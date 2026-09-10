import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plane, 
  FileCheck2, 
  History, 
  BellRing, 
  User, 
  LayoutDashboard, 
  LogOut, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Building,
  Mail,
  Send,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OperatorDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [currentTab, setTab] = useState('dashboard'); // 'dashboard', 'drones', 'permissions', 'history', 'notifications', 'profile'
  const [drones, setDrones] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Drone Form state
  const [showAddDrone, setShowAddDrone] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [newType, setNewType] = useState('ROTORCRAFT');
  const [newWeight, setNewWeight] = useState('SMALL');
  const [newOwner, setNewOwner] = useState(user?.full_name || '');
  const [newContact, setNewContact] = useState('+91-9876543210');
  const [formMsg, setFormMsg] = useState(null);

  // New Permission Form state
  const [showAddPerm, setShowAddPerm] = useState(false);
  const [permDroneId, setPermDroneId] = useState('');
  const [permPurpose, setPermPurpose] = useState('');
  const [permZone, setPermZone] = useState('ZONE-CIVIL-03');
  const [permAlt, setPermAlt] = useState(80);
  const [permStart, setPermStart] = useState('2026-09-11 08:00:00');
  const [permEnd, setPermEnd] = useState('2026-09-11 18:00:00');

  const fetchData = async () => {
    try {
      const [dRes, pRes, zRes] = await Promise.all([
        fetch('http://127.0.0.1:5000/api/drones'),
        fetch('http://127.0.0.1:5000/api/permissions'),
        fetch('http://127.0.0.1:5000/api/zones')
      ]);
      const [dData, pData, zData] = await Promise.all([
        dRes.json(),
        pRes.json(),
        zRes.json()
      ]);
      if (dData.drones) {
        setDrones(dData.drones);
        if (dData.drones[0]) setPermDroneId(dData.drones[0].drone_id);
      }
      if (pData.permissions) setPermissions(pData.permissions);
      if (zData.zones) setZones(zData.zones);
    } catch (err) {
      console.error('[OperatorDashboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/operator/login', { replace: true });
  };

  const handleCreateDrone = async (e) => {
    e.preventDefault();
    if (!newModel || !newOwner) return;
    try {
      const res = await fetch('http://127.0.0.1:5000/api/drones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: newModel,
          drone_type: newType,
          weight_category: newWeight,
          owner_name: newOwner,
          operator_contact: newContact
        })
      });
      const data = await res.json();
      if (data.success) {
        setFormMsg('Drone successfully registered in AeroGuard Civil Registry.');
        fetchData();
        setNewModel('');
        setTimeout(() => {
          setFormMsg(null);
          setShowAddDrone(false);
        }, 1500);
      }
    } catch (err) {
      setFormMsg('Error registering drone.');
    }
  };

  const handleCreatePermission = async (e) => {
    e.preventDefault();
    if (!permDroneId || !permPurpose) return;
    try {
      const res = await fetch('http://127.0.0.1:5000/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drone_id: permDroneId,
          operator_name: user?.full_name || 'Civilian Operator',
          flight_purpose: permPurpose,
          allowed_zone: permZone,
          max_altitude_m: parseFloat(permAlt),
          start_time: permStart,
          end_time: permEnd
        })
      });
      const data = await res.json();
      if (data.success) {
        setFormMsg('Permission request submitted for Civil Law Enforcement evaluation.');
        fetchData();
        setPermPurpose('');
        setTimeout(() => {
          setFormMsg(null);
          setShowAddPerm(false);
        }, 1500);
      }
    } catch (err) {
      setFormMsg('Error submitting permission request.');
    }
  };

  // Filter operator notifications from permissions and alerts
  const notifications = [
    { id: 1, title: 'DGCA Permission PERM-2026-081 Active', time: 'Today, 08:00 IST', type: 'SUCCESS', desc: 'Authorized coastal infrastructure inspection flight in Sector ZONE-PORT-02.' },
    { id: 2, title: 'Civil Airspace Advisory: Marina Beach Sector', time: 'Yesterday, 17:30 IST', type: 'INFO', desc: 'Marina Public Coastal zone capped at 120m AGL for civilian recreational flights.' },
    { id: 3, title: 'Drone DRN-001 DGCA Registration Renewed', time: '08 Sep 2026', type: 'SUCCESS', desc: 'UIN-2026-IND-0101 verified and compliant with Civil Aviation Digital Sky.' }
  ];

  const approvedPerms = permissions.filter(p => p.status === 'APPROVED');
  const pendingPerms = permissions.filter(p => p.status === 'PENDING');

  return (
    <div className="flex h-screen bg-aerodark-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Role-Specific Operator Navigation */}
      <aside className="w-64 bg-aerodark-900 border-r border-aerodark-700 flex flex-col justify-between py-4 shrink-0">
        <div className="space-y-4 px-4">
          {/* Operator Brand Header */}
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-slate-100">AEROGUARD</div>
              <div className="text-[10px] text-sky-400 font-medium">DRONE OPERATOR PORTAL</div>
            </div>
          </div>

          <div className="pt-2 border-t border-aerodark-800">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Operator Navigation
            </div>
            <nav className="mt-1 space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'drones', label: 'My Drones', icon: Plane, badge: drones.length },
                { id: 'permissions', label: 'Permissions', icon: FileCheck2, badge: permissions.length },
                { id: 'history', label: 'Flight History', icon: History },
                { id: 'notifications', label: 'Notifications', icon: BellRing, badge: '3' },
                { id: 'profile', label: 'Profile', icon: User }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-sky-600/20 text-sky-300 border border-sky-500/30 font-semibold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-aerodark-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-aerodark-800 text-slate-400'
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
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 font-bold text-xs">
                {user?.full_name ? user.full_name.charAt(0) : 'O'}
              </div>
              <div className="truncate">
                <div className="font-semibold text-xs text-slate-200 truncate">{user?.full_name || 'Pilot'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.organization || 'Civilian Operator'}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>DGCA CERTIFIED PILOT</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium bg-aerodark-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-aerodark-700 hover:border-red-500/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="px-6 py-3.5 bg-aerodark-900 border-b border-aerodark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {currentTab.toUpperCase()}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-300">
              Chennai Coastal Civil Airspace Sector
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400">
              Active Flights: <strong className="text-emerald-400 font-mono">{approvedPerms.length}</strong>
            </span>
            <span className="text-aerodark-700">|</span>
            <span className="text-slate-400">
              Registered Fleet: <strong className="text-sky-400 font-mono">{drones.length}</strong>
            </span>
          </div>
        </header>

        {/* View Router Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {formMsg && (
            <div className="p-3 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{formMsg}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-medium">
                    <span>MY REGISTERED DRONES</span>
                    <Plane className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">{drones.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">All verified under DGCA Digital Sky</div>
                </div>

                <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-medium">
                    <span>ACTIVE FLIGHT PERMITS</span>
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">{approvedPerms.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Authorized in coastal zones</div>
                </div>

                <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-medium">
                    <span>PENDING CLEARANCES</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-amber-400 font-mono">{pendingPerms.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Under civil law enforcement review</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => { setTab('drones'); setShowAddDrone(true); }}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Drone</span>
                </button>
                <button
                  onClick={() => { setTab('permissions'); setShowAddPerm(true); }}
                  className="px-4 py-2 rounded-lg bg-aerodark-800 hover:bg-aerodark-700 text-slate-200 border border-aerodark-700 font-medium text-xs flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <Send className="w-4 h-4 text-sky-400" />
                  <span>Request Flight Permission</span>
                </button>
              </div>

              {/* Recent Permissions Overview Table */}
              <div className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-sky-400" />
                  <span>Recent Flight Clearances</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-aerodark-700 text-slate-400 font-mono uppercase text-[11px]">
                        <th className="pb-2">Permit ID</th>
                        <th className="pb-2">Drone</th>
                        <th className="pb-2">Flight Purpose</th>
                        <th className="pb-2">Zone</th>
                        <th className="pb-2">Max Alt</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-aerodark-800">
                      {permissions.slice(0, 5).map((p) => (
                        <tr key={p.permission_id} className="text-slate-300 hover:bg-aerodark-850/50">
                          <td className="py-2.5 font-mono text-sky-300 font-bold">{p.permission_id}</td>
                          <td className="py-2.5 font-mono">{p.drone_id}</td>
                          <td className="py-2.5">{p.flight_purpose}</td>
                          <td className="py-2.5 font-mono text-[11px] text-slate-400">{p.allowed_zone}</td>
                          <td className="py-2.5 font-mono">{p.max_altitude_m}m</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                              p.status === 'PENDING' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                              'bg-red-500/15 text-red-300 border border-red-500/30'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY DRONES */}
          {currentTab === 'drones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Registered Drone Fleet</h2>
                  <p className="text-xs text-slate-400">DGCA UIN registered civilian aerial platforms</p>
                </div>
                <button
                  onClick={() => setShowAddDrone(!showAddDrone)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddDrone ? 'Close Form' : 'Add Drone'}</span>
                </button>
              </div>

              {/* Add Drone Modal / Form */}
              {showAddDrone && (
                <form onSubmit={handleCreateDrone} className="bg-aerodark-900 border border-sky-500/30 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-xs text-sky-300 uppercase">Register New Drone in Civil Database</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Model Name</label>
                      <input
                        type="text"
                        required
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        placeholder="e.g. DJI Mavic 3 Enterprise"
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      >
                        <option value="ROTORCRAFT">ROTORCRAFT (Quadcopter)</option>
                        <option value="HYBRID_VTOL">HYBRID VTOL</option>
                        <option value="MULTIROTOR">HEAVY MULTIROTOR</option>
                        <option value="FIXED_WING">FIXED WING</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Weight Category</label>
                      <select
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      >
                        <option value="NANO">NANO (&lt; 250g)</option>
                        <option value="MICRO">MICRO (250g - 2kg)</option>
                        <option value="SMALL">SMALL (2kg - 25kg)</option>
                        <option value="MEDIUM">MEDIUM (25kg - 150kg)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Registered Owner</label>
                      <input
                        type="text"
                        required
                        value={newOwner}
                        onChange={(e) => setNewOwner(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Operator Contact Phone</label>
                      <input
                        type="text"
                        value={newContact}
                        onChange={(e) => setNewContact(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-lg"
                  >
                    Submit Registration
                  </button>
                </form>
              )}

              {/* Drones List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drones.map((d) => (
                  <div key={d.drone_id} className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-100">{d.model_name}</div>
                        <div className="text-[11px] font-mono text-sky-400">{d.uin_number}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {d.registration_status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 border-t border-aerodark-800 pt-2 font-mono">
                      <div>TYPE: <strong className="text-slate-200 font-sans">{d.drone_type}</strong></div>
                      <div>WEIGHT: <strong className="text-slate-200 font-sans">{d.weight_category}</strong></div>
                      <div>OWNER: <strong className="text-slate-200 font-sans">{d.owner_name}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PERMISSIONS */}
          {currentTab === 'permissions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Flight Permission Requests</h2>
                  <p className="text-xs text-slate-400">DGCA digital airspace authorization requests</p>
                </div>
                <button
                  onClick={() => setShowAddPerm(!showAddPerm)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddPerm ? 'Close Form' : 'Request Flight Clearance'}</span>
                </button>
              </div>

              {/* Add Permission Form */}
              {showAddPerm && (
                <form onSubmit={handleCreatePermission} className="bg-aerodark-900 border border-sky-500/30 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-xs text-sky-300 uppercase">Apply for Coastal Airspace Access</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Select Registered Drone</label>
                      <select
                        value={permDroneId}
                        onChange={(e) => setPermDroneId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      >
                        {drones.map(d => (
                          <option key={d.drone_id} value={d.drone_id}>
                            {d.model_name} ({d.uin_number})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Coastal Airspace Zone</label>
                      <select
                        value={permZone}
                        onChange={(e) => setPermZone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      >
                        {zones.map(z => (
                          <option key={z.zone_id} value={z.zone_id}>
                            {z.name} (Max {z.max_altitude_m}m)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Flight Purpose</label>
                      <input
                        type="text"
                        required
                        value={permPurpose}
                        onChange={(e) => setPermPurpose(e.target.value)}
                        placeholder="e.g. Maritime Coastal Infrastructure Survey"
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Max Altitude (meters)</label>
                      <input
                        type="number"
                        value={permAlt}
                        onChange={(e) => setPermAlt(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Start Time</label>
                      <input
                        type="text"
                        value={permStart}
                        onChange={(e) => setPermStart(e.target.value)}
                        className="w-full px-3 py-1.5 bg-aerodark-950 border border-aerodark-700 rounded-lg text-xs text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-lg"
                  >
                    Submit Flight Permission Request
                  </button>
                </form>
              )}

              {/* Permissions Cards */}
              <div className="space-y-3">
                {permissions.map((p) => (
                  <div key={p.permission_id} className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs font-mono text-sky-400">{p.permission_id}</span>
                        <span className="text-slate-500">·</span>
                        <span className="font-semibold text-xs text-white">{p.flight_purpose}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">
                        Zone: {p.allowed_zone} · Max Altitude: {p.max_altitude_m}m · Drone: {p.drone_id}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Schedule: {p.start_time} to {p.end_time}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                        p.status === 'PENDING' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                        'bg-red-500/15 text-red-300 border border-red-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FLIGHT HISTORY */}
          {currentTab === 'history' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white">Historical Flight Logs</h2>
              <p className="text-xs text-slate-400">Archived flight missions and compliance records</p>

              <div className="space-y-3">
                {[
                  { date: '2026-09-08', drone: 'DRN-001 (DJI Matrice 300 RTK)', duration: '48 mins', zone: 'ZONE-PORT-02', result: 'COMPLIANT (100% within geofence)' },
                  { date: '2026-09-05', drone: 'DRN-003 (Garuda Kisan-X)', duration: '32 mins', zone: 'ZONE-CIVIL-03', result: 'COMPLIANT (Safe recovery on landing pad)' },
                  { date: '2026-08-28', drone: 'DRN-001 (DJI Matrice 300 RTK)', duration: '55 mins', zone: 'ZONE-PORT-02', result: 'COMPLIANT (Harbor breakwater survey completed)' }
                ].map((log, idx) => (
                  <div key={idx} className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-200">{log.drone}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Date: {log.date} · Duration: {log.duration} · Zone: {log.zone}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {log.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {currentTab === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white">Airspace Notifications & Advisories</h2>
              <p className="text-xs text-slate-400">Official civil law enforcement updates and approval notifications</p>

              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="bg-aerodark-900 border border-aerodark-700 rounded-xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-100">{n.title}</div>
                      <span className="text-[10px] font-mono text-slate-500">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-300">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PROFILE */}
          {currentTab === 'profile' && (
            <div className="max-w-xl bg-aerodark-900 border border-aerodark-700 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white border-b border-aerodark-800 pb-3 flex items-center space-x-2">
                <User className="w-4 h-4 text-sky-400" />
                <span>Operator Profile & Credentials</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-aerodark-800">
                  <span className="text-slate-400">FULL NAME</span>
                  <strong className="text-slate-200">{user?.full_name || 'R. Karthik'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-aerodark-800">
                  <span className="text-slate-400">USERNAME</span>
                  <strong className="text-sky-400 font-mono">{user?.username || 'operator'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-aerodark-800">
                  <span className="text-slate-400">EMAIL</span>
                  <strong className="text-slate-200 font-mono">{user?.email || 'operator@aeroguard.gov'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-aerodark-800">
                  <span className="text-slate-400">ORGANIZATION</span>
                  <strong className="text-slate-200">{user?.organization || 'Tamil Nadu Maritime Logistics'}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-aerodark-800">
                  <span className="text-slate-400">ROLE</span>
                  <strong className="text-emerald-400 font-mono">{user?.role || 'OPERATOR'}</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">DGCA REGISTRY STATUS</span>
                  <strong className="text-emerald-400">VERIFIED ACTIVE</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
