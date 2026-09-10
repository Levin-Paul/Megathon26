import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plane, Shield, ArrowRight, Lock, User, Mail, AlertCircle, CheckCircle2, FileText, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OperatorLoginPage() {
  const navigate = useNavigate();
  const { login, registerOperator } = useAuth();

  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOrg, setRegOrg] = useState('');

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username || !password) {
      setErrorMsg('Please enter your username/email and password.');
      return;
    }
    setIsSubmitting(true);
    const result = await login(username, password, 'OPERATOR');
    setIsSubmitting(false);

    if (result.success) {
      navigate('/operator/dashboard');
    } else {
      setErrorMsg(result.message || 'Login failed. Please check your operator credentials.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!regFullName || !regEmail || !regUsername || !regPassword) {
      setErrorMsg('All registration fields are required.');
      return;
    }
    setIsSubmitting(true);
    const res = await registerOperator({
      username: regUsername,
      email: regEmail,
      password: regPassword,
      full_name: regFullName,
      organization: regOrg || 'Civilian Drone Pilot'
    });
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Account registered successfully! You can now log in with your credentials.');
      setUsername(regUsername);
      setPassword('');
      setMode('LOGIN');
    } else {
      setErrorMsg(res.message || 'Registration failed.');
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setForgotModalOpen(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-aerodark-950 text-slate-100 flex flex-col justify-between font-sans select-none relative overflow-hidden">
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 border-b border-aerodark-800 flex items-center justify-between z-10 bg-aerodark-950/60 backdrop-blur-md">
        <Link to="/" className="flex items-center space-x-2.5 text-slate-300 hover:text-white transition-colors">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <Plane className="w-4 h-4 text-sky-400" />
          </div>
          <span className="font-bold text-xs tracking-wider">AEROGUARD</span>
          <span className="text-slate-500 text-xs">/</span>
          <span className="text-sky-300 text-xs font-medium">Drone Operator Portal</span>
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
        <div className="w-full max-w-md bg-aerodark-900/95 border border-aerodark-700/80 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-3 shadow-inner">
              <Plane className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">AeroGuard</h1>
            <h2 className="text-sm font-semibold text-sky-300 uppercase tracking-wider mt-0.5">
              Drone Operator Portal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'LOGIN'
                ? 'Sign in to manage registered drones and request coastal flight clearances.'
                : 'Create an official civilian drone operator account.'}
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-aerodark-950 rounded-lg border border-aerodark-800 mb-5 text-xs font-medium">
            <button
              onClick={() => { setMode('LOGIN'); setErrorMsg(''); }}
              className={`py-1.5 rounded-md transition-all ${
                mode === 'LOGIN'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('REGISTER'); setErrorMsg(''); }}
              className={`py-1.5 rounded-md transition-all ${
                mode === 'REGISTER'
                  ? 'bg-sky-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                  Email / Operator Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. operator or operator@aeroguard.gov"
                    className="w-full pl-9 pr-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-300 uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs tracking-wide transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer mt-2"
              >
                <span>{isSubmitting ? 'Authenticating Operator...' : 'Sign In to Operator Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Demo Credentials Quick Fill */}
              <div className="mt-4 pt-3 border-t border-aerodark-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Default Pilot: <strong className="text-slate-200">operator</strong></span>
                <button
                  type="button"
                  onClick={() => { setUsername('operator'); setPassword('operator123'); }}
                  className="text-sky-400 hover:underline font-mono"
                >
                  Fill Demo (operator123)
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                  Full Name / Organization
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar (Maritime Air Survey)"
                  className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="pilot_user"
                    className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="pilot@domain.com"
                    className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 uppercase tracking-wide">
                  Affiliation / Company
                </label>
                <input
                  type="text"
                  value={regOrg}
                  onChange={(e) => setRegOrg(e.target.value)}
                  placeholder="e.g. Tamil Nadu Coastal Infrastructure"
                  className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium text-xs tracking-wide transition-all shadow-md mt-2 flex items-center justify-center space-x-1"
              >
                <span>{isSubmitting ? 'Registering Account...' : 'Complete Operator Registration'}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-aerodark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>Operator Password Reset</span>
            </h3>
            <p className="text-xs text-slate-400">
              Enter the registered email associated with your civilian pilot certificate or DGCA operator registry.
            </p>
            {forgotSent ? (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                Password recovery dispatch sent to {forgotEmail}. Please check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="operator@aeroguard.gov"
                  className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-100 outline-none"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-3 py-1.5 bg-aerodark-800 text-slate-300 rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-medium"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-aerodark-800 text-center text-xs text-slate-500 font-mono">
        Civil Aviation DGCA Airspace Compliance · AeroGuard Civilian Operator Subsystem
      </footer>
    </div>
  );
}
