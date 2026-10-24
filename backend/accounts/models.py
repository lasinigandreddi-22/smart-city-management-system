from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin / Commissioner'
    AREA_HEAD = 'AREA_HEAD', 'Area Head'
    EMPLOYEE = 'EMPLOYEE', 'Employee'
    CITIZEN = 'CITIZEN', 'Citizen'
    # Legacy aliases for database compatibility
    SERVICE_DEPARTMENT = 'SERVICE_DEPARTMENT', 'Employee (Legacy Staff)'
    TRAFFIC_OFFICER = 'TRAFFIC_OFFICER', 'Employee (Legacy Traffic)'

CITY_WARDS = [f'Ward {i}' for i in range(1, 7)]

class Ward(models.Model):
    name = models.CharField(max_length=50, unique=True)
    ward_number = models.IntegerField(unique=True)
    description = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['ward_number']

    def __str__(self):
        return self.name

def get_user_authorized_wards(user):
    """
    Returns the list of standardized ward strings (e.g. ['Ward 1']) authorized for the user.
    Admin, staff, or superuser have access to all configured wards.
    Area Heads and Employees must have an explicit assigned_zone; otherwise an empty list is returned.
    """
    if not user or not user.is_authenticated:
        return []
    
    role = getattr(user.profile, 'role', UserRole.CITIZEN)
    if role == UserRole.ADMIN or user.is_superuser or user.is_staff:
        return list(CITY_WARDS)

    zone = getattr(user.profile, 'assigned_zone', '').strip()
    if not zone:
        return []
    if zone.lower() in ['all', 'all wards', 'city-wide']:
        return list(CITY_WARDS)

    raw_tokens = [w.strip() for w in zone.replace(';', ',').split(',') if w.strip()]
    matched = []
    for token in raw_tokens:
        token_clean = token.lower()
        for cw in CITY_WARDS:
            cw_clean = cw.lower()
            if cw_clean == token_clean or cw_clean in token_clean or token_clean in cw_clean:
                if cw not in matched:
                    matched.append(cw)
    return matched if matched else raw_tokens

def generate_user_id(role):
    """
    Generates a globally unique system User ID with role-based prefix:
    CIT-1001, EMP-1001, AH-1001, ADM-1001.
    """
    prefix_map = {
        UserRole.CITIZEN: 'CIT',
        UserRole.EMPLOYEE: 'EMP',
        UserRole.SERVICE_DEPARTMENT: 'EMP',
        UserRole.TRAFFIC_OFFICER: 'EMP',
        UserRole.AREA_HEAD: 'AH',
        UserRole.ADMIN: 'ADM',
    }
    prefix = prefix_map.get(role, 'USR')

    profiles = UserProfile.objects.filter(system_user_id__startswith=f"{prefix}-")
    max_num = 1000
    for p in profiles:
        if p.system_user_id:
            try:
                num = int(p.system_user_id.split('-')[-1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass

    next_id = f"{prefix}-{max_num + 1}"
    while UserProfile.objects.filter(system_user_id=next_id).exists() or User.objects.filter(username=next_id).exists():
        max_num += 1
        next_id = f"{prefix}-{max_num + 1}"
    return next_id

def normalize_ward_name(ward):
    """
    Standardizes input like '1', 'ward 1', 'Ward 1' to canonical 'Ward 1'.
    """
    if not ward:
        return ''
    w = str(ward).strip()
    if w.isdigit():
        return f"Ward {w}"
    for cw in CITY_WARDS:
        if cw.lower() == w.lower():
            return cw
    return w

def validate_role_ward_uniqueness(role, ward, department=None, exclude_user_id=None):
    """
    Ward Uniqueness Rules:
    - Citizen: 1 Citizen per ward.
    - Area Head: 1 Area Head per ward.
    - Employee: Uniqueness by (ward, department) assignment, allowing different departments
      to operate in the same ward without conflict.
    Returns (is_available, error_message).
    """
    if not ward or str(ward).strip().lower() in ['', 'city-wide', 'all', 'all wards']:
        return True, None

    normalized_ward = normalize_ward_name(ward)

    if role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
        roles_to_check = [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]
        dept_norm = (department or '').strip()
        query = UserProfile.objects.filter(
            role__in=roles_to_check,
            assigned_zone__iexact=normalized_ward
        )
        if dept_norm:
            # Check within the same department
            query = query.filter(department_name__iexact=dept_norm)
        if exclude_user_id:
            query = query.exclude(user__id=exclude_user_id)

        if query.exists():
            occupied_by = query.first().user
            dept_label = f" ({dept_norm})" if dept_norm else ""
            return False, f"This ward is already assigned to another user with your role{dept_label}. Please select another ward."
        return True, None

    elif role == UserRole.AREA_HEAD:
        query = UserProfile.objects.filter(
            role=UserRole.AREA_HEAD,
            assigned_zone__iexact=normalized_ward
        )
        if exclude_user_id:
            query = query.exclude(user__id=exclude_user_id)

        if query.exists():
            return False, "This ward is already assigned to another user with your role. Please select another ward."
        return True, None

    elif role == UserRole.CITIZEN:
        query = UserProfile.objects.filter(
            role=UserRole.CITIZEN,
            assigned_zone__iexact=normalized_ward
        )
        if exclude_user_id:
            query = query.exclude(user__id=exclude_user_id)

        if query.exists():
            return False, "This ward is already assigned to another user with your role. Please select another ward."
        return True, None

    return True, None

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    system_user_id = models.CharField(max_length=30, unique=True, null=True, blank=True)
    role = models.CharField(max_length=30, choices=UserRole.choices, default=UserRole.CITIZEN)
    phone = models.CharField(max_length=20, blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')
    department_name = models.CharField(max_length=100, blank=True, default='')
    assigned_zone = models.CharField(max_length=100, blank=True, default='')
    must_change_password = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        uid = f"[{self.system_user_id}] " if self.system_user_id else ""
        return f"{uid}{self.user.username} ({self.get_role_display()})"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    category = models.CharField(max_length=50, default='General') # Utility, Complaint, Traffic, PropertyTax, General
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"

@receiver(post_save, sender=User)
def create_or_save_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
