from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.db.models import Q, Count
from django.contrib.auth.models import User
from django.utils import timezone
from accounts.models import UserRole, Notification
from .models import Complaint, ComplaintStatusHistory, ComplaintStatus, ComplaintPriority
from .serializers import ComplaintSerializer, ComplaintCreateSerializer

class ComplaintListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        queryset = Complaint.objects.all().select_related('citizen', 'citizen__profile', 'assigned_to').prefetch_related('supports')

        # Role-based scoping
        if role == UserRole.CITIZEN:
            scope = request.query_params.get('scope')
            if scope in ['area', 'community', 'all']:
                # Citizen viewing community queue to support issues in their ward
                citizen_ward = getattr(request.user.profile, 'assigned_zone', '')
                ward_param = request.query_params.get('ward') or citizen_ward
                if ward_param:
                    queryset = queryset.filter(ward__icontains=ward_param)
            else:
                # Default: citizen views only their own complaints (preserves backwards compatibility)
                queryset = queryset.filter(citizen=request.user)

        elif role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            dept = getattr(request.user.profile, 'department_name', '')
            emp_zone = getattr(request.user.profile, 'assigned_zone', '')
            # An employee sees only tasks assigned to them within authorized department & zone
            queryset = queryset.filter(assigned_to=request.user)
            if dept:
                queryset = queryset.filter(Q(assigned_department__icontains=dept) | Q(category__icontains=dept))
            if emp_zone and emp_zone.lower() not in ['city-wide', 'all', '']:
                queryset = queryset.filter(ward__icontains=emp_zone)

        elif role == UserRole.AREA_HEAD:
            head_zone = getattr(request.user.profile, 'assigned_zone', '')
            head_dept = getattr(request.user.profile, 'department_name', '')
            # Area Head monitors complaints across all authorized departments in their assigned zone
            if head_zone and head_zone.lower() not in ['city-wide', 'all', '']:
                queryset = queryset.filter(ward__icontains=head_zone)
            if head_dept and head_dept.lower() not in ['all', 'municipal governance', '']:
                queryset = queryset.filter(assigned_department__icontains=head_dept)

        # Filters
        status_filter = request.query_params.get('status')
        category_filter = request.query_params.get('category')
        priority_filter = request.query_params.get('priority')
        ward_filter = request.query_params.get('ward')
        dept_filter = request.query_params.get('assigned_department')
        assigned_to_filter = request.query_params.get('assigned_to')
        overdue_filter = request.query_params.get('overdue')
        search = request.query_params.get('search')
        sort = request.query_params.get('sort')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if ward_filter:
            queryset = queryset.filter(ward__icontains=ward_filter)
        if dept_filter:
            queryset = queryset.filter(assigned_department__icontains=dept_filter)

        if assigned_to_filter:
            if assigned_to_filter == 'unassigned':
                queryset = queryset.filter(assigned_to__isnull=True)
            elif assigned_to_filter == 'me':
                queryset = queryset.filter(assigned_to=request.user)
            elif assigned_to_filter.isdigit():
                queryset = queryset.filter(assigned_to_id=int(assigned_to_filter))

        if overdue_filter == 'true':
            queryset = queryset.filter(
                deadline__isnull=False,
                deadline__lt=timezone.now()
            ).exclude(status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(complaint_ref__icontains=search) |
                Q(location__icontains=search) |
                Q(ward__icontains=search)
            )

        # Sorting
        if sort in ['mostly_complained', 'most_supported']:
            queryset = queryset.annotate(cnt=Count('supports')).order_by('-cnt', '-created_at')
        elif sort == 'deadline':
            queryset = queryset.order_by('deadline', '-created_at')
        elif sort == 'priority':
            queryset = queryset.order_by('-priority', '-created_at')

        serializer = ComplaintSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Default ward from citizen profile if not provided
        ward = request.data.get('ward')
        if not ward:
            ward = getattr(request.user.profile, 'assigned_zone', 'North Zone') or 'North Zone'

        complaint = serializer.save(
            citizen=request.user,
            ward=ward,
            status=ComplaintStatus.SUBMITTED
        )

        # Log initial status history
        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            changed_by=request.user,
            previous_status='New',
            new_status=ComplaintStatus.SUBMITTED,
            notes='Complaint submitted by citizen.'
        )

        # Automatically notify citizen
        Notification.objects.create(
            user=request.user,
            title='Complaint Registered',
            message=f'Your complaint #{complaint.complaint_ref} ({complaint.title}) in {ward} has been registered and queued for Area Head review.',
            category='Complaint'
        )

        return Response(ComplaintSerializer(complaint, context={'request': request}).data, status=status.HTTP_201_CREATED)

class ComplaintDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        role = getattr(user.profile, 'role', UserRole.CITIZEN)
        try:
            complaint = Complaint.objects.select_related(
                'citizen', 'citizen__profile', 'assigned_to', 'assigned_by', 'confirmed_by', 
                'acknowledged_by', 'completion_submitted_by'
            ).prefetch_related('supports', 'history').get(pk=pk)
        except Complaint.DoesNotExist:
            return None

        # Check authorization
        if role == UserRole.CITIZEN and complaint.citizen != user:
            return False  # Forbidden: citizens can only access their own complaint details

        if role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            dept = getattr(user.profile, 'department_name', '').lower()
            emp_zone = getattr(user.profile, 'assigned_zone', '').lower()

            # 1. Employee can only access tasks assigned to them
            if complaint.assigned_to != user:
                return False

            # 2. Zone check: Cannot access tasks from other zones
            if emp_zone and emp_zone not in ['city-wide', 'all', '']:
                if emp_zone not in complaint.ward.lower():
                    return False

            # 3. Department check: Cannot access tasks from other departments
            if dept:
                if dept not in complaint.assigned_department.lower() and complaint.category.lower() not in dept:
                    return False

        if role == UserRole.AREA_HEAD:
            head_zone = getattr(user.profile, 'assigned_zone', '').lower()
            head_dept = getattr(user.profile, 'department_name', '').lower()
            if head_zone and head_zone not in ['city-wide', 'all', '']:
                if head_zone not in complaint.ward.lower():
                    return False
            if head_dept and head_dept not in ['all', 'municipal governance', '']:
                if head_dept not in complaint.assigned_department.lower():
                    return False

        return complaint

    def get(self, request, pk):
        complaint = self.get_object(pk, request.user)
        if complaint is None:
            return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)
        if complaint is False:
            return Response({'error': 'You do not have permission to view this complaint.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ComplaintSerializer(complaint, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        complaint = self.get_object(pk, request.user)
        if complaint is None:
            return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)
        if complaint is False:
            return Response({'error': 'You do not have permission to modify this complaint.'}, status=status.HTTP_403_FORBIDDEN)

        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN:
            return Response({'error': 'Citizens cannot modify complaint status or assignments.'}, status=status.HTTP_403_FORBIDDEN)

        old_status = complaint.status
        action = request.data.get('action')
        new_status = request.data.get('status')
        new_dept = request.data.get('assigned_department')
        assigned_to_id = request.data.get('assigned_to')
        new_priority = request.data.get('priority')
        priority_reason = request.data.get('priority_reason')
        new_deadline = request.data.get('deadline')
        new_ward = request.data.get('ward')
        notes = request.data.get('notes', '').strip()
        resolution_details = request.data.get('resolution_details')
        completion_remarks = request.data.get('completion_remarks')
        return_reason = request.data.get('return_reason')

        # Employee role restrictions
        if role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            # Employees cannot reassign or change management parameters
            if assigned_to_id is not None or new_dept is not None or new_priority is not None or new_deadline is not None or new_ward is not None:
                return Response({'error': 'Only Area Head or Administrator can modify assignments, priorities, or deadlines.'}, status=status.HTTP_403_FORBIDDEN)

            # Employees CANNOT directly mark as Resolved or Closed (must submit completion for Area Head acknowledgement)
            if new_status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
                return Response({
                    'error': 'Employees cannot directly mark complaints as Resolved. Please submit completion details to the Area Head for acknowledgement.'
                }, status=status.HTTP_403_FORBIDDEN)

        status_changed = False

        # 1. Action: Area Head Confirming Complaint (Step 2)
        if action == 'confirm' or request.data.get('is_confirmed') is True:
            complaint.is_confirmed = True
            complaint.confirmed_by = request.user
            complaint.confirmed_at = timezone.now()
            if complaint.status == ComplaintStatus.SUBMITTED:
                complaint.status = ComplaintStatus.UNDER_REVIEW
                status_changed = True

        # 2. Action: Request Clarification from Citizen
        elif action == 'request_clarification' or new_status == ComplaintStatus.NEEDS_CLARIFICATION:
            complaint.status = ComplaintStatus.NEEDS_CLARIFICATION
            status_changed = True
            if return_reason:
                complaint.return_reason = return_reason.strip()

        # 3. Action: Employee Submitting Completion for Area Head Verification (Step 5)
        elif action == 'submit_completion' or new_status == ComplaintStatus.PENDING_VERIFICATION or (role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER] and completion_remarks):
            complaint.status = ComplaintStatus.PENDING_VERIFICATION
            status_changed = True
            complaint.completion_remarks = (completion_remarks or notes or 'Work completed by employee; submitted for Area Head acknowledgement.').strip()
            complaint.completion_submitted_at = timezone.now()
            complaint.completion_submitted_by = request.user
            if resolution_details:
                complaint.resolution_details = resolution_details.strip()

            # Notify Area Heads for this zone
            area_heads = User.objects.filter(profile__role=UserRole.AREA_HEAD, profile__assigned_zone__icontains=complaint.ward)
            for ah in area_heads:
                Notification.objects.create(
                    user=ah,
                    title=f'Work Completion Awaiting Verification: {complaint.complaint_ref}',
                    message=f'Employee {request.user.get_full_name() or request.user.username} submitted completion for #{complaint.complaint_ref} ({complaint.title}) in {complaint.ward}. Awaiting your acknowledgement.',
                    category='Complaint'
                )

        # 4. Action: Area Head Acknowledging Completion (Step 6)
        elif action == 'acknowledge' or (new_status == ComplaintStatus.RESOLVED and role in [UserRole.AREA_HEAD, UserRole.ADMIN]):
            complaint.status = ComplaintStatus.RESOLVED
            status_changed = True
            complaint.acknowledged_by = request.user
            complaint.acknowledged_at = timezone.now()
            complaint.resolved_at = timezone.now()
            if resolution_details:
                complaint.resolution_details = resolution_details.strip()
            elif complaint.completion_remarks:
                complaint.resolution_details = complaint.completion_remarks

            # Notify Citizen
            Notification.objects.create(
                user=complaint.citizen,
                title=f'Complaint Resolved & Confirmed: {complaint.complaint_ref}',
                message=f'Your complaint #{complaint.complaint_ref} has been resolved and officially verified by Area Head {request.user.get_full_name()}. Resolution: {complaint.resolution_details}',
                category='Complaint'
            )
            # Notify Employee
            if complaint.assigned_to:
                Notification.objects.create(
                    user=complaint.assigned_to,
                    title=f'Work Order Acknowledged: {complaint.complaint_ref}',
                    message=f'Your completion for #{complaint.complaint_ref} was approved and acknowledged by Area Head {request.user.get_full_name()}.',
                    category='Complaint'
                )

        # 5. Action: Area Head Returning Completion for Further Work (Step 6)
        elif action == 'return' or (old_status == ComplaintStatus.PENDING_VERIFICATION and new_status == ComplaintStatus.IN_PROGRESS):
            complaint.status = ComplaintStatus.IN_PROGRESS
            status_changed = True
            reason_text = (return_reason or notes or 'Returned by Area Head for further work.').strip()
            complaint.return_reason = reason_text

            # Notify Assigned Employee
            if complaint.assigned_to:
                Notification.objects.create(
                    user=complaint.assigned_to,
                    title=f'Work Returned for Further Action: {complaint.complaint_ref}',
                    message=f'Area Head {request.user.get_full_name()} returned #{complaint.complaint_ref} for further action: {reason_text}',
                    category='Complaint'
                )

        # General status update
        elif new_status and new_status != old_status:
            complaint.status = new_status
            status_changed = True

        # Department update
        if new_dept is not None:
            complaint.assigned_department = new_dept.strip()

        # Ward update
        if new_ward is not None:
            complaint.ward = new_ward.strip()

        # Priority update
        if new_priority is not None:
            complaint.priority = new_priority
            if priority_reason:
                complaint.priority_reason = priority_reason.strip()

        # Deadline update
        if new_deadline is not None:
            if new_deadline:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(new_deadline) if isinstance(new_deadline, str) else new_deadline
                complaint.deadline = dt
            else:
                complaint.deadline = None

        # Staff assignment
        if assigned_to_id is not None:
            if assigned_to_id == '' or assigned_to_id is None:
                complaint.assigned_to = None
            else:
                try:
                    staff_user = User.objects.get(pk=assigned_to_id)
                except User.DoesNotExist:
                    return Response({'error': 'Selected staff member does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

                staff_role = getattr(staff_user.profile, 'role', None)
                if staff_role not in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
                    return Response({'error': 'Issues can only be assigned to Employee / Department Staff members.'}, status=status.HTTP_400_BAD_REQUEST)

                # Validate department compatibility
                staff_dept = getattr(staff_user.profile, 'department_name', '')
                if complaint.assigned_department and staff_dept:
                    if staff_dept.lower() not in complaint.assigned_department.lower() and complaint.assigned_department.lower() not in staff_dept.lower():
                        return Response({
                            'error': f"Cannot assign: Staff member '{staff_user.get_full_name() or staff_user.username}' belongs to '{staff_dept}', which does not match complaint department '{complaint.assigned_department}'."
                        }, status=status.HTTP_400_BAD_REQUEST)

                # Validate zone compatibility
                staff_zone = getattr(staff_user.profile, 'assigned_zone', '')
                if complaint.ward and staff_zone and staff_zone.lower() not in ['city-wide', 'all', '']:
                    if staff_zone.lower() not in complaint.ward.lower():
                        return Response({
                            'error': f"Cannot assign: Staff member '{staff_user.get_full_name() or staff_user.username}' is assigned to zone '{staff_zone}', which does not match complaint zone '{complaint.ward}'."
                        }, status=status.HTTP_400_BAD_REQUEST)

                complaint.assigned_to = staff_user
                complaint.assigned_by = request.user
                complaint.assigned_at = timezone.now()
                complaint.is_confirmed = True
                complaint.confirmed_by = request.user
                complaint.confirmed_at = timezone.now()

                if complaint.status in [ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW]:
                    complaint.status = ComplaintStatus.ASSIGNED
                    status_changed = True

                # Notify assigned staff member
                Notification.objects.create(
                    user=staff_user,
                    title=f'Work Order Assigned: {complaint.complaint_ref}',
                    message=f'You have been assigned issue #{complaint.complaint_ref} ({complaint.title}) in {complaint.ward}. Priority: {complaint.priority}.',
                    category='Complaint'
                )

        if resolution_details is not None and not complaint.resolution_details:
            complaint.resolution_details = resolution_details.strip()

        complaint.save()

        # Audit History Log
        history_notes = notes
        if not history_notes:
            actor = request.user.get_full_name() or request.user.username
            changes = []
            if status_changed:
                changes.append(f"Status changed to '{complaint.status}'")
            if assigned_to_id is not None:
                assigned_name = complaint.assigned_to.get_full_name() or complaint.assigned_to.username if complaint.assigned_to else 'None'
                changes.append(f"Assigned to {assigned_name}")
            if new_priority:
                changes.append(f"Priority set to {complaint.priority} ({complaint.priority_reason or 'standard review'})")
            if complaint.return_reason and action == 'return':
                changes.append(f"Returned for further action: {complaint.return_reason}")
            if complaint.completion_remarks and complaint.status == ComplaintStatus.PENDING_VERIFICATION:
                changes.append(f"Completion submitted: {complaint.completion_remarks}")
            history_notes = "; ".join(changes) if changes else f"Updated by {actor}."

        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            changed_by=request.user,
            previous_status=old_status,
            new_status=complaint.status,
            notes=history_notes
        )

        # Notify citizen on general status or priority change
        if status_changed and complaint.status not in [ComplaintStatus.RESOLVED]:
            Notification.objects.create(
                user=complaint.citizen,
                title=f'Complaint Update: {complaint.complaint_ref}',
                message=f"Update from municipal operations: {history_notes}",
                category='Complaint'
            )

        return Response(ComplaintSerializer(complaint, context={'request': request}).data)

    def delete(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN:
            return Response({'error': 'Only Admin can delete complaints.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            complaint = Complaint.objects.get(pk=pk)
            complaint.delete()
            return Response({'message': 'Complaint deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
        except Complaint.DoesNotExist:
            return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

class ComplaintSupportAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            complaint = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user in complaint.supports.all():
            complaint.supports.remove(request.user)
            supported = False
            message = "You have removed your support from this issue."
        else:
            complaint.supports.add(request.user)
            supported = True
            message = "You have supported this issue (+1 affected citizen)."

        return Response({
            'supported': supported,
            'support_count': complaint.supports.count(),
            'message': message
        })
