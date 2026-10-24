from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from accounts.models import UserProfile, UserRole, Notification, Ward
from complaints.models import Complaint, ComplaintStatusHistory, ComplaintStatus, ComplaintPriority, ComplaintCategory
from utilities.models import WaterNotice, WaterServiceRequest, ElectricityNotice, ElectricityServiceRequest, NoticeStatus
from traffic.models import TrafficIncident, TrafficCitizenReport, IncidentSeverity, IncidentStatus, IncidentType
from property_tax.models import Property, PropertyTaxRecord, PaymentRecord, TaxPaymentStatus, PropertyType

class Command(BaseCommand):
    help = 'Seeds repeatable demonstration data for Smart City Management System prototype'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Smart City data seeding...'))

        # 0. Seed Exactly 10 Wards
        self.stdout.write(self.style.NOTICE('Seeding 10 Administrative City Wards...'))
        for i in range(1, 11):
            w, _ = Ward.objects.update_or_create(
                ward_number=i,
                defaults={
                    'name': f'Ward {i}',
                    'description': f'Smart City Municipal Ward {i} Civic Administration Sector'
                }
            )
            self.stdout.write(f"  [Ward Seeded] {w.name}")

        # 1. Create or update Demonstration Accounts (Exactly 4 Roles)
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
                'username': 'citizen2',
                'system_user_id': 'CIT-1002',
                'password': 'Citizen@12345',
                'email': 'citizen2@smartcity.gov.in',
                'first_name': 'Priya',
                'last_name': 'Verma',
                'role': UserRole.CITIZEN,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 22222',
                'address': 'Villa 9, Palm Meadows, Greenfield Colony',
                'department_name': '',
                'assigned_zone': 'Ward 2'
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
                'username': 'traffic1',
                'system_user_id': 'EMP-1002',
                'password': 'Traffic@12345',
                'email': 'traffic.officer1@smartcity.gov.in',
                'first_name': 'Inspector',
                'last_name': 'Rajesh Kumar',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 44444',
                'address': 'Traffic Enforcement Command Center',
                'department_name': 'Roads, Sanitation & Traffic',
                'assigned_zone': 'Ward 3'
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
                'address': 'Ward 1 Zonal Office',
                'department_name': 'Municipal Governance',
                'assigned_zone': 'Ward 1'
            },
            {
                'username': 'head2',
                'system_user_id': 'AH-1002',
                'password': 'Head@12345',
                'email': 'head.ward2@smartcity.gov.in',
                'first_name': 'Sunita',
                'last_name': 'Rao',
                'role': UserRole.AREA_HEAD,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 88888',
                'address': 'Ward 2 Administrative Center',
                'department_name': 'Municipal Governance',
                'assigned_zone': 'Ward 2'
            },
            {
                'username': 'department2',
                'system_user_id': 'EMP-1003',
                'password': 'Dept@12345',
                'email': 'dept.electricity@smartcity.gov.in',
                'first_name': 'Karan',
                'last_name': 'Patel',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 55555',
                'address': 'South Utilities Workshop, Greenfield',
                'department_name': 'Electricity Department',
                'assigned_zone': 'Ward 2'
            },
            {
                'username': 'traffic2',
                'system_user_id': 'EMP-1004',
                'password': 'Traffic@12345',
                'email': 'traffic.ward2@smartcity.gov.in',
                'first_name': 'Officer',
                'last_name': 'Suresh Nair',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 66666',
                'address': 'Ward 2 Patrol Station',
                'department_name': 'Roads, Sanitation & Traffic',
                'assigned_zone': 'Ward 4'
            },
            {
                'username': 'tax1',
                'system_user_id': 'EMP-1005',
                'password': 'Tax@12345',
                'email': 'tax.collector@smartcity.gov.in',
                'first_name': 'Ananya',
                'last_name': 'Deshmukh',
                'role': UserRole.EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'phone': '+91 98765 99999',
                'address': 'Municipal Revenue Building, Room 104',
                'department_name': 'Property Tax Department',
                'assigned_zone': 'Ward 5'
            }
        ]

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
        citizen2 = created_users['citizen2']
        dept_user = created_users['department1']
        traffic_user = created_users['traffic1']
        head_user = created_users['head1']
        head2_user = created_users['head2']
        dept2_user = created_users['department2']
        traffic2_user = created_users['traffic2']

        # 2. Seed Water Notices
        water_notices_data = [
            {
                'title': 'Scheduled Main Pipeline Overhaul - North Zone',
                'notice_type': 'Scheduled Maintenance',
                'affected_area': 'North Zone, Sectors 4, 5, and Lake View Road',
                'description': 'Municipal water board is replacing 400mm feeder pipelines. Low pressure expected between 09:00 AM and 03:00 PM.',
                'status': NoticeStatus.ACTIVE,
                'start': timezone.now() + timedelta(hours=2),
                'end': timezone.now() + timedelta(hours=8)
            },
            {
                'title': 'Emergency Valve Repair at Riverfront Pumping Station',
                'notice_type': 'Emergency Shutdown',
                'affected_area': 'Riverfront Promenade & South Boulevard',
                'description': 'Temporary halt in water pumping for urgent bypass valve replacement. Water tankers dispatched to affected residential societies.',
                'status': NoticeStatus.ACTIVE,
                'start': timezone.now() - timedelta(hours=1),
                'end': timezone.now() + timedelta(hours=4)
            },
            {
                'title': 'Semi-Annual Water Quality and Chlorination Advisory',
                'notice_type': 'Quality Advisory',
                'affected_area': 'East Municipal Ward (Wards 12 to 18)',
                'description': 'Periodic reservoir flushing completed successfully. Citizens are advised to boil tap water for drinking purposes for next 24 hours.',
                'status': NoticeStatus.RESOLVED,
                'start': timezone.now() - timedelta(days=2),
                'end': timezone.now() - timedelta(days=1)
            }
        ]

        for wn in water_notices_data:
            WaterNotice.objects.update_or_create(
                title=wn['title'],
                defaults={
                    'notice_type': wn['notice_type'],
                    'affected_area': wn['affected_area'],
                    'description': wn['description'],
                    'status': wn['status'],
                    'scheduled_start': wn['start'],
                    'scheduled_end': wn['end']
                }
            )

        # 3. Seed Water Service Requests
        WaterServiceRequest.objects.update_or_create(
            citizen=citizen1,
            request_type='Low Water Pressure',
            location='Skyline Residency, Block B, Floor 4',
            defaults={
                'description': 'Water pressure drops drastically after 8:00 AM every morning.',
                'meter_number': 'WTR-MTR-8841',
                'status': 'In Progress',
                'admin_notes': 'Field technician scheduled to inspect pressure reducing valve on Tuesday.'
            }
        )
        WaterServiceRequest.objects.update_or_create(
            citizen=citizen1,
            request_type='Water Leakage',
            location='Opposite Green Park Gate 3, Lake View Road',
            defaults={
                'description': 'Clear water leaking continuously from underground municipal connection pipe onto sidewalk.',
                'meter_number': 'WTR-PUB-019',
                'status': 'Submitted',
                'admin_notes': 'Work order pending assignment.'
            }
        )

        # 4. Seed Electricity Notices
        elec_notices_data = [
            {
                'title': 'Smart Grid 33kV Transformer Routine Maintenance',
                'notice_type': 'Scheduled Maintenance',
                'affected_area': 'IT Hub, Silicon Heights & Central Market',
                'description': 'Planned maintenance outage for smart transformer integration. Backup lines active for essential public hospitals.',
                'status': NoticeStatus.ACTIVE,
                'start': timezone.now() + timedelta(days=1, hours=6),
                'end': timezone.now() + timedelta(days=1, hours=10)
            },
            {
                'title': 'High-Tension Line Relocation for Metro Corridor',
                'notice_type': 'Grid Upgrade',
                'affected_area': 'Outer Ring Road (Junction 3 to 7)',
                'description': 'Power grid lines are being elevated for the upcoming metro flyover span. Intermittent cuts of 20 mins possible.',
                'status': NoticeStatus.SCHEDULED,
                'start': timezone.now() + timedelta(days=2),
                'end': timezone.now() + timedelta(days=2, hours=5)
            },
            {
                'title': 'Monsoon Storm Tree Branch Clearing Completed',
                'notice_type': 'Emergency Outage',
                'affected_area': 'Pine Valley & Hillcrest Colony',
                'description': 'Overhead electric wire cleared of fallen eucalyptus branches. Power fully restored.',
                'status': NoticeStatus.RESOLVED,
                'start': timezone.now() - timedelta(days=3),
                'end': timezone.now() - timedelta(days=3, hours=3)
            }
        ]

        for en in elec_notices_data:
            ElectricityNotice.objects.update_or_create(
                title=en['title'],
                defaults={
                    'notice_type': en['notice_type'],
                    'affected_area': en['affected_area'],
                    'description': en['description'],
                    'status': en['status'],
                    'scheduled_start': en['start'],
                    'scheduled_end': en['end']
                }
            )

        # 5. Seed Electricity Service Requests
        ElectricityServiceRequest.objects.update_or_create(
            citizen=citizen1,
            request_type='Streetlight Issue',
            location='Lamp Post #34, Lake View Road',
            defaults={
                'description': 'LED streetlight has been flickering continuously and goes dark after 10 PM.',
                'consumer_number': 'ELEC-PUB-9012',
                'status': 'In Progress',
                'admin_notes': 'Maintenance team assigned replacement LED driver.'
            }
        )

        # 6. Seed Complaints & Status History
        complaints_data = [
            {
                'ref': 'CMP-2026-A101',
                'citizen': citizen1,
                'title': 'Deep Pothole at Lake View Road - 4th Cross',
                'category': ComplaintCategory.ROADS_TRAFFIC,
                'location': 'Lake View Road near Landmark Bakery',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.HIGH,
                'priority_reason': 'School bus route with multiple two-wheeler skidding incidents reported.',
                'status': ComplaintStatus.IN_PROGRESS,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=1),
                'assigned_department': 'Roads, Sanitation & Traffic',
                'assigned_to': traffic_user,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=1),
                'deadline': timezone.now() + timedelta(days=2),
                'description': 'Multiple deep potholes formed after heavy rainfall. Two two-wheelers skidded yesterday. Immediate asphalt repair requested.',
                'resolution_details': '',
                'supporters': [citizen1, citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Complaint registered online by citizen.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Assigned to Roads, Sanitation & Traffic repair crew by Area Head.', head_user),
                    (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, 'Cold-mix asphalt patch material dispatched with repair crew.', traffic_user)
                ]
            },
            {
                'ref': 'CMP-2026-B202',
                'citizen': citizen1,
                'title': 'Muddy & Discolored Tap Water Supply',
                'category': ComplaintCategory.WATER_SUPPLY,
                'location': 'Flat 402, Skyline Residency',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.URGENT,
                'priority_reason': 'Contaminated drinking water affecting 40+ families; urgent health risk.',
                'status': ComplaintStatus.ASSIGNED,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=2),
                'assigned_department': 'Water Department',
                'assigned_to': dept_user,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=2),
                'deadline': timezone.now() - timedelta(days=1),  # Overdue
                'description': 'Tap water running turbid brown with high sedimentation since morning supply cycle. Inhabitable for drinking.',
                'resolution_details': '',
                'supporters': [citizen1, citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Complaint submitted by citizen.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Forwarded urgently to Water Quality Testing Division.', head_user)
                ]
            },
            {
                'ref': 'CMP-2026-C303',
                'citizen': citizen1,
                'title': 'Garbage Dump Overflow at Sector 4 Park Corner',
                'category': ComplaintCategory.SANITATION,
                'location': 'Corner of Sector 4 Public Park',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.MEDIUM,
                'priority_reason': 'General sanitation overflow.',
                'status': ComplaintStatus.RESOLVED,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=3),
                'assigned_department': 'Roads, Sanitation & Traffic',
                'assigned_to': traffic_user,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=3),
                'acknowledged_by': head_user,
                'acknowledged_at': timezone.now() - timedelta(days=1),
                'resolved_at': timezone.now() - timedelta(days=1),
                'deadline': timezone.now() - timedelta(days=2),
                'description': 'Community waste bin has not been cleared for 3 consecutive days. Stray animals scattering garbage.',
                'resolution_details': 'Special waste disposal truck deployed. Waste cleared and area sanitized with disinfectant powder.',
                'completion_remarks': 'Waste fully cleared and sanitized.',
                'supporters': [citizen1],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Logged by citizen.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Sanitation crew dispatched.', head_user),
                    (ComplaintStatus.ASSIGNED, ComplaintStatus.PENDING_VERIFICATION, 'Waste cleared by crew; submitted for Area Head review.', traffic_user),
                    (ComplaintStatus.PENDING_VERIFICATION, ComplaintStatus.RESOLVED, 'Resolution verified and acknowledged by Area Head.', head_user)
                ]
            },
            {
                'ref': 'CMP-2026-D404',
                'citizen': citizen2,
                'title': 'Storm Water Drain Blocked with Construction Debris',
                'category': ComplaintCategory.DRAINAGE,
                'location': 'Greenfield Colony Main Gate',
                'ward': 'Ward 2',
                'priority': ComplaintPriority.MEDIUM,
                'priority_reason': 'Drainage backup risk if unseasonal rains occur.',
                'status': ComplaintStatus.SUBMITTED,
                'is_confirmed': False,
                'assigned_department': '',
                'assigned_to': None,
                'deadline': timezone.now() + timedelta(days=4),
                'description': 'Nearby building construction discarded concrete debris into roadside stormwater drain causing water ponding.',
                'resolution_details': '',
                'supporters': [citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Submitted via citizen portal. Awaiting Ward 2 Area Head review.', citizen2)
                ]
            },
            {
                'ref': 'CMP-2026-E505',
                'citizen': citizen1,
                'title': 'Malfunctioning Streetlight Cluster on 80ft Ring Road',
                'category': ComplaintCategory.ELECTRICITY,
                'location': '80ft Ring Road, Near Junction 4',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.HIGH,
                'priority_reason': 'Dark stretch of high-speed corridor creating critical pedestrian accident risk.',
                'status': ComplaintStatus.UNDER_REVIEW,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(hours=4),
                'assigned_department': 'Electricity Department',
                'assigned_to': None,
                'deadline': timezone.now() + timedelta(days=1),
                'description': 'Six consecutive LED poles are completely dark creating a severe blind spot at the pedestrian crossing.',
                'resolution_details': '',
                'supporters': [citizen1, citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Reported by local neighborhood association.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW, 'Confirmed valid by Area Head; pending crew allocation.', head_user)
                ]
            },
            {
                'ref': 'CMP-2026-F606',
                'citizen': citizen1,
                'title': 'Major Water Main Burst Flooding Pedestrian Sidewalk',
                'category': ComplaintCategory.WATER_SUPPLY,
                'location': 'Sector 5 Main Avenue, Ward 1',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.URGENT,
                'priority_reason': 'Pressurized potable water main ruptured; washing out road foundation.',
                'status': ComplaintStatus.PENDING_VERIFICATION,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=1),
                'assigned_department': 'Water Department',
                'assigned_to': dept_user,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=1),
                'completion_remarks': 'Excavated ruptured 400mm cast iron main. Replaced 3-meter section with ductile iron pipe and new mechanical sleeve. Pressure test passed at 6.5 bar. Sidewalk backfilled.',
                'completion_submitted_at': timezone.now() - timedelta(hours=2),
                'completion_submitted_by': dept_user,
                'deadline': timezone.now() + timedelta(hours=10),
                'description': 'Potable water pipe burst flooding road and causing soil subsidence under the pedestrian footpath.',
                'resolution_details': 'Pipeline repaired and pressure tested.',
                'supporters': [citizen1, citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Submitted via citizen app.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Escalated by Area Head to Water Dept.', head_user),
                    (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, 'Excavator and isolation team deployed.', dept_user),
                    (ComplaintStatus.IN_PROGRESS, ComplaintStatus.PENDING_VERIFICATION, 'Repair completed by field crew; submitted to Area Head for acknowledgement.', dept_user)
                ]
            },
            {
                'ref': 'CMP-2026-G707',
                'citizen': citizen2,
                'title': 'Abandoned Heavy Dump Truck Obstructing Hospital Emergency Gate',
                'category': ComplaintCategory.ROADS_TRAFFIC,
                'location': 'Civil Hospital Emergency Gate Road',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.URGENT,
                'priority_reason': 'Direct obstruction to life-saving ambulance entry corridor.',
                'status': ComplaintStatus.SUBMITTED,
                'is_confirmed': False,
                'assigned_department': 'Roads, Sanitation & Traffic',
                'assigned_to': None,
                'deadline': timezone.now() + timedelta(hours=6),
                'description': 'Commercial flatbed truck with broken axle left directly across the ambulance entrance.',
                'resolution_details': '',
                'supporters': [citizen1, citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Emergency notification logged by hospital security.', citizen2)
                ]
            },
            {
                'ref': 'CMP-2026-H808',
                'citizen': citizen1,
                'title': 'Open Sewage Manhole Cover near Primary School',
                'category': ComplaintCategory.SANITATION,
                'location': 'Little Angels Nursery Lane, Sector 3',
                'ward': 'Ward 1',
                'priority': ComplaintPriority.URGENT,
                'priority_reason': 'Immediate fall hazard for young children walking to school.',
                'status': ComplaintStatus.ASSIGNED,
                'is_confirmed': True,
                'confirmed_by': head_user,
                'confirmed_at': timezone.now() - timedelta(days=2),
                'assigned_department': 'Roads, Sanitation & Traffic',
                'assigned_to': traffic_user,
                'assigned_by': head_user,
                'assigned_at': timezone.now() - timedelta(days=2),
                'deadline': timezone.now() - timedelta(days=2),  # Overdue
                'description': 'Heavy iron manhole cover cracked and removed by scrap scavengers, exposing 10ft deep septic shaft.',
                'resolution_details': '',
                'supporters': [citizen1, citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Reported by parents committee.', citizen1),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Emergency barricade requested.', head_user)
                ]
            },
            {
                'ref': 'CMP-2026-S101',
                'citizen': citizen2,
                'title': 'High Voltage Grid Fluctuation in Greenfield Sector',
                'category': ComplaintCategory.ELECTRICITY,
                'location': 'Greenfield Colony Block B',
                'ward': 'Ward 2',
                'priority': ComplaintPriority.MEDIUM,
                'priority_reason': 'Sustained voltage spikes threatening domestic electrical appliances.',
                'status': ComplaintStatus.ASSIGNED,
                'is_confirmed': True,
                'confirmed_by': head2_user,
                'confirmed_at': timezone.now() - timedelta(days=1),
                'assigned_department': 'Electricity Department',
                'assigned_to': dept2_user,
                'assigned_by': head2_user,
                'assigned_at': timezone.now() - timedelta(days=1),
                'deadline': timezone.now() + timedelta(days=3),
                'description': 'Local step-down transformer producing erratic voltage surges during evening peak load.',
                'resolution_details': '',
                'supporters': [citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Submitted by resident.', citizen2),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Assigned by Ward 2 Area Head to Electricity crew.', head2_user)
                ]
            },
            {
                'ref': 'CMP-2026-S202',
                'citizen': citizen2,
                'title': 'Fallen Tree Branch Obstructing South Expressway Exit',
                'category': ComplaintCategory.ROADS_TRAFFIC,
                'location': 'South Expressway Exit Ramp 3',
                'ward': 'Ward 2',
                'priority': ComplaintPriority.HIGH,
                'priority_reason': 'Single lane blocked creating 2km morning traffic tailback.',
                'status': ComplaintStatus.IN_PROGRESS,
                'is_confirmed': True,
                'confirmed_by': head2_user,
                'confirmed_at': timezone.now() - timedelta(hours=5),
                'assigned_department': 'Roads, Sanitation & Traffic',
                'assigned_to': traffic2_user,
                'assigned_by': head2_user,
                'assigned_at': timezone.now() - timedelta(hours=5),
                'deadline': timezone.now() + timedelta(hours=8),
                'description': 'Heavy storm caused large eucalyptus branch to snap and block outer lane of expressway ramp.',
                'resolution_details': '',
                'supporters': [citizen2],
                'history': [
                    ('New', ComplaintStatus.SUBMITTED, 'Reported via highway hotline.', citizen2),
                    (ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, 'Forwarded by Ward 2 Area Head to road crew.', head2_user),
                    (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, 'Chainsaw and tow truck arriving at site.', traffic2_user)
                ]
            }
        ]

        for cdata in complaints_data:
            complaint, c_created = Complaint.objects.update_or_create(
                complaint_ref=cdata['ref'],
                defaults={
                    'citizen': cdata['citizen'],
                    'title': cdata['title'],
                    'category': cdata['category'],
                    'ward': cdata.get('ward', 'North Zone'),
                    'location': cdata['location'],
                    'priority': cdata['priority'],
                    'priority_reason': cdata.get('priority_reason', ''),
                    'status': cdata['status'],
                    'is_confirmed': cdata.get('is_confirmed', False),
                    'confirmed_by': cdata.get('confirmed_by'),
                    'confirmed_at': cdata.get('confirmed_at'),
                    'assigned_department': cdata['assigned_department'],
                    'assigned_to': cdata['assigned_to'],
                    'assigned_by': cdata.get('assigned_by'),
                    'assigned_at': cdata.get('assigned_at'),
                    'deadline': cdata.get('deadline'),
                    'completion_remarks': cdata.get('completion_remarks', ''),
                    'completion_submitted_at': cdata.get('completion_submitted_at'),
                    'completion_submitted_by': cdata.get('completion_submitted_by'),
                    'acknowledged_by': cdata.get('acknowledged_by'),
                    'acknowledged_at': cdata.get('acknowledged_at'),
                    'resolved_at': cdata.get('resolved_at'),
                    'return_reason': cdata.get('return_reason', ''),
                    'description': cdata['description'],
                    'resolution_details': cdata['resolution_details']
                }
            )

            # Add supporters
            if 'supporters' in cdata:
                for supp in cdata['supporters']:
                    complaint.supports.add(supp)

            if c_created or not complaint.history.exists():
                for prev_st, new_st, note, actor in cdata['history']:
                    ComplaintStatusHistory.objects.create(
                        complaint=complaint,
                        changed_by=actor,
                        previous_status=prev_st,
                        new_status=new_st,
                        notes=note
                    )

        # 7. Seed Traffic Incidents & Alerts
        traffic_incidents_data = [
            {
                'title': 'Multi-Vehicle Collision on Central Ring Road Flyover',
                'incident_type': IncidentType.ACCIDENT,
                'location': 'Central Ring Road Flyover, Northbound Ramp',
                'severity': IncidentSeverity.CRITICAL,
                'status': IncidentStatus.ACTIVE,
                'description': 'Two sedans and a transport carrier collided. Left two lanes blocked. Emergency cranes and paramedic units at scene. Divert to Inner Boulevard.',
                'is_public_alert': True,
                'estimated_clearance': '1 hour 15 mins',
                'reported_by': traffic_user
            },
            {
                'title': 'Severe Waterlogging at Metro Station Underpass',
                'incident_type': IncidentType.HAZARD,
                'location': 'East Metro Underpass, Sector 7',
                'severity': IncidentSeverity.HIGH,
                'status': IncidentStatus.INVESTIGATING,
                'description': 'Over 2.5 feet water collected in underpass following sudden downpour. High-capacity dewatering pumps operating.',
                'is_public_alert': True,
                'estimated_clearance': '45 minutes',
                'reported_by': traffic_user
            },
            {
                'title': 'Road Closure: Metro Girder Erection Work',
                'incident_type': IncidentType.ROAD_CLOSURE,
                'location': 'Grand Trunk Avenue between Junction 5 and 6',
                'severity': IncidentSeverity.MEDIUM,
                'status': IncidentStatus.ACTIVE,
                'description': 'Complete night-time closure for pre-cast metro girder placement. Diversion signs erected along Service Road.',
                'is_public_alert': True,
                'estimated_clearance': 'Ongoing until 06:00 AM',
                'reported_by': traffic_user
            },
            {
                'title': 'Signal Failure at MG Road Cross',
                'incident_type': IncidentType.SIGNAL_FAILURE,
                'location': 'MG Road and Commercial Street Intersection',
                'severity': IncidentSeverity.MEDIUM,
                'status': IncidentStatus.RESOLVED,
                'description': 'Traffic light timer PCB burnt out. Manual officer control deployed until electric crew replaced controller box.',
                'is_public_alert': False,
                'estimated_clearance': 'Resolved',
                'reported_by': traffic_user
            }
        ]

        for ti in traffic_incidents_data:
            TrafficIncident.objects.update_or_create(
                title=ti['title'],
                defaults={
                    'incident_type': ti['incident_type'],
                    'location': ti['location'],
                    'severity': ti['severity'],
                    'status': ti['status'],
                    'description': ti['description'],
                    'is_public_alert': ti['is_public_alert'],
                    'estimated_clearance': ti['estimated_clearance'],
                    'reported_by': ti['reported_by']
                }
            )

        # Citizen traffic report
        TrafficCitizenReport.objects.update_or_create(
            citizen=citizen1,
            title='Illegal Parking Blocking Bus Bay',
            defaults={
                'incident_type': IncidentType.CONGESTION,
                'location': 'City Central Bus Terminal, Gate 2',
                'description': 'Multiple private cabs parked inside city transit bus bay preventing municipal buses from docking.',
                'status': 'Verified',
                'officer_notes': 'Towing truck dispatched to clear bus lane.'
            }
        )

        # 8. Seed Properties, Property Tax Records & Demonstration Payments
        prop1, _ = Property.objects.update_or_create(
            property_ref='PROP-9021-BL',
            defaults={
                'owner': citizen1,
                'address': 'Flat 402, Skyline Residency, Lake View Road',
                'property_type': PropertyType.RESIDENTIAL,
                'assessed_value': Decimal('4500000.00'),
                'built_up_area_sqft': Decimal('1450.00'),
                'ward_number': 'Ward 14 (North)'
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
                'ward_number': 'Ward 08 (Central)'
            }
        )

        prop3, _ = Property.objects.update_or_create(
            property_ref='PROP-8810-RS',
            defaults={
                'owner': citizen2,
                'address': 'Villa 9, Palm Meadows, Greenfield Colony',
                'property_type': PropertyType.RESIDENTIAL,
                'assessed_value': Decimal('12000000.00'),
                'built_up_area_sqft': Decimal('3200.00'),
                'ward_number': 'Ward 22 (South)'
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

        # Demonstration payment for tax1
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

        # Tax Record 3 for citizen2 (Fully Paid)
        tax3, _ = PropertyTaxRecord.objects.update_or_create(
            property=prop3,
            financial_year='2025-2026',
            defaults={
                'annual_tax': Decimal('48000.00'),
                'amount_paid': Decimal('48000.00'),
                'outstanding_balance': Decimal('0.00'),
                'due_date': date(2026, 10, 31),
                'payment_status': TaxPaymentStatus.PAID
            }
        )

        PaymentRecord.objects.update_or_create(
            transaction_ref='TXN-2026-DEMO02',
            defaults={
                'tax_record': tax3,
                'amount': Decimal('48000.00'),
                'payment_status': 'Success',
                'payment_mode': 'Simulated Net Banking',
                'payer_name': 'Priya Verma',
                'notes': 'Demonstration full payment.'
            }
        )

        # 9. Seed Notifications
        Notification.objects.update_or_create(
            user=citizen1,
            title='Welcome to Smart City Citizen Portal',
            defaults={
                'message': 'Welcome Aarav! You can now track water and electricity notices, log complaints, check live traffic alerts, and pay property tax online.',
                'category': 'General',
                'is_read': False
            }
        )
        Notification.objects.update_or_create(
            user=citizen1,
            title='Partial Tax Payment Receipt',
            defaults={
                'message': 'Simulated payment of ₹5,000 for Property PROP-9021-BL was processed successfully. Balance: ₹9,500.',
                'category': 'PropertyTax',
                'is_read': True
            }
        )
        Notification.objects.update_or_create(
            user=dept_user,
            title='New Complaint Assigned',
            defaults={
                'message': 'Complaint CMP-2026-A101 (Lake View Road potholes) has been assigned to your department for resolution.',
                'category': 'Complaint',
                'is_read': False
            }
        )
        Notification.objects.update_or_create(
            user=traffic_user,
            title='Critical Incident Logged',
            defaults={
                'message': 'Central Ring Road collision marked as Critical. Traffic alerts published to citizen portals.',
                'category': 'Traffic',
                'is_read': False
            }
        )

        self.stdout.write(self.style.SUCCESS('Smart City demonstration data seeded successfully!'))
