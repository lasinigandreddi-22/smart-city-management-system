import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Search, CheckCircle2, Clock, Wrench, 
  AlertTriangle, ArrowRight, ThumbsUp, MapPin, Building,
  ArrowUpDown, RotateCcw
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function AssignedRequestsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState('-created_at');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Progress update modal
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [workNotes, setWorkNotes] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);

  // Completion modal
  const [completionComplaint, setCompletionComplaint] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [savingCompletion, setSavingCompletion] = useState(false);

  const loadAssigned = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (overdueOnly) params.overdue = 'true';
      if (sortBy) params.sort = sortBy;
      if (search) params.search = search;

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
  }, [statusFilter, priorityFilter, overdueOnly, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAssigned();
  };

  const openProgressModal = (c) => {
    setActiveComplaint(c);
    setWorkNotes('');
  };

  const openCompletionModal = (c) => {
    setCompletionComplaint(c);
    setCompletionRemarks('');
    setCompletionNotes('');
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!activeComplaint) return;
    setSavingProgress(true);
    try {
      await api.complaints.update(activeComplaint.id, {
        status: 'In Progress',
        notes: workNotes || 'Progress update logged by assigned field staff.'
      });
      setActiveComplaint(null);
      loadAssigned();
    } catch (err) {
      alert('Error updating progress: ' + err.message);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSaveCompletion = async (e) => {
    e.preventDefault();
    if (!completionComplaint) return;
    if (!completionRemarks.trim()) {
      alert('Please enter completion remarks detailing the resolution.');
      return;
    }
    setSavingCompletion(true);
    try {
      await api.complaints.update(completionComplaint.id, {
        action: 'submit_completion',
        completion_remarks: completionRemarks,
        notes: completionNotes || 'Field work completed; submitted for Area Head verification.'
      });
      setCompletionComplaint(null);
      loadAssigned();
    } catch (err) {
      alert('Error submitting completion: ' + err.message);
    } finally {
      setSavingCompletion(false);
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
            <h1 className="text-xl font-bold text-slate-900">Employee Work Queue & Field Tasks</h1>
            <p className="text-xs text-slate-500">
              Assigned department tasks, SLA deadlines, work remarks, and Area Head verification submissions
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl">
          {complaints.length} Assigned Orders
        </span>
      </div>

      {/* Filter and Sort Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job ref, description, street or citizen..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="Assigned">Assigned (Queue)</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Resolved">Resolved</option>
              <option value="Needs Clarification">Needs Clarification</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
            >
              <option value="">All Priorities</option>
              <option value="Urgent">Urgent Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sort Queue By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
            >
              <option value="deadline">⏱️ Deadline (Earliest first)</option>
              <option value="priority">⚡ Priority (Highest first)</option>
              <option value="mostly_complained">👥 Citizen Supports</option>
              <option value="-created_at">📅 Date Assigned (Newest)</option>
            </select>
          </div>

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
              <span>{overdueOnly ? 'Overdue Only: ON' : 'Show Overdue'}</span>
            </button>
          </div>
        </div>
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
                  <th className="py-3.5 px-4">Ref #</th>
                  <th className="py-3.5 px-4">Issue & Ward</th>
                  <th className="py-3.5 px-4">Priority & SLA</th>
                  <th className="py-3.5 px-4">Duration Tracking</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Field Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {complaints.map((c) => {
                  const isOverdue = c.is_overdue;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{c.complaint_ref}</td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{c.title}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded text-[10px] border border-indigo-200">
                            {c.ward || 'General'}
                          </span>
                          <span>•</span>
                          <span className="truncate">{c.location}</span>
                        </div>
                        {c.return_reason && (
                          <p className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 truncate">
                            ↩ Returned by Area Head: {c.return_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <PriorityBadge priority={c.priority} />
                        {c.priority_reason && (
                          <p className="text-[10px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border-l-2 border-amber-400 mt-1 truncate">
                            {c.priority_reason}
                          </p>
                        )}
                        {c.deadline && (
                          <p className={`text-[10px] mt-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                            {isOverdue ? '⚠️ Overdue SLA: ' : 'Target: '}
                            {new Date(c.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          {c.expected_duration && (
                            <p className="text-blue-700 font-medium">SLA: {c.expected_duration}</p>
                          )}
                          {c.status === 'Resolved' ? (
                            <p className="text-emerald-700 font-bold">{c.actual_duration || 'Resolved'}</p>
                          ) : isOverdue ? (
                            <p className="text-red-600 font-extrabold">{c.overdue_duration || 'Overdue'}</p>
                          ) : (
                            <p className="text-emerald-600 font-medium">{c.remaining_time || 'On schedule'}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {c.status === 'Pending Verification' ? (
                          <span className="px-2 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 rounded-lg border border-purple-200">
                            Awaiting Area Head
                          </span>
                        ) : c.status !== 'Resolved' && c.status !== 'Closed' ? (
                          <>
                            <button
                              onClick={() => openProgressModal(c)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                            >
                              Log Notes
                            </button>
                            <button
                              onClick={() => openCompletionModal(c)}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                            >
                              Submit Done
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => navigate(`/complaints/${c.id}`)}
                          className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress Log Modal */}
      {activeComplaint && (
        <Modal
          isOpen={!!activeComplaint}
          onClose={() => setActiveComplaint(null)}
          title={`Update Progress Log (#${activeComplaint.complaint_ref})`}
        >
          <form onSubmit={handleSaveProgress} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <p className="font-bold text-slate-800">{activeComplaint.title}</p>
              <p className="text-[11px] text-slate-500">{activeComplaint.location} • Ward: {activeComplaint.ward || 'General'}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Field Work Remarks / Updates</label>
              <textarea
                rows={3}
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Log actions taken on site, parts used, or crew notes..."
                className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveComplaint(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProgress}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
              >
                {savingProgress ? 'Saving...' : 'Save Progress Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Submit Completion Modal */}
      {completionComplaint && (
        <Modal
          isOpen={!!completionComplaint}
          onClose={() => setCompletionComplaint(null)}
          title={`Submit Completion for Verification (#${completionComplaint.complaint_ref})`}
        >
          <form onSubmit={handleSaveCompletion} className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
              <p className="font-bold text-slate-800">{completionComplaint.title}</p>
              <p className="text-[11px] text-slate-600">{completionComplaint.location} • Ward: {completionComplaint.ward || 'General'}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Completion Remarks (Required for Area Head Acknowledgement) *
              </label>
              <textarea
                rows={4}
                value={completionRemarks}
                onChange={(e) => setCompletionRemarks(e.target.value)}
                placeholder="Explain what repairs were completed, parts installed, current operational status..."
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Field Notes / Diagnostics (Optional)
              </label>
              <input
                type="text"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Field crew Alpha dispatched"
                className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompletionComplaint(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCompletion}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
              >
                {savingCompletion ? 'Submitting...' : 'Submit to Area Head'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
