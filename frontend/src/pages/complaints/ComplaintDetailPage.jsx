import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, MapPin, User, Building, AlertCircle, 
  CheckCircle2, FileText, Send, ShieldAlert, Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Action form state for authorized department/admin users
  const [newStatus, setNewStatus] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [assignedDepartment, setAssignedDepartment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const canUpdate = role === 'ADMIN' || role === 'SERVICE_DEPARTMENT';

  const loadComplaint = async () => {
    try {
      const data = await api.complaints.get(id);
      setComplaint(data);
      setNewStatus(data.status);
      setAssignedDepartment(data.assigned_department || '');
      setResolutionDetails(data.resolution_details || '');
    } catch (err) {
      setError(err.message || 'Unable to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateMsg('');

    try {
      const payload = {
        status: newStatus,
        notes: workNotes,
      };

      if (resolutionDetails) {
        payload.resolution_details = resolutionDetails;
      }

      if (role === 'ADMIN' && assignedDepartment) {
        payload.assigned_department = assignedDepartment;
      }

      const updated = await api.complaints.update(id, payload);
      setComplaint(updated);
      setWorkNotes('');
      setUpdateMsg('Status and notes updated successfully!');
      setTimeout(() => setUpdateMsg(''), 3000);
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-2">{error || 'Complaint not found.'}</p>
        <Link
          to="/complaints"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Complaints
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb */}
      <Link
        to="/complaints"
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Complaints List
      </Link>

      {/* Header card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {complaint.complaint_ref}
            </span>
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{complaint.title}</h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {complaint.location}
          </p>
        </div>

        <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase">Lodged Date</p>
          <p className="text-xs font-bold text-slate-800 mt-0.5">
            {new Date(complaint.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Category: <strong className="text-slate-700">{complaint.category}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complaint Details & Citizen Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Description */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Grievance Description</span>
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
              {complaint.description}
            </p>
          </div>

          {/* Resolution Details (if available) */}
          {complaint.resolution_details && (
            <div className="bg-emerald-50/70 p-6 rounded-2xl border border-emerald-200 shadow-xs">
              <h3 className="font-bold text-sm text-emerald-900 mb-2 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Department Resolution Summary</span>
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed whitespace-pre-line">
                {complaint.resolution_details}
              </p>
            </div>
          )}

          {/* Status History Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Audit Log & Status History Timeline</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {complaint.history?.map((h, idx) => (
                <div key={h.id || idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {h.previous_status} → {h.new_status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        by {h.changed_by_name}
                      </span>
                    </div>
                    {h.notes && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {h.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(h.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Meta Info & Staff Actions */}
        <div className="space-y-6">
          {/* Assignment Information */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Assignment & Stakeholders
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Assigned Department</p>
                  <p className="font-bold text-slate-800">{complaint.assigned_department || 'Pending Assignment'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Registered Citizen</p>
                  <p className="font-bold text-slate-800">{complaint.citizen_name}</p>
                  {role !== 'CITIZEN' && (
                    <p className="text-[10px] text-slate-500">{complaint.citizen_email} • {complaint.citizen_phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Authorized Staff Update Panel */}
          {canUpdate && (
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-blue-900 border-b border-blue-100 pb-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider">
                  Update Complaint Status
                </h3>
              </div>

              {updateMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{updateMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {role === 'ADMIN' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assign Department</label>
                    <select
                      value={assignedDepartment}
                      onChange={(e) => setAssignedDepartment(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Department...</option>
                      <option value="Water & Electricity Services">Water & Electricity Services</option>
                      <option value="Public Works & Roads Department">Public Works & Roads Department</option>
                      <option value="Sanitation Department">Sanitation Department</option>
                      <option value="Traffic Control Division">Traffic Control Division</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Notes / Progress Update</label>
                  <textarea
                    rows={2}
                    value={workNotes}
                    onChange={(e) => setWorkNotes(e.target.value)}
                    placeholder="Describe actions taken (e.g. crew dispatched)..."
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {newStatus === 'Resolved' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Resolution Summary Details</label>
                    <textarea
                      rows={2}
                      value={resolutionDetails}
                      onChange={(e) => setResolutionDetails(e.target.value)}
                      placeholder="Final explanation of how issue was resolved..."
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {updating ? 'Saving Changes...' : 'Save & Notify Citizen'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
