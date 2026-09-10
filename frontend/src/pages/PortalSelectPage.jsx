import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plane, Radio, Key, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PortalSelectPage() {
  const navigate = useNavigate();
  const { user, role, isAuthenticated } = useAuth();

  const handlePortalClick = (targetPath, targetRole) => {
    if (isAuthenticated && role === targetRole) {
      if (role === 'OPERATOR') navigate('/operator/dashboard');
      else if (role === 'OFFICER' || role === 'ADMIN') navigate('/admin/dashboard');
      else if (role === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
      else navigate(targetPath);
    } else {
      navigate(targetPath);
    }
  };

  return (
    <div className="min-h-screen bg-aerodark-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden select-none">
      {/* Background Subtle Gradient & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-aerodark-950 to-aerodark-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#151E2E15_1px,transparent_1px),linear-gradient(to_bottom,#151E2E15_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-aerodark-800/80 bg-aerodark-950/70 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-600/10 border border-blue-500/20">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="font-bold tracking-widest text-sm text-slate-100">AEROGUARD</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2 font-mono">CIVIL AIRSPACE SECURITY PLATFORM</span>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400 font-medium">
              Signed in as <strong className="text-slate-200">{user?.full_name}</strong> ({role})
            </span>
            <button
              onClick={() => {
                if (role === 'OPERATOR') navigate('/operator/dashboard');
                else if (role === 'SUPER_ADMIN') navigate('/super-admin/dashboard');
                else navigate('/admin/dashboard');
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors flex items-center space-x-1.5"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Hero & Portal Selection */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        {/* Title & Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-300 text-xs font-medium mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>CIVIL LAW ENFORCEMENT & AIRSPACE GOVERNANCE</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 font-sans">
          AeroGuard
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-2 font-medium">
          AI Aerial Surveillance & Airspace Security Platform
        </p>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mb-10">
          Choose your authorized access portal to enter civilian flight management, tactical surveillance, or administrative controls.
        </p>

        {/* 3 Dedicated Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* 1. Drone Operator Portal */}
          <div
            onClick={() => handlePortalClick('/operator/login', 'OPERATOR')}
            className="group relative bg-aerodark-900/90 hover:bg-aerodark-850 border border-aerodark-700 hover:border-sky-500/50 rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-sky-950/30 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Plane className="w-6 h-6 text-sky-400" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-base text-slate-100 group-hover:text-sky-300 transition-colors">
                  Drone Operator
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Civil Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 font-normal">
                Civilian pilots and commercial logistics operators managing fleet registrations and permits.
              </p>

              <div className="space-y-2 border-t border-aerodark-800 pt-4 text-xs text-slate-300 font-sans">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Register drones & UIN compliance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Request flight permissions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Track applications & history</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-aerodark-800/80 flex items-center justify-between text-xs font-semibold text-sky-400 group-hover:text-sky-300">
              <span>Sign In as Operator</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Law Enforcement Officer */}
          <div
            onClick={() => handlePortalClick('/admin/login', 'OFFICER')}
            className="group relative bg-aerodark-900/90 hover:bg-aerodark-850 border border-aerodark-700 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-blue-950/30 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Radio className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-base text-slate-100 group-hover:text-blue-300 transition-colors">
                  Law Enforcement Officer
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Operations SOC
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 font-normal">
                Authorized coastal security officers and surveillance operators monitoring coastal airspace.
              </p>

              <div className="space-y-2 border-t border-aerodark-800 pt-4 text-xs text-slate-300 font-sans">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Live multi-sensor surveillance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>ASTRA radar detection & ML</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Camera verification & threat alerts</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-aerodark-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              <span>Sign In to Operations</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Super Administrator */}
          <div
            onClick={() => handlePortalClick('/super-admin/login', 'SUPER_ADMIN')}
            className="group relative bg-aerodark-900/90 hover:bg-aerodark-850 border border-aerodark-700 hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-amber-950/30 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Key className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-base text-slate-100 group-hover:text-amber-300 transition-colors">
                  Super Administrator
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  System Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 font-normal">
                Directorate system administrators managing access, infrastructure, AI weights, and audit trails.
              </p>

              <div className="space-y-2 border-t border-aerodark-800 pt-4 text-xs text-slate-300 font-sans">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>System management & user roles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Geofence definitions & camera setup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>AI configuration & immutable audit logs</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-aerodark-800/80 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
              <span>Sign In as Super Admin</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 border-t border-aerodark-800 text-center text-xs text-slate-500 font-mono">
        AeroGuard Coastal Airspace Governance & Multi-Sensor Surveillance Console · Civil Law Enforcement Security
      </footer>
    </div>
  );
}
