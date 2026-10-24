import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Clock, CheckCircle2, AlertTriangle, 
  Droplets, Zap, ArrowRight, ShieldCheck, Wrench, IndianRupee 
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
            Employee Operations • {data?.assigned_zone || 'Municipal Ward'}
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{data?.department_name || 'Department'} Workstation</h1>
          <p className="text-xs text-slate-500">
            Assigned tasks in your authorized department and zone. Execute field work and submit completions for Area Head verification.
          </p>
        </div>

        <Link
          to="/employee/tasks"
          className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <ClipboardList className="w-4 h-4 mr-1.5" />
          Open Assigned Work Queue
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

      {/* Department Financial Summary */}
      {data?.financial_summary && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Department Financial & Revenue Summary</h3>
                <p className="text-xs text-slate-500">
                  {data.financial_summary.department} • Authorized Jurisdiction: {data.financial_summary.ward}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-slate-500">Department Recovery Rate</span>
              <div className="text-base font-bold text-emerald-600">{data.financial_summary.collection_rate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Demanded / Billed</p>
              <p className="text-xl font-black text-slate-900 mt-1">₹{data.financial_summary.total_demanded?.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{data.financial_summary.department} assessments</p>
            </div>
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Received</p>
              <p className="text-xl font-black text-emerald-700 mt-1">₹{data.financial_summary.total_received?.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-600/80 mt-0.5">Realized payments</p>
            </div>
            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-100">
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Total Outstanding</p>
              <p className="text-xl font-black text-amber-700 mt-1">₹{data.financial_summary.total_outstanding?.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-amber-600/80 mt-0.5">Pending collection</p>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Work Queue */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-purple-600" />
            <span>Assigned Civic Complaints & Field Jobs</span>
          </h3>
          <Link to="/employee/tasks" className="text-xs font-bold text-purple-600 hover:text-purple-800">
            View All Work Orders
          </Link>
        </div>

        {data?.assigned_complaints?.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No tasks currently assigned to your account in this zone.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Citizen</th>
                  <th className="py-3 px-4">Problem & Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority & SLA</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data?.assigned_complaints?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{c.ref}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{c.citizen_name}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                      <p className="text-[10px] text-slate-400">{c.location}</p>
                      {c.return_reason && (
                        <p className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 truncate">
                          ↩ Returned: {c.return_reason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">{c.category}</td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={c.priority} />
                      {c.deadline && (
                        <p className={`text-[10px] mt-0.5 ${c.is_overdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          {c.is_overdue ? '⚠️ Overdue' : `Due: ${new Date(c.deadline).toLocaleDateString()}`}
                        </p>
                      )}
                    </td>
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
