import React, { useState } from 'react';
import { UserCheck, Plus, FileText, Send, Shield, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function OperatorPortal({ drones, permissions, onRegisterDrone, onRequestPermission }) {
  const [activeTab, setActiveTab] = useState('PERMISSIONS'); // PERMISSIONS, DRONES, NEW_PERM, NEW_DRONE

  // New Drone Form
  const [modelName, setModelName] = useState('');
  const [droneType, setDroneType] = useState('ROTORCRAFT');
  const [weightCategory, setWeightCategory] = useState('SMALL');
  const [ownerName, setOwnerName] = useState('');
  const [operatorContact, setOperatorContact] = useState('');

  // New Permission Form
  const [selectedDroneId, setSelectedDroneId] = useState(drones[0]?.drone_id || '');
  const [purpose, setPurpose] = useState('');
  const [zone, setZone] = useState('ZONE-CIVIL-03');
  const [maxAlt, setMaxAlt] = useState(80);
  const [startTime, setStartTime] = useState('2026-09-10 10:00:00');
  const [endTime, setEndTime] = useState('2026-09-10 18:00:00');
  const [submittedMessage, setSubmittedMessage] = useState(null);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!modelName || !ownerName) return;
    onRegisterDrone({
      model_name: modelName,
      drone_type: droneType,
      weight_category: weightCategory,
      owner_name: ownerName,
      operator_contact: operatorContact
    });
    setSubmittedMessage('Drone registration submitted and added to AeroGuard Civil Airspace Registry.');
    setModelName('');
    setOwnerName('');
    setTimeout(() => {
      setSubmittedMessage(null);
      setActiveTab('DRONES');
    }, 1500);
  };

  const handlePermSubmit = (e) => {
    e.preventDefault();
    if (!selectedDroneId || !purpose) return;
    onRequestPermission({
      drone_id: selectedDroneId,
      flight_purpose: purpose,
      allowed_zone: zone,
      max_altitude_m: maxAlt,
      start_time: startTime,
      end_time: endTime
    });
    setSubmittedMessage('Flight permission request submitted for Civil Law Enforcement evaluation.');
    setPurpose('');
    setTimeout(() => {
      setSubmittedMessage(null);
      setActiveTab('PERMISSIONS');
    }, 1500);
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto text-xs font-sans select-none overflow-y-auto h-full">
      {/* Portal Header */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-aerodark-900 border border-aerodark-700">
              <UserCheck className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-semibold text-sm text-slate-100 tracking-wide">PUBLIC DRONE OPERATOR PORTAL</span>
          </div>
          <div className="text-slate-400 text-xs mt-1">
            Civilian Flight Registration, DGCA UIN Compliance, and Coastal Airspace Access Authorization
          </div>
        </div>

        <div className="flex items-center space-x-2 font-sans text-xs">
          <button
            onClick={() => setActiveTab('PERMISSIONS')}
            className={`px-3 py-1.5 rounded-md transition-all font-medium ${
              activeTab === 'PERMISSIONS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-aerodark-900 text-slate-400 hover:text-slate-200 border border-aerodark-700'
            }`}
          >
            My Flight Permissions
          </button>
          <button
            onClick={() => setActiveTab('DRONES')}
            className={`px-3 py-1.5 rounded-md transition-all font-medium ${
              activeTab === 'DRONES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-aerodark-900 text-slate-400 hover:text-slate-200 border border-aerodark-700'
            }`}
          >
            My Drones
          </button>
          <button
            onClick={() => setActiveTab('NEW_PERM')}
            className={`px-3 py-1.5 rounded-md transition-all font-medium ${
              activeTab === 'NEW_PERM'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-aerodark-900 text-slate-400 hover:text-slate-200 border border-aerodark-700'
            }`}
          >
            + Request Flight Permit
          </button>
          <button
            onClick={() => setActiveTab('NEW_DRONE')}
            className={`px-3 py-1.5 rounded-md transition-all font-medium ${
              activeTab === 'NEW_DRONE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-aerodark-900 text-slate-400 hover:text-slate-200 border border-aerodark-700'
            }`}
          >
            + Register Drone
          </button>
        </div>
      </div>

      {submittedMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl font-sans text-xs flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>{submittedMessage}</span>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'PERMISSIONS' && (
        <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 shadow-sm space-y-3.5">
          <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Active & Past Airspace Permission Requests
          </div>
          <div className="overflow-x-auto rounded-lg border border-aerodark-700/60">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-slate-400 border-b border-aerodark-700 bg-aerodark-900 font-sans">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Permit ID</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Drone ID</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Operator</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Mission Purpose</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Zone</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Max Alt</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Status</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-aerodark-700/40 text-slate-300">
                {permissions?.map((p) => (
                  <tr key={p.permission_id} className="hover:bg-aerodark-800/50 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-blue-400">{p.permission_id}</td>
                    <td className="px-3.5 py-2.5">{p.drone_id}</td>
                    <td className="px-3.5 py-2.5 font-sans">{p.operator_name}</td>
                    <td className="px-3.5 py-2.5 font-sans">{p.flight_purpose}</td>
                    <td className="px-3.5 py-2.5 text-slate-400 font-sans">{p.allowed_zone}</td>
                    <td className="px-3.5 py-2.5">{p.max_altitude_m}m</td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-sans font-medium text-[10px] ${
                          p.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/15 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400 font-sans">{p.approved_by || 'Awaiting Review'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drones Tab */}
      {activeTab === 'DRONES' && (
        <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 shadow-sm space-y-3.5">
          <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Registered UAV Hardware in Civil Database
          </div>
          <div className="overflow-x-auto rounded-lg border border-aerodark-700/60">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-slate-400 border-b border-aerodark-700 bg-aerodark-900 font-sans">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Drone ID</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">DGCA UIN Number</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Model Name</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Type</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Weight Category</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Owner / Organization</th>
                  <th className="px-3.5 py-2.5 font-medium text-[11px] tracking-wider uppercase">Registration Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-aerodark-700/40 text-slate-300">
                {drones?.map((d) => (
                  <tr key={d.drone_id} className="hover:bg-aerodark-800/50 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-blue-400">{d.drone_id}</td>
                    <td className="px-3.5 py-2.5 text-slate-200 font-semibold">{d.uin_number}</td>
                    <td className="px-3.5 py-2.5 font-sans">{d.model_name}</td>
                    <td className="px-3.5 py-2.5 font-sans">{d.drone_type}</td>
                    <td className="px-3.5 py-2.5 font-sans">{d.weight_category}</td>
                    <td className="px-3.5 py-2.5 font-sans">{d.owner_name}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-md font-sans font-medium text-[10px]">
                        {d.registration_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Flight Permit Form */}
      {activeTab === 'NEW_PERM' && (
        <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-6 max-w-2xl shadow-sm space-y-3.5">
          <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Submit New Flight Authorization Request
          </div>
          <form onSubmit={handlePermSubmit} className="space-y-3.5 font-sans text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Select Registered Drone</label>
              <select
                value={selectedDroneId}
                onChange={(e) => setSelectedDroneId(e.target.value)}
                className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
              >
                {drones?.map((d) => (
                  <option key={d.drone_id} value={d.drone_id}>
                    {d.drone_id} - {d.model_name} ({d.uin_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Mission Purpose</label>
              <input
                type="text"
                placeholder="e.g. Coastal Infrastructure Inspection / Survey"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Requested Airspace Zone</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
                >
                  <option value="ZONE-CIVIL-03">ZONE-CIVIL-03 (Marina Coastal Buffer)</option>
                  <option value="ZONE-PORT-02">ZONE-PORT-02 (Chennai Port Perimeter)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Max Altitude Ceiling (m AGL)</label>
                <input
                  type="number"
                  value={maxAlt}
                  onChange={(e) => setMaxAlt(Number(e.target.value))}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
                  max="120"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Start Time (UTC)</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">End Time (UTC)</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Upload Flight Safety / Insurance Documentation</label>
              <input
                type="file"
                className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2 text-slate-400 text-xs"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm text-xs"
            >
              SUBMIT AUTHORIZATION REQUEST
            </button>
          </form>
        </div>
      )}

      {/* Register Drone Form */}
      {activeTab === 'NEW_DRONE' && (
        <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-6 max-w-2xl shadow-sm space-y-3.5">
          <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Register New Unmanned Aerial Vehicle (UAV)
          </div>
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 font-sans text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Drone Make & Model</label>
              <input
                type="text"
                placeholder="e.g. DJI Mavic 3 Enterprise / IdeaForge Q4i"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Drone Architecture</label>
                <select
                  value={droneType}
                  onChange={(e) => setDroneType(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
                >
                  <option value="ROTORCRAFT">ROTORCRAFT (Multirotor)</option>
                  <option value="HYBRID_VTOL">HYBRID VTOL</option>
                  <option value="FIXED_WING">FIXED WING</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Weight Category</label>
                <select
                  value={weightCategory}
                  onChange={(e) => setWeightCategory(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
                >
                  <option value="NANO">NANO (&lt; 250g)</option>
                  <option value="MICRO">MICRO (250g - 2kg)</option>
                  <option value="SMALL">SMALL (2kg - 25kg)</option>
                  <option value="MEDIUM">MEDIUM (25kg - 150kg)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Owner / Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Coastal Port Logistics Corp"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Operator Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91-9876543210"
                  value={operatorContact}
                  onChange={(e) => setOperatorContact(e.target.value)}
                  className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm text-xs"
            >
              REGISTER DRONE & ISSUE UIN
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
