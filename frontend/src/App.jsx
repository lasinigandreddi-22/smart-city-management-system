import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';

// Service Pages
import WaterManagementPage from './pages/services/WaterManagementPage';
import ElectricityManagementPage from './pages/services/ElectricityManagementPage';
import TrafficManagementPage from './pages/services/TrafficManagementPage';

// Complaints
import ComplaintListPage from './pages/complaints/ComplaintListPage';
import SubmitComplaintPage from './pages/complaints/SubmitComplaintPage';
import ComplaintDetailPage from './pages/complaints/ComplaintDetailPage';

// Property Tax
import PropertyTaxPage from './pages/property_tax/PropertyTaxPage';
import TaxBillDetailPage from './pages/property_tax/TaxBillDetailPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CitizenManagementPage from './pages/admin/CitizenManagementPage';
import ComplaintAdminPage from './pages/admin/ComplaintAdminPage';
import UtilityNoticesPage from './pages/admin/UtilityNoticesPage';
import TrafficIncidentAdminPage from './pages/admin/TrafficIncidentAdminPage';

// Service Department Pages
import DepartmentDashboard from './pages/department/DepartmentDashboard';
import AssignedRequestsPage from './pages/department/AssignedRequestsPage';

// Traffic Officer Pages
import TrafficOfficerDashboard from './pages/traffic_officer/TrafficOfficerDashboard';

// Common Pages
import ProfilePage from './pages/common/ProfilePage';
import ArchitecturePage from './pages/common/ArchitecturePage';
import AccessDeniedPage from './pages/common/AccessDeniedPage';

function RoleBasedHomeRedirect() {
  const { user, role, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (role) {
    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    case 'SERVICE_DEPARTMENT':
      return <Navigate to="/department/dashboard" replace />;
    case 'TRAFFIC_OFFICER':
      return <Navigate to="/traffic-officer/dashboard" replace />;
    default:
      return <Navigate to="/citizen/dashboard" replace />;
  }
}

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RoleBasedHomeRedirect />} />

          {/* Protected Application Routes inside Master Dashboard Layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Citizen Routes */}
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />

            {/* Five Major Civic Services */}
            <Route path="/services/water" element={<WaterManagementPage />} />
            <Route path="/services/electricity" element={<ElectricityManagementPage />} />
            <Route path="/services/traffic" element={<TrafficManagementPage />} />

            {/* Complaints Management */}
            <Route path="/complaints" element={<ComplaintListPage />} />
            <Route path="/complaints/new" element={<SubmitComplaintPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />

            {/* Property Tax Management */}
            <Route path="/property-tax" element={<PropertyTaxPage />} />
            <Route path="/property-tax/:id" element={<TaxBillDetailPage />} />

            {/* Admin Dedicated Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/citizens"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <CitizenManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ComplaintAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/utility-notices"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_DEPARTMENT']}>
                  <UtilityNoticesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/traffic"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'TRAFFIC_OFFICER']}>
                  <TrafficIncidentAdminPage />
                </ProtectedRoute>
              }
            />

            {/* Service Department Dedicated Routes */}
            <Route
              path="/department/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SERVICE_DEPARTMENT', 'ADMIN']}>
                  <DepartmentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/department/assigned"
              element={
                <ProtectedRoute allowedRoles={['SERVICE_DEPARTMENT', 'ADMIN']}>
                  <AssignedRequestsPage />
                </ProtectedRoute>
              }
            />

            {/* Traffic Officer Dedicated Routes */}
            <Route
              path="/traffic-officer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['TRAFFIC_OFFICER', 'ADMIN']}>
                  <TrafficOfficerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Common System Routes */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<AccessDeniedPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
