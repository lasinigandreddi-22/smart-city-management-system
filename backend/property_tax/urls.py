from django.urls import path
from .views import (
    PropertyListCreateAPIView, PropertyDetailAPIView,
    PropertyTaxRecordListCreateAPIView, PropertyTaxRecordDetailAPIView,
    ProcessSimulatedPaymentAPIView, PaymentRecordListView
)

urlpatterns = [
    path('properties/', PropertyListCreateAPIView.as_view(), name='property-list-create'),
    path('properties/<int:pk>/', PropertyDetailAPIView.as_view(), name='property-detail'),
    path('tax-records/', PropertyTaxRecordListCreateAPIView.as_view(), name='tax-record-list-create'),
    path('tax-records/<int:pk>/', PropertyTaxRecordDetailAPIView.as_view(), name='tax-record-detail'),
    path('pay/', ProcessSimulatedPaymentAPIView.as_view(), name='process-payment'),
    path('payments/', PaymentRecordListView.as_view(), name='payment-list'),
]
