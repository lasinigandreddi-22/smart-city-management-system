from django.urls import path
from .views import (
    LoginAPIView, LogoutAPIView, CurrentUserAPIView, 
    CitizenListAPIView, NotificationListAPIView, NotificationMarkReadAPIView
)

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='api-login'),
    path('logout/', LogoutAPIView.as_view(), name='api-logout'),
    path('me/', CurrentUserAPIView.as_view(), name='api-me'),
    path('citizens/', CitizenListAPIView.as_view(), name='api-citizens'),
    path('notifications/', NotificationListAPIView.as_view(), name='api-notifications'),
    path('notifications/read/', NotificationMarkReadAPIView.as_view(), name='api-notifications-read-all'),
    path('notifications/<int:pk>/read/', NotificationMarkReadAPIView.as_view(), name='api-notifications-read'),
]
