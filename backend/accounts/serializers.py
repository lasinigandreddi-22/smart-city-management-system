from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Notification

class UserProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(source='system_user_id', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['user_id', 'system_user_id', 'role', 'phone', 'address', 'department_name', 'assigned_zone', 'must_change_password', 'created_at']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    user_id = serializers.CharField(source='profile.system_user_id', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'user_id', 'email', 'first_name', 'last_name', 'date_joined', 'profile']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'category', 'is_read', 'created_at']
