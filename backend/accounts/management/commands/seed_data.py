from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from accounts.models import UserProfile, UserRole, Notification, Ward
from complaints.models import Complaint, ComplaintStatusHistory, ComplaintStatus, ComplaintPriority, ComplaintCategory
from utilities.models import (
    WaterNotice, WaterServiceRequest, ElectricityNotice, ElectricityServiceRequest,
    CivicNotice, NoticeCategory, NoticeAudience, NoticeStatus
)
from traffic.models import TrafficIncident, TrafficCitizenReport, IncidentSeverity, IncidentStatus, IncidentType
from property_tax.models import Property, PropertyTaxRecord, PaymentRecord, TaxPaymentStatus, PropertyType

class Command(BaseCommand):
    help = 'Seeds repeatable demonstration data for Smart City Management System prototype'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Smart City data seeding...'))

        # 0. Seed Exactly 6 Wards (Ward 1 to Ward 6)
        self.stdout.write(self.style.NOTICE('Seeding 6 Administrative City Wards...'))
        for i in range(1, 7):
            w, _ = Ward.objects.update_or_create(
                ward_number=i,
                defaults={
                    'name': f'Ward {i}',
                    'description': f'Smart City Municipal Ward {i} Civic Administration Sector'
                }
            )
            self.stdout.write(f"  [Ward Seeded] {w.name}")

        # Delete any legacy wards outside 1..6
        deleted_wards = Ward.objects.filter(ward_number__gt=6).delete()
        if deleted_wards[0] > 0:
            self.stdout.write(f"  Cleaned up {deleted_wards[0]} extra wards beyond Ward 6.")

        # Clean up legacy demo accounts outside Ward 1 so Wards 2-6 remain open
        legacy_usernames = ['citizen2', 'head2', 'traffic2', 'sanitation1']
        for lun in legacy_usernames:
            User.objects.filter(username=lun).delete()

        # 1. Create or update Demonstration Accounts (Ward 1 Only + Admin City-wide)
        users_data = [
            {
                'username': 'admin',
                'system_user_id': 'ADM-1001',
                'password': 'Admin@12345',
                'email': 'admin@smartcity.gov.in',
                'first_name': 'Chief',
                'last_name': 'Administrator',
                'role': UserRole.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'phone': '+91 98765 00001',
                'address': 'City Municipal Headquarters, Central Block',
                'department_name': 'Municipal Governance',
                'assigned_zone': 'City-wide'
            },
            {
                'username': 'citizen1',
                'system_user_id': 'CIT-1001',
                'password': 'Citizen@12345',
                'email': 'citizen1@smartcity.gov.in',
                'first_name': 'Aarav',
                'last_name': 'Sharma',
                'role': UserRole.CITIZEN,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 11111',
                'address': 'Flat 402, Skyline Residency, Lake View Road',
                'department_name': '',
                'assigned_zone': 'Ward 1'
            },
            {
                'username': 'head1',
                'system_user_id': 'AH-1001',
                'password': 'Head@12345',
                'email': 'head.ward1@smartcity.gov.in',
                'first_name': 'Devendra',
                'last_name': 'Mehta',
                'role': UserRole.AREA_HEAD,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 77777',
                'address': 'Ward 1 Zonal Office, North Sector',
                'department_name': 'Municipal Governance',
                'assigned_zone': 'Ward 1'
            },
            {
                'username': 'department1',
                'system_user_id': 'EMP-1001',
                'password': 'Dept@12345',
                'email': 'dept.water@smartcity.gov.in',
                'first_name': 'Vikram',
                'last_name': 'Singh',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 33333',
                'address': 'Public Works Depot, East Sector',
                'department_name': 'Water Department',
                'assigned_zone': 'Ward 1'
            },
            {
                'username': 'department2',
                'system_user_id': 'EMP-1002',
                'password': 'Dept@12345',
                'email': 'dept.electricity@smartcity.gov.in',
                'first_name': 'Karan',
                'last_name': 'Patel',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 55555',
                'address': 'North Power Substation Workshop',
                'department_name': 'Electricity Department',
                'assigned_zone': 'Ward 1'
            },
            {
                'username': 'traffic1',
                'system_user_id': 'EMP-1003',
                'password': 'Traffic@12345',
                'email': 'traffic.officer1@smartcity.gov.in',
                'first_name': 'Inspector',
                'last_name': 'Rajesh Kumar',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 44444',
                'address': 'Ward 1 Traffic Enforcement & Sanitation Command Unit',
                'department_name': 'Roads, Sanitation & Traffic',
                'assigned_zone': 'Ward 1'
            },
            {
                'username': 'tax1',
                'system_user_id': 'EMP-1004',
                'password': 'Tax@12345',
                'email': 'tax.collector@smartcity.gov.in',
                'first_name': 'Ananya',
                'last_name': 'Deshmukh',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 99999',
                'address': 'Municipal Revenue Building, Room 104',
                'department_name': 'Property Tax and Bills',
                'assigned_zone': 'Ward 1'
            }
        ]

        # Reset system_user_id temporarily to avoid uniqueness collision during reassignment
        UserProfile.objects.all().update(system_user_id=None)

        created_users = {}
        for udata in users_data:
            user, created = User.objects.get_or_create(username=udata['username'])
            user.set_password(udata['password'])
            user.email = udata['email']
            user.first_name = udata['first_name']
            user.last_name = udata['last_name']
            user.is_staff = udata['is_staff']
            user.is_superuser = udata['is_superuser']
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.system_user_id = udata.get('system_user_id')
            profile.role = udata['role']
            profile.phone = udata['phone']
            profile.address = udata['address']
            profile.department_name = udata['department_name']
            profile.assigned_zone = udata['assigned_zone']
            profile.must_change_password = False
            profile.save()

            created_users[udata['username']] = user
            action = "Created" if created else "Updated"
            self.stdout.write(f"  [{action}] User: {user.username} [{profile.system_user_id}] ({profile.role}) - Ward: {profile.assigned_zone}")

        admin_user = created_users['admin']
        citizen1 = created_users['citizen1']
        dept_water = created_users['department1']
        dept_elec = created_users['department2']
        traffic_user = created_users['traffic1']
        tax_user = created_users['tax1']
        head_user = created_users['head1']

        # 2. Seed Civic Utility Notices (All 4 Categories)
        civic_notices_data = [
            {
                'category': NoticeCategory.WATER,
                'title': 'Scheduled Main Pipeline Overhaul & Pressure Testing',
                'notice_type': 'Scheduled Maintenance',
                'affected_area': 'Lake View Road & North Residential Blocks',
                'target_ward': 'Ward 1',
                'department': 'Water Department',
                'audience': NoticeAudience.ALL,
                'description': 'Municipal water board is replacing 400mm feeder pipelines. Low pressure expected between 09:00 AM and 03:00 PM.',
                'status': NoticeStatus.ACTIVE,
                'published_by': head_user,
                'scheduled_start': timezone.now() + timedelta(hours=2),
                'scheduled_end': timezone.now() + timedelta(hours=8)
            },
            {
                'category': NoticeCategory.POWER,
                'title': 'Smart Grid 33kV Substation Modernization & Transformer Servicing',
                'notice_type': 'Grid Upgrade',
                'affected_area': 'Commercial Market & Skyline Residency Sector',
                'target_ward': 'Ward 1',
                'department': 'Electricity Department',
                'audience': NoticeAudience.ALL,
                'description': 'Planned substation calibration for smart metering integration. Essential power supply maintained via auxiliary feeder lines.',
                'status': NoticeStatus.ACTIVE,
                'published_by': head_user,
                'scheduled_start': timezone.now() + timedelta(days=1, hours=6),
                'scheduled_end': timezone.now() + timedelta(days=1, hours=10)
            },
            {
                'category': NoticeCategory.TRAFFIC,
                'title': 'Lane Resurfacing & Traffic Signal Calibration at 4th Cross',
                'notice_type': 'Road Work & Flow Management',
                'affected_area': 'Lake View Road - 4th Cross Intersection',
                'target_ward': 'Ward 1',
                'department': 'Roads and Traffic',
                'audience': NoticeAudience.ALL,
                'description': 'Bitumen resurfacing and intelligent signal sensor calibration underway. Traffic diverted to alternate service lanes with manual marshalling.',
                'status': NoticeStatus.ACTIVE,
                'published_by': head_user,
                'scheduled_start': timezone.now() + timedelta(hours=4),
                'scheduled_end': timezone.now() + timedelta(hours=14)
            },
            {
                'category': NoticeCategory.SANITATION,
                'title': 'Pre-Monsoon Deep Drainage Desilting & Waste Clearance Drive',
                'notice_type': 'Sanitation Clearance',
                'affected_area': 'Sector 3 Stormwater Drain Network',
                'target_ward': 'Ward 1',
                'department': 'Drainage and Sanitation',
                'audience': NoticeAudience.ALL,
                'description': 'Comprehensive suction desilting of major stormwater culverts to eliminate waterlogging risks ahead of monsoon showers.',
                'status': NoticeStatus.ACTIVE,
                'published_by': head_user,
                'scheduled_start': timezone.now() + timedelta(days=1),
                'scheduled_end': timezone.now() + timedelta(days=3)
            }
        ]

        for cnd in civic_notices_data:
            CivicNotice.objects.update_or_create(
                title=cnd['title'],
                defaults={
                    'category': cnd['category'],
                    'notice_type': cnd['notice_type'],
                    'affected_area': cnd['affected_area'],
                    'target_ward': cnd['target_ward'],
                    'department': cnd['department'],
                    'audience': cnd['audience'],
                    'description': cnd['description'],
                    'status': cnd['status'],
                    'published_by': cnd['published_by'],
                    'scheduled_start': cnd['scheduled_start'],
                    'scheduled_end': cnd['scheduled_end']
                }
            )

        # 3. Seed Water Notices & Requests
        WaterNotice.objects.update_or_create(
            title='Scheduled Main Pipeline Overhaul - Ward 1',
            defaults={
                'notice_type': 'Scheduled Maintenance',
                'affected_area': 'Ward 1, Lake View Road',
                'description': 'Municipal water board replacing 400mm feeder pipelines. Low pressure expected between 09:00 AM and 03:00 PM.',
                'status': NoticeStatus.ACTIVE,
                'scheduled_start': timezone.now() + timedelta(hours=2),
                'scheduled_end': timezone.now() + timedelta(hours=8)
            }
        )

        WaterServiceRequest.objects.update_or_create(
            citizen=citizen1,
            request_type='Low Water Pressure',
            location='Skyline Residency, Block B, Ward 1',
            defaults={
                'description': 'Water pressure drops drastically after 8:00 AM every morning.',
                'meter_number': 'WTR-MTR-8841',
                'status': 'In Progress',
                'admin_notes': 'Field technician scheduled to inspect pressure reducing valve.'
            }
        )

        # 4. Seed Electricity Notices & Requests
        ElectricityNotice.objects.update_or_create(
            title='Smart Grid 33kV Transformer Routine Maintenance',
            defaults={
                'notice_type': 'Scheduled Maintenance',
                'affected_area': 'Ward 1 Commercial Hub & Skyline Residency',
                'description': 'Planned maintenance outage for smart transformer integration.',
                'status': NoticeStatus.ACTIVE,
                'scheduled_start': timezone.now() + timedelta(days=1, hours=6),
                'scheduled_end': timezone.now() + timedelta(days=1, hours=10)
            }
        )

        ElectricityServiceRequest.objects.update_or_create(
            citizen=citizen1,
            request_type='Streetlight Issue',
            location='Lamp Post #34, Lake View Road, Ward 1',
            defaults={
                'description': 'LED streetlight has been flickering continuously and goes dark after 10 PM.',
                'consumer_number': 'ELEC-PUB-9012',
                'status': 'In Progress',
                'admin_notes': 'Maintenance team assigned replacement LED driver.'
            }
        )

        # 5. Seed Complaints across All Departments in Ward 1
        complaints_data = [
            {
                'ref': 'CMP-2026-A101',
                'citizen': citizen1,
                'title': 'Deep Pothole at Lake View Road - 4th Cross',
                'category': ComplaintCategory.ROADS_TRAFFIC,
                'location': 'Lake View Road - 4th Cross Junction, Ward 1',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.HIGH,
                'priority_reason': 'High accident risk during morning peak commute; multiple two-wheelers skidding.',
                'status': ComplaintStatus.IN_PROGRESS,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=1, hours=4),
                'assigned_department': 'Roads and Traffic',
                'assigned_to': traffic_user,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=1),
                'deadline': timezone.now() + timedelta(days=2),
                'description': 'Large pothole measuring approximately 4 feet wide and 6 inches deep in middle lane.',
                'resolution_details': 'Bitumen patching crew scheduled for overnight work.',
                'supporters': [citizen1],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Submitted via citizen portal.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Reviewed and assigned by Area Head.', head_user),
                    (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, 'Patching material dispatched.', traffic_user)
                ]
            },
            {
                'ref': 'CMP-2026-B202',
                'citizen': citizen1,
                'title': 'Severe Water Pipe Rupture Gushing into Basement',
                'category': ComplaintCategory.WATER_SUPPLY,
                'location': 'Skyline Residency Basement Approach, Ward 1',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.URGENT,
                'priority_reason': 'Basement flooding threatening electrical panels and transformer backup room.',
                'status': ComplaintStatus.PENDING_VERIFICATION,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=2),
                'assigned_department': 'Water Department',
                'assigned_to': dept_water,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=2),
                'deadline': timezone.now() + timedelta(hours=12),
                'description': 'Municipal cast iron pipe burst with high-pressure water leaking near electrical duct.',
                'resolution_details': 'Replaced cracked 400mm section with ductile iron pipeline and pressure-tested valve.',
                'completion_remarks': 'Leak completely sealed, basement drained, water supply restored at full pressure.',
                'completion_submitted_at': timezone.now() - timedelta(hours=3),
                'completion_submitted_by': dept_water,
                'supporters': [citizen1],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Emergency water leakage reported.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Escalated to Water Dept.', head_user),
                    (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, 'Repair team deployed.', dept_water),
                    (ComplaintStatus.IN_PROGRESS, ComplaintStatus.PENDING_VERIFICATION, 'Repair finished; awaiting Area Head verification.', dept_water)
                ]
            },
            {
                'ref': 'CMP-2026-C303',
                'citizen': citizen1,
                'title': 'Open Sewage Manhole Cover near Primary School',
                'category': ComplaintCategory.SANITATION,
                'location': 'Primary School Lane, Ward 1',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.URGENT,
                'priority_reason': 'Immediate fall hazard for young children walking to school.',
                'status': ComplaintStatus.ASSIGNED,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=1),
                'assigned_department': 'Roads, Sanitation & Traffic',
                'assigned_to': traffic_user,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=1),
                'deadline': timezone.now() + timedelta(hours=18),
                'description': 'Heavy manhole cover broken, exposing deep drainage pit.',
                'resolution_details': '',
                'supporters': [citizen1],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Reported by citizen.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Assigned to Sanitation team.', head_user)
                ]
            },
            {
                'ref': 'CMP-2026-D404',
                'citizen': citizen1,
                'title': 'High Voltage Surge Tripping Household Circuits',
                'category': ComplaintCategory.ELECTRICITY,
                'location': 'Lake View Road Sector 2, Ward 1',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.HIGH,
                'priority_reason': 'Frequent voltage spikes damaging home appliances.',
                'status': ComplaintStatus.SUBMITTED,
                'is_confirmed': False,
                'assigned_department': 'Electricity Department',
                'assigned_to': None,
                'deadline': timezone.now() + timedelta(days=2),
                'description': 'Transformer buzzing loudly with voltage jumping between 180V and 270V.',
                'resolution_details': '',
                'supporters': [citizen1],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Reported via citizen portal.', citizen1)
                ]
            }
        ]

        for cdata in complaints_data:
            complaint, _ = Complaint.objects.update_or_create(
                complaint_ref=cdata['ref'],
                defaults={
                    'citizen': cdata['citizen'],
                    'title': cdata['title'],
                    'category': cdata['category'],
                    'ward': cdata.get('ward', 'Ward 1'),
                    'location': cdata['location'],
                    'priority': cdata['priority'],
                    'priority_reason': cdata.get('priority_reason', ''),
                    'status': cdata['status'],
                    'is_confirmed': cdata.get('is_confirmed', False),
                    'confirmed_by': cdata.get('confirmed_by'),
                    'confirmed_at': cdata.get('confirmed_at'),
                    'assigned_department': cdata.get('assigned_department', ''),
                    'assigned_to': cdata.get('assigned_to'),
                    'assigned_by': cdata.get('assigned_by'),
                    'assigned_at': cdata.get('assigned_at'),
                    'deadline': cdata['deadline'],
                    'description': cdata['description'],
                    'resolution_details': cdata.get('resolution_details', ''),
                    'completion_remarks': cdata.get('completion_remarks', ''),
                    'completion_submitted_at': cdata.get('completion_submitted_at'),
                    'completion_submitted_by': cdata.get('completion_submitted_by'),
                }
            )
            for supp in cdata.get('supporters', []):
                complaint.supports.add(supp)

            for old_st, new_st, remark, changed_by in cdata.get('history', []):
                ComplaintStatusHistory.objects.get_or_create(
                    complaint=complaint,
                    previous_status=old_st,
                    new_status=new_st,
                    defaults={'changed_by': changed_by, 'notes': remark}
                )

        # 6. Seed Properties, Property Tax Records & Demonstration Payments in Ward 1
        prop1, _ = Property.objects.update_or_create(
            property_ref='PROP-9021-BL',
            defaults={
                'owner': citizen1,
                'address': 'Flat 402, Skyline Residency, Lake View Road',
                'property_type': PropertyType.RESIDENTIAL,
                'assessed_value': Decimal('4500000.00'),
                'built_up_area_sqft': Decimal('1450.00'),
                'ward_number': 'Ward 1'
            }
        )

        prop2, _ = Property.objects.update_or_create(
            property_ref='PROP-9022-CM',
            defaults={
                'owner': citizen1,
                'address': 'Unit 12, Commercial Plaza, Market Street',
                'property_type': PropertyType.COMMERCIAL,
                'assessed_value': Decimal('8500000.00'),
                'built_up_area_sqft': Decimal('800.00'),
                'ward_number': 'Ward 1'
            }
        )

        # Tax Record 1 for citizen1 (Partially Paid)
        tax1, _ = PropertyTaxRecord.objects.update_or_create(
            property=prop1,
            financial_year='2025-2026',
            defaults={
                'annual_tax': Decimal('14500.00'),
                'amount_paid': Decimal('5000.00'),
                'outstanding_balance': Decimal('9500.00'),
                'due_date': date(2026, 12, 31),
                'payment_status': TaxPaymentStatus.PARTIALLY_PAID
            }
        )

        PaymentRecord.objects.update_or_create(
            transaction_ref='TXN-2026-DEMO01',
            defaults={
                'tax_record': tax1,
                'amount': Decimal('5000.00'),
                'payment_status': 'Success',
                'payment_mode': 'Simulated UPI',
                'payer_name': 'Aarav Sharma',
                'notes': 'Demonstration initial installment payment.'
            }
        )

        # Tax Record 2 for citizen1 (Unpaid)
        PropertyTaxRecord.objects.update_or_create(
            property=prop2,
            financial_year='2025-2026',
            defaults={
                'annual_tax': Decimal('34000.00'),
                'amount_paid': Decimal('0.00'),
                'outstanding_balance': Decimal('34000.00'),
                'due_date': date(2026, 11, 15),
                'payment_status': TaxPaymentStatus.UNPAID
            }
        )

        # 7. Seed Traffic Incidents & Reports
        TrafficIncident.objects.update_or_create(
            title='Road Closure: Metro Girder Erection Work',
            defaults={
                'incident_type': IncidentType.ROAD_CLOSURE,
                'location': 'Grand Trunk Avenue between Junction 1 and 2, Ward 1',
                'severity': IncidentSeverity.MEDIUM,
                'status': IncidentStatus.ACTIVE,
                'description': 'Complete night-time closure for pre-cast metro girder placement. Diversion signs erected along Service Road.',
                'is_public_alert': True,
                'estimated_clearance': 'Ongoing until 06:00 AM',
                'reported_by': traffic_user
            }
        )

        TrafficCitizenReport.objects.update_or_create(
            citizen=citizen1,
            title='Illegal Parking Blocking Bus Bay',
            defaults={
                'incident_type': IncidentType.CONGESTION,
                'location': 'Ward 1 Bus Terminal, Gate 2',
                'description': 'Private cabs parked inside city transit bus bay preventing municipal buses from docking.',
                'status': 'Verified',
                'officer_notes': 'Towing truck dispatched to clear bus lane.'
            }
        )

        # 8. Seed Notifications
        Notification.objects.update_or_create(
            user=citizen1,
            title='Welcome to Smart City Citizen Portal',
            defaults={
                'message': 'Welcome Aarav! You can track utility notices, lodge complaints, view municipal bills, and pay property tax online.',
                'category': 'General',
                'is_read': False
            }
        )

        self.stdout.write(self.style.SUCCESS('Smart City demonstration data seeded successfully!'))
