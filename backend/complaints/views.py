from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.db.models import Q, Count
from django.contrib.auth.models import User
from django.utils import timezone
from accounts.models import UserRole, Notification, CITY_WARDS, get_user_authorized_wards
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
            is_community = scope in ['area', 'community', 'all'] or request.query_params.get('community') == 'true'
            if is_community:
                # Citizen viewing community queue to support issues in their ward
                # Privacy rule: Only confirmed complaints (or citizen's own) can be seen
                citizen_wards = get_user_authorized_wards(request.user)
                ward_param = request.query_params.get('ward')
                queryset = queryset.filter(Q(citizen=request.user) | Q(is_confirmed=True))
                if ward_param:
                    queryset = queryset.filter(ward__icontains=ward_param)
                elif citizen_wards and citizen_wards != list(CITY_WARDS):
                    queryset = queryset.filter(ward__in=citizen_wards)
            else:
                # Default: citizen views only their own complaints (preserves backwards compatibility)
                queryset = queryset.filter(citizen=request.user)

        elif role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            dept = getattr(request.user.profile, 'department_name', '').strip()
            emp_wards = get_user_authorized_wards(request.user)
            # An employee sees only tasks assigned to them within authorized department & ward
            queryset = queryset.filter(assigned_to=request.user)
            if dept:
                domain_keywords = [w for w in ['water', 'electricity', 'traffic', 'road', 'tax', 'sanitation'] if w in dept.lower()]
                if domain_keywords:
                    q_dept = Q()
                    for kw in domain_keywords:
                        q_dept |= Q(assigned_department__icontains=kw) | Q(category__icontains=kw)
                    queryset = queryset.filter(q_dept)
                else:
                    queryset = queryset.filter(Q(assigned_department__icontains=dept) | Q(category__icontains=dept))
            if emp_wards and emp_wards != list(CITY_WARDS):
                queryset = queryset.filter(ward__in=emp_wards)

        elif role == UserRole.AREA_HEAD:
            head_wards = get_user_authorized_wards(request.user)
            head_dept = getattr(request.user.profile, 'department_name', '').strip()
            # Area Head monitors complaints across authorized wards
            if head_wards and head_wards != list(CITY_WARDS):
                ward_param = request.query_params.get('ward')
                if ward_param and ward_param not in head_wards:
                    return Response({
                        'error': f"You do not have access to {ward_param}. Your authorized jurisdiction is {', '.join(head_wards)}."
                    }, status=status.HTTP_403_FORBIDDEN)
                queryset = queryset.filter(ward__in=head_wards)
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
            citizen_wards = get_user_authorized_wards(request.user)
            ward = citizen_wards[0] if citizen_wards else 'Ward 1'
        
        # Normalize to standard CITY_WARDS
        for cw in CITY_WARDS:
            if cw.lower() == ward.strip().lower() or cw.lower() in ward.strip().lower():
                ward = cw
                break

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

