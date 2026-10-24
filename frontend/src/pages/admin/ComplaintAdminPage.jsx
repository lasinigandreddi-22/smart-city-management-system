import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Search, Filter, Trash2, Edit3, 
  CheckCircle2, AlertTriangle, ArrowRight 
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function ComplaintAdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const navigate = useNavigate();

  // Edit / Assignment modal state
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assignedDept, setAssignedDept] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [statusVal, setStatusVal] = useState('');
  const [priorityVal, setPriorityVal] = useState('Medium');
  const [priorityReasonVal, setPriorityReasonVal] = useState('');
  const [deadlineVal, setDeadlineVal] = useState('');
  const [notes, setNotes] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [saving, setSaving] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const [data, staff] = await Promise.all([
        api.complaints.list(params),
        api.auth.getStaff()
      ]);
      setComplaints(data || []);
      setStaffList(staff || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, categoryFilter]);

  const openAssignModal = (complaint) => {
    setSelectedComplaint(complaint);
    setAssignedDept(complaint.assigned_department || 'Water & Electricity Services');
    setAssignedToId(complaint.assigned_to_id || complaint.assigned_to?.id || '');
    setStatusVal(complaint.status);
    setPriorityVal(complaint.priority || 'Medium');
    setPriorityReasonVal(complaint.priority_reason || '');
    setDeadlineVal(complaint.deadline ? complaint.deadline.substring(0, 16) : '');
    setNotes('');
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.complaints.update(selectedComplaint.id, {
        assigned_department: assignedDept,
        assigned_to: assignedToId || null,
        status: statusVal,
        priority: priorityVal,
        priority_reason: priorityReasonVal,
        deadline: deadlineVal || null,
        notes: notes || `Directives updated by Admin/Management.`,
      });
      setSelectedComplaint(null);
      loadComplaints();
    } catch (err) {
      alert('Error updating complaint: ' + err.message);
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
      loadComplaints();
    } catch (err) {
      alert('Error deleting complaint: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Complaint Administration & Delegation</h1>
            <p className="text-xs text-slate-500">Review grievances, delegate to civic departments, and enforce SLAs</p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl">
          {complaints.length} Total Complaints
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadComplaints()}
            placeholder="Search reference, citizen, title..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 bg-slate-50 text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
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
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
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

          <button
            onClick={loadComplaints}
            className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No complaints found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Ref #</th>
                  <th className="py-3.5 px-4">Citizen</th>
                  <th className="py-3.5 px-4">Title & Location</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Assigned Dept</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {c.complaint_ref}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.citizen_name}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <p className="font-semibold text-slate-800">{c.title}</p>
                      <p className="text-[10px] text-slate-400">{c.location}</p>
                    </td>
                    <td className="py-3.5 px-4"><PriorityBadge priority={c.priority} /></td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {c.assigned_department || <span className="text-amber-600 font-bold">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3.5 px-4 text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openAssignModal(c)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
                        title="Assign Department"
                      >
                        Assign / Update
                      </button>
                      <button
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                        title="View Full Detail"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
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

      {/* Assignment & Status Modal */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title={`Manage Complaint #${selectedComplaint?.complaint_ref}`}
      >
        {selectedComplaint && (
          <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
              <p className="font-bold text-slate-900">{selectedComplaint.title}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Citizen: {selectedComplaint.citizen_name} • Category: {selectedComplaint.category}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assign Service Department
              </label>
              <select
                value={assignedDept}
                onChange={(e) => setAssignedDept(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Water & Electricity Services">Water & Electricity Services</option>
                <option value="Roads & Traffic Department">Roads & Traffic Department</option>
                <option value="Public Works & Roads Department">Public Works & Roads Department</option>
                <option value="Sanitation Department">Sanitation Department</option>
                <option value="Traffic Control Division">Traffic Control Division</option>
                <option value="Public Health & Drainage">Public Health & Drainage</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assign Field Staff
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="">-- Leave Unassigned --</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.department_name || 'Staff'}) - {st.assigned_zone || 'City-wide'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priorityVal}
                  onChange={(e) => setPriorityVal(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
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
                  value={deadlineVal}
                  onChange={(e) => setDeadlineVal(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Priority Override Justification
              </label>
              <input
                type="text"
                value={priorityReasonVal}
                onChange={(e) => setPriorityReasonVal(e.target.value)}
                placeholder="Reason for priority assignment or escalation..."
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lifecycle Status
              </label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Submitted">Submitted (Awaiting action)</option>
                <option value="Assigned">Assigned to Department</option>
                <option value="In Progress">In Progress (Field Work Started)</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Administrative Directives / Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Directives for field crew or explanation of status change..."
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Save & Forward'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-red-50 text-red-800 rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>Are you sure you want to permanently delete complaint <strong>{deleteTarget?.complaint_ref}</strong>? This will remove all associated status history.</span>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteComplaint}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete Record'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
