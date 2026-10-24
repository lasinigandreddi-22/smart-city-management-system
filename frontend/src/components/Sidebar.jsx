import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Droplets, Zap, Car, AlertCircle, PlusCircle, 
  Receipt, Users, ClipboardList, BellRing, 
  ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { role } = useAuth();

  const getLinks = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
          { to: '/admin/complaints', label: 'All Complaints', icon: ClipboardList },
          { to: '/admin/citizens', label: 'Citizen Directory', icon: Users },
          { to: '/admin/utility-notices', label: 'Utility Notices', icon: BellRing },
          { to: '/admin/traffic', label: 'Traffic Incidents', icon: Car },
          { to: '/property-tax', label: 'Property Tax Records', icon: Receipt },
        ];
      case 'SERVICE_DEPARTMENT':
        return [
          { to: '/department/dashboard', label: 'Department Overview', icon: LayoutDashboard },
          { to: '/department/assigned', label: 'Assigned Work Orders', icon: ClipboardList },
          { to: '/services/water', label: 'Water Service Operations', icon: Droplets },
          { to: '/services/electricity', label: 'Electricity Operations', icon: Zap },
        ];
      case 'TRAFFIC_OFFICER':
        return [
          { to: '/traffic-officer/dashboard', label: 'Officer Dashboard', icon: LayoutDashboard },
          { to: '/admin/traffic', label: 'Incident Control Center', icon: Car },
          { to: '/services/traffic', label: 'Citizen Road Reports', icon: AlertCircle },
        ];
      default: // CITIZEN
        return [
          { to: '/citizen/dashboard', label: 'Citizen Dashboard', icon: LayoutDashboard },
          { to: '/complaints', label: 'My Complaints', icon: AlertCircle },
          { to: '/complaints/new', label: 'Lodge New Complaint', icon: PlusCircle },
          { to: '/services/water', label: 'Water Services', icon: Droplets },
          { to: '/services/electricity', label: 'Electricity Services', icon: Zap },
          { to: '/services/traffic', label: 'Traffic Alerts & Reports', icon: Car },
          { to: '/property-tax', label: 'Property Tax & Bills', icon: Receipt },
        ];
    }
  };

  const navLinks = getLinks();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 z-50 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow">
              SC
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Smart City</h2>
              <p className="text-[10px] text-teal-400 font-medium">Management System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </p>

          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
          <p className="font-medium text-slate-300">City Civic Services</p>
          <p className="text-[10px] text-slate-400">Active Session: Local Prototype</p>
        </div>
      </aside>
    </>
  );
}
