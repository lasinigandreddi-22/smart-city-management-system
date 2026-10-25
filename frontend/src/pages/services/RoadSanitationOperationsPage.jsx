import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Search, Filter, Wrench, AlertTriangle, 
  CheckCircle2, Clock, MapPin, Eye, Edit3, ArrowRight, ShieldCheck 
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

export default function RoadSanitationOperationsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const navigate = useNavigate();

  // Progress / Completion Modal
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [workStatus, setWorkStatus] = useState('In Progress');
  const [workNotes, setWorkNotes] = useState('');
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const data = await api.complaints.list(params);
      // Filter for road defects, sanitation, and drainage
      const roadSanitationData = (data || []).filter((c) => {
        const cat = (c.category || '').toLowerCase();
        const dept = (c.assigned_department || '').toLowerCase();
        return (
          cat.includes('road') || 
          cat.includes('sanitat') || 
          cat.includes('drain') ||
          dept.includes('road') ||
          dept.includes('sanitat')
        );
      });
      setComplaints(roadSanitationData);
    } catch (err) {
      console.error('Failed to load road & sanitation operations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const openUpdateModal = (c) => {
    setActiveComplaint(c);
    setWorkStatus(c.status === 'Assigned' ? 'In Progress' : c.status);
    setWorkNotes('');
    setCompletionRemarks('');
    setSuccessMsg('');
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!activeComplaint) return;

    setSaving(true);
    try {
      if (workStatus === 'Pending Verification') {
        if (!completionRemarks.trim()) {
          alert('Please enter completion remarks detailing the resolution.');
          setSaving(false);
          return;
        }
        await api.complaints.update(activeComplaint.id, {
          action: 'submit_completion',
          completion_remarks: completionRemarks,
          notes: workNotes || 'Road & sanitation field maintenance completed; submitted for verification.'
        });
      } else {
        await api.complaints.update(activeComplaint.id, {
          status: workStatus,
          notes: workNotes || 'Road/sanitation work update logged by field operations.'
        });
      }

      setSuccessMsg('Work progress updated successfully!');
      setTimeout(() => {
        setActiveComplaint(null);
        setSuccessMsg('');
        loadData();
      }, 1000);
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const totalCount = complaints.length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const pendingVerifCount = complaints.filter((c) => c.status === 'Pending Verification').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Road Defects & Sanitation Operations Handling</h1>
            <p className="text-xs text-slate-500">
              Live tracking, repair directives, and completion submissions for potholes, road resurfacing, and municipal sanitation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl">
            {totalCount} Active Grievances
          </span>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Road & Sanitation</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{totalCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Grievances assigned</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Active In Progress</p>
          <h3 className="text-xl font-bold text-blue-600 mt-1">{inProgressCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Field teams deployed</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Awaiting Sign-off</p>
          <h3 className="text-xl font-bold text-amber-600 mt-1">{pendingVerifCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Submitted for Area Head check</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase">Resolved & Cleared</p>
          <h3 className="text-xl font-bold text-emerald-600 mt-1">{resolvedCount}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Restored to service</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, street, defect details..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-slate-50 text-slate-900"
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
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Resolved">Resolved</option>
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
            onClick={loadData}
            className="px-3 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 shadow-xs"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Complaints Tracking Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No road defects or sanitation complaints found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Ref #</th>
                  <th className="py-3.5 px-4">Citizen & Ward</th>
                  <th className="py-3.5 px-4">Defect Title & Location</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Operations Actions</th>
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
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <p>{c.citizen_name}</p>
                      <span className="text-[10px] text-slate-400 font-normal">{c.ward || 'Ward 1'}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800">{c.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.location}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-teal-800">
                      <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-[11px]">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openUpdateModal(c)}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                        title="Update Work Progress"
                      >
                        Update Progress
                      </button>
                      <button
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        title="View Full Detail"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress & Completion Modal */}
      <Modal
        isOpen={!!activeComplaint}
        onClose={() => setActiveComplaint(null)}
        title={`Update Road/Sanitation Progress #${activeComplaint?.complaint_ref}`}
      >
        {activeComplaint && (
          <form onSubmit={handleSaveProgress} className="space-y-4 text-xs">
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl">
              <p className="font-bold text-slate-900">{activeComplaint.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Location: {activeComplaint.location} • Category: {activeComplaint.category}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Progress Status
              </label>
              <select
                value={workStatus}
                onChange={(e) => setWorkStatus(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value="In Progress">In Progress (Field Repair Underway)</option>
                <option value="Pending Verification">Pending Verification (Work Finished, Submit for Area Head Sign-off)</option>
                <option value="Needs Clarification">Needs Clarification from Citizen</option>
              </select>
            </div>

            {workStatus === 'Pending Verification' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Completion Remarks (Required for Area Head Sign-off) *
                </label>
                <textarea
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  required
                  rows={3}
                  placeholder="Describe repair actions taken (e.g., pothole patched with hot-mix asphalt and compaction tested)..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Field Operations Notes
              </label>
              <textarea
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                rows={2}
                placeholder="Log internal crew notes, equipment used, or material quantities..."
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveComplaint(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold disabled:opacity-50 shadow-xs"
              >
                {saving ? 'Updating...' : 'Save Operations Update'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
