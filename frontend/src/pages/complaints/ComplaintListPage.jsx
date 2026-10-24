import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Search, Filter, AlertCircle, ArrowRight, 
  ThumbsUp, Clock, MapPin, Building, AlertTriangle, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function ComplaintListPage() {
  const { user, role } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' or 'community' for citizens
  const [supportingId, setSupportingId] = useState(null);
  const navigate = useNavigate();

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (wardFilter) params.ward = wardFilter;

      if (role === 'CITIZEN' && activeTab === 'community') {
        params.community = 'true';
      }

      const data = await api.complaints.list(params);
      setComplaints(data || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, categoryFilter, priorityFilter, wardFilter, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadComplaints();
  };

  const handleSupportToggle = async (e, complaintId) => {
    e.stopPropagation();
    setSupportingId(complaintId);
    try {
      const res = await api.complaints.support(complaintId);
      // Update local item
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? { ...c, support_count: res.support_count, is_supported_by_me: res.supported }
            : c
        )
      );
    } catch (err) {
      alert(err.message || 'Failed to update support.');
    } finally {
      setSupportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {role === 'CITIZEN' ? 'Civic Complaints & Community Issues' : 'Public Complaints Management'}
            </h1>
            <p className="text-xs text-slate-500">
              Track issues, support neighbors on common neighborhood problems, and monitor resolution
            </p>
          </div>
        </div>

        {role === 'CITIZEN' && (
          <Link
            to="/complaints/new"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Lodge New Complaint
          </Link>
        )}
      </div>

      {/* Citizen Tab Switcher (My Complaints vs Community Issues) */}
      {role === 'CITIZEN' && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mine'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            My Submitted Complaints
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'community'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Community Issues ({user?.profile?.assigned_zone || 'My Area'})</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, ref #, location..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Needs Clarification">Needs Clarification</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Electricity">Electricity</option>
            <option value="Roads & Traffic">Roads & Traffic</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Drainage">Drainage</option>
            <option value="Public Safety">Public Safety</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            {activeTab === 'community' 
              ? 'No other community complaints reported in your area yet.'
              : 'No complaints found matching the criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Title & Details</th>
                  <th className="py-3.5 px-4">Ward / Area</th>
                  <th className="py-3.5 px-4">Community Support</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Deadline</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {complaints.map((c) => {
                  const isOverdue = c.is_overdue;
                  const isSupported = c.is_supported_by_me;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                        {c.complaint_ref}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{c.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.location}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {c.ward || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleSupportToggle(e, c.id)}
                          disabled={supportingId === c.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            isSupported
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                          }`}
                          title="Click to support / upvote this issue"
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${isSupported ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                          <span>{c.support_count || 0} Affected</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        {c.status === 'Resolved' && c.actual_duration ? (
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {c.actual_duration}
                            </span>
                            <span className="text-[10px] text-slate-400">Resolved</span>
                          </div>
                        ) : c.deadline ? (
                          <div className="space-y-0.5">
                            <span className={`text-[11px] font-medium flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                              <Clock className="w-3 h-3" />
                              {new Date(c.deadline).toLocaleDateString()}
                            </span>
                            {c.expected_duration && (
                              <p className="text-[10px] text-blue-600 font-medium">{c.expected_duration}</p>
                            )}
                            {isOverdue && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-600 text-white uppercase">
                                Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{c.expected_duration || 'No deadline'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-blue-600 font-semibold">
                        <span className="inline-flex items-center group-hover:translate-x-1 transition-transform">
                          View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
