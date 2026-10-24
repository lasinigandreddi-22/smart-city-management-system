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
