import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Menu, User, LogOut, Shield, MapPin, 
  Mail, Phone, Calendar, Building, ShieldCheck, 
  ChevronDown, X, Layers 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationDrawer from './NotificationDrawer';

export default function Navbar({ onMobileMenuToggle }) {
  const { user, role, logout, unreadCount } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const userInfoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (userInfoRef.current && !userInfoRef.current.contains(event.target)) {
        setShowUserInfo(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowUserInfo(false);
      }
    }
    if (showUserInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserInfo]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'ADMIN':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Admin</span>;
      case 'SERVICE_DEPARTMENT':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Department</span>;
      case 'TRAFFIC_OFFICER':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Traffic Officer</span>;
      default:
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Citizen</span>;
    }
  };

  const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'User');
  const userInitial = user?.first_name ? user.first_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U');

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            SC
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-base hidden sm:inline">
            Smart City
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 hidden md:inline">
            Management System
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationDrawer
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* User Badge & Interactive Profile Info Popover */}
        <div className="relative pl-2 border-l border-slate-200" ref={userInfoRef}>
          <button
            onClick={() => setShowUserInfo(!showUserInfo)}
            className={`flex items-center space-x-2 p-1.5 rounded-xl transition-all text-left border ${
              showUserInfo 
                ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-500/20 shadow-xs' 
                : 'hover:bg-slate-50 border-transparent'
            }`}
            aria-expanded={showUserInfo}
            aria-haspopup="true"
            title="Click to view your information"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200 shrink-0">
              {userInitial}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {displayName}
              </p>
              <div className="mt-0.5">{getRoleBadge(role)}</div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden md:block ${showUserInfo ? 'rotate-180 text-blue-600' : ''}`} />
          </button>

          {/* User Info Popover Card */}
          {showUserInfo && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
              {/* Header with Avatar & Name */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs text-white font-extrabold text-lg border border-white/30 flex items-center justify-center shadow-xs">
                      {userInitial}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white leading-tight">
                        {displayName}
                      </h3>
                      <p className="text-xs text-blue-100 font-mono">@{user?.username || 'user'}</p>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                          {role || 'CITIZEN'}
                        </span>
                        <span className="inline-flex items-center text-[10px] text-emerald-200 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserInfo(false)}
                    className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Close user info"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* User Detailed Information */}
              <div className="p-4 space-y-2.5 bg-slate-50/70 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  User Information
                </div>

                {/* Email */}
                <div className="flex items-start space-x-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Email Address</p>
                    <p className="font-semibold text-slate-800 truncate">{user?.email || 'No email provided'}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Phone Number</p>
                    <p className="font-semibold text-slate-800">{user?.profile?.phone || 'Not provided'}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start space-x-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Address / Location</p>
                    <p className="font-semibold text-slate-800 leading-snug">{user?.profile?.address || 'City Resident'}</p>
                  </div>
                </div>

                {/* Department if present */}
                {user?.profile?.department_name && (
                  <div className="flex items-start space-x-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <Building className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-slate-400">Assigned Department</p>
                      <p className="font-semibold text-slate-800">{user.profile.department_name}</p>
                    </div>
                  </div>
                )}

                {/* Assigned Zone if present */}
                {user?.profile?.assigned_zone && (
                  <div className="flex items-start space-x-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-slate-400">Assigned Zone / Sector</p>
                      <p className="font-semibold text-slate-800">{user.profile.assigned_zone}</p>
                    </div>
                  </div>
                )}

                {/* Member Since */}
                <div className="flex items-start space-x-3 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Member Since</p>
                    <p className="font-semibold text-slate-800">
                      {new Date(user?.profile?.created_at || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Links */}
              <div className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowUserInfo(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View / Edit Full Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserInfo(false);
                    navigate('/architecture');
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>OOAD & UML Architecture Specs</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserInfo(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
