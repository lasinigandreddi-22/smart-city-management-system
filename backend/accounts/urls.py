from django.urls import path
from .views import (
     LoginAPIView, LogoutAPIView, CurrentUserAPIView, 
     CitizenListAPIView, NotificationListAPIView, NotificationMarkReadAPIView,
     StaffListAPIView, UserManagementAPIView, WardListAPIView
)

urlpatterns = [
     path('login/', LoginAPIView.as_view(), name='api-login'),
     path('logout/', LogoutAPIView.as_view(), name='api-logout'),
     path('me/', CurrentUserAPIView.as_view(), name='api-me'),
     path('profile/', CurrentUserAPIView.as_view(), name='api-profile'),
     path('wards/', WardListAPIView.as_view(), name='api-wards'),
     path('citizens/', CitizenListAPIView.as_view(), name='api-citizens'),
     path('staff/', StaffListAPIView.as_view(), name='api-staff'),
     path('users/', UserManagementAPIView.as_view(), name='api-users'),
     path('users/<int:pk>/', UserManagementAPIView.as_view(), name='api-user-detail'),
     path('notifications/', NotificationListAPIView.as_view(), name='api-notifications'),
     path('notifications/read/', NotificationMarkReadAPIView.as_view(), name='api-notifications-read-all'),
     path('notifications/<int:pk>/read/', NotificationMarkReadAPIView.as_view(), name='api-notifications-read'),
]


