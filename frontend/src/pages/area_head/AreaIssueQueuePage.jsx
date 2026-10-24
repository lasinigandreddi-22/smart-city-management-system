import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Filter, Search, UserCheck, AlertTriangle, Clock, 
  MapPin, Building, ThumbsUp, CheckCircle2, ChevronRight,
  ArrowUpDown, Flame
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AreaIssueQueuePage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('mostly_complained');

  // Assignment Modal
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('');
  const [priorityReason, setPriorityReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = {};
      if (deptFilter) params.department = deptFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (overdueOnly) params.overdue = 'true';
      if (search) params.search = search;
      if (sortBy) params.sort = sortBy;

      const [complaintsRes, staffRes] = await Promise.all([
        api.complaints.list(params),
        api.auth.getStaff()
      ]);

      setComplaints(complaintsRes || []);
      setStaffList(staffRes || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load issues queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [deptFilter, statusFilter, priorityFilter, overdueOnly, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIssues();
  };

  const openAssignModal = (issue) => {
    setSelectedIssue(issue);
    setAssigneeId(issue.assigned_to_id || issue.assigned_to?.id || '');
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
        notes: actionNotes || `Assigned by Area Head ${user?.name || user?.username}.`
      });

      setSuccessMsg(`Issue #${selectedIssue.ref || selectedIssue.complaint_ref} updated successfully!`);
      setTimeout(() => {
        setSelectedIssue(null);
        setSuccessMsg('');
        fetchIssues();
      }, 1200);
    } catch (err) {
      alert(err.message || 'Failed to update issue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Area Issue Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter, prioritize, and assign civic issues across wards and departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/area-head/dashboard"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            ← Operations Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ref #, keyword, location, or street..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Authorized Ward Display */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Authorized Jurisdiction</label>
            <div className="p-2 border border-blue-200 rounded-lg bg-blue-50/70 text-blue-800 font-semibold text-xs flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{user?.profile?.assigned_zone || 'Ward 1'}</span>
            </div>
          </div>

          {/* Department filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">All Departments</option>
              <option value="Roads & Traffic">Roads & Traffic</option>
              <option value="Water & Electricity">Water & Electricity</option>
              <option value="Sanitation">Sanitation</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted (Unassigned)</option>
              <option value="Under Review">Under Review</option>
              <option value="Needs Clarification">Needs Clarification</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sort Queue By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
            >
              <option value="mostly_complained">🔥 Mostly Complained (Supports)</option>
              <option value="deadline">⏱️ Deadline (Earliest)</option>
              <option value="priority">⚡ Priority (Highest)</option>
              <option value="-created_at">📅 Date (Newest)</option>
            </select>
          </div>

          {/* Overdue Toggle */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`w-full p-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                overdueOnly 
                  ? 'bg-red-600 text-white border-red-700 shadow-xs' 
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{overdueOnly ? 'Overdue Only: ON' : 'Filter Overdue'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Issues Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Showing {complaints.length} Issues</span>
          <span>Click any issue to assign field staff, adjust priority, or set deadlines</span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-xs text-slate-400 mt-2">Loading issue queue...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No civic issues match your current filters.
            </div>
          ) : (
            complaints.map((item) => {
              const isOverdue = item.is_overdue;
              return (
                <div 
                  key={item.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.complaint_ref}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {item.ward || 'General'}
                      </span>
                      
                      {/* Supports */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                        <ThumbsUp className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>{item.support_count || 0} Affected</span>
                      </span>

                      {/* Status */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'Assigned' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status}
                      </span>

                      {/* Priority */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                        item.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.priority}
                      </span>

                      {/* Overdue Alert */}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {item.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.location}
                      </span>
                      {item.assigned_department && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {item.assigned_department}
                        </span>
                      )}
                      {item.assigned_to_name ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Staff: {item.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          Unassigned
                        </span>
                      )}
                      {item.deadline && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          Deadline: {new Date(item.deadline).toLocaleDateString()} {new Date(item.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {item.priority_reason && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 border-l-2 border-amber-400 px-2 py-0.5 rounded-r">
                        <strong className="text-slate-700">Reason:</strong> {item.priority_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openAssignModal(item)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{item.assigned_to_name ? 'Reassign / Prioritize' : 'Assign Staff'}</span>
                    </button>
                    <Link
                      to={`/complaints/${item.id}`}
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

      {/* QUICK ASSIGN / REPRIORITIZE MODAL */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign & Prioritize Issue</h3>
                <p className="text-xs text-slate-500">#{selectedIssue.complaint_ref || selectedIssue.ref} • {selectedIssue.title}</p>
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
                      {st.name} — {st.department_name || 'Staff'} ({st.assigned_zone || 'All Wards'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  * Staff must match complaint department: "{selectedIssue.assigned_department || selectedIssue.category}".
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
