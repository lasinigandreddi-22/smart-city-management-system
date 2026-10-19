from django.db import models
from django.contrib.auth.models import User

class IncidentSeverity(models.TextChoices):
    LOW = 'Low', 'Low'
    MEDIUM = 'Medium', 'Medium'
    HIGH = 'High', 'High'
    CRITICAL = 'Critical', 'Critical'

class IncidentStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    INVESTIGATING = 'Investigating', 'Investigating'
    CLEARING = 'Clearing', 'Clearing'
    RESOLVED = 'Resolved', 'Resolved'

class IncidentType(models.TextChoices):
    ROAD_CLOSURE = 'Road Closure', 'Road Closure'
    CONGESTION = 'Heavy Congestion', 'Heavy Congestion'
    ACCIDENT = 'Accident', 'Accident'
    ROADWORK = 'Roadwork / Construction', 'Roadwork / Construction'
    SIGNAL_FAILURE = 'Traffic Signal Failure', 'Traffic Signal Failure'
    HAZARD = 'Road Hazard / Waterlogging', 'Road Hazard / Waterlogging'

class TrafficIncident(models.Model):
    title = models.CharField(max_length=200)
    incident_type = models.CharField(max_length=100, choices=IncidentType.choices, default=IncidentType.CONGESTION)
    location = models.CharField(max_length=255) # Road, Landmark, Intersection
    severity = models.CharField(max_length=20, choices=IncidentSeverity.choices, default=IncidentSeverity.MEDIUM)
    status = models.CharField(max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.ACTIVE)
    description = models.TextField()
    is_public_alert = models.BooleanField(default=True)
    estimated_clearance = models.CharField(max_length=100, blank=True, default='')
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_incidents')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title} at {self.location} ({self.status})"

class TrafficCitizenReport(models.Model):
    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='citizen_traffic_reports')
    title = models.CharField(max_length=200)
    incident_type = models.CharField(max_length=100, choices=IncidentType.choices)
    location = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=30, default='Submitted') # Submitted, Verified, Resolved
    officer_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Citizen Report: {self.title} by {self.citizen.username}"
