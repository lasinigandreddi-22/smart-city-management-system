import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search, CheckCircle2, Clock, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function AssignedRequestsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const navigate = useNavigate();

  // Resolution modal state
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [notes, setNotes] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAssigned = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await api.complaints.list(params);
      setComplaints(data || []);
    } catch (err) {
      console.error('Failed to load assigned requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssigned();
  }, [statusFilter, priorityFilter]);

  const openActionModal = (c, defaultSt) => {
    setActiveComplaint(c);
    setNewStatus(defaultSt || c.status);
    setNotes('');
    setResolutionDetails(c.resolution_details || '');
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        status: newStatus,
        notes: notes || `Status updated to ${newStatus} by field team.`,
      };
      if (newStatus === 'Resolved') {
        payload.resolution_details = resolutionDetails;
      }
      await api.complaints.update(activeComplaint.id, payload);
      setActiveComplaint(null);
      loadAssigned();
    } catch (err) {
      alert('Error updating request: ' + err.message);
    } finally {
      setSaving(false);
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
            <h1 className="text-xl font-bold text-slate-900">Assigned Department Service Requests</h1>
            <p className="text-xs text-slate-500">Track field tasks, record diagnostic notes, and mark resolutions</p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl">
          {complaints.length} Assigned Jobs
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="Submitted">Submitted (New)</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
        >
          <option value="">All Priorities</option>
          <option value="Urgent">Urgent Priority</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No work orders currently assigned matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Job Ref #</th>
                  <th className="py-3.5 px-4">Citizen</th>
                  <th className="py-3.5 px-4">Problem & Location</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Field Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{c.complaint_ref}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{c.citizen_name}</p>
                      <p className="text-[10px] text-slate-400">{c.citizen_phone}</p>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm truncate">
                      <p className="font-bold text-slate-900">{c.title}</p>
                      <p className="text-[10px] text-slate-500">{c.location}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{c.description}</p>
                    </td>
                    <td className="py-3.5 px-4"><PriorityBadge priority={c.priority} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {c.status !== 'In Progress' && c.status !== 'Resolved' && (
                        <button
                          onClick={() => openActionModal(c, 'In Progress')}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100"
                        >
                          Start Work
                        </button>
                      )}
                      {c.status !== 'Resolved' && (
                        <button
                          onClick={() => openActionModal(c, 'Resolved')}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                        >
                          Resolve Job
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Field Action Modal */}
      <Modal
        isOpen={!!activeComplaint}
        onClose={() => setActiveComplaint(null)}
        title={`Field Action: ${activeComplaint?.complaint_ref}`}
      >
        {activeComplaint && (
          <form onSubmit={handleSaveAction} className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
              <p className="font-bold text-slate-900">{activeComplaint.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Location: {activeComplaint.location}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Set Work Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="In Progress">In Progress (Field team working on site)</option>
                <option value="Resolved">Resolved (Work completed successfully)</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Field Work Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Diagnostic findings, materials used, crew members dispatched..."
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            {newStatus === 'Resolved' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resolution Summary Details * (Visible to Citizen)
                </label>
                <textarea
                  rows={3}
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  placeholder="Explain exactly what was fixed to resolve the citizen's complaint..."
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-emerald-50/50"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveComplaint(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Update & Notify Citizen'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
