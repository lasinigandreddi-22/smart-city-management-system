import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AccessDeniedPage() {
  const { role } = useAuth();

  const getHomeRoute = () => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SERVICE_DEPARTMENT':
        return '/department/dashboard';
      case 'TRAFFIC_OFFICER':
        return '/traffic-officer/dashboard';
      default:
        return '/citizen/dashboard';
    }
  };

  return (
    <div className="min-h-96 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Access Restricted (403)</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          You do not have the required role privileges to access this administrative page. Role-based backend authorization protects civic data integrity.
        </p>
        <div className="pt-2">
          <Link
            to={getHomeRoute()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Return to Authorized Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
