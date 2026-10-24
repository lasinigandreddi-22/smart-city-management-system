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

    def test_get_profile_authenticated(self):
        self.client.force_authenticate(user=self.citizen1)
        res = self.client.get('/api/auth/profile/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'test_citizen1')
        self.assertEqual(res.data['role'], 'CITIZEN')
        self.assertIn('date_joined', res.data)
        self.assertIn('profile', res.data)

    def test_patch_profile_success(self):
        self.client.force_authenticate(user=self.citizen1)
        res = self.client.patch('/api/auth/profile/', {
            'first_name': 'NewFirst',
            'last_name': 'NewLast',
            'email': 'newcitizen1@test.com',
            'phone': '+91 99999 88888',
            'address': 'New Address Sector 4'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.citizen1.refresh_from_db()
        self.assertEqual(self.citizen1.first_name, 'NewFirst')
        self.assertEqual(self.citizen1.last_name, 'NewLast')
        self.assertEqual(self.citizen1.email, 'newcitizen1@test.com')
        self.assertEqual(self.citizen1.profile.phone, '+91 99999 88888')
        self.assertEqual(self.citizen1.profile.address, 'New Address Sector 4')

    def test_cannot_modify_role(self):
        self.client.force_authenticate(user=self.citizen1)
        res = self.client.patch('/api/auth/profile/', {
            'role': 'ADMIN'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.citizen1.refresh_from_db()
        self.assertEqual(self.citizen1.profile.role, UserRole.CITIZEN)

    def test_cannot_modify_username(self):
        self.client.force_authenticate(user=self.citizen1)
        res = self.client.patch('/api/auth/profile/', {
            'username': 'hacked_name'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.citizen1.refresh_from_db()
        self.assertEqual(self.citizen1.username, 'test_citizen1')

    def test_user_isolation_cannot_edit_another_profile(self):
        self.client.force_authenticate(user=self.citizen1)
        res = self.client.patch('/api/auth/profile/', {
            'id': self.citizen2.id,
            'address': 'Attempted change'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.citizen2.refresh_from_db()
        self.assertNotEqual(self.citizen2.profile.address, 'Attempted change')

    def test_duplicate_email_rejected(self):
        self.client.force_authenticate(user=self.citizen1)
        res = self.client.patch('/api/auth/profile/', {
            'email': 'c2@test.com' # already used by citizen2
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_area_head_dashboard_and_support_flow(self):
        # Create Area Head
        area_head = User.objects.create_user(username='test_head', password='password123', email='head@test.com')
        area_head.profile.role = UserRole.AREA_HEAD
        area_head.profile.assigned_zone = 'North Zone'
        area_head.profile.save()

        # Create Complaint
        complaint = Complaint.objects.create(
            complaint_ref='TEST-CMP-001',
            citizen=self.citizen1,
            title='Main Pipe Rupture in North Ward',
            category='Water Supply',
            ward='North Zone',
            location='Sector 4',
            priority='High',
            status=ComplaintStatus.SUBMITTED,
            assigned_department='Water & Electricity Services'
        )

        # Citizen 2 supports the complaint
        self.client.force_authenticate(user=self.citizen2)
        supp_res = self.client.post(f'/api/complaints/{complaint.id}/support/')
        self.assertEqual(supp_res.status_code, status.HTTP_200_OK)
        self.assertTrue(supp_res.data['supported'])
        self.assertEqual(supp_res.data['support_count'], 1)

        # Area Head views dashboard
        self.client.force_authenticate(user=area_head)
        dash_res = self.client.get('/api/dashboard/area-head/')
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        self.assertIn('mostly_complained', dash_res.data)
        self.assertIn('summary', dash_res.data)
        self.assertEqual(dash_res.data['summary']['total_complaints'], 1)

        # Area Head assigns staff with priority reason
        assign_res = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'assigned_to': self.dept_user.id,
            'priority': 'Urgent',
            'priority_reason': 'Heavily supported issue affecting multiple streets',
            'deadline': '2026-11-01T12:00:00Z'
        })
        self.assertEqual(assign_res.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.assigned_to, self.dept_user)
        self.assertEqual(complaint.status, ComplaintStatus.ASSIGNED)
        self.assertEqual(complaint.priority, 'Urgent')
        self.assertEqual(complaint.priority_reason, 'Heavily supported issue affecting multiple streets')

    def test_assignment_validation_cannot_assign_to_citizen(self):
        area_head = User.objects.create_user(username='test_head2', password='password123', email='head2@test.com')
        area_head.profile.role = UserRole.AREA_HEAD
        area_head.profile.save()

        complaint = Complaint.objects.create(
            complaint_ref='TEST-CMP-002',
            citizen=self.citizen1,
            title='Streetlight dark',
            category='Electricity',
            ward='North Zone',
            location='Park Ave',
            status=ComplaintStatus.SUBMITTED
        )

        self.client.force_authenticate(user=area_head)
        # Attempt assigning to a Citizen
        invalid_assign = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'assigned_to': self.citizen2.id
        })
        self.assertEqual(invalid_assign.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('only be assigned to Department Staff', invalid_assign.data['error'])

    def test_admin_user_role_management(self):
        self.client.force_authenticate(user=self.admin_user)
        # Update citizen2 to AREA_HEAD with zone
        res = self.client.patch(f'/api/auth/users/{self.citizen2.id}/', {
            'role': 'AREA_HEAD',
            'assigned_zone': 'South Zone',
            'department_name': 'Municipal Governance'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.citizen2.refresh_from_db()
        self.assertEqual(self.citizen2.profile.role, UserRole.AREA_HEAD)
        self.assertEqual(self.citizen2.profile.assigned_zone, 'South Zone')


