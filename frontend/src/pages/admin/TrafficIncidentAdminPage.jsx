import React, { useState, useEffect } from 'react';
import { Car, Plus, Trash2, Edit3, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function TrafficIncidentAdminPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('Heavy Congestion');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [statusVal, setStatusVal] = useState('Active');
  const [description, setDescription] = useState('');
  const [clearance, setClearance] = useState('45 mins');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.traffic.getIncidents();
      setIncidents(data || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setTitle('');
    setIncidentType('Heavy Congestion');
    setLocation('');
    setSeverity('Medium');
    setStatusVal('Active');
    setDescription('');
    setClearance('45 mins');
    setIsPublic(true);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (inc) => {
    setEditId(inc.id);
    setTitle(inc.title);
    setIncidentType(inc.incident_type);
    setLocation(inc.location);
    setSeverity(inc.severity);
    setStatusVal(inc.status);
    setDescription(inc.description);
    setClearance(inc.estimated_clearance || '');
    setIsPublic(inc.is_public_alert);
    setError('');
    setShowModal(true);
  };

  const handleSaveIncident = async (e) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !description.trim()) {
      setError('Please fill in required fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title,
        incident_type: incidentType,
        location,
        severity,
        status: statusVal,
        description,
        estimated_clearance: clearance,
        is_public_alert: isPublic,
      };

      if (editId) {
        await api.traffic.updateIncident(editId, payload);
      } else {
        await api.traffic.createIncident(payload);
      }

      setShowModal(false);
      loadIncidents();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncident = async () => {
    if (!deleteTarget) return;
    try {
      await api.traffic.deleteIncident(deleteTarget.id);
      setDeleteTarget(null);
      loadIncidents();
    } catch (err) {
      alert('Error deleting incident: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Traffic Incident & Arterial Control</h1>
            <p className="text-xs text-slate-500">Log road closures, collisions, publish public alerts, and coordinate clearance</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Log Official Incident
        </button>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto"></div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No traffic incidents logged.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Title & Location</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Clearance</th>
                  <th className="py-3.5 px-4">Public Alert</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {incidents.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{i.incident_type}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <p className="font-bold text-slate-900">{i.title}</p>
                      <p className="text-[10px] text-slate-400">{i.location}</p>
                    </td>
                    <td className="py-3.5 px-4"><PriorityBadge priority={i.severity} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={i.status} /></td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">{i.estimated_clearance || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {i.is_public_alert ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                          Internal Only
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(i)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(i)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete Incident"
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

      {/* Log / Edit Incident Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Traffic Incident' : 'Log New Traffic Incident'}
      >
        <form onSubmit={handleSaveIncident} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Incident Headline *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Collision on Flyover Ramp / Waterlogging at Underpass"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Incident Type</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Heavy Congestion">Heavy Congestion</option>
                <option value="Road Closure">Road Closure</option>
                <option value="Accident">Accident</option>
                <option value="Roadwork / Construction">Roadwork / Construction</option>
                <option value="Traffic Signal Failure">Signal Failure</option>
                <option value="Road Hazard / Waterlogging">Road Hazard / Waterlogging</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical (Immediate Alert)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location / Road *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Ring Road Junction 4"
                required
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="Active">Active</option>
                <option value="Investigating">Investigating</option>
                <option value="Clearing">Clearing in Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estimated Clearance Time</label>
            <input
              type="text"
              value={clearance}
              onChange={(e) => setClearance(e.target.value)}
              placeholder="e.g. 45 minutes / 1 hour"
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description & Diversion Instructions *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe lane closures, alternate routes, and emergency assistance dispatched..."
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="isPublic" className="font-semibold text-slate-700">
              Publish as Public Alert on Citizen Dashboard
            </label>
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editId ? 'Update Incident' : 'Publish Incident Alert'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Traffic Incident"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to permanently delete incident record <strong>"{deleteTarget?.title}"</strong>?
          </p>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteIncident}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
            >
              Delete Incident
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
