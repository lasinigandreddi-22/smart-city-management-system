from rest_framework import permissions
from .models import UserRole

class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or 
            request.user.is_staff or 
            getattr(request.user.profile, 'role', None) == UserRole.ADMIN
        )

class IsCitizenUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user.profile, 'role', None) == UserRole.CITIZEN

class IsDepartmentUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            getattr(request.user.profile, 'role', None) in [UserRole.SERVICE_DEPARTMENT, UserRole.ADMIN] or
            request.user.is_staff
        )

class IsTrafficOfficerUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            getattr(request.user.profile, 'role', None) in [UserRole.TRAFFIC_OFFICER, UserRole.ADMIN] or
            request.user.is_staff
        )
