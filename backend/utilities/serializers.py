from rest_framework import serializers
from .models import WaterNotice, WaterServiceRequest, ElectricityNotice, ElectricityServiceRequest

class WaterNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterNotice
        fields = '__all__'

class WaterServiceRequestSerializer(serializers.ModelSerializer):
    citizen_name = serializers.SerializerMethodField()

    class Meta:
        model = WaterServiceRequest
        fields = ['id', 'citizen', 'citizen_name', 'request_type', 'location', 'description', 'meter_number', 'status', 'admin_notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'citizen', 'created_at', 'updated_at']

    def get_citizen_name(self, obj):
        return obj.citizen.get_full_name() or obj.citizen.username

class ElectricityNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ElectricityNotice
        fields = '__all__'

class ElectricityServiceRequestSerializer(serializers.ModelSerializer):
    citizen_name = serializers.SerializerMethodField()

    class Meta:
        model = ElectricityServiceRequest
        fields = ['id', 'citizen', 'citizen_name', 'request_type', 'location', 'description', 'consumer_number', 'status', 'admin_notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'citizen', 'created_at', 'updated_at']

    def get_citizen_name(self, obj):
        return obj.citizen.get_full_name() or obj.citizen.username
