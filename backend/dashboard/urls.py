from django.urls import path
from .views import (
    CitizenDashboardAPIView, AdminDashboardAPIView,
    DepartmentDashboardAPIView, TrafficOfficerDashboardAPIView,
    AreaHeadDashboardAPIView
)

urlpatterns = [
    path('citizen/', CitizenDashboardAPIView.as_view(), name='dashboard-citizen'),
    path('admin/', AdminDashboardAPIView.as_view(), name='dashboard-admin'),
    path('department/', DepartmentDashboardAPIView.as_view(), name='dashboard-department'),
    path('traffic/', TrafficOfficerDashboardAPIView.as_view(), name='dashboard-traffic'),
    path('area-head/', AreaHeadDashboardAPIView.as_view(), name='dashboard-area-head'),
]

