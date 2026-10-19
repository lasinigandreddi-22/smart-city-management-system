import uuid
from decimal import Decimal
from django.db import models, transaction
from django.contrib.auth.models import User

class PropertyType(models.TextChoices):
    RESIDENTIAL = 'Residential', 'Residential'
    COMMERCIAL = 'Commercial', 'Commercial'
    INDUSTRIAL = 'Industrial', 'Industrial'
    MIXED = 'Mixed-use', 'Mixed-use'

class TaxPaymentStatus(models.TextChoices):
    UNPAID = 'Unpaid', 'Unpaid'
    PARTIALLY_PAID = 'Partially Paid', 'Partially Paid'
    PAID = 'Paid', 'Paid'

class Property(models.Model):
    property_ref = models.CharField(max_length=50, unique=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='properties')
    address = models.CharField(max_length=255)
    property_type = models.CharField(max_length=50, choices=PropertyType.choices, default=PropertyType.RESIDENTIAL)
    assessed_value = models.DecimalField(max_digits=12, decimal_places=2)
    built_up_area_sqft = models.DecimalField(max_digits=10, decimal_places=2, default=1200.0)
    ward_number = models.CharField(max_length=50, blank=True, default='Ward 14')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['property_ref']

    def __str__(self):
        return f"{self.property_ref} - {self.address} ({self.owner.username})"

class PropertyTaxRecord(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='tax_records')
    financial_year = models.CharField(max_length=20, default='2025-2026')
    annual_tax = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    outstanding_balance = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    payment_status = models.CharField(max_length=30, choices=TaxPaymentStatus.choices, default=TaxPaymentStatus.UNPAID)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date']
        unique_together = ('property', 'financial_year')

    def save(self, *args, **kwargs):
        if self.outstanding_balance is None:
            self.outstanding_balance = max(Decimal('0.00'), self.annual_tax - self.amount_paid)
        
        if self.amount_paid >= self.annual_tax:
            self.payment_status = TaxPaymentStatus.PAID
            self.outstanding_balance = Decimal('0.00')
        elif self.amount_paid > Decimal('0.00'):
            self.payment_status = TaxPaymentStatus.PARTIALLY_PAID
            self.outstanding_balance = self.annual_tax - self.amount_paid
        else:
            self.payment_status = TaxPaymentStatus.UNPAID
            self.outstanding_balance = self.annual_tax
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.property.property_ref} - FY {self.financial_year} (Due: ₹{self.outstanding_balance})"

class PaymentRecord(models.Model):
    tax_record = models.ForeignKey(PropertyTaxRecord, on_delete=models.CASCADE, related_name='payments')
    transaction_ref = models.CharField(max_length=50, unique=True, editable=False)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=30, default='Success')
    payment_mode = models.CharField(max_length=50, default='Simulated UPI')
    payer_name = models.CharField(max_length=150)
    notes = models.TextField(blank=True, default='Simulated payment for academic demonstration.')

    class Meta:
        ordering = ['-payment_date']

    def save(self, *args, **kwargs):
        if not self.transaction_ref:
            short_id = uuid.uuid4().hex[:8].upper()
            self.transaction_ref = f"TXN-2026-{short_id}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_ref}: ₹{self.amount} for {self.tax_record.property.property_ref}"
