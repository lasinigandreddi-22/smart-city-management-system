import React, { useState, useEffect } from 'react';
import { BellRing, Droplets, Zap, Plus, Trash2, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge } from '../../components/Badge';

export default function UtilityNoticesPage() {
  const [activeTab, setActiveTab] = useState('water'); // 'water' or 'electricity'
  const [waterNotices, setWaterNotices] = useState([]);
  const [elecNotices, setElecNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [noticeType, setNoticeType] = useState('Scheduled Maintenance');
  const [affectedArea, setAffectedArea] = useState('');
  const [description, setDescription] = useState('');
  const [statusVal, setStatusVal] = useState('Active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [w, e] = await Promise.all([
        api.utilities.getWaterNotices(),
        api.utilities.getElectricityNotices(),
      ]);
      setWaterNotices(w || []);
      setElecNotices(e || []);
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateNotice = async (e) => {
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
        notice_type: noticeType,
        affected_area: affectedArea,
        description,
        status: statusVal,
      };

      if (activeTab === 'water') {
        await api.utilities.createWaterNotice(payload);
      } else {
        await api.utilities.createElectricityNotice(payload);
      }

      setShowModal(false);
      setTitle('');
      setAffectedArea('');
      setDescription('');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to publish notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'water') {
        await api.utilities.deleteWaterNotice(deleteTarget.id);
      } else {
        await api.utilities.deleteElectricityNotice(deleteTarget.id);
      }
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      alert('Error deleting notice: ' + err.message);
    }
  };

  const handleToggleResolve = async (notice, type) => {
    const newSt = notice.status === 'Resolved' ? 'Active' : 'Resolved';
    try {
      if (type === 'water') {
        await api.utilities.updateWaterNotice(notice.id, { status: newSt });
      } else {
        await api.utilities.updateElectricityNotice(notice.id, { status: newSt });
      }
      loadData();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const currentList = activeTab === 'water' ? waterNotices : elecNotices;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Utility Notices Management</h1>
            <p className="text-xs text-slate-500">Publish and maintain scheduled maintenance and emergency outage notices</p>
          </div>
        </div>

        <button
          onClick={() => {
            setError('');
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Publish {activeTab === 'water' ? 'Water' : 'Electricity'} Notice
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('water')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'water'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>Water Pipeline Notices ({waterNotices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('electricity')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'electricity'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Power Grid Outages ({elecNotices.length})</span>
        </button>
      </div>

      {/* Notices Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : currentList.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          No {activeTab} notices published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((n) => (
            <div
              key={n.id}
              className={`p-5 rounded-2xl border shadow-xs transition-all ${
                n.status === 'Resolved'
                  ? 'bg-slate-50 border-slate-200 opacity-80'
                  : 'bg-white border-slate-200 hover:shadow'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{n.notice_type}</span>
                  <h4 className="font-bold text-sm text-slate-900 mt-1">{n.title}</h4>
                </div>
                <StatusBadge status={n.status} />
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{n.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Affected Area: <strong className="text-slate-700">{n.affected_area}</strong></span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleResolve(n, activeTab)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    n.status === 'Resolved'
                      ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {n.status === 'Resolved' ? 'Reopen Notice' : 'Mark Resolved'}
                </button>

                <button
                  onClick={() => setDeleteTarget({ id: n.id, title: n.title, type: activeTab })}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  title="Delete Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Notice Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Publish New ${activeTab === 'water' ? 'Water' : 'Electricity'} Notice`}
      >
        <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notice Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Maintenance on Pipeline Feeder 3"
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
                <option value="Emergency Shutdown">Emergency Shutdown / Repair</option>
                <option value="Grid Upgrade">Grid / Infrastructure Upgrade</option>
                <option value="Quality Advisory">Quality Advisory</option>
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
                <option value="Scheduled">Scheduled Future Outage</option>
                <option value="Resolved">Resolved / Restored</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Affected Municipal Area *</label>
            <input
              type="text"
              value={affectedArea}
              onChange={(e) => setAffectedArea(e.target.value)}
              placeholder="e.g. North Zone, Sector 4, 5 and Outer Ring Road"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Description & Citizen Advisory *</label>
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
              {submitting ? 'Publishing...' : 'Publish Public Notice'}
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
