import uuid
from django.db import models
from django.contrib.auth.models import User

class ComplaintStatus(models.TextChoices):
    SUBMITTED = 'Submitted', 'Submitted'
    ASSIGNED = 'Assigned', 'Assigned'
    IN_PROGRESS = 'In Progress', 'In Progress'
    RESOLVED = 'Resolved', 'Resolved'
    CLOSED = 'Closed', 'Closed'

class ComplaintPriority(models.TextChoices):
    LOW = 'Low', 'Low'
    MEDIUM = 'Medium', 'Medium'
    HIGH = 'High', 'High'
    URGENT = 'Urgent', 'Urgent'

class ComplaintCategory(models.TextChoices):
    WATER_SUPPLY = 'Water Supply', 'Water Supply'
    ELECTRICITY = 'Electricity', 'Electricity'
    ROADS_TRAFFIC = 'Roads & Traffic', 'Roads & Traffic'
    SANITATION = 'Sanitation', 'Sanitation'
    DRAINAGE = 'Drainage', 'Drainage'
    PUBLIC_SAFETY = 'Public Safety', 'Public Safety'
    OTHER = 'Other', 'Other'

class Complaint(models.Model):
    complaint_ref = models.CharField(max_length=30, unique=True, editable=False)
    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=ComplaintCategory.choices, default=ComplaintCategory.OTHER)
    description = models.TextField()
    location = models.CharField(max_length=255)
    priority = models.CharField(max_length=20, choices=ComplaintPriority.choices, default=ComplaintPriority.MEDIUM)
    status = models.CharField(max_length=30, choices=ComplaintStatus.choices, default=ComplaintStatus.SUBMITTED)
    assigned_department = models.CharField(max_length=100, blank=True, default='')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_complaints')
    resolution_details = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.complaint_ref:
            short_id = uuid.uuid4().hex[:6].upper()
            self.complaint_ref = f"CMP-2026-{short_id}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.complaint_ref}: {self.title} ({self.status})"

class ComplaintStatusHistory(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.complaint.complaint_ref}: {self.previous_status} -> {self.new_status}"
