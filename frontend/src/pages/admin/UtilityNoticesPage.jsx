import React, { useState, useEffect } from 'react';
import { 
  BellRing, Droplets, Zap, Car, Trash2, Plus, Edit3, 
  CheckCircle2, AlertCircle, Calendar, Clock, MapPin, Users, XCircle, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

const NOTICE_CATEGORIES = [
  { id: 'Water Pipeline', label: 'Water Pipeline', icon: Droplets, color: 'blue' },
  { id: 'Power Grid', label: 'Power Grid', icon: Zap, color: 'amber' },
  { id: 'Road and Traffic', label: 'Road and Traffic', icon: Car, color: 'rose' },
  { id: 'Road and Sanitation', label: 'Road and Sanitation', icon: Sparkles, color: 'teal' },
];

const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'City-wide'];

export default function UtilityNoticesPage() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('Water Pipeline');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editNoticeId, setEditNoticeId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Water Pipeline');
  const [noticeType, setNoticeType] = useState('Scheduled Maintenance');
  const [targetWard, setTargetWard] = useState('Ward 1');
  const [affectedArea, setAffectedArea] = useState('');
  const [audience, setAudience] = useState('All');
  const [description, setDescription] = useState('');
  const [statusVal, setStatusVal] = useState('Active');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await api.utilities.getCivicNotices();
      setNotices(data || []);
    } catch (err) {
      console.error('Failed to load civic notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const openCreateModal = () => {
    setEditNoticeId(null);
    setTitle('');
    setCategory(activeTab);
    setNoticeType('Scheduled Maintenance');
    setTargetWard(user?.profile?.assigned_zone || 'Ward 1');
    setAffectedArea('');
    setAudience('All');
    setDescription('');
    setStatusVal('Active');
    setStartTime('');
    setEndTime('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (notice) => {
    setEditNoticeId(notice.id);
    setTitle(notice.title);
    setCategory(notice.category);
    setNoticeType(notice.notice_type || 'Scheduled Maintenance');
    setTargetWard(notice.target_ward || 'Ward 1');
    setAffectedArea(notice.affected_area || '');
    setAudience(notice.audience || 'All');
    setDescription(notice.description || '');
    setStatusVal(notice.status || 'Active');
    setStartTime(notice.start_time ? notice.start_time.substring(0, 16) : '');
    setEndTime(notice.end_time ? notice.end_time.substring(0, 16) : '');
    setError('');
    setShowModal(true);
  };

  const handleSubmitNotice = async (e) => {
    e.preventDefault();
    if (!title.trim() || !affectedArea.trim() || !description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title,
        category,
        notice_type: noticeType,
        target_ward: targetWard,
        affected_area: affectedArea,
        audience,
        description,
        status: statusVal,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
      };

      if (editNoticeId) {
        await api.utilities.updateCivicNotice(editNoticeId, payload);
      } else {
        await api.utilities.createCivicNotice(payload);
      }

      setShowModal(false);
      loadNotices();
    } catch (err) {
      setError(err.message || 'Failed to save civic notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async () => {
    if (!deleteTarget) return;
    try {
      await api.utilities.deleteCivicNotice(deleteTarget.id);
      setDeleteTarget(null);
      loadNotices();
    } catch (err) {
      alert('Error deleting notice: ' + err.message);
    }
  };

  const handleUpdateStatus = async (notice, newStatus) => {
    try {
      await api.utilities.updateCivicNotice(notice.id, { status: newStatus });
      loadNotices();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const currentTabNotices = notices.filter((n) => n.category === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Utility & Civic Notices Management</h1>
            <p className="text-xs text-slate-500">
              Publish and maintain official advisories, disruptions, outages, and maintenance across all 4 utility domains
            </p>
          </div>
        </div>

        {(role === 'ADMIN' || role === 'AREA_HEAD' || role === 'EMPLOYEE' || role === 'SERVICE_DEPARTMENT') && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Publish {activeTab} Notice
          </button>
        )}
      </div>

      {/* 4 Category Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl">
        {NOTICE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.id;
          const count = notices.filter((n) => n.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="truncate">{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notices Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : currentTabNotices.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs space-y-2">
          <BellRing className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-600">No {activeTab} notices published yet.</p>
          <p className="text-[11px] text-slate-400">Notices published in this category will display here and be broadcast to citizens and staff.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentTabNotices.map((n) => {
            const isResolved = n.status === 'Resolved';
            const isCancelled = n.status === 'Cancelled';
            return (
              <div
                key={n.id}
                className={`p-5 rounded-2xl border shadow-xs transition-all flex flex-col justify-between ${
                  isResolved || isCancelled
                    ? 'bg-slate-50 border-slate-200 opacity-80'
                    : 'bg-white border-slate-200 hover:shadow'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                          {n.notice_type}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {n.target_ward || 'City-wide'}
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {n.audience}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    </div>
                    <StatusBadge status={n.status} />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{n.description}</p>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Affected Area: <strong className="text-slate-800">{n.affected_area}</strong></span>
                    </div>
                    {(n.start_time || n.end_time) && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {n.start_time ? new Date(n.start_time).toLocaleString() : 'Immediate'} 
                          {n.end_time ? ` → ${new Date(n.end_time).toLocaleString()}` : ''}
                        </span>
                      </div>
                    )}
                    {n.published_by_name && (
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        Published by {n.published_by_name} ({n.published_by_role || 'Official'})
                      </div>
                    )}
                  </div>
                </div>

                {/* Management Controls */}
                {(role === 'ADMIN' || role === 'AREA_HEAD' || role === 'EMPLOYEE') && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {n.status !== 'Resolved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(n, 'Resolved')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {n.status !== 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(n, 'Cancelled')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          Cancel Notice
                        </button>
                      )}
                      {n.status === 'Resolved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(n, 'Active')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          Reopen
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(n)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit Notice"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(n)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Notice Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editNoticeId ? 'Edit Civic / Utility Notice' : `Publish New ${category} Notice`}
      >
        <form onSubmit={handleSubmitNotice} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notice Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            >
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notice Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Maintenance on Pipeline Feeder 1"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notice Type</label>
              <select
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Scheduled Maintenance">Scheduled Maintenance</option>
                <option value="Emergency Outage">Emergency Outage / Breakdown</option>
                <option value="Traffic Advisory">Traffic & Road Advisory</option>
                <option value="Sanitation Drive">Sanitation & Drainage Drive</option>
                <option value="Infrastructure Upgrade">Infrastructure Upgrade</option>
                <option value="Quality Advisory">Quality Advisory</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Ward / Jurisdiction</label>
              <select
                value={targetWard}
                onChange={(e) => setTargetWard(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                {WARDS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="All">All (Citizens & Employees)</option>
                <option value="Citizens">Citizens Only</option>
                <option value="Employees">Employees Only</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Active">Active Notice</option>
                <option value="Scheduled">Scheduled Future</option>
                <option value="Resolved">Resolved</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Time (Optional)</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Time (Optional)</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Affected Municipal Area *</label>
            <input
              type="text"
              value={affectedArea}
              onChange={(e) => setAffectedArea(e.target.value)}
              placeholder="e.g. North Zone, Sector 1 & 2, Outer Ring Road"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Description & Advisory *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain expected timing, disruption severity, and alternative arrangements..."
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editNoticeId ? 'Update Notice' : 'Publish Public Notice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Utility Notice"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to permanently delete notice <strong>"{deleteTarget?.title}"</strong>?
          </p>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteNotice}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
            >
              Delete Notice
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
