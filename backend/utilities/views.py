from rest_framework import status, views, permissions
from rest_framework.response import Response
from accounts.models import UserRole, Notification
from .models import WaterNotice, WaterServiceRequest, ElectricityNotice, ElectricityServiceRequest
from .serializers import (
    WaterNoticeSerializer, WaterServiceRequestSerializer,
    ElectricityNoticeSerializer, ElectricityServiceRequestSerializer
)

# ----------------- Water Management Views -----------------

class WaterNoticeListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = WaterNotice.objects.all()
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        serializer = WaterNoticeSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.ADMIN, UserRole.SERVICE_DEPARTMENT]:
            return Response({'error': 'Only Admin or Department staff can publish notices.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = WaterNoticeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WaterNoticeDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return WaterNotice.objects.get(pk=pk)
        except WaterNotice.DoesNotExist:
            return None

    def get(self, request, pk):
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(WaterNoticeSerializer(notice).data)

    def patch(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.ADMIN, UserRole.SERVICE_DEPARTMENT]:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = WaterNoticeSerializer(notice, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN:
            return Response({'error': 'Only Admin can delete notices.'}, status=status.HTTP_403_FORBIDDEN)
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)
        notice.delete()
        return Response({'message': 'Notice deleted.'}, status=status.HTTP_204_NO_CONTENT)

class WaterServiceRequestListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN:
            queryset = WaterServiceRequest.objects.filter(citizen=request.user)
        else:
            queryset = WaterServiceRequest.objects.all()
        serializer = WaterServiceRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = WaterServiceRequestSerializer(data=request.data)
        if serializer.is_valid():
            req_obj = serializer.save(citizen=request.user)
            Notification.objects.create(
                user=request.user,
                title='Water Service Request Logged',
                message=f'Your request for {req_obj.request_type} at {req_obj.location} has been received.',
                category='Utility'
            )
            return Response(WaterServiceRequestSerializer(req_obj).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WaterServiceRequestDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        try:
            req_obj = WaterServiceRequest.objects.get(pk=pk)
        except WaterServiceRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if role == UserRole.CITIZEN:
            return Response({'error': 'Citizens cannot modify request status.'}, status=status.HTTP_403_FORBIDDEN)

        status_val = request.data.get('status')
        notes = request.data.get('admin_notes')
        if status_val:
            req_obj.status = status_val
        if notes is not None:
            req_obj.admin_notes = notes
        req_obj.save()

        Notification.objects.create(
            user=req_obj.citizen,
            title='Water Request Updated',
            message=f'Your request #{req_obj.id} status is now: {req_obj.status}',
            category='Utility'
        )

        return Response(WaterServiceRequestSerializer(req_obj).data)


# ----------------- Electricity Management Views -----------------

class ElectricityNoticeListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = ElectricityNotice.objects.all()
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        serializer = ElectricityNoticeSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.ADMIN, UserRole.SERVICE_DEPARTMENT]:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ElectricityNoticeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ElectricityNoticeDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return ElectricityNotice.objects.get(pk=pk)
        except ElectricityNotice.DoesNotExist:
            return None

    def get(self, request, pk):
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ElectricityNoticeSerializer(notice).data)

    def patch(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.ADMIN, UserRole.SERVICE_DEPARTMENT]:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ElectricityNoticeSerializer(notice, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN:
            return Response({'error': 'Only Admin can delete notices.'}, status=status.HTTP_403_FORBIDDEN)
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)
        notice.delete()
        return Response({'message': 'Notice deleted.'}, status=status.HTTP_204_NO_CONTENT)

class ElectricityServiceRequestListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN:
            queryset = ElectricityServiceRequest.objects.filter(citizen=request.user)
        else:
            queryset = ElectricityServiceRequest.objects.all()
        serializer = ElectricityServiceRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ElectricityServiceRequestSerializer(data=request.data)
        if serializer.is_valid():
            req_obj = serializer.save(citizen=request.user)
            Notification.objects.create(
                user=request.user,
                title='Electricity Service Request Logged',
                message=f'Your request for {req_obj.request_type} at {req_obj.location} has been received.',
                category='Utility'
            )
            return Response(ElectricityServiceRequestSerializer(req_obj).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ElectricityServiceRequestDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        try:
            req_obj = ElectricityServiceRequest.objects.get(pk=pk)
        except ElectricityServiceRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if role == UserRole.CITIZEN:
            return Response({'error': 'Citizens cannot modify request status.'}, status=status.HTTP_403_FORBIDDEN)

        status_val = request.data.get('status')
        notes = request.data.get('admin_notes')
        if status_val:
            req_obj.status = status_val
        if notes is not None:
            req_obj.admin_notes = notes
        req_obj.save()

        Notification.objects.create(
            user=req_obj.citizen,
            title='Electricity Request Updated',
            message=f'Your request #{req_obj.id} status is now: {req_obj.status}',
            category='Utility'
        )

        return Response(ElectricityServiceRequestSerializer(req_obj).data)
