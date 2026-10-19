import React, { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, MapPin, Building, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

export default function CitizenManagementPage() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCitizens() {
      try {
        const data = await api.auth.getCitizens();
        setCitizens(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load citizen records.');
      } finally {
        setLoading(false);
      }
    }
    loadCitizens();
  }, []);

  const filtered = citizens.filter((c) => {
    const term = search.toLowerCase();
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const username = (c.username || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    return fullName.includes(term) || username.includes(term) || email.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Citizen Directory & Registry</h1>
            <p className="text-xs text-slate-500">Verified municipal citizen accounts with connected property and contact profiles</p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
          {citizens.length} Registered Citizens
        </span>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search citizens by name, username, or email..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Citizens Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          No citizen profiles found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:shadow transition-shadow">
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

              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <p className="flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span className="truncate">{c.email || 'No email registered'}</span>
                </p>
                <p className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>{c.profile?.phone || '+91 98765 00000'}</span>
                </p>
                <p className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                  <span className="truncate">{c.profile?.address || 'City Residential Zone'}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Role: <strong className="text-slate-700">Citizen</strong></span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