def are_departments_compatible(staff_dept, target_dept):
    if not staff_dept or not target_dept:
        return True
    s = staff_dept.lower().strip()
    t = target_dept.lower().strip()
    if s == t:
        return True

    import re
    s_words = set(re.findall(r'[a-zA-Z]+', s))
    t_words = set(re.findall(r'[a-zA-Z]+', t))

    domain_groups = [
        {'water', 'drainage', 'sewerage', 'pipeline'},
        {'electricity', 'power', 'streetlight', 'lighting'},
        {'traffic', 'road', 'roads', 'transport', 'signal'},
        {'sanitation', 'garbage', 'waste', 'cleanliness'},
        {'tax', 'property', 'revenue', 'billing'},
    ]

    for grp in domain_groups:
        if (s_words & grp) and (t_words & grp):
            return True

    if s in t or t in s:
        return True

    return False

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
        if role == UserRole.CITIZEN:
            # Citizens can access their own complaint details, or public community complaints ONLY after Area Head confirmation
            if complaint.citizen != user and not complaint.is_confirmed:
                return False  # Forbidden: unconfirmed complaints of other citizens are strictly private

        elif role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            dept = getattr(user.profile, 'department_name', '').strip().lower()
            emp_wards = get_user_authorized_wards(user)

            # 1. Employee can only access tasks assigned to them
            if complaint.assigned_to != user:
                return False

            # 2. Ward check: Cannot access tasks outside authorized wards
            if emp_wards and emp_wards != list(CITY_WARDS):
                if complaint.ward not in emp_wards:
                    return False

            # 3. Department check: Cannot access tasks outside department
            if dept:
                dept_to_check = (complaint.assigned_department or complaint.category or '').lower()
                if not are_departments_compatible(dept, dept_to_check):
                    return False

        elif role == UserRole.AREA_HEAD:
            head_wards = get_user_authorized_wards(user)
            if head_wards and head_wards != list(CITY_WARDS):
                if complaint.ward not in head_wards:
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

        # ----------------- Citizen Actions -----------------
        if role == UserRole.CITIZEN:
            if complaint.citizen != request.user:
                return Response({'error': 'You can only manage your own complaints.'}, status=status.HTTP_403_FORBIDDEN)

            # Citizen confirms problem is resolved (transitions to Closed)
            if action in ['confirm_resolution', 'citizen_confirm'] or (complaint.status == ComplaintStatus.RESOLVED and new_status == ComplaintStatus.CLOSED):
                if complaint.status != ComplaintStatus.RESOLVED:
                    return Response({'error': 'Only resolved complaints can be confirmed by the citizen.'}, status=status.HTTP_400_BAD_REQUEST)

                complaint.status = ComplaintStatus.CLOSED
                complaint.save()

                ComplaintStatusHistory.objects.create(
                    complaint=complaint,
                    changed_by=request.user,
                    previous_status=old_status,
                    new_status=ComplaintStatus.CLOSED,
                    notes='Citizen verified and confirmed that the issue has been successfully resolved.'
                )

                if complaint.assigned_to:
                    Notification.objects.create(
                        user=complaint.assigned_to,
                        title=f'Citizen Confirmed Resolution: {complaint.complaint_ref}',
                        message=f'Citizen {request.user.get_full_name() or request.user.username} confirmed #{complaint.complaint_ref} ({complaint.title}) is resolved. Work order officially closed.',
                        category='Complaint'
                    )

                return Response(ComplaintSerializer(complaint, context={'request': request}).data)

            # Citizen reports still unresolved (reopens to In Progress)
            elif action in ['reopen', 'citizen_reopen'] or (complaint.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] and new_status == ComplaintStatus.IN_PROGRESS):
                feedback = (return_reason or notes or 'Citizen reported problem is still unresolved.').strip()
                complaint.status = ComplaintStatus.IN_PROGRESS
                complaint.return_reason = f"Citizen Feedback: {feedback}"
                complaint.save()

                ComplaintStatusHistory.objects.create(
                    complaint=complaint,
                    changed_by=request.user,
                    previous_status=old_status,
                    new_status=ComplaintStatus.IN_PROGRESS,
                    notes=f"Reopened by citizen: {feedback}"
                )

                if complaint.assigned_to:
                    Notification.objects.create(
                        user=complaint.assigned_to,
                        title=f'Work Reopened by Citizen: {complaint.complaint_ref}',
                        message=f'Citizen {request.user.get_full_name() or request.user.username} reported #{complaint.complaint_ref} ({complaint.title}) remains unresolved: {feedback}',
                        category='Complaint'
                    )

                return Response(ComplaintSerializer(complaint, context={'request': request}).data)

            else:
                return Response({'error': 'Citizens can only confirm resolution or report a resolved complaint as unresolved.'}, status=status.HTTP_403_FORBIDDEN)

        # ----------------- Employee Role Restrictions -----------------
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
            # Set default SLA deadline if none exists
            if not complaint.deadline:
                complaint.deadline = timezone.now() + timezone.timedelta(days=3)

        # 2. Action: Area Head Rejecting Complaint
        elif action == 'reject':
            reject_reason = (return_reason or notes or 'Complaint rejected upon Area Head review.').strip()
            complaint.status = ComplaintStatus.CLOSED
            status_changed = True
            complaint.is_confirmed = False
            complaint.return_reason = f"Rejected: {reject_reason}"

            Notification.objects.create(
                user=complaint.citizen,
                title=f'Complaint Rejected: {complaint.complaint_ref}',
                message=f'Your complaint #{complaint.complaint_ref} was reviewed and rejected by Area Head {request.user.get_full_name() or request.user.username}. Reason: {reject_reason}',
                category='Complaint'
            )

        # 3. Action: Request Clarification from Citizen
        elif action == 'request_clarification' or new_status == ComplaintStatus.NEEDS_CLARIFICATION:
            complaint.status = ComplaintStatus.NEEDS_CLARIFICATION
            status_changed = True
            if return_reason:
                complaint.return_reason = return_reason.strip()

        # 4. Action: Employee Submitting Completion for Area Head Verification (Step 5)
        elif action == 'submit_completion' or new_status == ComplaintStatus.PENDING_VERIFICATION or (role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER] and completion_remarks):
            complaint.status = ComplaintStatus.PENDING_VERIFICATION
            status_changed = True
            complaint.completion_remarks = (completion_remarks or notes or 'Work completed by employee; submitted for Area Head acknowledgement.').strip()
            complaint.completion_submitted_at = timezone.now()
            complaint.completion_submitted_by = request.user
            if resolution_details:
                complaint.resolution_details = resolution_details.strip()

            # Notify Area Heads for this ward
            area_heads = User.objects.filter(profile__role=UserRole.AREA_HEAD)
            for ah in area_heads:
                ah_wards = get_user_authorized_wards(ah)
                if complaint.ward in ah_wards or ah_wards == list(CITY_WARDS):
                    Notification.objects.create(
                        user=ah,
                        title=f'Work Completion Awaiting Verification: {complaint.complaint_ref}',
                        message=f'Employee {request.user.get_full_name() or request.user.username} submitted completion for #{complaint.complaint_ref} ({complaint.title}) in {complaint.ward}. Awaiting your acknowledgement.',
                        category='Complaint'
                    )

        # 5. Action: Area Head Acknowledging Completion (Step 6)
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
                message=f'Your complaint #{complaint.complaint_ref} has been resolved and officially verified by Area Head {request.user.get_full_name() or request.user.username}. Resolution: {complaint.resolution_details}',
                category='Complaint'
            )
            # Notify Employee
            if complaint.assigned_to:
                Notification.objects.create(
                    user=complaint.assigned_to,
                    title=f'Work Order Acknowledged: {complaint.complaint_ref}',
                    message=f'Your completion for #{complaint.complaint_ref} was approved and acknowledged by Area Head {request.user.get_full_name() or request.user.username}.',
                    category='Complaint'
                )

        # 6. Action: Area Head Returning Completion for Further Work (Step 6)
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
                    message=f'Area Head {request.user.get_full_name() or request.user.username} returned #{complaint.complaint_ref} for further action: {reason_text}',
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
                    return Response({'error': 'Issues can only be assigned to Employee accounts.'}, status=status.HTTP_400_BAD_REQUEST)

                # Validate department compatibility
                staff_dept = getattr(staff_user.profile, 'department_name', '').strip()
                dept_to_check = (new_dept or complaint.assigned_department or complaint.category or '').strip()
                if dept_to_check and staff_dept:
                    if not are_departments_compatible(staff_dept, dept_to_check):
                        return Response({
                            'error': f"Cannot assign: Staff member '{staff_user.get_full_name() or staff_user.username}' belongs to '{staff_dept}', which does not match complaint department '{dept_to_check}'."
                        }, status=status.HTTP_400_BAD_REQUEST)

                # Validate ward compatibility
                staff_wards = get_user_authorized_wards(staff_user)
                target_ward = new_ward or complaint.ward
                if staff_wards != list(CITY_WARDS) and target_ward not in staff_wards:
                    return Response({
                        'error': f"Cannot assign: Staff member '{staff_user.get_full_name() or staff_user.username}' is authorized for '{getattr(staff_user.profile, 'assigned_zone', '')}', which does not include complaint ward '{target_ward}'."
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

                # Default SLA deadline if none set
                if not complaint.deadline:
                    hours = 24 if complaint.priority == ComplaintPriority.URGENT else (48 if complaint.priority == ComplaintPriority.HIGH else 72)
                    complaint.deadline = timezone.now() + timezone.timedelta(hours=hours)

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
