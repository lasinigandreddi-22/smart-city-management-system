import uuid
from django.db import models
from django.contrib.auth.models import User

class ComplaintStatus(models.TextChoices):
    SUBMITTED = 'Submitted', 'Submitted'
    UNDER_REVIEW = 'Under Review', 'Under Review'
    ASSIGNED = 'Assigned', 'Assigned'
    IN_PROGRESS = 'In Progress', 'In Progress'
    PENDING_VERIFICATION = 'Pending Verification', 'Pending Verification'
    RESOLVED = 'Resolved', 'Resolved'
    CLOSED = 'Closed', 'Closed'
    NEEDS_CLARIFICATION = 'Needs Clarification', 'Needs Clarification'

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

from django.utils import timezone

def format_timedelta(td):
    if not td:
        return ""
    total_seconds = int(td.total_seconds())
    if total_seconds < 0:
        total_seconds = abs(total_seconds)
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    
    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days > 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hr{'s' if hours > 1 else ''}")
    if not parts or (days == 0 and hours == 0):
        parts.append(f"{max(1, minutes)} min{'s' if minutes > 1 else ''}")
    return " ".join(parts[:2])

class Complaint(models.Model):
    complaint_ref = models.CharField(max_length=30, unique=True, editable=False)
    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=ComplaintCategory.choices, default=ComplaintCategory.OTHER)
    description = models.TextField()
    location = models.CharField(max_length=255)
    ward = models.CharField(max_length=100, blank=True, default='Ward 1')
    priority = models.CharField(max_length=20, choices=ComplaintPriority.choices, default=ComplaintPriority.MEDIUM)
    priority_reason = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=30, choices=ComplaintStatus.choices, default=ComplaintStatus.SUBMITTED)
    
    # Area Head review & confirmation
    is_confirmed = models.BooleanField(default=False)
    confirmed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='confirmed_complaints')
    confirmed_at = models.DateTimeField(null=True, blank=True)

    # Department & staff assignment
    assigned_department = models.CharField(max_length=100, blank=True, default='')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_complaints')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_out_complaints')
    assigned_at = models.DateTimeField(null=True, blank=True)

    # Deadlines & SLAs
    deadline = models.DateTimeField(null=True, blank=True)

    # Employee completion submission
    completion_remarks = models.TextField(blank=True, default='')
    completion_submitted_at = models.DateTimeField(null=True, blank=True)
    completion_submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_completions')

    # Area Head verification / acknowledgement
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_complaints')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    return_reason = models.TextField(blank=True, default='')

    resolution_details = models.TextField(blank=True, default='')
    supports = models.ManyToManyField(User, related_name='supported_complaints', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def support_count(self):
        return self.supports.count()

    def _get_aware_deadline(self):
        if not self.deadline:
            return None
        dt = self.deadline
        if isinstance(dt, str):
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(dt)
        if dt and timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        return dt

    @property
    def is_overdue(self):
        if self.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            dt = self._get_aware_deadline()
            if dt:
                return timezone.now() > dt
        return False

    @property
    def expected_duration(self):
        dt = self._get_aware_deadline()
        if dt and self.created_at:
            created = self.created_at
            if timezone.is_naive(created):
                created = timezone.make_aware(created)
            diff = dt - created
            if diff.total_seconds() > 0:
                return f"Within {format_timedelta(diff)}"
        
        # Standard default SLA by category
        slas = {
            'Roads & Traffic': 'Within 3 days (Standard SLA)',
            'Water Supply': 'Within 2 days (Standard SLA)',
            'Electricity': 'Within 24 hours (Standard SLA)',
            'Sanitation': 'Within 2 days (Standard SLA)',
            'Property Tax': 'Within 5 days (Standard SLA)',
            'Drainage': 'Within 3 days (Standard SLA)',
            'Public Safety': 'Within 24 hours (Urgent SLA)',
        }
        return slas.get(self.category, 'Within 3 days (Standard SLA)')

    @property
    def elapsed_duration(self):
        if not self.created_at:
            return ""
        created = self.created_at
        if timezone.is_naive(created):
            created = timezone.make_aware(created)
        return format_timedelta(timezone.now() - created)

    @property
    def remaining_time(self):
        if self.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            return None
        dt = self._get_aware_deadline()
        if dt:
            now = timezone.now()
            if now < dt:
                return f"{format_timedelta(dt - now)} remaining"
            else:
                return "Overdue"
        return "Review in progress"

    @property
    def overdue_duration(self):
        if self.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            return None
        dt = self._get_aware_deadline()
        if dt:
            now = timezone.now()
            if now > dt:
                return f"Overdue by {format_timedelta(now - dt)}"
        return None

    @property
    def actual_duration(self):
        if self.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            end_dt = self.resolved_at or self.acknowledged_at or self.updated_at
            if end_dt and self.created_at:
                if timezone.is_naive(end_dt):
                    end_dt = timezone.make_aware(end_dt)
                created = self.created_at
                if timezone.is_naive(created):
                    created = timezone.make_aware(created)
                return format_timedelta(end_dt - created)
        return None

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
