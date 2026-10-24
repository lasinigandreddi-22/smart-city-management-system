from django.urls import path
from .views import ComplaintListCreateAPIView, ComplaintDetailAPIView, ComplaintSupportAPIView

urlpatterns = [
    path('', ComplaintListCreateAPIView.as_view(), name='complaint-list-create'),
    path('<int:pk>/', ComplaintDetailAPIView.as_view(), name='complaint-detail'),
    path('<int:pk>/support/', ComplaintSupportAPIView.as_view(), name='complaint-support'),
]
