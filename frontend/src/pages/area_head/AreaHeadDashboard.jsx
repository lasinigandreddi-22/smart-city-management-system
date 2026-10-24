import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, CheckCircle2, Clock, Users, ArrowUpRight, 
  Filter, Search, UserCheck, Flame, ShieldAlert, Calendar, 
  MapPin, Building, ChevronRight, ThumbsUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AreaHeadDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Quick assignment modal state
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('');
  const [priorityReason, setPriorityReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getAreaHeadStats();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load area operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openAssignModal = (issue) => {
    setSelectedIssue(issue);
    setAssigneeId(issue.assigned_to_id || '');
    setPriority(issue.priority || 'Medium');
    setPriorityReason(issue.priority_reason || '');
    setDeadline(issue.deadline ? issue.deadline.substring(0, 16) : '');
    setActionNotes('');
    setSuccessMsg('');
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    
    setSaving(true);
    try {
      await api.complaints.update(selectedIssue.id, {
        assigned_to: assigneeId || null,
        priority: priority,
        priority_reason: priorityReason,
        deadline: deadline || null,
        notes: actionNotes || `Updated by Area Head ${user?.name || user?.username}.`
      });

      setSuccessMsg(`Issue #${selectedIssue.ref} updated successfully!`);
      setTimeout(() => {
        setSelectedIssue(null);
        setSuccessMsg('');
        fetchDashboardData();
      }, 1200);
    } catch (err) {
      alert(err.message || 'Failed to update issue.');
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledgeQuick = async (issueId, defaultRemarks) => {
    const details = prompt('Enter resolution summary (optional):', defaultRemarks || '');
    try {
      await api.complaints.update(issueId, {
        action: 'acknowledge',
        resolution_details: details || defaultRemarks || 'Resolution verified and acknowledged by Area Head.'
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to acknowledge issue.');
    }
  };

  const handleReturnQuick = async (issueId) => {
    const reason = prompt('Please enter return reason explaining required rework:');
    if (!reason) return;
    try {
      await api.complaints.update(issueId, {
        action: 'return',
        return_reason: reason,
        notes: `Returned by Area Head: ${reason}`
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to return issue.');
    }
  };

  const handleConfirmQuick = async (issueId) => {
    try {
      await api.complaints.update(issueId, {
        action: 'confirm',
        notes: `Complaint verified and confirmed by Area Head ${user?.name || user?.username}.`
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to confirm issue.');
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const mostlyComplained = data?.mostly_complained || [];
  const unassignedQueue = data?.unassigned_queue || [];
  const pendingAcknowledgements = data?.pending_acknowledgements || [];
  const staffList = data?.available_staff || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Assigned Jurisdiction: {data?.area_head_zone || 'Municipal Sector'}</span>
              <span className="text-slate-400">•</span>
              <span>{data?.department_focus || 'Governance'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Area Head Operations Center</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl">
              Triage incoming civic issues, focus immediate action on the <strong>top 5-6 mostly-complained community problems</strong>, enforce deadlines, and assign work orders to field staff.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/area-head/queue"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <span>Full Issue Queue</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Operations Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Area Issues</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total_complaints || 0}</p>
          <span className="text-[10px] text-slate-400">Jurisdiction queue</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Pending Triage</p>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">{summary.unassigned || 0}</p>
          <span className="text-[10px] text-amber-700 font-medium">Unassigned issues</span>
        </div>

        <div className="bg-red-50/70 p-4 rounded-xl border border-red-200 shadow-xs">
          <p className="text-[11px] font-semibold text-red-800 uppercase tracking-wider">Overdue Work</p>
          <p className="text-2xl font-extrabold text-red-900 mt-1">{summary.overdue || 0}</p>
          <span className="text-[10px] text-red-700 font-medium">Missed deadlines</span>
        </div>

        <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-200 shadow-xs">
          <p className="text-[11px] font-semibold text-orange-800 uppercase tracking-wider">High / Urgent</p>
          <p className="text-2xl font-extrabold text-orange-900 mt-1">{summary.high_priority || 0}</p>
          <span className="text-[10px] text-orange-700">Critical attention</span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-extrabold text-blue-900 mt-1">{summary.in_progress || 0}</p>
          <span className="text-[10px] text-blue-700">Active field work</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">{summary.resolved || 0}</p>
          <span className="text-[10px] text-emerald-700">Completed & verified</span>
        </div>
      </div>

      {/* KEY WORKFLOW REQUIREMENT: FIELD COMPLETIONS AWAITING AREA HEAD ACKNOWLEDGEMENT */}
      {pendingAcknowledgements.length > 0 && (
        <div className="bg-purple-900/10 border-2 border-purple-300 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-200/80 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-700" />
              <div>
                <h2 className="text-sm font-bold text-purple-950">
                  Field Completions Awaiting Verification ({pendingAcknowledgements.length})
                </h2>
                <p className="text-xs text-purple-800">
                  Department employees have finished work and submitted completion remarks. Verify and acknowledge resolution or return with feedback.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingAcknowledgements.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-700">{item.ref}</span>
                    <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                      {item.ward} • {item.category}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-0.5">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Submitted by {item.completion_submitted_by || item.assigned_to_name}</p>
                    <p className="italic font-medium text-slate-800">"{item.completion_remarks || 'Work completed'}"</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <Link
                    to={`/complaints/${item.id}`}
                    className="text-slate-500 hover:text-slate-800 font-semibold text-[11px]"
                  >
                    View Details
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReturnQuick(item.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                      Return
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeQuick(item.id, item.completion_remarks)}
                      className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                    >
                      ✓ Acknowledge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KEY REQUIREMENT: TOP 5-6 MOSTLY COMPLAINED / SUPPORTED ISSUES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Priority Community Issues (Top Mostly Complained)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                  Target: Solve Top 5-6 First
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Issues ranked by number of affected citizens supporting the complaint. Take these 5-6 first to maximize civic impact.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {mostlyComplained.length} items flagged
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {mostlyComplained.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No citizen-supported community issues logged in this sector yet.
            </div>
          ) : (
            mostlyComplained.map((issue, idx) => {
              const isOverdue = issue.is_overdue;
              return (
                <div 
                  key={issue.id} 
                  className={`p-4 transition-colors hover:bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    idx === 0 ? 'bg-orange-50/30' : ''
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">#{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800">
                        {issue.ref}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {issue.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {issue.ward}
                      </span>
                      
                      {/* Community Support Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                        <ThumbsUp className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>{issue.support_count} Citizens Affected</span>
                      </span>

                      {/* Priority Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        issue.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                        issue.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {issue.priority} Priority
                      </span>

                      {/* Overdue Badge */}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {issue.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {issue.location}
                      </span>
                      {issue.assigned_department && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {issue.assigned_department}
                        </span>
                      )}
                      {issue.assigned_to_name ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Staff: {issue.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          Unassigned
                        </span>
                      )}
                      {issue.deadline && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          Deadline: {new Date(issue.deadline).toLocaleDateString()} {new Date(issue.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {issue.priority_reason && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 border-l-2 border-amber-400 px-2 py-1 rounded-r">
                        <strong className="text-slate-700">Priority Reason:</strong> {issue.priority_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openAssignModal(issue)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{issue.assigned_to_name ? 'Reassign / Reprioritize' : 'Take & Assign'}</span>
                    </button>
                    <Link
                      to={`/complaints/${issue.id}`}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Unassigned Incoming Queue & Available Staff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unassigned Incoming Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Unassigned Area Complaints</h2>
              <p className="text-xs text-slate-500">Incoming citizen submissions requiring review and staff assignment</p>
            </div>
            <Link to="/area-head/queue" className="text-xs text-blue-600 hover:underline font-semibold">
              View All ({unassignedQueue.length})
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {unassignedQueue.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No unassigned issues in your area right now.</p>
            ) : (
              unassignedQueue.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-blue-700">{item.ref}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{item.category}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">{item.ward}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400">{item.location}</p>
                  </div>
                  <button
                    onClick={() => openAssignModal(item)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shrink-0"
                  >
                    Assign Staff
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Department Staff */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Field Staff Directory</h2>
            <p className="text-xs text-slate-500">Workload across municipal departments</p>
          </div>

          <div className="space-y-2.5">
            {staffList.length === 0 ? (
              <p className="text-xs text-slate-500">No active staff registered.</p>
            ) : (
              staffList.map((st) => (
                <div key={st.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{st.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{st.department || 'General Services'}</p>
                    <p className="text-[10px] text-indigo-600 font-medium">{st.zone || 'City-wide'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                      {st.active_tasks} Active Tasks
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QUICK ASSIGN / REPRIORITIZE MODAL */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign & Prioritize Issue</h3>
                <p className="text-xs text-slate-500">#{selectedIssue.ref} • {selectedIssue.title}</p>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assign to Department Staff
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Leave Unassigned / General Pool --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.department || 'Staff'} ({st.zone || 'All Wards'}) [{st.active_tasks} current tasks]
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  * Issues can only be assigned to staff whose department matches the issue category.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent (Immediate)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Completion Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Priority Override Reason <span className="text-slate-400 font-normal">(Required for auditing)</span>
                </label>
                <input
                  type="text"
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="e.g. 5+ citizens supported; school route obstruction; public hazard"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Action Instructions / Staff Notes
                </label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Specific field instructions for assigned crew..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
