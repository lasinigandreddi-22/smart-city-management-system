import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Clock, CheckCircle2, AlertTriangle, 
  Droplets, Zap, ArrowRight, ShieldCheck, Wrench 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function DepartmentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api.dashboard.getDepartmentStats();
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load department dashboard.');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
      </div>
    );
  }

  const s = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full uppercase">
            Service Operations Wing
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{data?.department_name}</h1>
          <p className="text-xs text-slate-500">Service request triage, work order dispatch, and field resolution management</p>
        </div>

        <Link
          to="/department/assigned"
          className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <ClipboardList className="w-4 h-4 mr-1.5" />
          Open Assigned Work Orders
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Assigned Work Orders"
          value={s.total_assigned || 0}
          subtitle="Department responsibility"
          icon={ClipboardList}
          color="purple"
        />
        <StatCard
          title="In Progress"
          value={s.in_progress || 0}
          subtitle="Repair crews dispatched"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Overdue Tasks"
          value={s.overdue || 0}
          subtitle="Passed target SLA"
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Urgent Priority"
          value={s.urgent || 0}
          subtitle="Critical action needed"
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Resolved"
          value={s.resolved || 0}
          subtitle="Verified complete"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Assigned Work Queue */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-purple-600" />
            <span>Assigned Civic Complaints & Field Jobs</span>
          </h3>
          <Link to="/department/assigned" className="text-xs font-bold text-purple-600 hover:text-purple-800">
            View All Work Orders
          </Link>
        </div>

        {data?.assigned_complaints?.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No complaints currently assigned to this department.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Citizen</th>
                  <th className="py-3 px-4">Problem & Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data?.assigned_complaints?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{c.ref}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.citizen_name}</td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <p className="font-semibold text-slate-800">{c.title}</p>
                      <p className="text-[10px] text-slate-400">{c.location}</p>
                    </td>
                    <td className="py-3 px-4">{c.category}</td>
                    <td className="py-3 px-4"><PriorityBadge priority={c.priority} /></td>
                    <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
                      >
                        Process Job
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
