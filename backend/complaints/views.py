from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.db.models import Q
from accounts.models import UserRole, Notification
from .models import Complaint, ComplaintStatusHistory, ComplaintStatus
from .serializers import ComplaintSerializer, ComplaintCreateSerializer

class ComplaintListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        queryset = Complaint.objects.all().select_related('citizen', 'citizen__profile', 'assigned_to')

        # Role-based scoping
        if role == UserRole.CITIZEN:
            queryset = queryset.filter(citizen=request.user)
        elif role == UserRole.SERVICE_DEPARTMENT:
            dept = request.user.profile.department_name
            if dept:
                queryset = queryset.filter(Q(assigned_department__icontains=dept) | Q(assigned_to=request.user))
            # If no department is set yet, show all assigned or open complaints
        elif role == UserRole.TRAFFIC_OFFICER:
            queryset = queryset.filter(category='Roads & Traffic')
        # Admin can view all

        # Filtering
        status_filter = request.query_params.get('status')
        category_filter = request.query_params.get('category')
        priority_filter = request.query_params.get('priority')
        search = request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(complaint_ref__icontains=search) |
                Q(location__icontains=search)
            )

        serializer = ComplaintSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        complaint = serializer.save(
            citizen=request.user,
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
            message=f'Your complaint #{complaint.complaint_ref} ({complaint.title}) has been registered and is pending assignment.',
            category='Complaint'
        )

        return Response(ComplaintSerializer(complaint).data, status=status.HTTP_201_CREATED)

class ComplaintDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        role = getattr(user.profile, 'role', UserRole.CITIZEN)
        try:
            complaint = Complaint.objects.select_related('citizen', 'citizen__profile', 'assigned_to').get(pk=pk)
        except Complaint.DoesNotExist:
            return None

        # Check authorization
        if role == UserRole.CITIZEN and complaint.citizen != user:
            return False # Forbidden
        return complaint

    def get(self, request, pk):
        complaint = self.get_object(pk, request.user)
        if complaint is None:
            return Response({'error': 'Complaint not found.'}, status=status.HTTP_404_NOT_FOUND)
        if complaint is False:
            return Response({'error': 'You do not have permission to view this complaint.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ComplaintSerializer(complaint)
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
        notes = request.data.get('notes', '').strip()
        resolution_details = request.data.get('resolution_details')

        status_changed = False
        if new_status and new_status != old_status:
            complaint.status = new_status
            status_changed = True

        if new_dept is not None:
            complaint.assigned_department = new_dept

        if resolution_details is not None:
            complaint.resolution_details = resolution_details

        complaint.save()

        if status_changed or notes:
            history_notes = notes or f"Status updated to {complaint.status} by {request.user.get_full_name() or request.user.username}."
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
                message=f'Status changed from {old_status} to {complaint.status}. Note: {history_notes}',
                category='Complaint'
            )

        return Response(ComplaintSerializer(complaint).data)

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
