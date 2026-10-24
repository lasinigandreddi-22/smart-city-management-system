import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building, User, Lock, Mail, Phone, MapPin, 
  CheckCircle2, AlertCircle, Copy, ArrowRight, 
  ShieldCheck, Briefcase, Building2, Check, ShieldAlert
} from 'lucide-react';
import api from '../services/api';

const REGISTER_ROLES = [
  { id: 'CITIZEN', label: 'Citizen', icon: User, desc: 'Civic complaints, utilities & property taxes' },
  { id: 'EMPLOYEE', label: 'Employee', icon: Briefcase, desc: 'Field engineer & municipal service staff' },
  { id: 'AREA_HEAD', label: 'Area Head', icon: Building2, desc: 'Zonal administrator & complaint reviewer' },
];

const DEPARTMENTS = [
  'Water Department',
  'Electricity Department',
  'Roads, Sanitation & Traffic',
  'Property Tax Department',
];

export default function RegisterPage() {
  const [role, setRole] = useState('CITIZEN');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [ward, setWard] = useState('');
  const [departmentName, setDepartmentName] = useState(DEPARTMENTS[0]);
  const [customPassword, setCustomPassword] = useState('');
  const [autoGenPassword, setAutoGenPassword] = useState(true);

  // Ward availability
  const [wardAvailability, setWardAvailability] = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredCredentials, setRegisteredCredentials] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const navigate = useNavigate();

  // Wards list
  const configuredWards = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }

    if (!ward) {
      setError('Please select an available ward.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        ward,
        department_name: role === 'EMPLOYEE' ? departmentName : '',
      };

      if (!autoGenPassword && customPassword.trim()) {
        payload.password = customPassword.trim();
      }

      const res = await api.auth.register(payload);
      setRegisteredCredentials(res);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check form inputs.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPwd(true);
      setTimeout(() => setCopiedPwd(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3">
          <Building className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Smart City Portal Registration
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          Integrated Civic Governance • Unique Ward Allocation & User ID Generation
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/80">
          
          {/* Success Credential View */}
          {registeredCredentials ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Registration Successful!
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Your civic portal account has been created with a system-generated User ID.
                </p>
              </div>

              {/* Credential Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Assigned Role & Ward
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
                    {registeredCredentials.role} • {registeredCredentials.ward}
                  </span>
                </div>

                {/* User ID */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    System-Assigned User ID (Username)
                  </label>
                  <div className="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5">
                    <span className="font-mono text-base font-bold text-blue-700">
                      {registeredCredentials.user_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(registeredCredentials.user_id, 'id')}
                      className="text-xs font-medium text-slate-600 hover:text-blue-600 flex items-center space-x-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Initial Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Initial Password
                  </label>
                  <div className="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5">
                    <span className="font-mono text-base font-bold text-slate-800">
                      {registeredCredentials.initial_password}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(registeredCredentials.initial_password, 'pwd')}
                      className="text-xs font-medium text-slate-600 hover:text-blue-600 flex items-center space-x-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {copiedPwd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPwd ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Important:</strong> Please store your User ID and Password safely. You will use this <strong>User ID</strong> to sign in to the portal.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select Registration Role
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {REGISTER_ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setRole(r.id);
                          setError('');
                        }}
                        className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30'
                            : 'bg-slate-50/70 hover:bg-white text-slate-700 hover:text-blue-600 border-slate-200'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  {REGISTER_ROLES.find((r) => r.id === role)?.desc}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Gupta"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Residential / Office Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Apartment / House, Street, Area"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                />
              </div>

              {/* Department (If Employee) */}
              {role === 'EMPLOYEE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Municipal Department Assignment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-medium"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ward Allocation & Strict Uniqueness Policy */}
              {/* Ward Allocation */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="ward-select" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Municipal Ward <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    Configured Wards (Ward 1 to Ward 6)
                  </span>
                </div>

                <div>
                  <select
                    id="ward-select"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="">-- Choose Municipal Ward (Ward 1 to Ward 6) --</option>
                    {configuredWards.map((wName) => (
                      <option key={wName} value={wName}>
                        {wName}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Notice: Ward availability is verified upon submission based on role allocation rules (1 user per ward for Citizen/Area Head; 1 per department for Employees).
                </p>
              </div>

              {/* Password Option */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Portal Password Provisioning
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setAutoGenPassword(true)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors ${
                        autoGenPassword
                          ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Auto-generate
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoGenPassword(false)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors ${
                        !autoGenPassword
                          ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Set Custom
                    </button>
                  </div>
                </div>

                {!autoGenPassword && (
                  <div>
                    <input
                      type="password"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Enter a secure password (min 6 characters)"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    />
                  </div>
                )}
                {autoGenPassword && (
                  <p className="text-[11px] text-slate-500">
                    A secure 10-character temporary password will be provisioned and displayed to you upon submission.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !ward}
                className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 mt-4 cursor-pointer"
              >
                {loading ? (
                  <span>Registering Account & Allocating Ward...</span>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                    Back to Sign In
                  </Link>
                </p>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
