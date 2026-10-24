import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, MapPin, User, Building, AlertCircle, 
  CheckCircle2, FileText, Send, ShieldAlert, Sparkles,
  ThumbsUp, UserCheck, AlertTriangle, Check, RefreshCw, XCircle, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supporting, setSupporting] = useState(false);
  const navigate = useNavigate();

  // Action form state
  const [newStatus, setNewStatus] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [assignedDept, setAssignedDept] = useState('');
  const [priority, setPriority] = useState('');
  const [priorityReason, setPriorityReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  // Modals for workflow
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [ackResolutionDetails, setAckResolutionDetails] = useState('');

  // Citizen confirmation & reopen modals
  const [showCitizenConfirmModal, setShowCitizenConfirmModal] = useState(false);
  const [citizenRemarks, setCitizenRemarks] = useState('');
  const [showCitizenReopenModal, setShowCitizenReopenModal] = useState(false);
  const [citizenReopenReason, setCitizenReopenReason] = useState('');

  const isEmployee = role === 'EMPLOYEE' || role === 'SERVICE_DEPARTMENT' || role === 'TRAFFIC_OFFICER';
  const canManage = role === 'ADMIN' || role === 'AREA_HEAD';
  const canUpdateStatus = canManage || isEmployee;

  const loadComplaint = async () => {
    try {
      const [data, staffRes] = await Promise.all([
        api.complaints.get(id),
        canManage ? api.auth.getStaff() : Promise.resolve([])
      ]);

      setComplaint(data);
      setNewStatus(data.status);
      setAssignedToId(data.assigned_to_id || data.assigned_to?.id || '');
      setAssignedDept(data.assigned_department || '');
      setPriority(data.priority || 'Medium');
      setPriorityReason(data.priority_reason || '');
      setDeadline(data.deadline ? data.deadline.substring(0, 16) : '');
      setResolutionDetails(data.resolution_details || '');
      setStaffList(staffRes || []);
    } catch (err) {
      setError(err.message || 'Unable to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const handleSupport = async () => {
    setSupporting(true);
    try {
      const res = await api.complaints.support(id);
      setComplaint((prev) => ({
        ...prev,
        support_count: res.support_count,
        is_supported_by_me: res.supported
      }));
    } catch (err) {
      alert(err.message || 'Failed to toggle support.');
    } finally {
      setSupporting(false);
    }
  };

  // Step 2 & 3: Area Head Confirm Complaint
  const handleConfirmComplaint = async () => {
    setUpdating(true);
    try {
      await api.complaints.update(id, { 
        action: 'confirm', 
        notes: `Complaint verified and confirmed by Area Head ${user?.name || user?.username}.` 
      });
      setUpdateMsg('Complaint verified and confirmed!');
      loadComplaint();
    } catch (err) {
      alert(err.message || 'Failed to confirm complaint.');
    } finally {
      setUpdating(false);
    }
  };

  // Step 2: Request Clarification
  const handleRequestClarification = async () => {
    const reason = prompt('Specify clarification needed from citizen:');
    if (!reason) return;
    setUpdating(true);
    try {
      await api.complaints.update(id, { 
        action: 'request_clarification', 
        notes: reason 
      });
      setUpdateMsg('Clarification request logged.');
      loadComplaint();
    } catch (err) {
      alert(err.message || 'Failed to request clarification.');
    } finally {
      setUpdating(false);
    }
  };

  // Step 5: Employee Submits Completion
  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!completionRemarks.trim()) {
      alert('Please enter completion remarks describing the work done.');
      return;
    }
    setUpdating(true);
    try {
      await api.complaints.update(id, {
        action: 'submit_completion',
        completion_remarks: completionRemarks,
        notes: workNotes || 'Field work completed; submitted for Area Head verification.'
      });
      setShowCompletionModal(false);
      setCompletionRemarks('');
      setWorkNotes('');
      setUpdateMsg('Completion remarks submitted to Area Head for verification!');
      loadComplaint();
    } catch (err) {
      alert(err.message || 'Failed to submit completion.');
    } finally {
      setUpdating(false);
    }
  };

  // Step 6: Area Head Acknowledges Completion (Resolved)
  const handleAcknowledgeSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.complaints.update(id, {
        action: 'acknowledge',
        resolution_details: ackResolutionDetails || complaint.completion_remarks || 'Resolution verified and acknowledged by Area Head.'
      });
      setShowAcknowledgeModal(false);
      setUpdateMsg('Complaint verified and acknowledged as Resolved!');
      loadComplaint();
    } catch (err) {
      alert(err.message || 'Failed to acknowledge resolution.');
    } finally {
      setUpdating(false);
    }
  };

  // Step 6: Area Head Returns to Field Staff
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) {
      alert('Please provide the return reason explaining further work needed.');
      return;
    }
    setUpdating(true);
    try {
      await api.complaints.update(id, {
        action: 'return',
        return_reason: returnReason,
        notes: `Returned by Area Head: ${returnReason}`
      });
      setShowReturnModal(false);
      setReturnReason('');
      setUpdateMsg('Returned to field staff for further work.');
      loadComplaint();
    } catch (err) {
      alert(err.message || 'Failed to return complaint.');
    } finally {
      setUpdating(false);
    }
  };

  // Step 7: Citizen Confirms Resolution (Closed)
  const handleCitizenConfirm = async (e) => {
    if (e) e.preventDefault();
    setUpdating(true);
    try {
      await api.complaints.update(id, {
        action: 'confirm_resolution',
        notes: citizenRemarks || 'Citizen verified and confirmed that the issue has been successfully resolved.'
      });
      setShowCitizenConfirmModal(false);
      setCitizenRemarks('');
      setUpdateMsg('Thank you! You have confirmed the resolution. This complaint is now officially Closed.');
      loadComplaint();
    } catch (err) {
      alert(err.message || 'Failed to confirm resolution.');
    } finally {
      setUpdating(false);
    }
  };

  // Step 7: Citizen Reports Issue Still Unresolved (Reopen to In Progress)
  const handleCitizenReopen = async (e) => {
    if (e) e.preventDefault();
    if (!citizenReopenReason.trim()) {
      alert('Please explain what remains unresolved or requires further action.');
      return;
    }
    setUpdating(true);
    try {
      await api.complaints.update(id, {
        action: 'reopen',
        return_reason: citizenReopenReason,
        notes: `Citizen reported still unresolved: ${citizenReopenReason}`
      });
      setShowCitizenReopenModal(false);
      setCitizenReopenReason('');
      setUpdateMsg('Issue reported as unresolved and returned to department work queue.');
      loadComplaint();
    } catch (err) {
      alert(err.message || 'Failed to reopen complaint.');
    } finally {
      setUpdating(false);
    }
  };

  // General Update (Area Head triage / assignment / Employee progress)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateMsg('');

    try {
      const payload = {
        notes: workNotes,
      };

      if (canManage) {
        payload.status = newStatus;
        payload.assigned_to = assignedToId || null;
        payload.priority = priority;
        payload.priority_reason = priorityReason;
        payload.deadline = deadline || null;
        if (assignedDept) {
          payload.assigned_department = assignedDept;
        }
        if (newStatus === 'Resolved' && resolutionDetails) {
          payload.resolution_details = resolutionDetails;
        }
      } else if (isEmployee) {
        // Employee can only update to In Progress
        if (newStatus === 'In Progress' || newStatus === 'Assigned') {
          payload.status = newStatus;
        } else if (newStatus === 'Resolved') {
          alert('Employees must use "Submit Completion for Verification" to resolve tasks with Area Head acknowledgement.');
          setUpdating(false);
          return;
        }
      }

      await api.complaints.update(id, payload);
      setWorkNotes('');
      setUpdateMsg('Complaint updated successfully!');
      setTimeout(() => setUpdateMsg(''), 3000);
      loadComplaint();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-2">{error || 'Complaint not found.'}</p>
        <Link
          to="/complaints"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Complaints
        </Link>
      </div>
    );
  }

  const isOverdue = complaint.is_overdue;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={isEmployee ? '/employee/tasks' : role === 'AREA_HEAD' ? '/area-head/queue' : '/complaints'}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to {isEmployee ? 'Work Queue' : role === 'AREA_HEAD' ? 'Area Queue' : 'Complaints List'}
        </Link>

        {role === 'AREA_HEAD' && (
          <Link
            to="/area-head/dashboard"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            ← Area Head Operations
          </Link>
        )}
      </div>

      {/* Header card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {complaint.complaint_ref}
            </span>
            <span className="font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
              Ward: {complaint.ward || 'General'}
            </span>
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />

            {/* Overdue Badge */}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-red-600 text-white px-2.5 py-0.5 rounded animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                OVERDUE
              </span>
            )}

            {/* Confirmation status badge */}
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
              complaint.is_confirmed 
                ? 'bg-teal-50 text-teal-800 border-teal-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {complaint.is_confirmed ? '✓ Confirmed by Area Head' : '⏳ Pending Review'}
            </span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mt-2">{complaint.title}</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {complaint.location}
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-2">
          {/* Community Support Button */}
          <button
            onClick={handleSupport}
            disabled={supporting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              complaint.is_supported_by_me
                ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400/30'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${complaint.is_supported_by_me ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
            <span>{complaint.is_supported_by_me ? 'Supported (+1)' : '+1 Support Issue'}</span>
            <span className="px-1.5 py-0.2 bg-amber-200/80 text-amber-950 rounded-full text-[10px]">
              {complaint.support_count || 0}
            </span>
          </button>

          <p className="text-[11px] text-slate-400">
            Lodged: {new Date(complaint.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      {/* SLA & DURATION ANALYSIS PANEL (All Roles) */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Resolution Timeline & SLA Analysis
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Lifecycle Step: {
              complaint.status === 'Submitted' ? '1: Submitted (Citizen)' :
              complaint.status === 'Under Review' || complaint.status === 'Needs Clarification' ? '2: Area Head Review' :
              complaint.status === 'Assigned' ? '3: Assigned to Employee' :
              complaint.status === 'In Progress' ? '4: In Progress (Field Work)' :
              complaint.status === 'Pending Verification' ? '5: Pending Area Head Verification' :
              '6: Acknowledged & Resolved'
            }
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Expected Duration</p>
            <p className="font-bold text-blue-300 text-sm mt-0.5">{complaint.expected_duration || 'Standard SLA'}</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Target SLA Deadline</p>
            <p className={`font-bold text-sm mt-0.5 ${isOverdue ? 'text-red-400 font-extrabold' : 'text-slate-200'}`}>
              {complaint.deadline ? new Date(complaint.deadline).toLocaleDateString() : 'Pending Triage'}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Elapsed Duration</p>
            <p className="font-bold text-slate-200 text-sm mt-0.5">{complaint.elapsed_duration || 'Just logged'}</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">
              {complaint.status === 'Resolved' ? 'Actual Resolution Time' : isOverdue ? 'Overdue By' : 'Remaining Time'}
            </p>
            <p className={`font-bold text-sm mt-0.5 ${
              complaint.status === 'Resolved' ? 'text-emerald-400' :
              isOverdue ? 'text-red-400 font-extrabold' : 'text-emerald-400'
            }`}>
              {complaint.status === 'Resolved' ? (complaint.actual_duration || 'Resolved') :
               isOverdue ? (complaint.overdue_duration || 'Overdue') :
               (complaint.remaining_time || 'Within SLA')}
            </p>
          </div>
        </div>
      </div>

      {/* RETURNED BY AREA HEAD BANNER */}
      {complaint.return_reason && complaint.status !== 'Resolved' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start space-x-3 text-amber-900 shadow-xs">
          <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Returned by Area Head for Further Work
            </p>
            <p className="text-xs text-amber-900 mt-1 font-medium">{complaint.return_reason}</p>
            <p className="text-[11px] text-amber-700 mt-1">Please address the required work remarks and resubmit completion for verification.</p>
          </div>
        </div>
      )}

      {/* PENDING VERIFICATION BANNER */}
      {complaint.status === 'Pending Verification' && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start space-x-3 text-purple-900 shadow-xs">
          <Clock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-800">
                Work Completed — Awaiting Area Head Acknowledgement
              </p>
              {complaint.completion_submitted_at && (
                <span className="text-[10px] text-purple-600 font-mono">
                  {new Date(complaint.completion_submitted_at).toLocaleString()}
                </span>
              )}
            </div>
            {complaint.completion_remarks && (
              <p className="text-xs text-purple-950 mt-1 bg-white/70 p-2.5 rounded-xl border border-purple-100">
                <strong>Completion Remarks:</strong> {complaint.completion_remarks}
              </p>
            )}

            {canManage && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAckResolutionDetails(complaint.completion_remarks || '');
                    setShowAcknowledgeModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  ✓ Acknowledge & Confirm Resolution
                </button>
                <button
                  type="button"
                  onClick={() => setShowReturnModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  ↩ Return for Further Work
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complaint Details & Citizen Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Description */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Grievance Description</span>
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
              {complaint.description}
            </p>

            {complaint.priority_reason && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                <p className="font-bold text-amber-900 uppercase text-[10px] tracking-wider mb-0.5">Management Priority Reason:</p>
                <p className="text-amber-800">{complaint.priority_reason}</p>
              </div>
            )}
          </div>

          {/* Resolution Details (if available) */}
          {complaint.resolution_details && (
            <div className="bg-emerald-50/70 p-6 rounded-2xl border border-emerald-200 shadow-xs">
              <h3 className="font-bold text-sm text-emerald-900 mb-2 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Department Resolution Summary</span>
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed whitespace-pre-line">
                {complaint.resolution_details}
              </p>
              {complaint.acknowledged_by && (
                <p className="text-[10px] text-emerald-700 font-semibold mt-3 pt-2 border-t border-emerald-200">
                  Acknowledged & Confirmed by {complaint.acknowledged_by} on {complaint.acknowledged_at ? new Date(complaint.acknowledged_at).toLocaleDateString() : 'N/A'}
                </p>
              )}
            </div>
          )}

          {/* Status History Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Audit Log & Status History Timeline</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {complaint.history?.map((h, idx) => (
                <div key={h.id || idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {h.previous_status} → {h.new_status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        by {h.changed_by_name}
                      </span>
                    </div>
                    {h.notes && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {h.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(h.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Meta Info & Staff Actions */}
        <div className="space-y-6">
          {/* Assignment Information */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Assignment & Stakeholders
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Assigned Department</p>
                  <p className="font-bold text-slate-800">{complaint.assigned_department || 'Pending Department'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Assigned Field Staff</p>
                  <p className="font-bold text-slate-800">{complaint.assigned_to_name || 'Unassigned'}</p>
                </div>
              </div>

              {complaint.deadline && (
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                  <Clock className={`w-4 h-4 shrink-0 ${isOverdue ? 'text-red-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Target Deadline</p>
                    <p className={`font-bold ${isOverdue ? 'text-red-600 font-extrabold' : 'text-slate-800'}`}>
                      {new Date(complaint.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/60 flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Registered Citizen</p>
                  <p className="font-bold text-slate-800">{complaint.citizen_name}</p>
                  {role !== 'CITIZEN' && (
                    <p className="text-[10px] text-slate-500">{complaint.citizen_email} • {complaint.citizen_phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CITIZEN RESOLUTION CONFIRMATION PANEL */}
          {(role === 'CITIZEN' || user?.id === complaint.citizen) && complaint.status === 'Resolved' && (
            <div className="bg-emerald-50 border-2 border-emerald-400 p-5 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-emerald-950 border-b border-emerald-200 pb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Citizen Resolution Confirmation
                </h3>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                The municipal team has reported this grievance as <strong>Resolved</strong>. Please inspect the site and confirm if the work was completed to your satisfaction, or report it if the problem persists.
              </p>
              {complaint.resolution_details && (
                <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs">
                  <p className="font-semibold text-slate-700">Official Resolution Details:</p>
                  <p className="text-slate-600 mt-0.5">{complaint.resolution_details}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCitizenConfirmModal(true)}
                  disabled={updating}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Problem Resolved</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCitizenReopenModal(true)}
                  disabled={updating}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Report Still Unresolved</span>
                </button>
              </div>
            </div>
          )}

          {/* CITIZEN OFFICIALLY CLOSED NOTICE */}
          {(role === 'CITIZEN' || user?.id === complaint.citizen) && complaint.status === 'Closed' && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-700 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Issue Confirmed & Closed</p>
                <p className="text-slate-500 mt-0.5">Thank you for validating this resolution. The civic work order is officially complete.</p>
              </div>
            </div>
          )}

          {/* AREA HEAD INITIAL REVIEW ACTIONS */}
          {canManage && !complaint.is_confirmed && complaint.status === 'Submitted' && (
            <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 border-b border-amber-100 pb-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Area Head Initial Triage & Confirmation
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Validate this grievance before prioritizing and assigning to department field staff.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmComplaint}
                  disabled={updating}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                >
                  ✓ Confirm Complaint as Valid
                </button>
                <button
                  type="button"
                  onClick={handleRequestClarification}
                  disabled={updating}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
                >
                  ? Request Citizen Clarification
                </button>
              </div>
            </div>
          )}

          {/* EMPLOYEE ACTIONS PANEL */}
          {isEmployee && (
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-blue-900 border-b border-blue-100 pb-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Employee Work Actions
                </h3>
              </div>

              {updateMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{updateMsg}</span>
                </div>
              )}

              {complaint.status !== 'Resolved' && complaint.status !== 'Closed' && complaint.status !== 'Pending Verification' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowCompletionModal(true)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Completion for Area Head Verification</span>
                  </button>

                  <form onSubmit={handleUpdate} className="space-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Update Progress Log / Work Notes</label>
                      <textarea
                        rows={3}
                        value={workNotes}
                        onChange={(e) => setWorkNotes(e.target.value)}
                        placeholder="Log diagnostic findings, parts ordered, crew status..."
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={updating}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                    >
                      {updating ? 'Saving...' : 'Add Progress Log (In Progress)'}
                    </button>
                  </form>
                </div>
              )}

              {complaint.status === 'Pending Verification' && (
                <p className="text-xs text-purple-700 bg-purple-50 p-3 rounded-xl border border-purple-200 font-medium text-center">
                  Work submitted! Waiting for Area Head inspection and acknowledgement.
                </p>
              )}
            </div>
          )}

          {/* AREA HEAD / ADMIN MANAGEMENT PANEL */}
          {canManage && (
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-blue-900 border-b border-blue-100 pb-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Area Head / Admin Controls
                </h3>
              </div>

              {updateMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{updateMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Needs Clarification">Needs Clarification</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Staff</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Unassigned --</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.department_name || 'Staff'}{st.zone ? ` - ${st.zone}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deadline</label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Reason / Justification</label>
                  <input
                    type="text"
                    value={priorityReason}
                    onChange={(e) => setPriorityReason(e.target.value)}
                    placeholder="e.g. 5+ citizens affected; main arterial road"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Action Notes</label>
                  <textarea
                    rows={2}
                    value={workNotes}
                    onChange={(e) => setWorkNotes(e.target.value)}
                    placeholder="Describe directives or notes..."
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {newStatus === 'Resolved' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Resolution Summary Details</label>
                    <textarea
                      rows={2}
                      value={resolutionDetails}
                      onChange={(e) => setResolutionDetails(e.target.value)}
                      placeholder="Final explanation of how issue was resolved..."
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {updating ? 'Saving Changes...' : 'Save & Update Complaint'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Employee Submit Completion */}
      {showCompletionModal && (
        <Modal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          title={`Submit Completion for Verification (#${complaint.complaint_ref})`}
        >
          <form onSubmit={handleSubmitCompletion} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Document the repairs or actions completed on site. This will transition the issue to <strong>Pending Verification</strong> and notify the Area Head for final acknowledgement.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Completion Remarks (Required) *
              </label>
              <textarea
                rows={4}
                value={completionRemarks}
                onChange={(e) => setCompletionRemarks(e.target.value)}
                placeholder="Detail what was fixed, parts replaced, current site state..."
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Additional Crew / Action Notes (Optional)
              </label>
              <input
                type="text"
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="e.g. Cleared by Field Team Alpha"
                className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {updating ? 'Submitting...' : 'Submit to Area Head'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Area Head Acknowledge */}
      {showAcknowledgeModal && (
        <Modal
          isOpen={showAcknowledgeModal}
          onClose={() => setShowAcknowledgeModal(false)}
          title={`Acknowledge & Confirm Resolution (#${complaint.complaint_ref})`}
        >
          <form onSubmit={handleAcknowledgeSubmit} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Acknowledge that the work completed by field staff meets satisfaction. This marks the complaint as <strong>Resolved</strong> and records the official completion duration.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800">Submitted by Field Staff:</p>
              <p className="text-slate-700 mt-1 italic">"{complaint.completion_remarks || 'Work completed'}"</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Resolution Summary Details
              </label>
              <textarea
                rows={3}
                value={ackResolutionDetails}
                onChange={(e) => setAckResolutionDetails(e.target.value)}
                placeholder="Final summary to be shared with the citizen..."
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAcknowledgeModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {updating ? 'Acknowledging...' : 'Confirm & Acknowledge'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Area Head Return for Further Action */}
      {showReturnModal && (
        <Modal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          title={`Return Issue for Further Work (#${complaint.complaint_ref})`}
        >
          <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Return this complaint to the assigned field staff member with clear instructions on what needs to be redone or finished.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Return Reason & Required Actions (Required) *
              </label>
              <textarea
                rows={4}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Specify what remains incomplete or needs rework..."
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {updating ? 'Returning...' : 'Return to Staff'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Citizen Confirm Resolution */}
      {showCitizenConfirmModal && (
        <Modal
          isOpen={showCitizenConfirmModal}
          onClose={() => setShowCitizenConfirmModal(false)}
          title={`Confirm Problem Resolved (#${complaint.complaint_ref})`}
        >
          <form onSubmit={handleCitizenConfirm} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Please confirm that the reported problem has been resolved on site to your satisfaction. This will officially close the complaint ticket.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Satisfaction Feedback / Remarks (Optional)
              </label>
              <textarea
                rows={3}
                value={citizenRemarks}
                onChange={(e) => setCitizenRemarks(e.target.value)}
                placeholder="Share any feedback about the resolution quality or staff responsiveness..."
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCitizenConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer"
              >
                {updating ? 'Confirming...' : 'Confirm Resolution & Close Issue'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Citizen Report Still Unresolved */}
      {showCitizenReopenModal && (
        <Modal
          isOpen={showCitizenReopenModal}
          onClose={() => setShowCitizenReopenModal(false)}
          title={`Report Issue as Unresolved (#${complaint.complaint_ref})`}
        >
          <form onSubmit={handleCitizenReopen} className="space-y-4 text-xs">
            <p className="text-slate-600">
              If the problem was not fixed or has resurfaced, please describe what still requires attention. This will return the complaint to <strong>In Progress</strong> for field staff.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Issue Description / What is still unresolved? (Required) *
              </label>
              <textarea
                rows={4}
                value={citizenReopenReason}
                onChange={(e) => setCitizenReopenReason(e.target.value)}
                placeholder="Explain what was not completed or what problem is still occurring on site..."
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCitizenReopenModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer"
              >
                {updating ? 'Submitting...' : 'Submit & Reopen Issue'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
