from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.db.models import Q
from accounts.models import UserRole, Notification, get_user_authorized_wards, CITY_WARDS
from .models import WaterNotice, WaterServiceRequest, ElectricityNotice, ElectricityServiceRequest, CivicNotice
from .serializers import (
    WaterNoticeSerializer, WaterServiceRequestSerializer,
    ElectricityNoticeSerializer, ElectricityServiceRequestSerializer,
    CivicNoticeSerializer
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
        elif role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT]:
            dept = (getattr(request.user.profile, 'department_name', '') or '').lower()
            if 'water' not in dept and not request.user.is_superuser and not request.user.is_staff:
                return Response({'error': 'You do not have permission to view Water Department requests.'}, status=status.HTTP_403_FORBIDDEN)
            queryset = WaterServiceRequest.objects.all()
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
        elif role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT]:
            dept = (getattr(request.user.profile, 'department_name', '') or '').lower()
            if 'elec' not in dept and 'power' not in dept and not request.user.is_superuser and not request.user.is_staff:
                return Response({'error': 'You do not have permission to view Electricity Department requests.'}, status=status.HTTP_403_FORBIDDEN)
            queryset = ElectricityServiceRequest.objects.all()
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


# ----------------- Civic Notices Management Views (4 Categories) -----------------

class CivicNoticeListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        user_wards = get_user_authorized_wards(request.user)
        queryset = CivicNotice.objects.select_related('published_by')

        # Filter by category
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)

        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by ward
        ward_filter = request.query_params.get('ward')
        if ward_filter:
            queryset = queryset.filter(Q(target_ward__iexact=ward_filter) | Q(affected_area__icontains=ward_filter))

        # Role-based visibility and audience filtering
        if role == UserRole.CITIZEN:
            queryset = queryset.filter(audience__in=['All', 'Citizens'])
            if user_wards and user_wards != list(CITY_WARDS):
                queryset = queryset.filter(
                    Q(target_ward__in=user_wards) | Q(target_ward='') | Q(target_ward__iexact='City-wide')
                )
        elif role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            user_dept = getattr(request.user.profile, 'department_name', '')
            queryset = queryset.filter(audience__in=['All', 'Employees'])
            if user_wards and user_wards != list(CITY_WARDS):
                queryset = queryset.filter(
                    Q(target_ward__in=user_wards) | Q(target_ward='') | Q(target_ward__iexact='City-wide')
                )
            if user_dept:
                queryset = queryset.filter(
                    Q(department__iexact=user_dept) | Q(department='')
                )
        elif role == UserRole.AREA_HEAD:
            if user_wards and user_wards != list(CITY_WARDS):
                queryset = queryset.filter(
                    Q(target_ward__in=user_wards) | Q(target_ward='') | Q(target_ward__iexact='City-wide') | Q(published_by=request.user)
                )

        serializer = CivicNoticeSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        user_wards = get_user_authorized_wards(request.user)

        if role not in [UserRole.ADMIN, UserRole.AREA_HEAD, UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT]:
            return Response({'error': 'Only Area Heads, Department Staff, or Administrators can publish civic notices.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()

        # If Area Head, ensure target_ward is within their jurisdiction
        if role == UserRole.AREA_HEAD:
            target_ward = data.get('target_ward', '').strip()
            if not target_ward:
                if user_wards:
                    data['target_ward'] = user_wards[0]
            elif user_wards and user_wards != list(CITY_WARDS) and target_ward not in user_wards:
                return Response({'error': f'You can only publish notices for your assigned ward ({", ".join(user_wards)}).'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CivicNoticeSerializer(data=data)
        if serializer.is_valid():
            notice = serializer.save(published_by=request.user)
            return Response(CivicNoticeSerializer(notice).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CivicNoticeDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return CivicNotice.objects.select_related('published_by').get(pk=pk)
        except CivicNotice.DoesNotExist:
            return None

    def get(self, request, pk):
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CivicNoticeSerializer(notice).data)

    def patch(self, request, pk):
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)

        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        is_creator = (notice.published_by == request.user)
        is_admin = (role == UserRole.ADMIN or request.user.is_staff or request.user.is_superuser)

        if not (is_admin or is_creator):
            return Response({'error': 'You do not have permission to modify this notice.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CivicNoticeSerializer(notice, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(CivicNoticeSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        notice = self.get_object(pk)
        if not notice:
            return Response({'error': 'Notice not found.'}, status=status.HTTP_404_NOT_FOUND)

        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        is_creator = (notice.published_by == request.user)
        is_admin = (role == UserRole.ADMIN or request.user.is_staff or request.user.is_superuser)

        if not (is_admin or is_creator):
            return Response({'error': 'You do not have permission to delete this notice.'}, status=status.HTTP_403_FORBIDDEN)

        notice.delete()
        return Response({'message': 'Notice deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

