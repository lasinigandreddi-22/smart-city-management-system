from django.urls import path
from .views import (
    WaterNoticeListCreateAPIView, WaterNoticeDetailAPIView,
    WaterServiceRequestListCreateAPIView, WaterServiceRequestDetailAPIView,
    ElectricityNoticeListCreateAPIView, ElectricityNoticeDetailAPIView,
    ElectricityServiceRequestListCreateAPIView, ElectricityServiceRequestDetailAPIView
)

urlpatterns = [
    # Water Management
    path('water/notices/', WaterNoticeListCreateAPIView.as_view(), name='water-notices'),
    path('water/notices/<int:pk>/', WaterNoticeDetailAPIView.as_view(), name='water-notice-detail'),
    path('water/requests/', WaterServiceRequestListCreateAPIView.as_view(), name='water-requests'),
    path('water/requests/<int:pk>/', WaterServiceRequestDetailAPIView.as_view(), name='water-request-detail'),

    # Electricity Management
    path('electricity/notices/', ElectricityNoticeListCreateAPIView.as_view(), name='electricity-notices'),
    path('electricity/notices/<int:pk>/', ElectricityNoticeDetailAPIView.as_view(), name='electricity-notice-detail'),
    path('electricity/requests/', ElectricityServiceRequestListCreateAPIView.as_view(), name='electricity-requests'),
    path('electricity/requests/<int:pk>/', ElectricityServiceRequestDetailAPIView.as_view(), name='electricity-request-detail'),
]
