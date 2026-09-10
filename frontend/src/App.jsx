import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Portal & Login Pages
import PortalSelectPage from './pages/PortalSelectPage';
import OperatorLoginPage from './pages/OperatorLoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';

// Role-Dedicated Dashboard Pages
import OperatorDashboardPage from './pages/OperatorDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Entry & Role Selection Portal */}
          <Route path="/" element={<PortalSelectPage />} />
          <Route path="/portal-select" element={<PortalSelectPage />} />

          {/* Dedicated Login Pages */}
          <Route path="/operator/login" element={<OperatorLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

          {/* 1. Protected Drone Operator Portal (/operator/*) */}
          <Route
            path="/operator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['OPERATOR']}>
                <OperatorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/*"
            element={
              <ProtectedRoute allowedRoles={['OPERATOR']}>
                <OperatorDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* 2. Protected Law Enforcement Operations Console (/admin/*) */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* 3. Protected Super Administration Interface (/super-admin/*) */}
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/*"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
