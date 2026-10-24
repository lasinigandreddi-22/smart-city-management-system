from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'City Admin / Commissioner'
    AREA_HEAD = 'AREA_HEAD', 'Area Head / Department Head'
    EMPLOYEE = 'EMPLOYEE', 'Employee'
    SERVICE_DEPARTMENT = 'SERVICE_DEPARTMENT', 'Department Staff (Legacy)'
    CITIZEN = 'CITIZEN', 'Citizen'
    TRAFFIC_OFFICER = 'TRAFFIC_OFFICER', 'Traffic Officer (Legacy Staff)'

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
