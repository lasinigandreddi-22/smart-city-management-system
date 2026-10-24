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

class IsAreaHeadUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            getattr(request.user.profile, 'role', None) in [UserRole.AREA_HEAD, UserRole.ADMIN] or
            request.user.is_staff or request.user.is_superuser
        )

class IsDepartmentUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            getattr(request.user.profile, 'role', None) in [
                UserRole.EMPLOYEE,
                UserRole.SERVICE_DEPARTMENT,
                UserRole.TRAFFIC_OFFICER,
                UserRole.AREA_HEAD,
                UserRole.ADMIN
            ] or
            request.user.is_staff or request.user.is_superuser
        )

# Unified Employee Role permission alias
IsEmployeeUserRole = IsDepartmentUserRole

class IsTrafficOfficerUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user.profile, 'role', None)
        dept = getattr(request.user.profile, 'department_name', '').lower()
        return (
            role in [UserRole.TRAFFIC_OFFICER, UserRole.ADMIN, UserRole.AREA_HEAD] or
            (role in [UserRole.EMPLOYEE, UserRole.SERVICE_DEPARTMENT] and 'traffic' in dept) or
            request.user.is_staff or request.user.is_superuser
        )
