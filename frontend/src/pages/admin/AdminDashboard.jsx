import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, AlertCircle, Droplets, Zap, Car, Receipt, 
  Clock, CheckCircle2, ArrowRight, BarChart3, TrendingUp, ShieldAlert 
} from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.dashboard.getAdminStats();
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load admin stats.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  const s = data?.summary || {};
  const charts = data?.charts || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full uppercase">
            Chief Administrative Control
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">Smart City Governance Dashboard</h1>
          <p className="text-xs text-slate-500">Live operational overview across civic departments, infrastructure, and revenue</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/complaints"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Manage Complaints
          </Link>
          <Link
            to="/admin/utility-notices"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Publish Notices
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Registered Citizens"
          value={s.total_citizens || 0}
          subtitle={`${s.total_staff || 0} staff • ${s.total_area_heads || 0} area heads`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Complaints"
          value={s.total_complaints || 0}
          subtitle={`${s.pending_complaints || 0} pending resolution`}
          icon={AlertCircle}
          color="purple"
        />
        <StatCard
          title="Overdue Complaints"
          value={s.overdue_complaints || 0}
          subtitle="Passed target deadline"
          icon={ShieldAlert}
          color="red"
        />
        <StatCard
          title="Active Utility Notices"
          value={(s.active_water_notices || 0) + (s.active_elec_notices || 0)}
          subtitle={`${s.active_water_notices || 0} water, ${s.active_elec_notices || 0} power`}
          icon={Droplets}
          color="amber"
        />
        <StatCard
          title="Tax Revenue Collected"
          value={`₹${(s.total_tax_collected || 0).toLocaleString('en-IN')}`}
          subtitle={`₹${(s.total_tax_outstanding || 0).toLocaleString('en-IN')} outstanding`}
          icon={Receipt}
          color="emerald"
        />
      </div>

      {/* Top Mostly-Complained Community Issues Section */}
      {data?.mostly_complained && data.mostly_complained.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">High-Impact Community Issues (Mostly Complained)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  Citizen Priority
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Issues ranked by total citizen support votes</p>
            </div>
            <Link to="/admin/complaints" className="text-xs font-bold text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.mostly_complained.map((item, idx) => (
              <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700">{item.ref}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    👍 {item.support_count || 0} Affected Citizens
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{item.ward || 'General'}</span>
                  <span className="font-semibold text-slate-700">{item.assigned_department || 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Distribution Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Complaints by Category</span>
            </h3>
            <span className="text-[11px] text-slate-400">Total: {s.total_complaints}</span>
          </div>

          <div className="space-y-3">
            {charts.category_breakdown?.map((cat) => {
              const pct = s.total_complaints > 0 ? Math.round((cat.count / s.total_complaints) * 100) : 0;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{cat.category}</span>
                    <span className="font-mono text-slate-500">{cat.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Resolution Lifecycle</span>
            </h3>
            <span className="text-[11px] text-slate-400">Status Distribution</span>
          </div>

          <div className="space-y-3">
            {charts.status_breakdown?.map((st) => {
              const pct = s.total_complaints > 0 ? Math.round((st.count / s.total_complaints) * 100) : 0;
              const barColor =
                st.status === 'Resolved' || st.status === 'Closed'
                  ? 'bg-emerald-500'
                  : st.status === 'In Progress'
                  ? 'bg-amber-500'
                  : 'bg-purple-500';

              return (
                <div key={st.status} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${barColor}`} />
                      <span>{st.status}</span>
                    </span>
                    <span className="font-mono text-slate-500">{st.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${barColor} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ward Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Complaints by Ward / Zone</span>
            </h3>
            <span className="text-[11px] text-slate-400">Geographical Spread</span>
          </div>

          <div className="space-y-3">
            {charts.ward_breakdown?.map((w) => {
              const pct = s.total_complaints > 0 ? Math.round((w.count / s.total_complaints) * 100) : 0;
              return (
                <div key={w.ward || 'General'} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{w.ward || 'General'}</span>
                    <span className="font-mono text-slate-500">{w.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Complaints Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Recent Complaints & Status Tracking</h3>
          <Link to="/admin/complaints" className="text-xs font-bold text-blue-600 hover:text-blue-800">
            View All Complaints
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Ref #</th>
                <th className="py-3 px-4">Citizen</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data?.recent_complaints?.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{c.ref}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{c.citizen_name}</td>
                  <td className="py-3 px-4 max-w-xs truncate">{c.title}</td>
                  <td className="py-3 px-4">{c.category}</td>
                  <td className="py-3 px-4"><PriorityBadge priority={c.priority} /></td>
                  <td className="py-3 px-4 text-slate-500">{c.assigned_department || 'Unassigned'}</td>
                  <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
