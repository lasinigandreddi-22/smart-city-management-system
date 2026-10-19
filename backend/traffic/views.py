from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.db.models import Q
from accounts.models import UserRole, Notification
from .models import TrafficIncident, TrafficCitizenReport, IncidentStatus
from .serializers import TrafficIncidentSerializer, TrafficCitizenReportSerializer

class TrafficIncidentListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = TrafficIncident.objects.all()

        public_only = request.query_params.get('public')
        if public_only == 'true':
            queryset = queryset.filter(is_public_alert=True)

        status_filter = request.query_params.get('status')
        severity_filter = request.query_params.get('severity')
        search = request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if severity_filter:
            queryset = queryset.filter(severity=severity_filter)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(location__icontains=search) |
                Q(description__icontains=search)
            )

        serializer = TrafficIncidentSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.TRAFFIC_OFFICER, UserRole.ADMIN]:
            return Response({'error': 'Only Traffic Officers and Admins can log official incidents.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TrafficIncidentSerializer(data=request.data)
        if serializer.is_valid():
            incident = serializer.save(reported_by=request.user)
            return Response(TrafficIncidentSerializer(incident).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TrafficIncidentDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return TrafficIncident.objects.get(pk=pk)
        except TrafficIncident.DoesNotExist:
            return None

    def get(self, request, pk):
        incident = self.get_object(pk)
        if not incident:
            return Response({'error': 'Incident not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TrafficIncidentSerializer(incident).data)

    def patch(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.TRAFFIC_OFFICER, UserRole.ADMIN]:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        incident = self.get_object(pk)
        if not incident:
            return Response({'error': 'Incident not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TrafficIncidentSerializer(incident, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN:
            return Response({'error': 'Only Admin can remove incident logs.'}, status=status.HTTP_403_FORBIDDEN)
        incident = self.get_object(pk)
        if not incident:
            return Response({'error': 'Incident not found.'}, status=status.HTTP_404_NOT_FOUND)
        incident.delete()
        return Response({'message': 'Incident deleted.'}, status=status.HTTP_204_NO_CONTENT)

class TrafficCitizenReportListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN:
            queryset = TrafficCitizenReport.objects.filter(citizen=request.user)
        else:
            queryset = TrafficCitizenReport.objects.all()
        serializer = TrafficCitizenReportSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TrafficCitizenReportSerializer(data=request.data)
        if serializer.is_valid():
            rep = serializer.save(citizen=request.user)
            Notification.objects.create(
                user=request.user,
                title='Traffic Report Submitted',
                message=f'Your report regarding "{rep.title}" at {rep.location} has been forwarded to the Traffic Control Room.',
                category='Traffic'
            )
            return Response(TrafficCitizenReportSerializer(rep).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TrafficCitizenReportDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.TRAFFIC_OFFICER, UserRole.ADMIN]:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            report = TrafficCitizenReport.objects.get(pk=pk)
        except TrafficCitizenReport.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

        status_val = request.data.get('status')
        notes = request.data.get('officer_notes')
        if status_val:
            report.status = status_val
        if notes is not None:
            report.officer_notes = notes
        report.save()

        Notification.objects.create(
            user=report.citizen,
            title='Traffic Report Update',
            message=f'Traffic Report #{report.id} status updated to {report.status}.',
            category='Traffic'
        )

        return Response(TrafficCitizenReportSerializer(report).data)
