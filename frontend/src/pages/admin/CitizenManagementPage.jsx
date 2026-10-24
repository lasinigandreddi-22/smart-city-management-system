import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Mail, Phone, MapPin, Building, ShieldCheck, 
  Edit3, CheckCircle2, UserCheck, Shield 
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../../components/Modal';

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
              Manage accounts, assign roles (Citizen, Staff, Area Head, Admin), and set department & ward boundaries
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
          {users.length} Registered Accounts
        </span>
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
            placeholder="Search by name, username, department, or zone..."
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
            <option value="AREA_HEAD">Area Heads / Dept Heads</option>
            <option value="ADMIN">City Administrators</option>
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
          {users.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm border border-blue-200">
                    {c.first_name ? c.first_name[0] : c.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.username}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">@{c.username}</span>
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
                  <span className="truncate">Ward/Zone: {c.profile?.assigned_zone || c.profile?.address || 'City-wide'}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Joined {new Date(c.date_joined).toLocaleDateString()}</span>
                <button
                  onClick={() => openEditModal(c)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Role & Ward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
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
              <p className="font-bold text-slate-800">{editingUser.first_name} {editingUser.last_name} (@{editingUser.username})</p>
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
                <option value="AREA_HEAD">Area Head / Department Head</option>
                <option value="SERVICE_DEPARTMENT">Legacy Department Staff</option>
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
                <option value="Municipal Governance">Municipal Governance (Area / City Head)</option>
                <option value="Water & Electricity Services">Water & Electricity Services</option>
                <option value="Roads & Traffic Department">Roads & Traffic Department</option>
                <option value="Sanitation Department">Sanitation Department</option>
                <option value="Public Works & Roads Department">Public Works & Roads Department</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Ward / Geographical Zone
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
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
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
