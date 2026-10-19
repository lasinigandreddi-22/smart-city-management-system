from rest_framework import serializers
from django.contrib.auth.models import User
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
    history = ComplaintStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_ref', 'citizen', 'citizen_name', 'citizen_email', 'citizen_phone',
            'title', 'category', 'description', 'location', 'priority', 'status',
            'assigned_department', 'assigned_to', 'resolution_details',
            'history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'complaint_ref', 'citizen', 'created_at', 'updated_at']

    def get_citizen_name(self, obj):
        return obj.citizen.get_full_name() or obj.citizen.username

    def get_citizen_email(self, obj):
        return obj.citizen.email

    def get_citizen_phone(self, obj):
        if hasattr(obj.citizen, 'profile'):
            return obj.citizen.profile.phone
        return ''

class ComplaintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['title', 'category', 'description', 'location', 'priority']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Complaint title is required.")
        return value.strip()

    def validate_description(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Please provide a detailed description (at least 10 characters).")
        return value.strip()
