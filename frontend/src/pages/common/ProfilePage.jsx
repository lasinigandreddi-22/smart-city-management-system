import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Building, ShieldCheck, 
  Calendar, Lock, CheckCircle2, AlertCircle, Edit3, Save, Loader2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user, role, updateProfile, loading } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.profile?.phone || '');
      setAddress(user.profile?.address || '');
    }
  }, [user]);

  const effectiveRole = (
    role || 
    user?.profile?.role || 
    (user?.is_superuser || user?.is_staff ? 'ADMIN' : 'CITIZEN')
  );

  const getRoleBadge = (roleName) => {
    const r = roleName || effectiveRole;
    switch (r) {
      case 'ADMIN':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1 rounded-full">Administrator</span>;
      case 'AREA_HEAD':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-3 py-1 rounded-full">Area Head</span>;
      case 'EMPLOYEE':
      case 'SERVICE_DEPARTMENT':
      case 'TRAFFIC_OFFICER':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">Employee</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full">Citizen</span>;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-xs text-slate-500 mt-3 font-medium">Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">User Profile Unavailable</h3>
        <p className="text-xs text-slate-500 mt-1">Please sign in to view and manage your profile details.</p>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Email address cannot be empty.');
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
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
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
        month: 'long',
        day: 'numeric'
      })
    : 'Active Account';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md text-white font-extrabold text-3xl border border-white/30 flex items-center justify-center shadow-md">
              {userInitial}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">{displayName}</h1>
                {getRoleBadge(role)}
              </div>
              <p className="text-sm text-blue-100 font-mono">User ID: {user?.profile?.system_user_id || user?.username}</p>
              <p className="text-xs text-blue-200 mt-1">Username: @{user?.username}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsEditing(!isEditing);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isEditing 
                ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30' 
                : 'bg-white text-blue-900 hover:bg-blue-50 shadow-sm'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="m-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="m-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Content */}
        <div className="p-6 sm:p-8">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential / Office Address</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Building, Flat / Unit Number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Portal Role, System User ID, and Username are governed by municipal administration and cannot be edited.</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Credentials</h2>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <span className="text-[11px] text-slate-500">System User ID</span>
                    <p className="text-sm font-bold text-slate-800 font-mono">{user?.profile?.system_user_id || user?.username}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Username</span>
                    <p className="text-sm font-semibold text-slate-800">@{user?.username}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Assigned Ward / Jurisdiction</span>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>{user?.profile?.assigned_zone || 'City-wide'}</span>
                    </p>
                  </div>
                  {user?.profile?.department_name && (
                    <div>
                      <span className="text-[11px] text-slate-500">Department</span>
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-4 h-4 text-emerald-600" />
                        <span>{user?.profile?.department_name}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Details</h2>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <span className="text-[11px] text-slate-500">Email Address</span>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{user?.email || 'Not provided'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Phone Number</span>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{user?.profile?.phone || 'Not provided'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Address</span>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {user?.profile?.address || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Joined Date</span>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formattedJoinedDate}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
