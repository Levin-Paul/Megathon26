import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Radio, Lock, BadgeCheck, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username || !password) {
      setErrorMsg('Officer ID/Email and Security Key are required.');
      return;
    }
    setIsSubmitting(true);
    const result = await login(username, password, 'OFFICER');
    setIsSubmitting(false);

    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setErrorMsg(result.message || 'Authentication failed. Please check your Law Enforcement Officer credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-aerodark-950 text-slate-100 flex flex-col justify-between font-sans select-none relative overflow-hidden">
      {/* Tactical Radar Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/15 via-aerodark-950 to-aerodark-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#151E2E20_1px,transparent_1px),linear-gradient(to_bottom,#151E2E20_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 border-b border-aerodark-800 flex items-center justify-between z-10 bg-aerodark-950/70 backdrop-blur-md">
        <Link to="/" className="flex items-center space-x-2.5 text-slate-300 hover:text-white transition-colors">
          <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-bold text-xs tracking-wider">AEROGUARD</span>
          <span className="text-slate-500 text-xs">/</span>
          <span className="text-blue-300 text-xs font-medium">Law Enforcement Operations</span>
        </Link>
        <Link
          to="/"
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
        >
          <span>← Choose Access Portal</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md bg-aerodark-900/95 border border-blue-500/30 rounded-2xl shadow-2xl p-8 backdrop-blur-xl relative">
          {/* Subtle Tactical Corner Marks */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-blue-400/50" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-blue-400/50" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-blue-400/50" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-blue-400/50" />

          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">AeroGuard</h1>
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mt-0.5">
              Law Enforcement Operations
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized surveillance officers and coastal defense operations center.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Security Notice */}
          <div className="mb-5 p-2.5 rounded-lg bg-aerodark-950 border border-aerodark-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Restricted Access: Civil Law Enforcement Personnel Only.</span>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                Officer ID / Official Email
              </label>
              <div className="relative">
                <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. officer.raman or admin"
                  className="w-full pl-9 pr-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs tracking-wide transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
            >
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In to Surveillance Console'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Demo Credentials Quick Fill */}
            <div className="mt-4 pt-3 border-t border-aerodark-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Officer: <strong className="text-slate-200">officer.raman</strong></span>
              <button
                type="button"
                onClick={() => { setUsername('officer.raman'); setPassword('officer123'); }}
                className="text-blue-400 hover:underline font-mono"
              >
                Fill Demo (officer123)
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-aerodark-800 text-center text-xs text-slate-500 font-mono">
        Coastal Defense Security Operations Center · Authorized Law Enforcement Terminal
      </footer>
    </div>
  );
}
