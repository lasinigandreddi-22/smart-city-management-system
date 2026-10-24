from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Q
import secrets
import string
from .models import (
    UserProfile, UserRole, Notification, Ward, CITY_WARDS,
    generate_user_id, validate_role_ward_uniqueness, normalize_ward_name
)
from .serializers import UserSerializer, NotificationSerializer
from .permissions import IsAdminUserRole

def generate_secure_password(length=10):
    specials = "!@#$%^&*"
    chars = string.ascii_letters + string.digits + specials
    while True:
        pwd = ''.join(secrets.choice(chars) for _ in range(length))
        if (any(c.islower() for c in pwd) and
            any(c.isupper() for c in pwd) and
            any(c.isdigit() for c in pwd) and
            any(c in specials for c in pwd)):
            return pwd

class LoginAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        selected_role = request.data.get('role', '').strip()

        if not raw_username or not password:
            return Response(
                {'error': 'Username or User ID and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Dual lookup: Find user by system_user_id (e.g. CIT-1001) or by Django username (e.g. citizen1)
        user_obj = User.objects.filter(
            Q(username__iexact=raw_username) | Q(profile__system_user_id__iexact=raw_username)
        ).first()

        if not user_obj:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = authenticate(username=user_obj.username, password=password)
        if not user:
            return Response(
                {'error': 'Invalid username or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Enforce selected role verification against actual user role
        if selected_role:
            role_upper = selected_role.upper()
            is_role_valid = False
            if role_upper == 'ADMIN' and (profile.role == UserRole.ADMIN or user.is_staff or user.is_superuser):
                is_role_valid = True
            elif role_upper == 'AREA_HEAD' and profile.role == UserRole.AREA_HEAD:
                is_role_valid = True
            elif role_upper in ['EMPLOYEE', 'STAFF'] and profile.role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
                is_role_valid = True
            elif role_upper == 'CITIZEN' and profile.role == UserRole.CITIZEN:
                is_role_valid = True

            if not is_role_valid:
                return Response(
                    {
                        'error': f'Role mismatch: This account has "{profile.get_role_display()}" permissions, but you selected "{selected_role}". Please select the correct portal role.'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        token, _ = Token.objects.get_or_create(user=user)
        # Also log into Django session for browsable API/admin convenience
        login(request, user)

        user_data = UserSerializer(user).data
        return Response({
            'token': token.key,
            'user': user_data,
            'role': profile.role,
            'user_id': profile.system_user_id or user.username,
            'must_change_password': profile.must_change_password,
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


class RegisterAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        role = data.get('role', 'CITIZEN').strip().upper()

        if role == 'ADMIN':
            return Response(
                {'error': 'Administrator accounts cannot be registered publicly. Please contact system governance.'},
                status=status.HTTP_403_FORBIDDEN
            )

        valid_roles = [UserRole.CITIZEN, UserRole.EMPLOYEE, UserRole.AREA_HEAD]
        if role not in valid_roles:
            return Response(
                {'error': f'Invalid role: {role}. Allowed roles for registration are: CITIZEN, EMPLOYEE, AREA_HEAD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        address = data.get('address', '').strip()
        raw_ward = data.get('ward') or data.get('assigned_zone') or ''
        department_name = data.get('department_name', '').strip()

        if not first_name:
            return Response({'error': 'First name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not raw_ward:
            return Response({'error': 'Ward selection is mandatory for civic registration.'}, status=status.HTTP_400_BAD_REQUEST)

        normalized_ward = normalize_ward_name(raw_ward)

        # Check Ward Uniqueness Rule: no two users of same role can share a ward
        is_available, error_msg = validate_role_ward_uniqueness(role, normalized_ward)
        if not is_available:
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        if email:
            try:
                validate_email(email)
            except ValidationError:
                return Response({'error': 'Invalid email address format.'}, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.filter(email__iexact=email).exists():
                return Response({'error': 'A user with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Password handling: use user password if provided, else generate temporary password
        user_provided_pwd = data.get('password', '').strip()
        if user_provided_pwd:
            initial_pwd = user_provided_pwd
            must_change = False
        else:
            initial_pwd = generate_secure_password(10)
            must_change = True

        # Generate system-assigned User ID (CIT-1001, EMP-1001, AH-1001)
        system_user_id = generate_user_id(role)

        # Create user with User ID as username
        user = User.objects.create_user(
            username=system_user_id,
            email=email,
            password=initial_pwd,
            first_name=first_name,
            last_name=last_name
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.system_user_id = system_user_id
        profile.role = role
        profile.phone = phone
        profile.address = address
        profile.assigned_zone = normalized_ward
        profile.department_name = department_name if role == UserRole.EMPLOYEE else ''
        profile.must_change_password = must_change
        profile.save()

        return Response({
            'message': 'Account registered successfully!',
            'user_id': system_user_id,
            'username': system_user_id,
            'initial_password': initial_pwd,
            'role': role,
            'ward': normalized_ward,
            'department_name': profile.department_name,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

class WardAvailabilityAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        role = request.query_params.get('role', 'CITIZEN').strip().upper()
        exclude_id = request.query_params.get('exclude_user_id')
        if exclude_id:
            try:
                exclude_id = int(exclude_id)
            except ValueError:
                exclude_id = None

        results = []
        for i in range(1, 11):
            ward_name = f'Ward {i}'
            is_available, err = validate_role_ward_uniqueness(role, ward_name, exclude_user_id=exclude_id)

            occupied_by = None
            if not is_available:
                roles_to_check = [role]
                if role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
                    roles_to_check = [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]
                q = UserProfile.objects.filter(role__in=roles_to_check, assigned_zone__iexact=ward_name)
                if exclude_id:
                    q = q.exclude(user__id=exclude_id)
                occupant = q.first()
                if occupant:
                    occupied_by = occupant.system_user_id or occupant.user.username

            results.append({
                'ward_number': i,
                'ward_name': ward_name,
                'is_available': is_available,
                'occupied_by': occupied_by,
                'role': role
            })

        return Response({
            'role': role,
            'wards': results
        })

class UserPasswordResetAPIView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request, pk=None):
        try:
            target_user = User.objects.select_related('profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_password = generate_secure_password(10)
        target_user.set_password(new_password)
        target_user.save()

        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        profile.must_change_password = True
        profile.save()

        return Response({
            'message': f'Password for @{target_user.username} has been securely reset.',
            'temporary_password': new_password,
            'user_id': profile.system_user_id or target_user.username,
            'username': target_user.username
        })

class UserManagementAPIView(views.APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
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
                Q(profile__system_user_id__icontains=search) |
                Q(profile__department_name__icontains=search) |
                Q(profile__assigned_zone__icontains=search)
            )

        return Response(UserSerializer(queryset, many=True).data)

    def post(self, request):
        data = request.data
        role = data.get('role', 'CITIZEN').strip().upper()
        valid_roles = [r.value for r in UserRole]
        if role not in valid_roles:
            return Response({'error': f'Invalid role: {role}.'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        address = data.get('address', '').strip()
        department_name = data.get('department_name', '').strip()
        raw_ward = data.get('ward') or data.get('assigned_zone') or ''

        normalized_ward = normalize_ward_name(raw_ward) if raw_ward else ('City-wide' if role == UserRole.ADMIN else '')

        # Check ward uniqueness
        if role != UserRole.ADMIN and normalized_ward and normalized_ward.lower() not in ['city-wide', 'all', 'all wards']:
            is_available, err = validate_role_ward_uniqueness(role, normalized_ward)
            if not is_available:
                return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        # Generate system user ID
        system_user_id = generate_user_id(role)
        temp_pwd = data.get('password', '').strip() or generate_secure_password(10)

        user = User.objects.create_user(
            username=system_user_id,
            email=email,
            password=temp_pwd,
            first_name=first_name,
            last_name=last_name
        )
        if role == UserRole.ADMIN:
            user.is_staff = True
            user.is_superuser = True
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.system_user_id = system_user_id
        profile.role = role
        profile.phone = phone
        profile.address = address
        profile.assigned_zone = normalized_ward
        profile.department_name = department_name if role == UserRole.EMPLOYEE else ''
        profile.must_change_password = True
        profile.save()

        return Response({
            'message': f'User {system_user_id} provisioned successfully.',
            'user_id': system_user_id,
            'username': system_user_id,
            'initial_password': temp_pwd,
            'role': role,
            'ward': normalized_ward,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, pk=None):
        if not pk:
            return Response({'error': 'User ID required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_user = User.objects.select_related('profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        data = request.data

        # Determine target role & ward for uniqueness validation
        target_role = data.get('role', profile.role)
        raw_ward = data.get('assigned_zone') or data.get('ward')
        target_ward = normalize_ward_name(raw_ward) if raw_ward is not None else profile.assigned_zone

        if target_role != UserRole.ADMIN and target_ward and target_ward.lower() not in ['city-wide', 'all', 'all wards']:
            is_available, err = validate_role_ward_uniqueness(target_role, target_ward, exclude_user_id=target_user.id)
            if not is_available:
                return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

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
        if raw_ward is not None:
            profile.assigned_zone = target_ward

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
