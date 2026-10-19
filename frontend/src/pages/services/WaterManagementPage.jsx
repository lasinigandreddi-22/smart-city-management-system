import React, { useState, useEffect } from 'react';
import { Droplets, AlertCircle, Plus, CheckCircle2, Clock, Filter, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { StatusBadge } from '../../components/Badge';

export default function WaterManagementPage() {
  const { user, role } = useAuth();
  const [notices, setNotices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Form states
  const [requestType, setRequestType] = useState('Water Leakage');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [meterNumber, setMeterNumber] = useState('');

  const canManage = role === 'ADMIN' || role === 'SERVICE_DEPARTMENT';

  const loadData = async () => {
    try {
      const [noticesData, requestsData] = await Promise.all([
        api.utilities.getWaterNotices(),
        api.utilities.getWaterRequests(),
      ]);
      setNotices(noticesData || []);
      setRequests(requestsData || []);
    } catch (err) {
      console.error('Failed to load water data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!location.trim() || !description.trim()) {
      setFormError('Location and description are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      await api.utilities.createWaterRequest({
        request_type: requestType,
        location,
        description,
        meter_number: meterNumber,
      });
      setFormSuccess('Water service request submitted successfully!');
      setLocation('');
      setDescription('');
      setMeterNumber('');
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1500);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.utilities.updateWaterRequest(id, { status: newStatus });
      loadData();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Water Management Service</h1>
            <p className="text-xs text-slate-500">Monitor municipal pipelines, scheduled supply maintenance & report leakages</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Submit Service Request
        </button>
      </div>

      {/* Water Service Information & Key Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase">Daily Supply Timing</p>
          <h4 className="text-lg font-bold text-slate-900 mt-1">06:00 AM – 10:00 AM</h4>
          <p className="text-xs text-slate-500 mt-1">Evening cycle: 05:30 PM – 08:30 PM</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase">Potable Water Quality</p>
          <h4 className="text-lg font-bold text-emerald-600 mt-1">99.4% Standard Grade</h4>
          <p className="text-xs text-slate-500 mt-1">TDS 140 ppm • WHO Compliant</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase">Emergency Helpline</p>
          <h4 className="text-lg font-bold text-blue-600 mt-1">1800-425-WTR (987)</h4>
          <p className="text-xs text-slate-500 mt-1">24/7 Water Control Room</p>
        </div>
      </div>

      {/* Active Supply Notices */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <span>Scheduled Water Maintenance & Supply Notices</span>
        </h3>

        {notices.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No active water notices.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((n) => (
              <div key={n.id} className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-xs text-blue-900">{n.title}</h4>
                  <StatusBadge status={n.status} />
                </div>
                <p className="text-xs text-slate-600 mt-2">{n.description}</p>
                <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-blue-600" />
                    {n.affected_area}
                  </span>
                  <span className="font-medium text-blue-700">{n.notice_type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Water Service Requests Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {canManage ? 'All Water Service Requests' : 'Your Water Service Requests'}
            </h3>
            <p className="text-xs text-slate-500">Track field inspection, repairs, and pipeline status</p>
          </div>
          <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
            {requests.length} requests
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No water requests submitted yet. Click "Submit Service Request" above to log one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Req ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">#WTR-{r.id}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">{r.request_type}</td>
                    <td className="py-3 px-4 max-w-xs truncate">{r.location}</td>
                    <td className="py-3 px-4 max-w-xs truncate" title={r.description}>{r.description}</td>
                    <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3 px-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                    {canManage && (
                      <td className="py-3 px-4 text-right space-x-1">
                        {r.status !== 'In Progress' && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'In Progress')}
                            className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded hover:bg-amber-100"
                          >
                            In Progress
                          </button>
                        )}
                        {r.status !== 'Resolved' && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'Resolved')}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Request Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Submit Water Service Request"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
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
              Request Type
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Water Leakage">Water Leakage (Underground / Surface Pipe)</option>
              <option value="Supply Interruption">Supply Interruption (No water supply)</option>
              <option value="Low Water Pressure">Low Water Pressure</option>
              <option value="Meter Defect">Meter Defect / Malfunction</option>
              <option value="Pipeline Damage">Pipeline Damage / Burst</option>
              <option value="Water Contamination">Water Contamination / Turbid Water</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Location / Address
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Skyline Residency, Block B, Floor 4 or Street name"
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Consumer / Meter Number (Optional)
            </label>
            <input
              type="text"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              placeholder="e.g. WTR-MTR-8841"
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Detailed Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, intensity, and duration..."
              required
              className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
