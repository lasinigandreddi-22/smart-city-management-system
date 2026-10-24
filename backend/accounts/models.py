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

CITY_WARDS = [f'Ward {i}' for i in range(1, 11)]

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
    Admin, staff, superuser, or users with 'All Wards' / 'City-wide' have access to all 10 wards.
    """
    if not user or not user.is_authenticated:
        return []
    
    role = getattr(user.profile, 'role', UserRole.CITIZEN)
    if role == UserRole.ADMIN or user.is_superuser or user.is_staff:
        return list(CITY_WARDS)

    zone = getattr(user.profile, 'assigned_zone', '').strip()
    if not zone or zone.lower() in ['all', 'all wards', 'city-wide']:
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

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=30, choices=UserRole.choices, default=UserRole.CITIZEN)
    phone = models.CharField(max_length=20, blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')
    department_name = models.CharField(max_length=100, blank=True, default='')
    assigned_zone = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


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
