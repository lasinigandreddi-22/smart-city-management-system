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

class CurrentUserAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            'user': UserSerializer(request.user).data,
            'role': profile.role
        })

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        phone = request.data.get('phone')
        address = request.data.get('address')
        email = request.data.get('email')

        if phone is not None:
            profile.phone = phone
        if address is not None:
            profile.address = address
        profile.save()

        if email is not None:
            request.user.email = email
            request.user.save()

        return Response(UserSerializer(request.user).data)

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
