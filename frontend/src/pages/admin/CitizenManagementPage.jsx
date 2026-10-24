import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Mail, Phone, MapPin, Building, ShieldCheck, 
  Edit3, CheckCircle2, UserCheck, Shield, KeyRound, UserPlus, 
  Copy, Check, AlertCircle, X 
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';

const DEPARTMENTS = [
  'Water Department',
  'Electricity Department',
  'Roads, Sanitation & Traffic',
  'Property Tax Department',
  'Municipal Governance',
];

export default function CitizenManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');

  // Edit user modal state
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('CITIZEN');
  const [departmentName, setDepartmentName] = useState('');
  const [assignedZone, setAssignedZone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Provision user modal state
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provRole, setProvRole] = useState('CITIZEN');
  const [provFirstName, setProvFirstName] = useState('');
  const [provLastName, setProvLastName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provAddress, setProvAddress] = useState('');
  const [provWard, setProvWard] = useState('Ward 1');
  const [provDept, setProvDept] = useState(DEPARTMENTS[0]);
  const [provPassword, setProvPassword] = useState('');
  const [provSubmitting, setProvSubmitting] = useState(false);
  const [provWardAvail, setProvWardAvail] = useState([]);
  const [provResult, setProvResult] = useState(null);
  const [provError, setProvError] = useState('');

  // Password reset modal state
  const [resetResult, setResetResult] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const data = await api.auth.getUsers(params);
      setUsers(data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setSelectedRole(u.profile?.role || 'CITIZEN');
    setDepartmentName(u.profile?.department_name || '');
    setAssignedZone(u.profile?.assigned_zone || '');
    setSaveSuccess('');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      await api.auth.updateUser(editingUser.id, {
        role: selectedRole,
        department_name: departmentName,
        assigned_zone: assignedZone,
      });

      setSaveSuccess(`User @${editingUser.username} updated successfully!`);
      setTimeout(() => {
        setEditingUser(null);
        setSaveSuccess('');
        loadUsers();
      }, 1000);
    } catch (err) {
      alert(err.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvSubmitting(true);
    setProvError('');
    try {
      const payload = {
        role: provRole,
        first_name: provFirstName.trim(),
        last_name: provLastName.trim(),
        email: provEmail.trim(),
        phone: provPhone.trim(),
        address: provAddress.trim(),
        ward: provRole === 'ADMIN' ? 'City-wide' : provWard,
        department_name: provRole === 'EMPLOYEE' ? provDept : (provRole === 'ADMIN' ? 'Municipal Governance' : ''),
      };
      if (provPassword.trim()) {
        payload.password = provPassword.trim();
      }

      const res = await api.auth.provisionUser(payload);
      setProvResult(res);
      loadUsers();
    } catch (err) {
      setProvError(err.message || 'Provisioning failed. Check ward allocation.');
    } finally {
      setProvSubmitting(false);
    }
  };

  const handleResetPassword = async (userObj) => {
    if (!window.confirm(`Are you sure you want to reset password for @${userObj.username} (${userObj.user_id || userObj.username})?`)) {
      return;
    }

    setResettingId(userObj.id);
    try {
      const res = await api.auth.resetPassword(userObj.id);
      setResetResult(res);
    } catch (err) {
      alert(err.message || 'Failed to reset password.');
    } finally {
      setResettingId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Admin</span>;
      case 'AREA_HEAD':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Area Head</span>;
      case 'EMPLOYEE':
      case 'SERVICE_DEPARTMENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Employee</span>;
      case 'TRAFFIC_OFFICER':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">Traffic Staff</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Citizen</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">User & Role Directory (Admin Management)</h1>
            <p className="text-xs text-slate-500">
              Manage accounts, allocate unique wards per role, and provision system User IDs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsProvisionOpen(true);
              setProvResult(null);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Provision User</span>
          </button>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
            {users.length} Accounts
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Search and Role Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, username, name, or ward..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
          <label className="font-semibold text-slate-500">Filter Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Roles</option>
            <option value="CITIZEN">Citizens</option>
            <option value="EMPLOYEE">Employees (Field Staff)</option>
            <option value="AREA_HEAD">Area Heads</option>
            <option value="ADMIN">Administrators</option>
          </select>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          No user profiles found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map((c) => {
            const systemId = c.user_id || c.profile?.system_user_id || c.username;
            return (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:shadow transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm border border-blue-200">
                      {c.first_name ? c.first_name[0] : c.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.username}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded">
                          {systemId}
                        </span>
                        <span className="text-[10px] text-slate-400">(@{c.username})</span>
                      </div>
                    </div>
                  </div>
                  {getRoleBadge(c.profile?.role)}
                </div>

                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p className="flex items-center">
                    <Mail className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email || 'No email registered'}</span>
                  </p>
                  <p className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                    <span>{c.profile?.phone || 'No phone registered'}</span>
                  </p>
                  {c.profile?.department_name && (
                    <p className="flex items-center text-indigo-700 font-medium">
                      <Building className="w-3.5 h-3.5 mr-2 text-indigo-500 shrink-0" />
                      <span className="truncate">{c.profile.department_name}</span>
                    </p>
                  )}
                  <p className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-slate-700">
                      Assigned Ward: {c.profile?.assigned_zone || 'City-wide'}
                    </span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => handleResetPassword(c)}
                    disabled={resettingId === c.id}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-200/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Generate secure temporary password for user"
                  >
                    <KeyRound className="w-3 h-3 text-amber-600" />
                    <span>{resettingId === c.id ? 'Resetting...' : 'Reset Pwd'}</span>
                  </button>

                  <button
                    onClick={() => openEditModal(c)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Ward & Role</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provision User Modal */}
      {isProvisionOpen && (
        <Modal
          isOpen={isProvisionOpen}
          onClose={() => setIsProvisionOpen(false)}
          title="Provision New System User (Admin Provisioning)"
        >
          {provResult ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-900">User Provisioned Successfully!</h3>
                <p className="text-slate-600">The account is ready with auto-generated credentials.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Generated User ID (Username)</span>
                  <div className="font-mono text-sm font-bold text-blue-700 bg-white p-2 rounded-lg border border-slate-200 mt-0.5">
                    {provResult.user_id}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Initial Temporary Password</span>
                  <div className="flex items-center justify-between font-mono text-sm font-bold text-slate-800 bg-white p-2 rounded-lg border border-slate-200 mt-0.5">
                    <span>{provResult.initial_password}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(provResult.initial_password)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer"
                    >
                      {copiedKey ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600">
                  Role: <strong>{provResult.role}</strong> • Ward: <strong>{provResult.ward}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProvisionOpen(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleProvisionSubmit} className="space-y-3.5 text-xs">
              {provError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{provError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Role</label>
                  <select
                    value={provRole}
                    onChange={(e) => setProvRole(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="CITIZEN">Citizen</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="AREA_HEAD">Area Head</option>
                    <option value="ADMIN">City Administrator</option>
                  </select>
                </div>

                {provRole === 'EMPLOYEE' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department</label>
                    <select
                      value={provDept}
                      onChange={(e) => setProvDept(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Ward</label>
                    {provRole === 'ADMIN' ? (
                      <input
                        type="text"
                        disabled
                        value="City-wide (All Wards)"
                        className="w-full p-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-600"
                      />
                    ) : (
                      <select
                        value={provWard}
                        onChange={(e) => setProvWard(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                      >
                        {['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'].map((wName) => (
                          <option key={wName} value={wName}>
                            {wName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {provRole === 'EMPLOYEE' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Ward (1 Employee per Ward & Department)</label>
                  <select
                    value={provWard}
                    onChange={(e) => setProvWard(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    {['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'].map((wName) => (
                      <option key={wName} value={wName}>
                        {wName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={provFirstName}
                    onChange={(e) => setProvFirstName(e.target.value)}
                    placeholder="e.g. Suresh"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={provLastName}
                    onChange={(e) => setProvLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="name@smartcity.gov.in"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={provPhone}
                    onChange={(e) => setProvPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={provAddress}
                  onChange={(e) => setProvAddress(e.target.value)}
                  placeholder="Official / Residential location"
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Custom Password (Optional - leave blank to auto-generate)
                </label>
                <input
                  type="password"
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  placeholder="Auto-generate secure temporary password"
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {provSubmitting ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Password Reset Result Modal */}
      {resetResult && (
        <Modal
          isOpen={!!resetResult}
          onClose={() => setResetResult(null)}
          title="Password Reset Result"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{resetResult.message}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">New Temporary Password</span>
              <div className="flex items-center justify-between font-mono text-sm font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-300">
                <span>{resetResult.temporary_password}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(resetResult.temporary_password)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded cursor-pointer font-sans"
                >
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setResetResult(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Role & Ward Modal */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Edit Account Permissions: @${editingUser.username}`}
        >
          <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <p className="font-bold text-slate-800">
                {editingUser.first_name} {editingUser.last_name} ({editingUser.user_id || editingUser.username})
              </p>
              <p className="text-slate-500">{editingUser.email}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                System Role Assignment
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="CITIZEN">Citizen (Public Access)</option>
                <option value="EMPLOYEE">Employee (Field Staff)</option>
                <option value="AREA_HEAD">Area Head</option>
                <option value="ADMIN">City Admin / Commissioner</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department Assignment
              </label>
              <select
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Department (Citizen) --</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Ward (Enforces 1 User per Role per Ward)
              </label>
              <select
                value={assignedZone}
                onChange={(e) => setAssignedZone(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="City-wide">City-wide (All Wards)</option>
                {Array.from({ length: 10 }, (_, i) => `Ward ${i + 1}`).map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Role & Permissions'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
