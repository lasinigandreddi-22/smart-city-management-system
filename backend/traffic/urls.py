from django.urls import path
from .views import (
    TrafficIncidentListCreateAPIView, TrafficIncidentDetailAPIView,
    TrafficCitizenReportListCreateAPIView, TrafficCitizenReportDetailAPIView
)

urlpatterns = [
    path('incidents/', TrafficIncidentListCreateAPIView.as_view(), name='traffic-incidents'),
    path('incidents/<int:pk>/', TrafficIncidentDetailAPIView.as_view(), name='traffic-incident-detail'),
    path('reports/', TrafficCitizenReportListCreateAPIView.as_view(), name='traffic-reports'),
    path('reports/<int:pk>/', TrafficCitizenReportDetailAPIView.as_view(), name='traffic-report-detail'),
]
