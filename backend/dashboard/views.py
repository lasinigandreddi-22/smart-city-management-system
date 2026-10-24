from decimal import Decimal
from django.utils import timezone
from rest_framework import views, permissions
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Count, Sum, Q

from accounts.models import UserRole
from complaints.models import Complaint, ComplaintStatus
from utilities.models import WaterNotice, WaterServiceRequest, ElectricityNotice, ElectricityServiceRequest, NoticeStatus
from traffic.models import TrafficIncident, TrafficCitizenReport, IncidentStatus, IncidentSeverity, IncidentType
from property_tax.models import Property, PropertyTaxRecord, PaymentRecord, TaxPaymentStatus

class CitizenDashboardAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Complaints summary
        user_complaints = Complaint.objects.filter(citizen=user)
        total_complaints = user_complaints.count()
        pending_complaints = user_complaints.filter(status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]).count()
        resolved_complaints = user_complaints.filter(status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]).count()

        # Water & Electricity notices
        active_water_notices = WaterNotice.objects.filter(status=NoticeStatus.ACTIVE)[:3]
        active_electricity_notices = ElectricityNotice.objects.filter(status=NoticeStatus.ACTIVE)[:3]

        # Public traffic alerts
        active_traffic_alerts = TrafficIncident.objects.filter(is_public_alert=True, status__in=[IncidentStatus.ACTIVE, IncidentStatus.INVESTIGATING])[:3]

        # Property tax info
        tax_records = PropertyTaxRecord.objects.filter(property__owner=user)
        total_outstanding = tax_records.aggregate(total=Sum('outstanding_balance'))['total'] or Decimal('0.00')
        unpaid_bills_count = tax_records.filter(payment_status__in=[TaxPaymentStatus.UNPAID, TaxPaymentStatus.PARTIALLY_PAID]).count()
        properties_count = Property.objects.filter(owner=user).count()

        # Recent requests
        recent_complaints = user_complaints[:5]
        recent_water_reqs = WaterServiceRequest.objects.filter(citizen=user)[:3]
        recent_elec_reqs = ElectricityServiceRequest.objects.filter(citizen=user)[:3]

        return Response({
            'user': {
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email
            },
            'stats': {
                'total_complaints': total_complaints,
                'pending_complaints': pending_complaints,
                'resolved_complaints': resolved_complaints,
                'properties_owned': properties_count,
                'total_tax_outstanding': float(total_outstanding),
                'unpaid_bills_count': unpaid_bills_count,
            },
            'active_water_notices': [
                {'id': n.id, 'title': n.title, 'affected_area': n.affected_area, 'notice_type': n.notice_type, 'status': n.status}
                for n in active_water_notices
            ],
            'active_electricity_notices': [
                {'id': n.id, 'title': n.title, 'affected_area': n.affected_area, 'notice_type': n.notice_type, 'status': n.status}
                for n in active_electricity_notices
            ],
            'active_traffic_alerts': [
                {'id': t.id, 'title': t.title, 'location': t.location, 'severity': t.severity, 'status': t.status, 'incident_type': t.incident_type}
                for t in active_traffic_alerts
            ],
            'recent_complaints': [
                {
                    'id': c.id, 
                    'ref': c.complaint_ref, 
                    'title': c.title, 
                    'ward': c.ward,
                    'status': c.status, 
                    'priority': c.priority, 
                    'priority_reason': c.priority_reason,
                    'deadline': c.deadline,
                    'is_overdue': c.is_overdue,
                    'support_count': c.support_count,
                    'date': c.created_at
                }
                for c in recent_complaints
            ]
        })

class AdminDashboardAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role != UserRole.ADMIN and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Only Admins can view administrative metrics.'}, status=403)

        total_citizens = User.objects.filter(profile__role=UserRole.CITIZEN).count()
        total_staff = User.objects.filter(profile__role__in=[UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]).count()
        total_area_heads = User.objects.filter(profile__role=UserRole.AREA_HEAD).count()
        
        all_complaints = Complaint.objects.all()
        total_complaints = all_complaints.count()
        pending_complaints = all_complaints.filter(status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]).count()
        resolved_complaints = all_complaints.filter(status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]).count()
        overdue_complaints = all_complaints.filter(
            deadline__lt=timezone.now(),
            status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
        ).count()

        active_water_notices = WaterNotice.objects.filter(status=NoticeStatus.ACTIVE).count()
        active_elec_notices = ElectricityNotice.objects.filter(status=NoticeStatus.ACTIVE).count()
        active_traffic_incidents = TrafficIncident.objects.filter(status__in=[IncidentStatus.ACTIVE, IncidentStatus.INVESTIGATING]).count()

        # Category breakdown for charts
        category_breakdown = list(Complaint.objects.values('category').annotate(count=Count('id')).order_by('-count'))

        # Status breakdown for charts
        status_breakdown = list(Complaint.objects.values('status').annotate(count=Count('id')).order_by('-count'))

        # Ward breakdown
        ward_breakdown = list(Complaint.objects.values('ward').annotate(count=Count('id')).order_by('-count'))

        # Department performance breakdown
        department_performance = list(
            Complaint.objects.values('assigned_department').annotate(
                total=Count('id'),
                resolved=Count('id', filter=Q(status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])),
                pending=Count('id', filter=Q(status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]))
            ).order_by('-total')
        )

        # Tax metrics
        total_tax_collected = PaymentRecord.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_tax_outstanding = PropertyTaxRecord.objects.aggregate(total=Sum('outstanding_balance'))['total'] or Decimal('0.00')

        # Top mostly-complained community issues
        mostly_complained = Complaint.objects.annotate(
            supp_count=Count('supports')
        ).order_by('-supp_count', '-created_at')[:6]

        # Recent activity
        recent_complaints = Complaint.objects.select_related('citizen', 'assigned_to').order_by('-created_at')[:6]
        recent_payments = PaymentRecord.objects.select_related('tax_record__property').order_by('-payment_date')[:5]

        return Response({
            'summary': {
                'total_citizens': total_citizens,
                'total_staff': total_staff,
                'total_area_heads': total_area_heads,
                'total_complaints': total_complaints,
                'pending_complaints': pending_complaints,
                'resolved_complaints': resolved_complaints,
                'overdue_complaints': overdue_complaints,
                'active_water_notices': active_water_notices,
                'active_elec_notices': active_elec_notices,
                'active_traffic_incidents': active_traffic_incidents,
                'total_tax_collected': float(total_tax_collected),
                'total_tax_outstanding': float(total_tax_outstanding),
            },
            'charts': {
                'category_breakdown': category_breakdown,
                'status_breakdown': status_breakdown,
                'ward_breakdown': ward_breakdown,
                'department_performance': department_performance,
            },
            'mostly_complained': [
                {
                    'id': c.id,
                    'ref': c.complaint_ref,
                    'title': c.title,
                    'category': c.category,
                    'ward': c.ward,
                    'location': c.location,
                    'priority': c.priority,
                    'priority_reason': c.priority_reason,
                    'status': c.status,
                    'deadline': c.deadline,
                    'is_overdue': c.is_overdue,
                    'support_count': c.support_count,
                    'assigned_to_name': c.assigned_to.get_full_name() or c.assigned_to.username if c.assigned_to else None,
                    'assigned_department': c.assigned_department,
                    'created_at': c.created_at
                }
                for c in mostly_complained
            ],
            'recent_complaints': [
                {
                    'id': c.id,
                    'ref': c.complaint_ref,
                    'citizen_name': c.citizen.get_full_name() or c.citizen.username,
                    'title': c.title,
                    'category': c.category,
                    'ward': c.ward,
                    'status': c.status,
                    'priority': c.priority,
                    'deadline': c.deadline,
                    'is_overdue': c.is_overdue,
                    'support_count': c.support_count,
                    'assigned_department': c.assigned_department,
                    'assigned_to_name': c.assigned_to.get_full_name() or c.assigned_to.username if c.assigned_to else None,
                    'created_at': c.created_at
                }
                for c in recent_complaints
            ],
            'recent_payments': [
                {
                    'id': p.id,
                    'txn_ref': p.transaction_ref,
                    'property_ref': p.tax_record.property.property_ref,
                    'amount': float(p.amount),
                    'payer_name': p.payer_name,
                    'payment_mode': p.payment_mode,
                    'date': p.payment_date
                }
                for p in recent_payments
            ]
        })

class AreaHeadDashboardAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        if role not in [UserRole.AREA_HEAD, UserRole.ADMIN] and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Permission denied. Area Head or Admin access required.'}, status=403)

        assigned_zone = getattr(request.user.profile, 'assigned_zone', '')
        user_dept = getattr(request.user.profile, 'department_name', '')

        # Base queryset
        queryset = Complaint.objects.select_related('citizen', 'assigned_to')

        # Filter by query parameters if supplied, otherwise Area Head default zone
        ward_filter = request.query_params.get('ward')
        dept_filter = request.query_params.get('department')
        status_filter = request.query_params.get('status')
        priority_filter = request.query_params.get('priority')
        is_overdue_filter = request.query_params.get('overdue')

        if ward_filter:
            queryset = queryset.filter(Q(ward__icontains=ward_filter) | Q(location__icontains=ward_filter))
        elif assigned_zone and assigned_zone != 'City-wide' and role == UserRole.AREA_HEAD:
            # Focus on area head's assigned area/zone
            queryset = queryset.filter(
                Q(ward__icontains=assigned_zone) | 
                Q(location__icontains=assigned_zone) |
                Q(ward__isnull=True) | Q(ward='')
            )

        if dept_filter:
            queryset = queryset.filter(assigned_department__icontains=dept_filter)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        now = timezone.now()
        if is_overdue_filter == 'true':
            queryset = queryset.filter(
                deadline__lt=now,
                status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
            )

        # Metrics for the scoped area
        total_complaints = queryset.count()
        unassigned_count = queryset.filter(status=ComplaintStatus.SUBMITTED, assigned_to__isnull=True).count()
        in_progress_count = queryset.filter(status__in=[ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]).count()
        resolved_count = queryset.filter(status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]).count()
        high_priority_count = queryset.filter(priority__in=['High', 'Urgent']).count()
        overdue_count = queryset.filter(
            deadline__lt=now,
            status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
        ).count()

        # Top 5-6 Mostly Complained / Supported issues
        # Requirement: "From that area head take 5-6 and solve them and focus on remaining ones."
        mostly_complained = queryset.annotate(
            supp_count=Count('supports')
        ).order_by('-supp_count', '-created_at')[:6]

        # Top unassigned issues needing immediate triage
        unassigned_issues = queryset.filter(
            status=ComplaintStatus.SUBMITTED,
            assigned_to__isnull=True
        ).order_by('-created_at')[:8]

        # Breakdowns
        ward_breakdown = list(queryset.values('ward').annotate(count=Count('id')).order_by('-count'))
        department_breakdown = list(queryset.values('assigned_department').annotate(count=Count('id')).order_by('-count'))
        category_breakdown = list(queryset.values('category').annotate(count=Count('id')).order_by('-count'))
        status_breakdown = list(queryset.values('status').annotate(count=Count('id')).order_by('-count'))

        # Staff list for quick assignment
        staff_members = User.objects.filter(
            profile__role__in=[UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]
        ).select_related('profile').order_by('first_name', 'username')

        staff_data = [
            {
                'id': s.id,
                'name': s.get_full_name() or s.username,
                'department': s.profile.department_name,
                'zone': s.profile.assigned_zone,
                'active_tasks': Complaint.objects.filter(
                    assigned_to=s,
                    status__in=[ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
                ).count()
            }
            for s in staff_members
        ]

        def serialize_item(c):
            return {
                'id': c.id,
                'ref': c.complaint_ref,
                'title': c.title,
                'category': c.category,
                'ward': c.ward or 'General',
                'location': c.location,
                'priority': c.priority,
                'priority_reason': c.priority_reason,
                'status': c.status,
                'deadline': c.deadline,
                'is_overdue': c.is_overdue,
                'support_count': c.support_count,
                'assigned_department': c.assigned_department,
                'assigned_to_id': c.assigned_to_id,
                'assigned_to_name': c.assigned_to.get_full_name() or c.assigned_to.username if c.assigned_to else None,
                'created_at': c.created_at
            }

        return Response({
            'area_head_zone': assigned_zone or 'All Wards',
            'department_focus': user_dept or 'All Municipal Departments',
            'summary': {
                'total_complaints': total_complaints,
                'unassigned': unassigned_count,
                'in_progress': in_progress_count,
                'resolved': resolved_count,
                'high_priority': high_priority_count,
                'overdue': overdue_count
            },
            'mostly_complained': [serialize_item(c) for c in mostly_complained],
            'unassigned_queue': [serialize_item(c) for c in unassigned_issues],
            'charts': {
                'ward_breakdown': ward_breakdown,
                'department_breakdown': department_breakdown,
                'category_breakdown': category_breakdown,
                'status_breakdown': status_breakdown,
            },
            'available_staff': staff_data
        })

class DepartmentDashboardAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        dept_name = getattr(request.user.profile, 'department_name', '')
        
        # Allow service department staff, traffic officers, area heads, and admins
        if role not in [UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER, UserRole.AREA_HEAD, UserRole.ADMIN] and not request.user.is_staff:
            return Response({'error': 'Permission denied.'}, status=403)

        queryset = Complaint.objects.select_related('citizen', 'assigned_to')
        if role in [UserRole.SERVICE_DEPARTMENT, UserRole.TRAFFIC_OFFICER]:
            if dept_name:
                queryset = queryset.filter(Q(assigned_department__icontains=dept_name) | Q(assigned_to=request.user))
            else:
                queryset = queryset.filter(assigned_to=request.user)

        # Filtering parameters
        status_filter = request.query_params.get('status')
        priority_filter = request.query_params.get('priority')
        category_filter = request.query_params.get('category')
        is_overdue = request.query_params.get('overdue')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if category_filter:
            queryset = queryset.filter(category=category_filter)

        now = timezone.now()
        if is_overdue == 'true':
            queryset = queryset.filter(
                deadline__lt=now,
                status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
            )

        total_assigned = queryset.count()
        in_progress = queryset.filter(status=ComplaintStatus.IN_PROGRESS).count()
        submitted = queryset.filter(status=ComplaintStatus.SUBMITTED).count()
        resolved = queryset.filter(status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]).count()
        urgent = queryset.filter(priority__in=['High', 'Urgent'], status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]).count()
        overdue_count = queryset.filter(
            deadline__lt=now,
            status__in=[ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
        ).count()

        # Ordering
        sort_by = request.query_params.get('sort', '-created_at')
        if sort_by == 'deadline':
            recent_assigned = queryset.order_by('deadline', '-created_at')[:15]
        elif sort_by == 'priority':
            recent_assigned = queryset.order_by('-priority', '-created_at')[:15]
        else:
            recent_assigned = queryset.order_by('-created_at')[:15]

        # Utility service requests
        water_reqs = WaterServiceRequest.objects.filter(status__in=['Submitted', 'In Progress']).count()
        elec_reqs = ElectricityServiceRequest.objects.filter(status__in=['Submitted', 'In Progress']).count()

        return Response({
            'department_name': dept_name or 'Municipal Service Department',
            'summary': {
                'total_assigned': total_assigned,
                'in_progress': in_progress,
                'submitted': submitted,
                'resolved': resolved,
                'urgent': urgent,
                'overdue': overdue_count,
                'pending_water_requests': water_reqs,
                'pending_elec_requests': elec_reqs
            },
            'assigned_complaints': [
                {
                    'id': c.id,
                    'ref': c.complaint_ref,
                    'citizen_name': c.citizen.get_full_name() or c.citizen.username,
                    'title': c.title,
                    'category': c.category,
                    'ward': c.ward or 'General',
                    'location': c.location,
                    'description': c.description,
                    'status': c.status,
                    'priority': c.priority,
                    'priority_reason': c.priority_reason,
                    'deadline': c.deadline,
                    'is_overdue': c.is_overdue,
                    'support_count': c.support_count,
                    'resolution_details': c.resolution_details,
                    'created_at': c.created_at
                }
                for c in recent_assigned
            ]
        })

class TrafficOfficerDashboardAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = getattr(request.user.profile, 'role', UserRole.CITIZEN)
        dept_name = getattr(request.user.profile, 'department_name', '').lower()
        
        is_traffic_authorized = (
            role in [UserRole.TRAFFIC_OFFICER, UserRole.ADMIN, UserRole.AREA_HEAD] or
            (role == UserRole.SERVICE_DEPARTMENT and 'traffic' in dept_name) or
            request.user.is_staff
        )

        if not is_traffic_authorized:
            return Response({'error': 'Permission denied.'}, status=403)

        all_incidents = TrafficIncident.objects.all()
        active_incidents = all_incidents.filter(status__in=[IncidentStatus.ACTIVE, IncidentStatus.INVESTIGATING]).count()
        critical_incidents = all_incidents.filter(severity=IncidentSeverity.CRITICAL, status__in=[IncidentStatus.ACTIVE, IncidentStatus.INVESTIGATING]).count()
        road_closures = all_incidents.filter(incident_type=IncidentType.ROAD_CLOSURE, status__in=[IncidentStatus.ACTIVE, IncidentStatus.INVESTIGATING]).count()
        resolved_count = all_incidents.filter(status=IncidentStatus.RESOLVED).count()

        citizen_reports_pending = TrafficCitizenReport.objects.filter(status='Submitted').count()

        recent_active = all_incidents.filter(status__in=[IncidentStatus.ACTIVE, IncidentStatus.INVESTIGATING]).order_by('-created_at')[:6]
        recent_resolved = all_incidents.filter(status=IncidentStatus.RESOLVED).order_by('-updated_at')[:4]
        pending_reports = TrafficCitizenReport.objects.filter(status='Submitted').order_by('-created_at')[:4]

        return Response({
            'officer_zone': request.user.profile.assigned_zone or 'Metro Traffic Sector',
            'summary': {
                'active_incidents': active_incidents,
                'critical_incidents': critical_incidents,
                'road_closures': road_closures,
                'resolved_count': resolved_count,
                'citizen_reports_pending': citizen_reports_pending
            },
            'active_incidents': [
                {
                    'id': i.id,
                    'title': i.title,
                    'incident_type': i.incident_type,
                    'location': i.location,
                    'severity': i.severity,
                    'status': i.status,
                    'description': i.description,
                    'estimated_clearance': i.estimated_clearance,
                    'is_public_alert': i.is_public_alert,
                    'created_at': i.created_at
                }
                for i in recent_active
            ],
            'recent_resolved': [
                {
                    'id': i.id,
                    'title': i.title,
                    'location': i.location,
                    'severity': i.severity,
                    'updated_at': i.updated_at
                }
                for i in recent_resolved
            ],
            'pending_citizen_reports': [
                {
                    'id': r.id,
                    'title': r.title,
                    'location': r.location,
                    'incident_type': r.incident_type,
                    'citizen_name': r.citizen.get_full_name() or r.citizen.username,
                    'created_at': r.created_at
                }
                for r in pending_reports
            ]
        })

