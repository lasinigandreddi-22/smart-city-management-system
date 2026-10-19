from decimal import Decimal
from rest_framework import serializers
from .models import Property, PropertyTaxRecord, PaymentRecord

class PaymentRecordSerializer(serializers.ModelSerializer):
    property_ref = serializers.SerializerMethodField()
    financial_year = serializers.SerializerMethodField()

    class Meta:
        model = PaymentRecord
        fields = [
            'id', 'tax_record', 'property_ref', 'financial_year',
            'transaction_ref', 'amount', 'payment_date',
            'payment_status', 'payment_mode', 'payer_name', 'notes'
        ]
        read_only_fields = ['id', 'transaction_ref', 'payment_date', 'payment_status']

    def get_property_ref(self, obj):
        return obj.tax_record.property.property_ref

    def get_financial_year(self, obj):
        return obj.tax_record.financial_year

class PropertyTaxRecordSerializer(serializers.ModelSerializer):
    property_ref = serializers.CharField(source='property.property_ref', read_only=True)
    property_address = serializers.CharField(source='property.address', read_only=True)
    property_type = serializers.CharField(source='property.property_type', read_only=True)
    owner_name = serializers.SerializerMethodField()
    payments = PaymentRecordSerializer(many=True, read_only=True)

    class Meta:
        model = PropertyTaxRecord
        fields = [
            'id', 'property', 'property_ref', 'property_address', 'property_type',
            'owner_name', 'financial_year', 'annual_tax', 'amount_paid',
            'outstanding_balance', 'due_date', 'payment_status', 'payments',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'amount_paid', 'outstanding_balance', 'payment_status', 'created_at', 'updated_at']

    def get_owner_name(self, obj):
        return obj.property.owner.get_full_name() or obj.property.owner.username

class PropertySerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    tax_records = PropertyTaxRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Property
        fields = [
            'id', 'property_ref', 'owner', 'owner_name', 'address',
            'property_type', 'assessed_value', 'built_up_area_sqft', 'ward_number',
            'tax_records', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_owner_name(self, obj):
        return obj.owner.get_full_name() or obj.owner.username

class ProcessPaymentSerializer(serializers.Serializer):
    tax_record_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = serializers.CharField(max_length=50, default='Simulated UPI')
    payer_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value
