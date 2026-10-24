import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, MapPin, User, Building, AlertCircle, 
  CheckCircle2, FileText, Send, ShieldAlert, Sparkles,
  ThumbsUp, UserCheck, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
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

  const canManage = role === 'ADMIN' || role === 'AREA_HEAD';
  const canUpdateStatus = canManage || role === 'SERVICE_DEPARTMENT' || role === 'TRAFFIC_OFFICER';

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

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateMsg('');

    try {
      const payload = {
        status: newStatus,
        notes: workNotes,
      };

      if (resolutionDetails) {
        payload.resolution_details = resolutionDetails;
      }

      if (canManage) {
        payload.assigned_to = assignedToId || null;
        payload.priority = priority;
        payload.priority_reason = priorityReason;
        payload.deadline = deadline || null;
        if (assignedDept) {
          payload.assigned_department = assignedDept;
        }
      }

      const updated = await api.complaints.update(id, payload);
      setComplaint(updated);
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
          to="/complaints"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Complaints List
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
                <span>Department Resolution Summary</span>
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed whitespace-pre-line">
                {complaint.resolution_details}
              </p>
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

          {/* Action / Update Panel */}
          {canUpdateStatus && (
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-blue-900 border-b border-blue-100 pb-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  {canManage ? 'Area Head / Admin Controls' : 'Field Staff Progress Update'}
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
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Area Head / Admin Controls */}
                {canManage && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Assign Staff</label>
                      <select
                        value={assignedToId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Unassigned --</option>
                        {staffList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.department_name || 'Staff'})
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
                      <label className="block font-semibold text-slate-700 mb-1">Priority Reason / Override Justification</label>
                      <input
                        type="text"
                        value={priorityReason}
                        onChange={(e) => setPriorityReason(e.target.value)}
                        placeholder="e.g. 5+ citizens supported; school route obstruction"
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Remarks / Action Log</label>
                  <textarea
                    rows={2}
                    value={workNotes}
                    onChange={(e) => setWorkNotes(e.target.value)}
                    placeholder="Describe actions taken or updates..."
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
    </div>
  );
}
