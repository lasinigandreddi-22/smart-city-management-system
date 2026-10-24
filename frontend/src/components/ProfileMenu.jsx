import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, MapPin, Building, ShieldCheck, 
  Calendar, Lock, LogOut, X, ChevronDown, CheckCircle2, 
  AlertCircle, Edit3, Eye, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileMenu() {
  const { user, role, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('view'); // 'view' | 'edit'

  // Edit form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Sync form state when user changes or menu opens
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.profile?.phone || '');
      setAddress(user.profile?.address || '');
    }
  }, [user, isOpen]);

  // Handle outside click & Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveTab('view');
        setSuccessMsg('');
        setErrorMsg('');
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setActiveTab('view');
        setSuccessMsg('');
        setErrorMsg('');
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setActiveTab('view');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    // Client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Email address cannot be empty.');
      setSaving(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      setSaving(false);
      return;
    }

    if (phone.trim().length > 20) {
      setErrorMsg('Phone number cannot exceed 20 characters.');
      setSaving(false);
      return;
    }

    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: trimmedEmail,
        phone: phone.trim(),
        address: address.trim(),
      });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('view');
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (roleName) => {
    switch (roleName) {
      case 'ADMIN':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Administrator</span>;
      case 'SERVICE_DEPARTMENT':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Department Staff</span>;
      case 'TRAFFIC_OFFICER':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Traffic Officer</span>;
      default:
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold px-2 py-0.5 rounded-full">Citizen</span>;
    }
  };

  const displayName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ''}`.trim() 
    : (user?.username || 'User');

  const userInitial = user?.first_name 
    ? user.first_name[0].toUpperCase() 
    : (user?.username ? user.username[0].toUpperCase() : 'U');

  const joinedDate = user?.date_joined || user?.profile?.created_at;
  const formattedJoinedDate = joinedDate 
    ? new Date(joinedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Active Citizen';

  return (
    <div className="relative pl-2 border-l border-slate-200">
      {/* Trigger Button: User Name & Avatar */}
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={`flex items-center space-x-2 p-1.5 rounded-xl transition-all text-left border cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
          isOpen 
            ? 'bg-blue-50/80 border-blue-200 ring-2 ring-blue-500/20 shadow-xs' 
            : 'hover:bg-slate-50 border-transparent'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User profile menu"
        title="Open profile menu"
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
        <ChevronDown 
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden md:block ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`} 
        />
      </button>

      {/* Profile Dropdown Menu Card */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Profile navigation and settings"
          className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100vh-5rem)] flex flex-col"
        >
          {/* Header with Avatar & Name */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white shrink-0">
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
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close profile menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* View / Edit Mode Switcher Tabs */}
            <div className="mt-3 flex rounded-xl bg-black/15 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('view');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'view'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('edit');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mx-4 mt-3 p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center space-x-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-4 mt-3 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center space-x-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="leading-tight font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 text-xs">
            {activeTab === 'view' ? (
              /* TAB 1: VIEW PROFILE */
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Profile Information
                </div>

                {/* Full Name */}
                <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Full Name</p>
                    <p className="font-semibold text-slate-800">{displayName}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Mail className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Email Address</p>
                    <p className="font-semibold text-slate-800 truncate">{user?.email || 'No email provided'}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">System Role</p>
                    <div className="mt-0.5">{getRoleBadge(role)}</div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Phone Number</p>
                    <p className="font-semibold text-slate-800">{user?.profile?.phone || 'Not provided'}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Address / Location</p>
                    <p className="font-semibold text-slate-800 leading-snug">{user?.profile?.address || 'Not provided'}</p>
                  </div>
                </div>

                {/* Department (if staff) */}
                {(user?.profile?.department_name || role === 'SERVICE_DEPARTMENT') && (
                  <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Building className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-slate-400">Department</p>
                      <p className="font-semibold text-slate-800">
                        {user?.profile?.department_name || 'Water & Electricity Services'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Assigned Zone (if traffic officer / present) */}
                {user?.profile?.assigned_zone && (
                  <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-slate-400">Assigned Zone / Sector</p>
                      <p className="font-semibold text-slate-800">{user.profile.assigned_zone}</p>
                    </div>
                  </div>
                )}

                {/* Joined Date */}
                <div className="flex items-start space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Calendar className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-400">Joined Date</p>
                    <p className="font-semibold text-slate-800">{formattedJoinedDate}</p>
                  </div>
                </div>

                {/* Switch to edit button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile Details</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: EDIT PROFILE FORM */
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Editable Profile Details
                </div>

                {/* Read-only Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Username
                    </label>
                    <span className="text-[10px] text-slate-400 flex items-center">
                      <Lock className="w-2.5 h-2.5 mr-1 text-slate-400" /> Read-only
                    </span>
                  </div>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full p-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed font-mono text-xs"
                  />
                </div>

                {/* Read-only Role */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      System Role
                    </label>
                    <span className="text-[10px] text-slate-400 flex items-center">
                      <Lock className="w-2.5 h-2.5 mr-1 text-slate-400" /> Read-only
                    </span>
                  </div>
                  <input
                    type="text"
                    value={role || 'CITIZEN'}
                    disabled
                    className="w-full p-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed text-xs font-semibold"
                  />
                </div>

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs bg-white text-slate-900"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="user@smartcity.gov.in"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs bg-white text-slate-900"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    maxLength={20}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs bg-white text-slate-900"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Residential / Official Address
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, Sector, Ward, City"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs bg-white text-slate-900"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('view');
                      setErrorMsg('');
                    }}
                    disabled={saving}
                    className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl transition-colors text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-xs disabled:opacity-50 shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Action Footer: Logout Button */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
