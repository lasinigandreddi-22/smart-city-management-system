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
                # Citizen viewing community queue to support issues
                ward_param = request.query_params.get('ward')
                if ward_param:
                    queryset = queryset.filter(ward__icontains=ward_param)
            else:
                # Default: citizen views only their own complaints (preserves backwards compatibility)
                queryset = queryset.filter(citizen=request.user)

        elif role in [UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            dept = getattr(request.user.profile, 'department_name', '')
            if role == UserRole.TRAFFIC_OFFICER or 'traffic' in dept.lower():
                queryset = queryset.filter(
                    Q(category='Roads & Traffic') | 
                    Q(assigned_department__icontains='Traffic') | 
                    Q(assigned_to=request.user)
                )
            elif dept:
                queryset = queryset.filter(
                    Q(assigned_department__icontains=dept) | 
                    Q(assigned_to=request.user)
                )
            else:
                queryset = queryset.filter(assigned_to=request.user)

        elif role == UserRole.AREA_HEAD:
            head_zone = getattr(request.user.profile, 'assigned_zone', '')
            head_dept = getattr(request.user.profile, 'department_name', '')
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
            complaint = Complaint.objects.select_related('citizen', 'citizen__profile', 'assigned_to').prefetch_related('supports', 'history').get(pk=pk)
        except Complaint.DoesNotExist:
            return None

        # Check authorization
        if role == UserRole.CITIZEN and complaint.citizen != user:
            return False  # Forbidden: citizens can only access their own complaint details

        if role in [UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            dept = getattr(user.profile, 'department_name', '').lower()
            if role == UserRole.TRAFFIC_OFFICER or 'traffic' in dept:
                if complaint.category != 'Roads & Traffic' and complaint.assigned_to != user:
                    return False
            elif dept:
                if dept not in complaint.assigned_department.lower() and complaint.assigned_to != user:
                    return False

        if role == UserRole.AREA_HEAD:
            head_zone = getattr(user.profile, 'assigned_zone', '')
            if head_zone and head_zone.lower() not in ['city-wide', 'all', '']:
                if head_zone.lower() not in complaint.ward.lower():
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
        new_status = request.data.get('status')
        new_dept = request.data.get('assigned_department')
        assigned_to_id = request.data.get('assigned_to')
        new_priority = request.data.get('priority')
        priority_reason = request.data.get('priority_reason')
        new_deadline = request.data.get('deadline')
        new_ward = request.data.get('ward')
        notes = request.data.get('notes', '').strip()
        resolution_details = request.data.get('resolution_details')

        # Role restrictions for Staff vs Area Head / Admin
        if role in [UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            # Staff can update status, notes, resolution details, but cannot reassign to other staff/departments
            if assigned_to_id is not None or new_dept is not None:
                return Response({'error': 'Only Area Head or Administrator can assign or reassign issues.'}, status=status.HTTP_403_FORBIDDEN)

        status_changed = False
        if new_status and new_status != old_status:
            complaint.status = new_status
            status_changed = True

        if new_dept is not None:
            complaint.assigned_department = new_dept.strip()

        if new_ward is not None:
            complaint.ward = new_ward.strip()

        if new_priority is not None:
            complaint.priority = new_priority
            if priority_reason:
                complaint.priority_reason = priority_reason.strip()

        if new_deadline is not None:
            if new_deadline:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(new_deadline) if isinstance(new_deadline, str) else new_deadline
                complaint.deadline = dt
            else:
                complaint.deadline = None

        # Handle staff assignment
        if assigned_to_id is not None:
            if assigned_to_id == '' or assigned_to_id is None:
                complaint.assigned_to = None
            else:
                try:
                    staff_user = User.objects.get(pk=assigned_to_id)
                except User.DoesNotExist:
                    return Response({'error': 'Selected staff member does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

                staff_role = getattr(staff_user.profile, 'role', None)
                if staff_role not in [UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
                    return Response({'error': 'Issues can only be assigned to Department Staff members.'}, status=status.HTTP_400_BAD_REQUEST)

                # Validate department compatibility
                staff_dept = getattr(staff_user.profile, 'department_name', '')
                if complaint.assigned_department and staff_dept:
                    # Allow assignment if department matches or staff is multi-department
                    if staff_dept.lower() not in complaint.assigned_department.lower() and complaint.assigned_department.lower() not in staff_dept.lower():
                        return Response({
                            'error': f"Cannot assign: Staff member '{staff_user.get_full_name() or staff_user.username}' belongs to '{staff_dept}', which does not match complaint department '{complaint.assigned_department}'."
                        }, status=status.HTTP_400_BAD_REQUEST)

                complaint.assigned_to = staff_user
                if complaint.status == ComplaintStatus.SUBMITTED:
                    complaint.status = ComplaintStatus.ASSIGNED
                    status_changed = True

                # Notify assigned staff member
                Notification.objects.create(
                    user=staff_user,
                    title=f'Work Order Assigned: {complaint.complaint_ref}',
                    message=f'You have been assigned issue #{complaint.complaint_ref} ({complaint.title}) in {complaint.ward}. Priority: {complaint.priority}.',
                    category='Complaint'
                )

        if resolution_details is not None:
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
            history_notes = "; ".join(changes) if changes else f"Updated by {actor}."

        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            changed_by=request.user,
            previous_status=old_status,
            new_status=complaint.status,
            notes=history_notes
        )

        # Notify citizen
        Notification.objects.create(
            user=complaint.citizen,
            title=f'Complaint Update: {complaint.complaint_ref}',
            message=f"Update from municipal team: {history_notes}",
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
