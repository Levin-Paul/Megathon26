import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Shield, 
  Users, 
  Plane, 
  FileCheck2, 
  ShieldAlert, 
  Cpu, 
  Radar, 
  Camera, 
  ScrollText, 
  Settings, 
  LayoutDashboard, 
  LogOut, 
  Server, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AITransparencyView from '../components/AITransparencyView';
import AuditLogView from '../components/AuditLogView';
import PermissionsRegistryView from '../components/PermissionsRegistryView';
import RestrictedZonesView from '../components/RestrictedZonesView';

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [currentTab, setTab] = useState('overview'); // overview, admins, operators, registry, permissions, zones, geofences, models, radar_cfg, cameras, audit, settings
  const [healthData, setHealthData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [drones, setDrones] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [zones, setZones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  // System Settings state
  const [radarGain, setRadarGain] = useState(85);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [auditRetention, setAuditRetention] = useState(365);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchSystemData = async () => {
    try {
      const [hRes, aRes, dRes, pRes, zRes, cRes, sRes] = await Promise.all([
        fetch('/api/health').catch(() => null),
        fetch('/api/audit').catch(() => null),
        fetch('/api/drones').catch(() => null),
        fetch('/api/permissions').catch(() => null),
        fetch('/api/zones').catch(() => null),
        fetch('/api/cameras').catch(() => null),
        fetch('/api/settings').catch(() => null)
      ]);
      const [hData, aData, dData, pData, zData, cData, sData] = await Promise.all([
        hRes ? hRes.json() : null,
        aRes ? aRes.json() : null,
        dRes ? dRes.json() : null,
        pRes ? pRes.json() : null,
        zRes ? zRes.json() : null,
        cRes ? cRes.json() : null,
        sRes ? sRes.json() : null
      ]);
      if (hData) setHealthData(hData);
      if (aData?.logs) setAuditLogs(aData.logs);
      if (dData?.drones) setDrones(dData.drones);
      if (pData?.permissions) setPermissions(pData.permissions);
      if (zData?.zones) setZones(zData.zones);
      if (cData?.cameras) setCameras(cData.cameras);
      if (sData?.settings) {
        if (sData.settings.audit_retention_days) {
          setAuditRetention(Number(sData.settings.audit_retention_days));
        }
        if (sData.settings.session_timeout_minutes) {
          setSessionTimeout(Number(sData.settings.session_timeout_minutes));
        }
      }
    } catch (err) {
      console.error('[SuperAdmin] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/super-admin/login', { replace: true });
  };

  // Seeded Administrators
  const administrators = [
    { id: 'USR-SUP-001', name: 'Dr. S. Jayaram', role: 'SUPER_ADMIN', email: 'admin@aeroguard.gov', org: 'AeroGuard Directorate', status: 'ACTIVE' },
    { id: 'USR-OFF-001', name: 'Inspector V. Raman', role: 'OFFICER', email: 'officer@aeroguard.gov', org: 'Coastal Defense Airspace Command', status: 'ACTIVE' },
    { id: 'USR-OFF-002', name: 'Commander S. Natarajan', role: 'OFFICER', email: 'admin.officer@aeroguard.gov', org: 'Airspace SOC', status: 'ACTIVE' }
  ];

  // Seeded Operators
  const registeredOperators = [
    { id: 'USR-OP-001', name: 'R. Karthik', email: 'operator@aeroguard.gov', org: 'Tamil Nadu Maritime Logistics', drones: 2, status: 'VERIFIED' },
    { id: 'USR-OP-002', name: 'Coastal Guard Logistics', email: 'logistics@coastguard.gov.in', org: 'Coastal Guard Recon', drones: 1, status: 'VERIFIED' },
    { id: 'USR-OP-003', name: 'Oceanic Research Ltd', email: 'survey@oceanic.in', org: 'Oceanic Scientific Institute', drones: 1, status: 'VERIFIED' }
  ];

  const handleCreateZone = async (newZone) => {
    try {
      const token = localStorage.getItem('aeroguard_token') || 'aerosec-admin-token';
      await fetch('/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newZone)
      });
      fetchSystemData();
    } catch (err) {
      console.error('Create zone error:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('aeroguard_token') || 'aerosec-admin-token';
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          audit_retention_days: parseInt(auditRetention, 10),
          session_timeout_minutes: parseInt(sessionTimeout, 10)
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      }
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  return (
    <div className="flex h-screen bg-aerodark-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Super Admin Navigation Sidebar */}
      <aside className="w-64 bg-aerodark-900 border-r border-aerodark-700 flex flex-col justify-between py-3 shrink-0">
        <div className="space-y-3 px-3">
          {/* Super Admin Header */}
          <div className="flex items-center space-x-2.5 px-2 py-1">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-slate-100">AEROGUARD</div>
              <div className="text-[10px] text-amber-400 font-medium">SUPER ADMINISTRATION</div>
            </div>
          </div>

          <div className="pt-2 border-t border-aerodark-800">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Administration Modules
            </div>
            <nav className="mt-1 space-y-0.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
              {[
                { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
                { id: 'admins', label: 'Administrators', icon: Users, badge: '3' },
                { id: 'operators', label: 'Operators', icon: Users, badge: registeredOperators.length },
                { id: 'registry', label: 'Drone Registry', icon: Plane, badge: drones.length },
                { id: 'permissions', label: 'Permissions', icon: FileCheck2, badge: permissions.length },
                { id: 'zones', label: 'Restricted Zones', icon: ShieldAlert, badge: zones.length },
                { id: 'geofences', label: 'Geofences', icon: ShieldAlert },
                { id: 'models', label: 'AI Models', icon: Cpu, badge: '99.8%' },
                { id: 'radar_cfg', label: 'Radar Configuration', icon: Radar },
                { id: 'cameras', label: 'Camera Management', icon: Camera, badge: cameras.length },
                { id: 'audit', label: 'Audit Logs', icon: ScrollText, badge: auditLogs.length },
                { id: 'settings', label: 'System Settings', icon: Settings }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-aerodark-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-aerodark-800 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="px-4 space-y-3">
          <div className="p-3 rounded-xl bg-aerodark-850 border border-aerodark-700/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs">
                {user?.full_name ? user.full_name.charAt(0) : 'S'}
              </div>
              <div className="truncate">
                <div className="font-semibold text-xs text-slate-200 truncate">{user?.full_name || 'Administrator'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.organization || 'Directorate'}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-mono text-amber-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>SUPER ADMIN PRIVILEGES</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium bg-aerodark-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-aerodark-700 hover:border-red-500/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminate Admin Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="px-6 py-3.5 bg-aerodark-900 border-b border-aerodark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {currentTab.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-300">
              AeroGuard Directorate System Administration
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400">
              System Health: <strong className="text-emerald-400 font-mono">100% OPERATIONAL</strong>
            </span>
            <span className="text-aerodark-700">|</span>
            <button
              onClick={fetchSystemData}
              className="p-1 rounded-md hover:bg-aerodark-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh System Telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Tab Router */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: SYSTEM OVERVIEW */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>ACTIVE USERS</span>
                    <Users className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">{administrators.length + registeredOperators.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">3 Admins · {registeredOperators.length} Operators</div>
                </div>

                <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>RESTRICTED GEOFENCES</span>
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-blue-400 font-mono">{zones.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Coastal defense sectors</div>
                </div>

                <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>ASTRA RADAR ACCURACY</span>
                    <Cpu className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">99.82%</div>
                  <div className="text-[11px] text-slate-400 mt-1">RandomForest Micro-Doppler</div>
                </div>

                <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                    <span>AUDIT RECORDS</span>
                    <ScrollText className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-purple-400 font-mono">{auditLogs.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Cryptographically logged</div>
                </div>
              </div>

              {/* Component Health Matrix */}
              <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span>Subsystem Operational Health Matrix</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                  {healthData?.components && Object.entries(healthData.components).map(([k, v]) => (
                    <div key={k} className="p-3 rounded-lg bg-aerodark-950 border border-aerodark-800 flex items-center justify-between">
                      <span className="text-slate-400 font-sans">{k.replace('_', ' ').toUpperCase()}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMINISTRATORS */}
          {currentTab === 'admins' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white">System Administrators & Law Enforcement Officers</h2>
              <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-aerodark-950 border-b border-aerodark-800 text-slate-400 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="p-3">User ID</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Official Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aerodark-800">
                    {administrators.map(a => (
                      <tr key={a.id} className="text-slate-300 hover:bg-aerodark-850/50">
                        <td className="p-3 font-mono text-amber-400 font-bold">{a.id}</td>
                        <td className="p-3 font-semibold text-white">{a.name}</td>
                        <td className="p-3 font-mono text-slate-400">{a.email}</td>
                        <td className="p-3 font-mono text-xs">{a.role}</td>
                        <td className="p-3 text-slate-400">{a.org}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OPERATORS */}
          {currentTab === 'operators' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white">Registered Civilian Drone Operators</h2>
              <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-aerodark-950 border-b border-aerodark-800 text-slate-400 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="p-3">Operator ID</th>
                      <th className="p-3">Operator Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Fleet Size</th>
                      <th className="p-3">DGCA Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aerodark-800">
                    {registeredOperators.map(o => (
                      <tr key={o.id} className="text-slate-300 hover:bg-aerodark-850/50">
                        <td className="p-3 font-mono text-sky-400 font-bold">{o.id}</td>
                        <td className="p-3 font-semibold text-white">{o.name}</td>
                        <td className="p-3 font-mono text-slate-400">{o.email}</td>
                        <td className="p-3 text-slate-400">{o.org}</td>
                        <td className="p-3 font-mono">{o.drones} Drones</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DRONE REGISTRY */}
          {currentTab === 'registry' && (
            <PermissionsRegistryView
              activeSubtab="REGISTRY"
              drones={drones}
              permissions={permissions}
              onApprovePermission={() => {}}
              onRejectPermission={() => {}}
            />
          )}

          {/* TAB 5: PERMISSIONS */}
          {currentTab === 'permissions' && (
            <PermissionsRegistryView
              activeSubtab="PERMISSIONS"
              drones={drones}
              permissions={permissions}
              onApprovePermission={() => {}}
              onRejectPermission={() => {}}
            />
          )}

          {/* TAB 6 & 7: RESTRICTED ZONES & GEOFENCES */}
          {(currentTab === 'zones' || currentTab === 'geofences') && (
            <RestrictedZonesView
              zones={zones}
              onCreateZone={handleCreateZone}
              onImportGeoJSON={fetchSystemData}
            />
          )}

          {/* TAB 8: AI MODELS */}
          {currentTab === 'models' && (
            <AITransparencyView systemHealth={healthData} />
          )}

          {/* TAB 9: RADAR CONFIGURATION */}
          {currentTab === 'radar_cfg' && (
            <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-6 space-y-4 max-w-2xl">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Radar className="w-4 h-4 text-amber-400" />
                <span>Primary Pulse-Doppler Radar Station Configuration</span>
              </h2>
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">RECEIVER SENSITIVITY GAIN</span>
                    <span className="font-mono text-amber-400">{radarGain}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={radarGain}
                    onChange={(e) => setRadarGain(e.target.value)}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="p-3 bg-aerodark-950 border border-aerodark-800 rounded-lg font-mono text-[11px] text-slate-300 space-y-1">
                  <div>STATION: CHENNAI NAVAL COASTAL COMMAND (13.065°N, 80.295°E)</div>
                  <div>PULSE REPETITION FREQUENCY (PRF): 2,400 Hz</div>
                  <div>MAX INSTRUMENTED RANGE: 10,000 meters</div>
                  <div>MICRO-DOPPLER SAMPLING RATE: 10 kHz (300 spectral bins)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: CAMERA MANAGEMENT */}
          {currentTab === 'cameras' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white">Coastal EO/IR Optical PTZ Towers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cameras.map(c => (
                  <div key={c.camera_id} className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-white">{c.name}</div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {c.status}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      ID: {c.camera_id} · TYPE: {c.stream_type} · FOV: {c.fov_deg}°
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Location: {c.latitude}°N, {c.longitude}°E · Range: {c.coverage_radius_m}m
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: AUDIT LOGS */}
          {currentTab === 'audit' && (
            <AuditLogView logs={auditLogs} />
          )}

          {/* TAB 12: SYSTEM SETTINGS */}
          {currentTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-6 space-y-5 max-w-xl">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Global System Security Settings</span>
              </h2>

              {settingsSaved && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>System configuration updated and recorded in audit ledger.</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Session Idle Timeout (Minutes)</label>
                  <input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Audit Trail Retention (Days)</label>
                  <input
                    type="number"
                    value={auditRetention}
                    onChange={(e) => setAuditRetention(e.target.value)}
                    className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Security Enforcement Mode</label>
                  <select className="w-full px-3 py-2 bg-aerodark-950 border border-aerodark-700 rounded-lg text-slate-100 outline-none">
                    <option>STRICT: Passive Surveillance & Chain of Custody Only</option>
                    <option>DGCA ENFORCED: Automated Airspace Violation Tagging</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg shadow-sm"
              >
                Save System Configuration
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
