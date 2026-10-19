import React, { useState, useEffect } from 'react';
import { Car, AlertTriangle, ShieldAlert, Plus, CheckCircle2, Clock, MapPin, Compass, Navigation } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function TrafficManagementPage() {
  const { user, role } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [citizenReports, setCitizenReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('Heavy Congestion');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const canManage = role === 'ADMIN' || role === 'TRAFFIC_OFFICER';

  const loadData = async () => {
    try {
      const [incidentsData, reportsData] = await Promise.all([
        api.traffic.getIncidents(),
        api.traffic.getReports(),
      ]);
      setIncidents(incidentsData || []);
      setCitizenReports(reportsData || []);
    } catch (err) {
      console.error('Failed to load traffic data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !description.trim()) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      await api.traffic.createReport({
        title,
        incident_type: incidentType,
        location,
        description,
      });
      setFormSuccess('Traffic problem reported to traffic enforcement division!');
      setTitle('');
      setLocation('');
      setDescription('');
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1500);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveIncident = async (id) => {
    try {
      await api.traffic.updateIncident(id, { status: 'Resolved' });
      loadData();
    } catch (err) {
      alert('Error updating incident: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Traffic Management & Road Advisory</h1>
            <p className="text-xs text-slate-500">Live arterial road status, congestion alerts, and citizen traffic incident reporting</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Report Road Problem
        </button>
      </div>

      {/* Demonstration Banner */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>
          <strong>Demonstration Data:</strong> All traffic incidents, road closures, and sensor feeds are simulated for academic OOAD demonstration purposes.
        </span>
      </div>

      {/* Visual Map-Style Traffic Grid Panel */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-teal-400 animate-spin" style={{ animationDuration: '10s' }} />
            <div>
              <h3 className="font-bold text-sm text-white">City Traffic Corridor Status Grid</h3>
              <p className="text-[11px] text-slate-400">Real-time smart signal & camera network</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30">
            Smart Signals: Synchronized
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <p className="text-xs text-slate-400">Inner Ring Road</p>
            <h4 className="text-base font-bold text-emerald-400 mt-1">Normal Flow (42 km/h)</h4>
            <p className="text-[10px] text-slate-400 mt-1">Average delay &lt; 3 mins</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <p className="text-xs text-slate-400">Metro Corridor (North)</p>
            <h4 className="text-base font-bold text-amber-400 mt-1">Moderate Jam (18 km/h)</h4>
            <p className="text-[10px] text-slate-400 mt-1">Girder construction diversion</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <p className="text-xs text-slate-400">Lake View Boulevard</p>
            <h4 className="text-base font-bold text-emerald-400 mt-1">Clear Flow (50 km/h)</h4>
            <p className="text-[10px] text-slate-400 mt-1">Signals running optimal green</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <p className="text-xs text-slate-400">Flyover Northbound Ramp</p>
            <h4 className="text-base font-bold text-rose-400 mt-1">Severe Halt (Lanes Closed)</h4>
            <p className="text-[10px] text-slate-400 mt-1">Collision clearance in progress</p>
          </div>
        </div>
      </div>

      {/* Active Traffic Incidents */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Active Road Incidents & Closure Notices</span>
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            {incidents.filter(i => i.status !== 'Resolved').length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={`p-4 rounded-xl border transition-all ${
                inc.status === 'Resolved'
                  ? 'bg-slate-50 border-slate-200 opacity-75'
                  : 'bg-white border-rose-200 shadow-xs hover:shadow'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{inc.incident_type}</span>
                  <h4 className="font-bold text-xs text-slate-900 mt-0.5">{inc.title}</h4>
                </div>
                <div className="flex items-center space-x-1">
                  <PriorityBadge priority={inc.severity} />
                  <StatusBadge status={inc.status} />
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-2">{inc.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1 text-rose-500" />
                  {inc.location}
                </span>
                {inc.estimated_clearance && (
                  <span className="flex items-center font-medium text-slate-700">
                    <Clock className="w-3 h-3 mr-1 text-amber-500" />
                    Est: {inc.estimated_clearance}
                  </span>
                )}
              </div>

              {canManage && inc.status !== 'Resolved' && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleResolveIncident(inc.id)}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Mark as Resolved
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Citizen Traffic Reports */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-4">
          {canManage ? 'All Citizen Road Problem Reports' : 'Your Submitted Traffic Reports'}
        </h3>

        {citizenReports.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No traffic issues reported yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Officer Action</th>
                  <th className="py-3 px-4">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {citizenReports.map((cr) => (
                  <tr key={cr.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">#TR-{cr.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{cr.title}</td>
                    <td className="py-3 px-4 text-slate-600">{cr.incident_type}</td>
                    <td className="py-3 px-4">{cr.location}</td>
                    <td className="py-3 px-4"><StatusBadge status={cr.status} /></td>
                    <td className="py-3 px-4 text-slate-500">{cr.officer_notes || 'Pending review'}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(cr.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Report Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Report Traffic or Road Problem"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Issue Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Signal light stuck on red / Illegal lane obstruction"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Problem Category
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
            >
              <option value="Heavy Congestion">Heavy Congestion / Traffic Gridlock</option>
              <option value="Traffic Signal Failure">Traffic Signal Malfunction / Blackout</option>
              <option value="Accident">Accident / Vehicle Breakdown</option>
              <option value="Road Hazard / Waterlogging">Waterlogging / Fallen Obstacle</option>
              <option value="Road Closure">Unauthorized Road Closure / Construction</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Location / Intersection / Landmark
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. MG Road Junction with Brigade Cross"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe which direction is blocked and current situation..."
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Send Traffic Report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
