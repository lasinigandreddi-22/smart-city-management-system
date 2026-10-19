import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, ShieldAlert, Plus, CheckCircle2, Clock, 
  MapPin, AlertTriangle, Compass, Radio 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function TrafficOfficerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick incident modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('Heavy Congestion');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [clearance, setClearance] = useState('30 mins');
  const [submitting, setSubmitting] = useState(false);

  const loadStats = async () => {
    try {
      const res = await api.dashboard.getTrafficStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load traffic stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.traffic.createIncident({
        title,
        incident_type: incidentType,
        location,
        severity,
        status: 'Active',
        description,
        estimated_clearance: clearance,
        is_public_alert: true,
      });
      setShowModal(false);
      setTitle('');
      setLocation('');
      setDescription('');
      loadStats();
    } catch (err) {
      alert('Error creating incident: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.traffic.updateIncident(id, { status: 'Resolved' });
      loadStats();
    } catch (err) {
      alert('Error updating: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto"></div>
      </div>
    );
  }

  const s = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase flex items-center w-fit">
            <Radio className="w-3 h-3 mr-1 text-rose-600 animate-pulse" />
            Enforcement Command Center
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">Traffic Enforcement Dashboard</h1>
          <p className="text-xs text-slate-500">Zone: <strong className="text-slate-800">{data?.officer_zone}</strong> • Arterial Road Flow & Rapid Incident Dispatch</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Broadcast Incident Alert
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Road Incidents"
          value={s.active_incidents || 0}
          subtitle="Real-time obstructions"
          icon={Car}
          color="rose"
        />
        <StatCard
          title="Critical Severity"
          value={s.critical_incidents || 0}
          subtitle="Immediate hazard / collision"
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard
          title="Road Closures"
          value={s.road_closures || 0}
          subtitle="Active diversions in effect"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Citizen Reports Pending"
          value={s.citizen_reports_pending || 0}
          subtitle="Verification required"
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Active Incidents Feed */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Active Roadway Incidents & Diverted Corridors</span>
          </h3>
          <Link to="/admin/traffic" className="text-xs font-bold text-rose-600 hover:text-rose-800">
            Open All Controls
          </Link>
        </div>

        {data?.active_incidents?.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">All traffic corridors running smoothly without active incidents.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.active_incidents?.map((inc) => (
              <div key={inc.id} className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{inc.incident_type}</span>
                      <h4 className="font-bold text-xs text-slate-900 mt-0.5">{inc.title}</h4>
                    </div>
                    <div className="flex items-center space-x-1">
                      <PriorityBadge priority={inc.severity} />
                      <StatusBadge status={inc.status} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">{inc.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-[11px]">
                  <span className="flex items-center text-slate-500">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500" />
                    {inc.location}
                  </span>
                  <button
                    onClick={() => handleResolve(inc.id)}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50"
                  >
                    Clear & Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Citizen Reports */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Recent Citizen Road Incident Submissions</h3>

        {data?.pending_citizen_reports?.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No new citizen reports awaiting verification.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Report</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Reported By</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data?.pending_citizen_reports?.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.title}</td>
                    <td className="py-3 px-4">{r.incident_type}</td>
                    <td className="py-3 px-4">{r.location}</td>
                    <td className="py-3 px-4">{r.citizen_name}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Broadcast Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Broadcast Live Traffic Incident"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Headline *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken Down Tanker Blocking Outer Ring Road Lane 2"
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
                <option value="Road Hazard / Waterlogging">Waterlogging</option>
                <option value="Traffic Signal Failure">Signal Failure</option>
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
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Location / Intersection *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ring Road Junction 5, Northbound"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Clearance Time</label>
            <input
              type="text"
              value={clearance}
              onChange={(e) => setClearance(e.target.value)}
              placeholder="e.g. 30 mins / 1 hour"
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Advisory Description *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail lane closures, diversion route, and patrol units responding..."
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'Broadcasting...' : 'Publish to Citizen Portals'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
