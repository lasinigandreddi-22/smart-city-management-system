from rest_framework import serializers
from .models import TrafficIncident, TrafficCitizenReport

class TrafficIncidentSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TrafficIncident
        fields = [
            'id', 'title', 'incident_type', 'location', 'severity', 'status',
            'description', 'is_public_alert', 'estimated_clearance',
            'reported_by', 'reported_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reported_by', 'created_at', 'updated_at']

    def get_reported_by_name(self, obj):
        if obj.reported_by:
            return obj.reported_by.get_full_name() or obj.reported_by.username
        return 'Control Room'

class TrafficCitizenReportSerializer(serializers.ModelSerializer):
    citizen_name = serializers.SerializerMethodField()

    class Meta:
        model = TrafficCitizenReport
        fields = [
            'id', 'citizen', 'citizen_name', 'title', 'incident_type',
            'location', 'description', 'status', 'officer_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'citizen', 'created_at', 'updated_at']

    def get_citizen_name(self, obj):
        return obj.citizen.get_full_name() or obj.citizen.username
