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
        self.dept_user.profile.assigned_zone = 'City-wide'
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
        area_head.profile.assigned_zone = 'Ward 1'
        area_head.profile.save()

        # Create Complaint
        complaint = Complaint.objects.create(
            complaint_ref='TEST-CMP-001',
            citizen=self.citizen1,
            title='Main Pipe Rupture in North Ward',
            category='Water Supply',
            ward='Ward 1',
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
        self.assertIn('only be assigned to Employee', invalid_assign.data['error'])

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

    def test_employee_zone_isolation(self):
        # Create Employee in North Zone
        emp_north = User.objects.create_user(username='emp_north', password='password123', email='emp_n@test.com')
        emp_north.profile.role = UserRole.EMPLOYEE
        emp_north.profile.department_name = 'Water & Electricity Services'
        emp_north.profile.assigned_zone = 'North Zone'
        emp_north.profile.save()

        # Create Employee in South Zone
        emp_south = User.objects.create_user(username='emp_south', password='password123', email='emp_s@test.com')
        emp_south.profile.role = UserRole.EMPLOYEE
        emp_south.profile.department_name = 'Water & Electricity Services'
        emp_south.profile.assigned_zone = 'South Zone'
        emp_south.profile.save()

        # Complaint in North Zone assigned to emp_north
        c_north = Complaint.objects.create(
            complaint_ref='CMP-NZ-001',
            citizen=self.citizen1,
            title='North Zone Pipe Leak',
            category='Water Supply',
            ward='North Zone',
            location='North Block 1',
            status=ComplaintStatus.ASSIGNED,
            assigned_department='Water & Electricity Services',
            assigned_to=emp_north
        )

        # Complaint in South Zone assigned to emp_south
        c_south = Complaint.objects.create(
            complaint_ref='CMP-SZ-001',
            citizen=self.citizen2,
            title='South Zone Valve Fault',
            category='Water Supply',
            ward='South Zone',
            location='South Block 2',
            status=ComplaintStatus.ASSIGNED,
            assigned_department='Water & Electricity Services',
            assigned_to=emp_south
        )

        # 1. emp_north can view their own North Zone task
        self.client.force_authenticate(user=emp_north)
        res_ok = self.client.get(f'/api/complaints/{c_north.id}/')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        # 2. emp_north CANNOT view South Zone task (Forbidden 403)
        res_forbidden = self.client.get(f'/api/complaints/{c_south.id}/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 3. emp_north task list only contains c_north, never c_south
        list_res = self.client.get('/api/complaints/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        refs = [c['complaint_ref'] for c in list_res.data]
        self.assertIn('CMP-NZ-001', refs)
        self.assertNotIn('CMP-SZ-001', refs)

    def test_employee_cannot_bypass_area_head_acknowledgement(self):
        emp = User.objects.create_user(username='emp_wf', password='password123', email='emp_wf@test.com')
        emp.profile.role = UserRole.EMPLOYEE
        emp.profile.department_name = 'Water & Electricity Services'
        emp.profile.assigned_zone = 'North Zone'
        emp.profile.save()

        complaint = Complaint.objects.create(
            complaint_ref='CMP-WF-001',
            citizen=self.citizen1,
            title='Main Line Work Order',
            category='Water Supply',
            ward='North Zone',
            location='Sector 7',
            status=ComplaintStatus.ASSIGNED,
            assigned_department='Water & Electricity Services',
            assigned_to=emp
        )

        self.client.force_authenticate(user=emp)

        # Attempt to mark as Resolved directly -> MUST be rejected with 403 Forbidden
        direct_resolve = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'status': 'Resolved',
            'notes': 'Trying to resolve without Area Head review'
        })
        self.assertEqual(direct_resolve.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('cannot directly mark complaints as Resolved', direct_resolve.data['error'])

        # Submit completion to Area Head -> Sets status to Pending Verification
        submit_comp = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'action': 'submit_completion',
            'completion_remarks': 'Pipe replaced and sealed with pressure test verified.'
        })
        self.assertEqual(submit_comp.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.PENDING_VERIFICATION)
        self.assertEqual(complaint.completion_remarks, 'Pipe replaced and sealed with pressure test verified.')
        self.assertIsNotNone(complaint.completion_submitted_at)

    def test_area_head_acknowledge_and_return_workflow(self):
        head = User.objects.create_user(username='head_wf', password='password123', email='head_wf@test.com')
        head.profile.role = UserRole.AREA_HEAD
        head.profile.assigned_zone = 'North Zone'
        head.profile.save()

        emp = User.objects.create_user(username='emp_wf2', password='password123', email='emp_wf2@test.com')
        emp.profile.role = UserRole.EMPLOYEE
        emp.profile.department_name = 'Water & Electricity Services'
        emp.profile.assigned_zone = 'North Zone'
        emp.profile.save()

        complaint = Complaint.objects.create(
            complaint_ref='CMP-WF-002',
            citizen=self.citizen1,
            title='Valve Replacement',
            category='Water Supply',
            ward='North Zone',
            location='Sector 8',
            status=ComplaintStatus.PENDING_VERIFICATION,
            assigned_department='Water & Electricity Services',
            assigned_to=emp,
            completion_remarks='Replaced 2-inch gate valve.'
        )

        self.client.force_authenticate(user=head)

        # 1. Area Head returns for further work with a reason
        return_res = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'action': 'return',
            'return_reason': 'Valve packaging requires additional pressure seal inspection.'
        })
        self.assertEqual(return_res.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.IN_PROGRESS)
        self.assertEqual(complaint.return_reason, 'Valve packaging requires additional pressure seal inspection.')

        # 2. Employee resubmits completion
        self.client.force_authenticate(user=emp)
        self.client.patch(f'/api/complaints/{complaint.id}/', {
            'action': 'submit_completion',
            'completion_remarks': 'Secondary pressure test completed at 8 bar. All seals verified.'
        })

        # 3. Area Head acknowledges completion
        self.client.force_authenticate(user=head)
        ack_res = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'action': 'acknowledge'
        })
        self.assertEqual(ack_res.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.RESOLVED)
        self.assertEqual(complaint.acknowledged_by, head)
        self.assertIsNotNone(complaint.acknowledged_at)
        self.assertIsNotNone(complaint.resolved_at)
        self.assertIsNotNone(complaint.actual_duration)

    def test_area_head_ward_isolation_enforcement(self):
        # Create Area Head for Ward 1
        head_w1 = User.objects.create_user(username='head_w1', password='password123', email='w1@test.com')
        head_w1.profile.role = UserRole.AREA_HEAD
        head_w1.profile.assigned_zone = 'Ward 1'
        head_w1.profile.save()

        # Create Complaint in Ward 2
        c_w2 = Complaint.objects.create(
            complaint_ref='CMP-W2-001',
            citizen=self.citizen2,
            title='Ward 2 Transformer Issue',
            category='Electricity',
            ward='Ward 2',
            location='Ward 2 Sector A',
            status=ComplaintStatus.SUBMITTED
        )

        self.client.force_authenticate(user=head_w1)

        # 1. Direct GET on Ward 2 complaint must return 403 Forbidden
        res_forbidden = self.client.get(f'/api/complaints/{c_w2.id}/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Querying complaints with ward=Ward 2 must return 403 Forbidden
        query_forbidden = self.client.get('/api/complaints/?ward=Ward 2')
        self.assertEqual(query_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Area Head dashboard query for unauthorized ward returns 403
        dash_forbidden = self.client.get('/api/dashboard/area-head/?ward=Ward 2')
        self.assertEqual(dash_forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_assignment_validation_department_and_ward_mismatch(self):
        head = User.objects.create_user(username='head_assign', password='password123', email='head_a@test.com')
        head.profile.role = UserRole.AREA_HEAD
        head.profile.assigned_zone = 'Ward 1'
        head.profile.save()

        # Employee assigned to Electricity in Ward 1
        emp_elec = User.objects.create_user(username='emp_elec', password='password123', email='elec@test.com')
        emp_elec.profile.role = UserRole.EMPLOYEE
        emp_elec.profile.department_name = 'Electricity Services'
        emp_elec.profile.assigned_zone = 'Ward 1'
        emp_elec.profile.save()

        # Employee assigned to Water in Ward 2
        emp_water_w2 = User.objects.create_user(username='emp_w2', password='password123', email='w2@test.com')
        emp_water_w2.profile.role = UserRole.EMPLOYEE
        emp_water_w2.profile.department_name = 'Water & Electricity Services'
        emp_water_w2.profile.assigned_zone = 'Ward 2'
        emp_water_w2.profile.save()

        # Water complaint in Ward 1
        complaint = Complaint.objects.create(
            complaint_ref='CMP-VAL-001',
            citizen=self.citizen1,
            title='Ward 1 Water Pipe Burst',
            category='Water Supply',
            ward='Ward 1',
            location='Main Road',
            status=ComplaintStatus.SUBMITTED,
            assigned_department='Water Supply'
        )

        self.client.force_authenticate(user=head)

        # 1. Attempt assigning to employee from wrong department -> 400 Bad Request
        res_dept_mismatch = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'assigned_to': emp_elec.id
        })
        self.assertEqual(res_dept_mismatch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not match', res_dept_mismatch.data['error'])

        # 2. Attempt assigning to employee from wrong ward -> 400 Bad Request
        res_ward_mismatch = self.client.patch(f'/api/complaints/{complaint.id}/', {
            'assigned_to': emp_water_w2.id
        })
        self.assertEqual(res_ward_mismatch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not include complaint ward', res_ward_mismatch.data['error'])

    def test_citizen_confirm_and_reopen_lifecycle(self):
        head = User.objects.create_user(username='head_cl', password='password123', email='head_cl@test.com')
        head.profile.role = UserRole.AREA_HEAD
        head.profile.assigned_zone = 'Ward 1'
        head.profile.save()

        emp = User.objects.create_user(username='emp_cl', password='password123', email='emp_cl@test.com')
        emp.profile.role = UserRole.EMPLOYEE
        emp.profile.department_name = 'Water & Electricity Services'
        emp.profile.assigned_zone = 'Ward 1'
        emp.profile.save()

        # 1. Citizen 1 lodges complaint
        self.client.force_authenticate(user=self.citizen1)
        sub_res = self.client.post('/api/complaints/', {
            'title': 'Low water pressure on 5th avenue',
            'category': 'Water Supply',
            'ward': 'Ward 1',
            'location': '5th Ave, Ward 1',
            'description': 'Water pressure dropped below 1 bar since this morning.',
            'priority': 'Medium'
        })
        self.assertEqual(sub_res.status_code, status.HTTP_201_CREATED)
        c_id = sub_res.data['id']

        # 2. Privacy Rule: Citizen 2 CANNOT access Citizen 1's unconfirmed complaint
        self.client.force_authenticate(user=self.citizen2)
        c2_view = self.client.get(f'/api/complaints/{c_id}/')
        self.assertEqual(c2_view.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Area Head confirms & assigns complaint
        self.client.force_authenticate(user=head)
        conf_res = self.client.patch(f'/api/complaints/{c_id}/', {
            'action': 'confirm',
            'assigned_to': emp.id,
            'priority': 'High',
            'deadline': '2026-11-05T18:00:00Z'
        })
        self.assertEqual(conf_res.status_code, status.HTTP_200_OK)

        # 4. Employee submits completion
        self.client.force_authenticate(user=emp)
        comp_res = self.client.patch(f'/api/complaints/{c_id}/', {
            'action': 'submit_completion',
            'completion_remarks': 'Booster pump pressure regulator calibrated and inlet filter cleared.'
        })
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)

        # 5. Area Head acknowledges completion -> Status becomes RESOLVED
        self.client.force_authenticate(user=head)
        ack_res = self.client.patch(f'/api/complaints/{c_id}/', {
            'action': 'acknowledge',
            'resolution_details': 'Pump station output verified at 3.5 bar.'
        })
        self.assertEqual(ack_res.status_code, status.HTTP_200_OK)
        self.assertEqual(ack_res.data['status'], 'Resolved')

        # 6. Citizen confirms resolution -> Status becomes CLOSED
        self.client.force_authenticate(user=self.citizen1)
        close_res = self.client.patch(f'/api/complaints/{c_id}/', {
            'action': 'confirm_resolution',
            'notes': 'Verified pressure is restored. Thank you!'
        })
        self.assertEqual(close_res.status_code, status.HTTP_200_OK)
        self.assertEqual(close_res.data['status'], 'Closed')

        # 7. Reopening: Citizen reports issue persists -> Status reverts to IN_PROGRESS
        reopen_res = self.client.patch(f'/api/complaints/{c_id}/', {
            'action': 'reopen',
            'return_reason': 'Pressure dropped again during evening peak hours.'
        })
        self.assertEqual(reopen_res.status_code, status.HTTP_200_OK)
        self.assertEqual(reopen_res.data['status'], 'In Progress')
        self.assertIn('Pressure dropped again', reopen_res.data['return_reason'])

    def test_dual_login_and_role_verification(self):
        # Assign system_user_id to citizen1
        self.citizen1.profile.system_user_id = 'CIT-1001'
        self.citizen1.profile.assigned_zone = 'Ward 1'
        self.citizen1.profile.save()

        # Login with system_user_id and correct role
        res = self.client.post('/api/auth/login/', {
            'username': 'CIT-1001',
            'password': 'password123',
            'role': 'CITIZEN'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user_id'], 'CIT-1001')

        # Login with role mismatch (selecting ADMIN for citizen account)
        res_mismatch = self.client.post('/api/auth/login/', {
            'username': 'CIT-1001',
            'password': 'password123',
            'role': 'ADMIN'
        })
        self.assertEqual(res_mismatch.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Role mismatch', res_mismatch.data['error'])

    def test_registration_and_ward_uniqueness_enforcement(self):
        # Register Citizen 1 in Ward 7 -> Generates W7C1
        res1 = self.client.post('/api/auth/register/', {
            'role': 'CITIZEN',
            'first_name': 'Meera',
            'last_name': 'Joshi',
            'email': 'meera.joshi@example.com',
            'ward': 'Ward 7',
            'address': '701 Green Park'
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['user_id'], 'W7C1')
        self.assertTrue(len(res1.data['initial_password']) >= 8)

        # Register Citizen 2 in Ward 7 -> Must SUCCEED and generate W7C2 (multi-citizen per ward)
        res2 = self.client.post('/api/auth/register/', {
            'role': 'CITIZEN',
            'first_name': 'Rohan',
            'last_name': 'Kapoor',
            'email': 'rohan.kapoor@example.com',
            'ward': 'Ward 7',
            'address': '702 Green Park'
        })
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res2.data['user_id'], 'W7C2')

        # Register Area Head in Ward 7 -> Must succeed
        res_ah1 = self.client.post('/api/auth/register/', {
            'role': 'AREA_HEAD',
            'first_name': 'Kavita',
            'last_name': 'Patel',
            'email': 'kavita.patel@example.com',
            'ward': 'Ward 7'
        })
        self.assertEqual(res_ah1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_ah1.data['user_id'].startswith('AH-'))

        # Register second Area Head in Ward 7 -> Must FAIL (1 Area Head per ward)
        res_ah2 = self.client.post('/api/auth/register/', {
            'role': 'AREA_HEAD',
            'first_name': 'Sanjay',
            'last_name': 'Menon',
            'email': 'sanjay.menon@example.com',
            'ward': 'Ward 7'
        })
        self.assertEqual(res_ah2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already assigned', res_ah2.data['error'])

        # Register Employee in Ward 7, Water Department -> Must succeed
        res_emp1 = self.client.post('/api/auth/register/', {
            'role': 'EMPLOYEE',
            'first_name': 'Anil',
            'last_name': 'Verma',
            'email': 'anil.verma@example.com',
            'ward': 'Ward 7',
            'department_name': 'Water Department'
        })
        self.assertEqual(res_emp1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_emp1.data['user_id'].startswith('EMP-'))

        # Register second Employee in Ward 7, same department (Water Department) -> Must FAIL
        res_emp2 = self.client.post('/api/auth/register/', {
            'role': 'EMPLOYEE',
            'first_name': 'Sunil',
            'last_name': 'Sharma',
            'email': 'sunil.sharma@example.com',
            'ward': 'Ward 7',
            'department_name': 'Water Department'
        })
        self.assertEqual(res_emp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already assigned', res_emp2.data['error'])

        # Prohibit public Admin registration
        res_admin = self.client.post('/api/auth/register/', {
            'role': 'ADMIN',
            'first_name': 'Hacker',
            'email': 'hacker@example.com',
            'ward': 'Ward 1'
        })
        self.assertEqual(res_admin.status_code, status.HTTP_403_FORBIDDEN)

    def test_multi_citizen_capacity_and_consecutive_ids(self):
        # Register 12 citizens in Ward 1: must generate W1C1 to W1C12
        for i in range(1, 13):
            res = self.client.post('/api/auth/register/', {
                'role': 'CITIZEN',
                'first_name': f'Citizen{i}',
                'last_name': 'Test',
                'email': f'citizen{i}.w1@example.com',
                'ward': 'Ward 1',
                'address': f'{i} Test Colony, Ward 1'
            })
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertEqual(res.data['user_id'], f'W1C{i}')

    def test_admin_ward_tax_summary(self):
        # Citizen cannot access ward tax summary
        self.client.force_authenticate(user=self.citizen1)
        res_cit = self.client.get('/api/tax/ward-summary/')
        self.assertEqual(res_cit.status_code, status.HTTP_403_FORBIDDEN)

        # Admin accesses ward tax summary: returns all 6 wards
        self.client.force_authenticate(user=self.admin_user)
        res_adm = self.client.get('/api/tax/ward-summary/')
        self.assertEqual(res_adm.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_adm.data), 6)
        wards = [w['ward'] for w in res_adm.data]
        self.assertEqual(wards, ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'])

    def test_ward_availability_endpoint(self):
        # Check ward availability for CITIZEN
        res = self.client.get('/api/auth/wards/availability/?role=CITIZEN')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['wards']), 6)
        self.assertIn('is_available', res.data['wards'][0])

    def test_admin_password_reset(self):
        # Admin resets citizen1 password
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(f'/api/auth/users/{self.citizen1.id}/reset-password/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('temporary_password', res.data)
        new_pwd = res.data['temporary_password']

        # Verify new password works
        self.client.logout()
        login_res = self.client.post('/api/auth/login/', {
            'username': self.citizen1.username,
            'password': new_pwd
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)


