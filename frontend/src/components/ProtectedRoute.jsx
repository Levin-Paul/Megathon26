import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, role, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-aerodark-950 flex flex-col items-center justify-center space-y-3 text-slate-300 font-sans">
        <div className="p-3 bg-aerodark-900 border border-aerodark-700 rounded-xl animate-pulse">
          <Shield className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <div className="text-xs font-mono tracking-wider text-slate-400 uppercase">
          Verifying Security Clearance...
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    const path = location.pathname;
    if (path.startsWith('/operator')) {
      return <Navigate to="/operator/login" replace state={{ from: location }} />;
    }
    if (path.startsWith('/super-admin')) {
      return <Navigate to="/super-admin/login" replace state={{ from: location }} />;
    }
    if (path.startsWith('/admin')) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }
    return <Navigate to="/" replace />;
  }

  // Authenticated but unauthorized for this role
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'OPERATOR') {
      return <Navigate to="/operator/dashboard" replace />;
    }
    if (role === 'OFFICER' || role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (role === 'SUPER_ADMIN') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
