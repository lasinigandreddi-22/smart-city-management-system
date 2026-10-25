import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Search, Filter, Trash2, Edit3, 
  CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck 
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

export default function AreaIssueQueuePage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const navigate = useNavigate();

  // Assignment Modal
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [assignedDept, setAssignedDept] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [statusVal, setStatusVal] = useState('Assigned');
  const [priority, setPriority] = useState('Medium');
  const [priorityReason, setPriorityReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const [complaintsRes, staffRes] = await Promise.all([
        api.complaints.list(params),
        api.auth.getStaff()
      ]);

      setComplaints(complaintsRes || []);
      setStaffList(staffRes || []);
    } catch (err) {
      console.error('Failed to load issues queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, categoryFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIssues();
  };

  const openAssignModal = (issue) => {
    setSelectedIssue(issue);
    setAssignedDept(issue.assigned_department || 'Water Department');
    setAssigneeId(issue.assigned_to_id || issue.assigned_to?.id || '');
    setStatusVal(issue.status || 'Assigned');
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
        assigned_department: assignedDept,
        assigned_to: assigneeId || null,
        status: statusVal,
        priority: priority,
        priority_reason: priorityReason,
        deadline: deadline || null,
        notes: actionNotes || `Assigned and reviewed by Area Head ${user?.name || user?.username}.`
      });

      setSuccessMsg(`Complaint #${selectedIssue.complaint_ref} updated successfully!`);
      setTimeout(() => {
        setSelectedIssue(null);
        setSuccessMsg('');
        fetchIssues();
      }, 1000);
    } catch (err) {
      alert(err.message || 'Failed to update issue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComplaint = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.complaints.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchIssues();
    } catch (err) {
      alert('Error deleting complaint: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const assignedZone = user?.profile?.assigned_zone || 'Ward 1';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Area Issue Queue — {assignedZone}</h1>
            <p className="text-xs text-slate-500">
              Review, delegate to municipal departments, track SLA deadlines, and verify complaint resolutions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
            {complaints.length} Ward Complaints
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, citizen, title..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Needs Clarification">Needs Clarification</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Categories</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Electricity">Electricity</option>
            <option value="Roads & Traffic">Roads & Traffic</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Drainage">Drainage</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            onClick={fetchIssues}
            className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-xs"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Complaints Table (Matching All Complaints Specification) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No complaints found matching filters in {assignedZone}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">REF #</th>
                  <th className="py-3.5 px-4">CITIZEN</th>
                  <th className="py-3.5 px-4">TITLE & LOCATION</th>
                  <th className="py-3.5 px-4">PRIORITY</th>
                  <th className="py-3.5 px-4">ASSIGNED DEPT</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4">DATE</th>
                  <th className="py-3.5 px-4 text-right">ADMIN ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      <button
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="hover:underline font-bold text-blue-600"
                      >
                        {c.complaint_ref}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.citizen_name}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800">{c.title}</p>
                      <p className="text-[10px] text-slate-400">{c.location}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {c.assigned_department ? (
                        <span>{c.assigned_department}</span>
                      ) : (
                        <span className="text-amber-600 font-bold">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openAssignModal(c)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Assign Department & Staff"
                      >
                        Assign / Update
                      </button>
                      <button
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        title="View Full Detail"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors inline-block align-middle"
                        title="Delete Complaint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment & Management Modal */}
      <Modal
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        title={`Manage Complaint #${selectedIssue?.complaint_ref}`}
      >
        {selectedIssue && (
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
              <p className="font-bold text-slate-900">{selectedIssue.title}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Citizen: {selectedIssue.citizen_name} • Location: {selectedIssue.location}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assign Service Department
              </label>
              <select
                value={assignedDept}
                onChange={(e) => setAssignedDept(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value="Water Department">Water Department</option>
                <option value="Electricity Department">Electricity Department</option>
                <option value="Roads, Sanitation & Traffic">Roads, Sanitation & Traffic</option>
                <option value="Property Tax Department">Property Tax Department</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assign Field Staff Member
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value="">-- Leave Unassigned --</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.department_name || 'Staff'}) - {st.assigned_zone || 'Ward'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Update Status</label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Resolution Deadline</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Area Head Directives & Remarks</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={3}
                placeholder="Enter instructions for assigned field staff or remarks for the citizen..."
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50 shadow-xs"
              >
                {saving ? 'Saving Directives...' : 'Save & Delegate'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete Complaint"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to delete complaint <strong>#{deleteTarget?.complaint_ref}</strong>?
          </p>
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteComplaint}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-xs"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
