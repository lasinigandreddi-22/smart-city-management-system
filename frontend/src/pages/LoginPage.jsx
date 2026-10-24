import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building, Lock, User, ArrowRight, AlertCircle, 
  ShieldCheck, Briefcase, Building2, Eye, EyeOff 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PORTAL_ROLES = [
  { id: 'CITIZEN', label: 'Citizen', icon: User, desc: 'Civic services & complaints' },
  { id: 'ADMIN', label: 'Admin', icon: ShieldCheck, desc: 'Municipal administration' },
  { id: 'EMPLOYEE', label: 'Employee', icon: Briefcase, desc: 'Department & field staff' },
  { id: 'AREA_HEAD', label: 'Area Head', icon: Building2, desc: 'Zonal & ward administration' },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('CITIZEN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username or User ID and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await login(username.trim(), password, selectedRole);
      const userRole = data.role;
      if (userRole === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (userRole === 'AREA_HEAD') {
        navigate('/area-head/dashboard');
      } else if (userRole === 'EMPLOYEE' || userRole === 'SERVICE_DEPARTMENT' || userRole === 'TRAFFIC_OFFICER') {
        navigate('/employee/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials and selected role.');
    } finally {
      setLoading(false);
    }
  };

  const activeRoleObj = PORTAL_ROLES.find((r) => r.id === selectedRole) || PORTAL_ROLES[0];

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Header section matching Reference Image 2 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-4">
          <Building className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Smart City Portal
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 font-normal">
          Integrated Civic Governance & Services Prototype
        </p>
      </div>

      {/* Centered Login Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/80">
          
          {/* Top Role Selector matching Reference Image 1 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                SELECT PORTAL ROLE
              </span>
              <Link
                to="/register"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full border border-blue-200/60 transition-colors"
              >
                Register Account →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PORTAL_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setError('');
                    }}
                    className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30'
                        : 'bg-slate-50/70 hover:bg-white text-slate-700 hover:text-blue-600 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Role Indicator */}
          <div className="mb-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Selected: <span className="font-bold text-slate-900">{activeRoleObj.label} Portal</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
              {activeRoleObj.label} Login
            </span>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Login Form matching Reference Image 2 */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username / User ID
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username or User ID (e.g. CIT-1001)"
                  className="block w-full pl-10 pr-3.5 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="block w-full pl-10 pr-10 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 mt-6 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              Need a civic account?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                Register as Citizen or Staff
              </Link>
            </p>
          </div>

          {/* Footer matching Reference Image 2 */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Smart City Management System</p>
            <p className="text-[11px] text-slate-400 mt-1">
              SQLite Persistent Database • Django REST • React Vite
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
