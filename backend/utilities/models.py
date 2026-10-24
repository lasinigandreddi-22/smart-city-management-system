from django.db import models
from django.contrib.auth.models import User

class NoticeStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    SCHEDULED = 'Scheduled', 'Scheduled'
    RESOLVED = 'Resolved', 'Resolved'
    CANCELLED = 'Cancelled', 'Cancelled'


class ServiceRequestStatus(models.TextChoices):
    SUBMITTED = 'Submitted', 'Submitted'
    IN_PROGRESS = 'In Progress', 'In Progress'
    RESOLVED = 'Resolved', 'Resolved'
    CLOSED = 'Closed', 'Closed'

class WaterNotice(models.Model):
    title = models.CharField(max_length=200)
    notice_type = models.CharField(max_length=100) # Scheduled Maintenance, Pipeline Repair, Emergency Shutdown, Water Quality Alert
    description = models.TextField()
    affected_area = models.CharField(max_length=200)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=NoticeStatus.choices, default=NoticeStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[Water] {self.title} - {self.affected_area}"

class WaterServiceRequest(models.Model):
    REQUEST_TYPES = [
        ('Water Leakage', 'Water Leakage'),
        ('Supply Interruption', 'Supply Interruption'),
        ('Low Water Pressure', 'Low Water Pressure'),
        ('Meter Defect', 'Meter Defect'),
        ('Pipeline Damage', 'Pipeline Damage'),
        ('Water Contamination', 'Water Contamination'),
    ]

    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='water_requests')
    request_type = models.CharField(max_length=100, choices=REQUEST_TYPES)
    location = models.CharField(max_length=255)
    description = models.TextField()
    meter_number = models.CharField(max_length=50, blank=True, default='')
    status = models.CharField(max_length=30, choices=ServiceRequestStatus.choices, default=ServiceRequestStatus.SUBMITTED)
    admin_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Water Req #{self.id} ({self.request_type}) - {self.citizen.username}"

class ElectricityNotice(models.Model):
    title = models.CharField(max_length=200)
    notice_type = models.CharField(max_length=100) # Scheduled Maintenance, Grid Maintenance, Transformer Upgrade, Emergency Outage
    description = models.TextField()
    affected_area = models.CharField(max_length=200)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=NoticeStatus.choices, default=NoticeStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[Electricity] {self.title} - {self.affected_area}"

class ElectricityServiceRequest(models.Model):
    REQUEST_TYPES = [
        ('Power Outage', 'Power Outage'),
        ('Streetlight Issue', 'Streetlight Issue'),
        ('Electrical Fault', 'Electrical Fault'),
        ('Transformer Breakdown', 'Transformer Breakdown'),
        ('Voltage Fluctuation', 'Voltage Fluctuation'),
        ('Meter Replacement', 'Meter Replacement'),
    ]

    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='electricity_requests')
    request_type = models.CharField(max_length=100, choices=REQUEST_TYPES)
    location = models.CharField(max_length=255)
    description = models.TextField()
    consumer_number = models.CharField(max_length=50, blank=True, default='')
    status = models.CharField(max_length=30, choices=ServiceRequestStatus.choices, default=ServiceRequestStatus.SUBMITTED)
    admin_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Electricity Req #{self.id} ({self.request_type}) - {self.citizen.username}"

class NoticeCategory(models.TextChoices):
    WATER = 'Water Pipeline', 'Water Pipeline Notices'
    POWER = 'Power Grid', 'Power Grid Notices'
    TRAFFIC = 'Road and Traffic', 'Road and Traffic Notices'
    SANITATION = 'Road and Sanitation', 'Road and Sanitation Notices'

class NoticeAudience(models.TextChoices):
    ALL = 'All', 'Citizens & Employees'
    CITIZENS = 'Citizens', 'Citizens Only'
    EMPLOYEES = 'Employees', 'Department Employees Only'

class CivicNotice(models.Model):
    category = models.CharField(max_length=50, choices=NoticeCategory.choices, default=NoticeCategory.WATER)
    title = models.CharField(max_length=200)
    notice_type = models.CharField(max_length=100, default='Scheduled Maintenance')
    description = models.TextField()
    affected_area = models.CharField(max_length=200)
    target_ward = models.CharField(max_length=50, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    audience = models.CharField(max_length=50, choices=NoticeAudience.choices, default=NoticeAudience.ALL)
    status = models.CharField(max_length=20, choices=NoticeStatus.choices, default=NoticeStatus.ACTIVE)
    published_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='published_civic_notices')
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        ward_info = f" [{self.target_ward}]" if self.target_ward else ""
        return f"[{self.category}]{ward_info} {self.title}"
