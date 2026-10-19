from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserRole, UserProfile
from complaints.models import Complaint, ComplaintStatus
from property_tax.models import Property, PropertyTaxRecord, TaxPaymentStatus

class SmartCityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_user(username='test_admin', password='password123', email='admin@test.com')
        self.admin_user.profile.role = UserRole.ADMIN
        self.admin_user.profile.save()

        # Create Citizen 1
        self.citizen1 = User.objects.create_user(username='test_citizen1', password='password123', email='c1@test.com')
        self.citizen1.profile.role = UserRole.CITIZEN
        self.citizen1.profile.save()

        # Create Citizen 2
        self.citizen2 = User.objects.create_user(username='test_citizen2', password='password123', email='c2@test.com')
        self.citizen2.profile.role = UserRole.CITIZEN
        self.citizen2.profile.save()

        # Create Department User
        self.dept_user = User.objects.create_user(username='test_dept', password='password123', email='dept@test.com')
        self.dept_user.profile.role = UserRole.SERVICE_DEPARTMENT
        self.dept_user.profile.department_name = 'Water & Electricity Services'
        self.dept_user.profile.save()

    def test_login_success_and_token(self):
        response = self.client.post('/api/auth/login/', {'username': 'test_citizen1', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['role'], 'CITIZEN')

    def test_login_invalid_credentials(self):
        response = self.client.post('/api/auth/login/', {'username': 'test_citizen1', 'password': 'wrong_password'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_complaint_citizen_isolation(self):
        # Citizen 1 creates complaint
        self.client.force_authenticate(user=self.citizen1)
        create_res = self.client.post('/api/complaints/', {
            'title': 'Leaking pipeline near apartment',
            'category': 'Water Supply',
            'description': 'High volume water leakage observed near gate 1 of the colony.',
            'location': 'Gate 1, Lake View',
            'priority': 'High'
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        c1_id = create_res.data['id']

        # Citizen 2 attempts to view Citizen 1's complaint
        self.client.force_authenticate(user=self.citizen2)
        get_res = self.client.get(f'/api/complaints/{c1_id}/')
        self.assertEqual(get_res.status_code, status.HTTP_403_FORBIDDEN)

        # Citizen 1 can view own complaint
        self.client.force_authenticate(user=self.citizen1)
        get_res2 = self.client.get(f'/api/complaints/{c1_id}/')
        self.assertEqual(get_res2.status_code, status.HTTP_200_OK)

    def test_admin_access_control(self):
        # Citizen tries to access citizen list
        self.client.force_authenticate(user=self.citizen1)
        res = self.client.get('/api/auth/citizens/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin accesses citizen list
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get('/api/auth/citizens/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)

    def test_property_tax_payment_balance_consistency(self):
        # Create property and tax bill
        prop = Property.objects.create(
            property_ref='TEST-PROP-1',
            owner=self.citizen1,
            address='123 Test Street',
            assessed_value=Decimal('1000000.00')
        )
        tax = PropertyTaxRecord.objects.create(
            property=prop,
            financial_year='2025-2026',
            annual_tax=Decimal('10000.00'),
            amount_paid=Decimal('0.00'),
            outstanding_balance=Decimal('10000.00'),
            due_date='2026-12-31'
        )

        self.client.force_authenticate(user=self.citizen1)
        # Process partial payment
        pay_res = self.client.post('/api/tax/pay/', {
            'tax_record_id': tax.id,
            'amount': '4000.00',
            'payment_mode': 'Simulated UPI'
        })
        self.assertEqual(pay_res.status_code, status.HTTP_201_CREATED)

        tax.refresh_from_db()
        self.assertEqual(tax.amount_paid, Decimal('4000.00'))
        self.assertEqual(tax.outstanding_balance, Decimal('6000.00'))
        self.assertEqual(tax.payment_status, TaxPaymentStatus.PARTIALLY_PAID)

        # Process remainder payment
        pay_res2 = self.client.post('/api/tax/pay/', {
            'tax_record_id': tax.id,
            'amount': '6000.00',
            'payment_mode': 'Simulated Net Banking'
        })
        self.assertEqual(pay_res2.status_code, status.HTTP_201_CREATED)

        tax.refresh_from_db()
        self.assertEqual(tax.amount_paid, Decimal('10000.00'))
        self.assertEqual(tax.outstanding_balance, Decimal('0.00'))
        self.assertEqual(tax.payment_status, TaxPaymentStatus.PAID)
