import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Droplets, Zap, Car, AlertCircle, Receipt, 
  ArrowUpRight, Clock, CheckCircle2, ChevronRight, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import { StatusBadge, PriorityBadge } from '../../components/Badge';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const stats = await api.dashboard.getCitizenStats();
        setData(stats);
      } catch (err) {
        setError(err.message || 'Failed to load citizen dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const services = [
    {
      title: 'Water Management',
      desc: 'Check supply schedules, low pressure alerts & report leakages',
      icon: Droplets,
      to: '/services/water',
      color: 'blue',
      badge: `${data?.active_water_notices?.length || 0} notices`,
    },
    {
      title: 'Electricity Management',
      desc: 'View planned grid maintenance, outages & streetlight complaints',
      icon: Zap,
      to: '/services/electricity',
      color: 'amber',
      badge: `${data?.active_electricity_notices?.length || 0} notices`,
    },
    {
      title: 'Traffic Management',
      desc: 'Check real-time road closures, congestion & log citizen reports',
      icon: Car,
      to: '/services/traffic',
      color: 'rose',
      badge: `${data?.active_traffic_alerts?.length || 0} alerts`,
    },
    {
      title: 'Complaint Management',
      desc: 'Lodge civic grievances, track investigation progress & resolution',
      icon: AlertCircle,
      to: '/complaints',
      color: 'purple',
      badge: `${data?.stats?.total_complaints || 0} total`,
    },
    {
      title: 'Property Tax',
      desc: 'Review annual tax assessment bills & make simulated payments',
      icon: Receipt,
      to: '/property-tax',
      color: 'emerald',
      badge: data?.stats?.unpaid_bills_count ? `${data.stats.unpaid_bills_count} due` : 'Paid',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block px-3 py-1 bg-blue-800/80 text-blue-200 rounded-full text-xs font-semibold mb-3 border border-blue-700/50">
            Citizen Public Services Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.first_name || user?.username}!
          </h1>
          <p className="mt-2 text-sm text-blue-200 max-w-2xl leading-relaxed">
            Access municipal civic services, track your lodged complaints, check real-time water and power supply schedules, and manage property tax payments in one unified dashboard.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/complaints/new"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              Lodge a Complaint
              <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </Link>
            <Link
              to="/property-tax"
              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition-colors backdrop-blur-xs border border-white/20"
            >
              View Tax Bills
            </Link>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-blue-700/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Complaints"
          value={data?.stats?.total_complaints || 0}
          subtitle="Submitted by you"
          icon={AlertCircle}
          color="blue"
        />
        <StatCard
          title="In Progress"
          value={data?.stats?.pending_complaints || 0}
          subtitle="Under department review"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Resolved"
          value={data?.stats?.resolved_complaints || 0}
          subtitle="Successfully closed"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Tax Outstanding"
          value={`₹${(data?.stats?.total_tax_outstanding || 0).toLocaleString('en-IN')}`}
          subtitle={`${data?.stats?.unpaid_bills_count || 0} pending bill(s)`}
          icon={Receipt}
          color="rose"
        />
      </div>

      {/* 5 Clickable City Services Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Municipal Services</h2>
            <p className="text-xs text-slate-500">Select a department to view details, request services, or file reports</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.title}
                onClick={() => navigate(svc.to)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {svc.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {svc.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Service</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Live Notices & Recent Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Utility & Traffic Notices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Active City Notices & Advisories</span>
            </h3>
            <span className="text-xs text-slate-400">Real-time alerts</span>
          </div>

          <div className="space-y-3">
            {/* Water Notices */}
            {data?.active_water_notices?.map((n) => (
              <div key={n.id} className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start space-x-3">
                <Droplets className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-900 truncate">{n.title}</p>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Water</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{n.affected_area}</p>
                </div>
              </div>
            ))}

            {/* Electricity Notices */}
            {data?.active_electricity_notices?.map((n) => (
              <div key={n.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-start space-x-3">
                <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-900 truncate">{n.title}</p>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Power</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{n.affected_area}</p>
                </div>
              </div>
            ))}

            {/* Traffic Alerts */}
            {data?.active_traffic_alerts?.map((t) => (
              <div key={t.id} className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-start space-x-3">
                <Car className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-rose-900 truncate">{t.title}</p>
                    <PriorityBadge priority={t.severity} />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{t.location}</p>
                </div>
              </div>
            ))}

            {(!data?.active_water_notices?.length && !data?.active_electricity_notices?.length && !data?.active_traffic_alerts?.length) && (
              <p className="text-xs text-slate-400 py-4 text-center">No active municipal advisories at this time.</p>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span>Your Recent Complaints</span>
            </h3>
            <Link to="/complaints" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_complaints?.length ? (
              data.recent_complaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/complaints/${c.id}`)}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{c.ref}</span>
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">{c.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(c.date).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs">You have not submitted any complaints yet.</p>
                <Link
                  to="/complaints/new"
                  className="inline-block mt-3 text-xs font-bold text-blue-600 hover:underline"
                >
                  Submit your first complaint
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
