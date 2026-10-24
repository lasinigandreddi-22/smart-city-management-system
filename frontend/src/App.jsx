import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

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

// Area Head Pages
import AreaHeadDashboard from './pages/area_head/AreaHeadDashboard';
import AreaIssueQueuePage from './pages/area_head/AreaIssueQueuePage';

// Common Pages
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
    case 'AREA_HEAD':
      return <Navigate to="/area-head/dashboard" replace />;
    case 'EMPLOYEE':
    case 'SERVICE_DEPARTMENT':
    case 'TRAFFIC_OFFICER':
      return <Navigate to="/employee/dashboard" replace />;
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
          {/* Public Login & Register Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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

            {/* Area Head Dedicated Routes */}
            <Route
              path="/area-head/dashboard"
              element={
                <ProtectedRoute allowedRoles={['AREA_HEAD', 'ADMIN']}>
                  <AreaHeadDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/area-head/queue"
              element={
                <ProtectedRoute allowedRoles={['AREA_HEAD', 'ADMIN']}>
                  <AreaIssueQueuePage />
                </ProtectedRoute>
              }
            />

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
                <ProtectedRoute allowedRoles={['ADMIN', 'AREA_HEAD']}>
                  <ComplaintAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/utility-notices"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'AREA_HEAD', 'SERVICE_DEPARTMENT', 'EMPLOYEE']}>
                  <UtilityNoticesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/traffic"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'AREA_HEAD', 'TRAFFIC_OFFICER', 'SERVICE_DEPARTMENT', 'EMPLOYEE']}>
                  <TrafficIncidentAdminPage />
                </ProtectedRoute>
              }
            />

            {/* Unified Employee Routes */}
            <Route
              path="/employee/dashboard"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'SERVICE_DEPARTMENT', 'TRAFFIC_OFFICER', 'ADMIN', 'AREA_HEAD']}>
                  <DepartmentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/tasks"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'SERVICE_DEPARTMENT', 'TRAFFIC_OFFICER', 'ADMIN', 'AREA_HEAD']}>
                  <AssignedRequestsPage />
                </ProtectedRoute>
              }
            />

            {/* Legacy Service Department Routes (Backward Compatibility) */}
            <Route
              path="/department/dashboard"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'SERVICE_DEPARTMENT', 'ADMIN', 'AREA_HEAD']}>
                  <DepartmentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/department/assigned"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'SERVICE_DEPARTMENT', 'ADMIN', 'AREA_HEAD']}>
                  <AssignedRequestsPage />
                </ProtectedRoute>
              }
            />

            {/* Legacy Traffic Officer Dedicated Routes (Backward Compatibility) */}
            <Route
              path="/traffic-officer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'TRAFFIC_OFFICER', 'SERVICE_DEPARTMENT', 'ADMIN']}>
                  <TrafficOfficerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Common System Routes */}
            <Route path="/profile" element={<Navigate to="/" replace />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<AccessDeniedPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
