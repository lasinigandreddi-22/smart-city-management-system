from decimal import Decimal
from django.db import transaction
from rest_framework import status, views, permissions
from rest_framework.response import Response
from accounts.models import UserRole, Notification
from .models import Property, PropertyTaxRecord, PaymentRecord, TaxPaymentStatus
from .serializers import (
    PropertySerializer, PropertyTaxRecordSerializer,
    PaymentRecordSerializer, ProcessPaymentSerializer
)

class PropertyListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN:
            queryset = Property.objects.filter(owner=request.user)
        else:
            queryset = Property.objects.all().select_related('owner')
        serializer = PropertySerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN:
            return Response({'error': 'Only Admins can register new properties.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PropertySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PropertyDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        try:
            prop = Property.objects.select_related('owner').get(pk=pk)
        except Property.DoesNotExist:
            return Response({'error': 'Property not found.'}, status=status.HTTP_404_NOT_FOUND)

        if role == UserRole.CITIZEN and prop.owner != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(PropertySerializer(prop).data)

class PropertyTaxRecordListCreateAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN:
            queryset = PropertyTaxRecord.objects.filter(property__owner=request.user).select_related('property', 'property__owner')
        else:
            queryset = PropertyTaxRecord.objects.all().select_related('property', 'property__owner')
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(payment_status=status_filter)

        serializer = PropertyTaxRecordSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN:
            return Response({'error': 'Only Admins can create tax assessment bills.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = PropertyTaxRecordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PropertyTaxRecordDetailAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        try:
            tax_record = PropertyTaxRecord.objects.select_related('property', 'property__owner').prefetch_related('payments').get(pk=pk)
        except PropertyTaxRecord.DoesNotExist:
            return Response({'error': 'Tax record not found.'}, status=status.HTTP_404_NOT_FOUND)

        if role == UserRole.CITIZEN and tax_record.property.owner != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(PropertyTaxRecordSerializer(tax_record).data)

class ProcessSimulatedPaymentAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ProcessPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tax_record_id = serializer.validated_data['tax_record_id']
        amount = serializer.validated_data['amount']
        payment_mode = serializer.validated_data.get('payment_mode', 'Simulated UPI')
        payer_name = serializer.validated_data.get('payer_name') or request.user.get_full_name() or request.user.username

        try:
            tax_record = PropertyTaxRecord.objects.select_for_update().get(pk=tax_record_id)
        except PropertyTaxRecord.DoesNotExist:
            return Response({'error': 'Tax bill not found.'}, status=status.HTTP_404_NOT_FOUND)

        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN and tax_record.property.owner != request.user:
            return Response({'error': 'You can only pay for your own properties.'}, status=status.HTTP_403_FORBIDDEN)

        if tax_record.outstanding_balance <= Decimal('0.00'):
            return Response(
                {'error': 'This tax bill is already fully paid. Outstanding balance is ₹0.00.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if amount > tax_record.outstanding_balance:
            return Response(
                {'error': f'Payment amount (₹{amount}) cannot exceed outstanding balance of ₹{tax_record.outstanding_balance}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create simulated payment record
        payment = PaymentRecord.objects.create(
            tax_record=tax_record,
            amount=amount,
            payment_mode=payment_mode,
            payment_status='Success',
            payer_name=payer_name,
            notes='Demonstration payment processed in sandbox environment.'
        )

        # Update tax record balances consistently
        tax_record.amount_paid += amount
        tax_record.outstanding_balance = max(Decimal('0.00'), tax_record.annual_tax - tax_record.amount_paid)
        if tax_record.outstanding_balance == Decimal('0.00'):
            tax_record.payment_status = TaxPaymentStatus.PAID
        else:
            tax_record.payment_status = TaxPaymentStatus.PARTIALLY_PAID
        tax_record.save()

        # Send notification to property owner
        Notification.objects.create(
            user=tax_record.property.owner,
            title='Tax Payment Confirmed (Demonstration)',
            message=f'Received ₹{amount:.2f} via {payment_mode} for Property {tax_record.property.property_ref} (Txn: {payment.transaction_ref}). Remaining: ₹{tax_record.outstanding_balance:.2f}',
            category='PropertyTax'
        )

        return Response({
            'message': 'Demonstration payment successful!',
            'payment': PaymentRecordSerializer(payment).data,
            'tax_record': PropertyTaxRecordSerializer(tax_record).data
        }, status=status.HTTP_201_CREATED)

class PaymentRecordListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role == UserRole.CITIZEN:
            payments = PaymentRecord.objects.filter(tax_record__property__owner=request.user).select_related('tax_record', 'tax_record__property')
        else:
            payments = PaymentRecord.objects.all().select_related('tax_record', 'tax_record__property')
        
        serializer = PaymentRecordSerializer(payments, many=True)
        return Response(serializer.data)

from django.db.models import Sum

class AdminWardTaxSummaryAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Only Administrators can view city-wide ward financial summaries.'}, status=status.HTTP_403_FORBIDDEN)

        from accounts.models import CITY_WARDS
        ward_summaries = []
        for ward_name in CITY_WARDS:
            props = Property.objects.filter(ward_number__iexact=ward_name)
            tax_records = PropertyTaxRecord.objects.filter(property__in=props)

            total_demanded = float(tax_records.aggregate(total=Sum('annual_tax'))['total'] or Decimal('0.00'))
            total_received = float(tax_records.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0.00'))
            total_outstanding = float(tax_records.aggregate(total=Sum('outstanding_balance'))['total'] or Decimal('0.00'))
            collection_rate = round((total_received / total_demanded * 100), 1) if total_demanded > 0 else 0.0

            ward_summaries.append({
                'ward': ward_name,
                'properties_count': props.count(),
                'tax_records_count': tax_records.count(),
                'assessment_year': 'FY 2025-2026',
                'total_demanded': total_demanded,
                'total_received': total_received,
                'total_outstanding': total_outstanding,
                'collection_rate': collection_rate,
            })

        return Response(ward_summaries)
