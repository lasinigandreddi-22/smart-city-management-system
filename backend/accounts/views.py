from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .models import UserProfile, UserRole, Notification
from .serializers import UserSerializer, NotificationSerializer
from .permissions import IsAdminUserRole

class LoginAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token, _ = Token.objects.get_or_create(user=user)
        # Also log into Django session for browsable API/admin convenience
        login(request, user)

        # Ensure user profile exists
        profile, _ = UserProfile.objects.get_or_create(user=user)

        user_data = UserSerializer(user).data
        return Response({
            'token': token.key,
            'user': user_data,
            'role': profile.role,
            'message': f'Welcome back, {user.first_name or user.username}!'
        })

class LogoutAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            if hasattr(request.user, 'auth_token'):
                request.user.auth_token.delete()
        except Exception:
            pass
        logout(request)
        return Response({'message': 'Logged out successfully.'})

from django.core.validators import validate_email
from django.core.exceptions import ValidationError

class CurrentUserAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        user_data = UserSerializer(request.user).data
        return Response({
            **user_data,
            'user': user_data,
            'role': profile.role
        })

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        # Enforce that users can only edit their own profile
        target_id = request.data.get('id') or request.data.get('user_id')
        if target_id is not None and str(target_id) != str(request.user.id):
            return Response(
                {'error': 'You can only edit your own profile.', 'field_errors': {'id': 'You can only edit your own profile.'}},
                status=status.HTTP_403_FORBIDDEN
            )

        # Enforce that username cannot be modified
        new_username = request.data.get('username')
        if new_username is not None and new_username.strip() != request.user.username:
            return Response(
                {'error': 'Username cannot be modified.', 'field_errors': {'username': 'Username cannot be modified.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce that users can never change their role
        new_role = request.data.get('role')
        if new_role is not None and new_role != profile.role:
            return Response(
                {'error': 'Role cannot be modified.', 'field_errors': {'role': 'Role cannot be modified.'}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle and validate email
        if 'email' in request.data:
            email = request.data.get('email', '').strip()
            if not email:
                return Response(
                    {'error': 'Email address cannot be empty.', 'field_errors': {'email': 'Email address cannot be empty.'}},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                validate_email(email)
            except ValidationError:
                return Response(
                    {'error': 'Please enter a valid email address.', 'field_errors': {'email': 'Please enter a valid email address.'}},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if User.objects.filter(email__iexact=email).exclude(pk=request.user.pk).exists():
                return Response(
                    {'error': 'This email address is already in use by another account.', 'field_errors': {'email': 'This email address is already in use by another account.'}},
                    status=status.HTTP_400_BAD_REQUEST
                )
            request.user.email = email

        # Handle name fields
        if 'first_name' in request.data:
            request.user.first_name = request.data.get('first_name', '').strip()
        if 'last_name' in request.data:
            request.user.last_name = request.data.get('last_name', '').strip()
        if 'name' in request.data and 'first_name' not in request.data:
            full_name = request.data.get('name', '').strip()
            if full_name:
                parts = full_name.split(' ', 1)
                request.user.first_name = parts[0]
                request.user.last_name = parts[1] if len(parts) > 1 else ''
        request.user.save()

        # Handle profile phone and address
        if 'phone' in request.data:
            phone = request.data.get('phone', '').strip()
            if len(phone) > 20:
                return Response(
                    {'error': 'Phone number cannot exceed 20 characters.', 'field_errors': {'phone': 'Phone number cannot exceed 20 characters.'}},
                    status=status.HTTP_400_BAD_REQUEST
                )
            profile.phone = phone

        if 'address' in request.data:
            profile.address = request.data.get('address', '').strip()

        profile.save()

        user_data = UserSerializer(request.user).data
        return Response({
            **user_data,
            'user': user_data,
            'role': profile.role,
            'message': 'Profile updated successfully.'
        }, status=status.HTTP_200_OK)

class CitizenListAPIView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        citizens = User.objects.filter(profile__role=UserRole.CITIZEN).select_related('profile').order_by('-date_joined')
        return Response(UserSerializer(citizens, many=True).data)

from .models import UserProfile, UserRole, Notification, Ward, CITY_WARDS, get_user_authorized_wards

class StaffListAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', None)
        if role not in [UserRole.ADMIN, UserRole.AREA_HEAD, UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER] and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        department = request.query_params.get('department')
        ward = request.query_params.get('ward') or request.query_params.get('zone')

        staff_users = User.objects.filter(
            profile__role__in=[UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]
        ).select_related('profile').order_by('first_name', 'username')

        if department:
            staff_users = staff_users.filter(profile__department_name__icontains=department)
        
        results = []
        for u in staff_users:
            if ward:
                u_wards = get_user_authorized_wards(u)
                if ward not in u_wards and u_wards != list(CITY_WARDS):
                    continue

            results.append({
                'id': u.id,
                'username': u.username,
                'name': u.get_full_name() or u.username,
                'email': u.email,
                'role': u.profile.role,
                'department_name': u.profile.department_name,
                'assigned_zone': u.profile.assigned_zone
            })
        return Response(results)

class WardListAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        wards = Ward.objects.all().order_by('ward_number')
        if not wards.exists():
            data = [{'id': i, 'name': f'Ward {i}', 'ward_number': i, 'description': f'Municipal Ward {i}'} for i in range(1, 11)]
        else:
            data = [{'id': w.id, 'name': w.name, 'ward_number': w.ward_number, 'description': w.description} for w in wards]
        return Response(data)


class UserManagementAPIView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        from django.db.models import Q
        role_filter = request.query_params.get('role')
        search = request.query_params.get('search')

        queryset = User.objects.select_related('profile').order_by('-date_joined')
        if role_filter:
            queryset = queryset.filter(profile__role=role_filter)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(profile__department_name__icontains=search) |
                Q(profile__assigned_zone__icontains=search)
            )

        return Response(UserSerializer(queryset, many=True).data)

    def patch(self, request, pk=None):
        if not pk:
            return Response({'error': 'User ID required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.select_related('profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        data = request.data

        # Update role
        if 'role' in data:
            new_role = data['role']
            valid_roles = [r.value for r in UserRole]
            if new_role not in valid_roles:
                return Response({'error': f'Invalid role: {new_role}. Valid roles are: {valid_roles}'}, status=status.HTTP_400_BAD_REQUEST)
            profile.role = new_role

        # Update department
        if 'department_name' in data:
            profile.department_name = data.get('department_name', '').strip()

        # Update assigned_zone / ward
        if 'assigned_zone' in data:
            profile.assigned_zone = data.get('assigned_zone', '').strip()
        elif 'ward' in data:
            profile.assigned_zone = data.get('ward', '').strip()

        # Update name/email if provided
        if 'first_name' in data:
            target_user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            target_user.last_name = data['last_name'].strip()
        if 'email' in data:
            target_user.email = data['email'].strip()

        target_user.save()
        profile.save()

        return Response({
            'message': f'User {target_user.username} updated successfully.',
            'user': UserSerializer(target_user).data
        })

class NotificationListAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)[:20]
        serializer = NotificationSerializer(notifications, many=True)
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            'unread_count': unread_count,
            'notifications': serializer.data
        })

class NotificationMarkReadAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            Notification.objects.filter(id=pk, user=request.user).update(is_read=True)
        else:
            Notification.objects.filter(user=request.user).update(is_read=True)
        return Response({'status': 'marked as read'})
