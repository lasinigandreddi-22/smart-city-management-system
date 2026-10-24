from rest_framework import serializers
from django.contrib.auth.models import User
from accounts.models import UserRole
from .models import Complaint, ComplaintStatusHistory

class ComplaintStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintStatusHistory
        fields = ['id', 'previous_status', 'new_status', 'notes', 'changed_by_name', 'created_at']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return 'System'

class ComplaintSerializer(serializers.ModelSerializer):
    citizen_name = serializers.SerializerMethodField()
    citizen_email = serializers.SerializerMethodField()
    citizen_phone = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    confirmed_by_name = serializers.SerializerMethodField()
    completion_submitted_by_name = serializers.SerializerMethodField()
    acknowledged_by_name = serializers.SerializerMethodField()
    support_count = serializers.IntegerField(read_only=True)
    is_supported_by_me = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    expected_duration = serializers.CharField(read_only=True)
    elapsed_duration = serializers.CharField(read_only=True)
    remaining_time = serializers.CharField(read_only=True)
    overdue_duration = serializers.CharField(read_only=True)
    actual_duration = serializers.CharField(read_only=True)
    history = ComplaintStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_ref', 'citizen', 'citizen_name', 'citizen_email', 'citizen_phone',
            'title', 'category', 'description', 'location', 'ward', 'priority', 'priority_reason',
            'status', 'is_confirmed', 'confirmed_by', 'confirmed_by_name', 'confirmed_at',
            'assigned_department', 'assigned_to', 'assigned_to_name', 'assigned_by', 'assigned_by_name', 'assigned_at',
            'deadline', 'expected_duration', 'elapsed_duration', 'remaining_time', 'overdue_duration', 'actual_duration',
            'completion_remarks', 'completion_submitted_at', 'completion_submitted_by', 'completion_submitted_by_name',
            'acknowledged_by', 'acknowledged_by_name', 'acknowledged_at', 'resolved_at', 'return_reason',
            'resolution_details', 'support_count', 'is_supported_by_me', 'is_overdue',
            'history', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'complaint_ref', 'citizen', 'created_at', 'updated_at', 'support_count', 
            'is_overdue', 'expected_duration', 'elapsed_duration', 'remaining_time', 'overdue_duration', 'actual_duration'
        ]

    def get_citizen_name(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
            if role in [UserRole.ADMIN, UserRole.AREA_HEAD, UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER] or request.user == obj.citizen:
                return obj.citizen.get_full_name() or obj.citizen.username
        return f"Resident ({obj.ward or 'Verified Citizen'})"

    def get_citizen_email(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
            if role in [UserRole.ADMIN, UserRole.AREA_HEAD, UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER] or request.user == obj.citizen:
                return obj.citizen.email
        return ''

    def get_citizen_phone(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
            if role in [UserRole.ADMIN, UserRole.AREA_HEAD, UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER] or request.user == obj.citizen:
                if hasattr(obj.citizen, 'profile'):
                    return obj.citizen.profile.phone
        return ''

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return ''

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.username
        return ''

    def get_confirmed_by_name(self, obj):
        if obj.confirmed_by:
            return obj.confirmed_by.get_full_name() or obj.confirmed_by.username
        return ''

    def get_completion_submitted_by_name(self, obj):
        if obj.completion_submitted_by:
            return obj.completion_submitted_by.get_full_name() or obj.completion_submitted_by.username
        return ''

    def get_acknowledged_by_name(self, obj):
        if obj.acknowledged_by:
            return obj.acknowledged_by.get_full_name() or obj.acknowledged_by.username
        return ''

    def get_is_supported_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.supports.filter(pk=request.user.pk).exists()
        return False

class ComplaintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['title', 'category', 'description', 'location', 'ward', 'priority']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Complaint title is required.")
        return value.strip()

    def validate_description(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Please provide a detailed description (at least 10 characters).")
        return value.strip()
