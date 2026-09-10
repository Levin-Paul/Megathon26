import React, { useState } from 'react';
import { FolderGit2, ShieldAlert, FileText, UserCheck, CheckCircle2, Clock, MapPin, Eye, Camera, Radar } from 'lucide-react';

export default function IncidentsEvidenceView({ incidents, selectedIncident, onSelectIncident, onUpdateIncident }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [officerNotes, setOfficerNotes] = useState('');
  const [newStatus, setNewStatus] = useState('INVESTIGATING');

  const inc = selectedIncident || (incidents && incidents[0]) || {
    incident_id: 'INC-2026-001',
    track_id: 'TRACK-0001',
    incident_type: 'Unauthorized Coastal Airspace Intrusion',
    severity: 'CRITICAL',
    location_name: 'INS Adyar Naval Base & Coastal Defense Sector',
    latitude: 13.068,
    longitude: 80.301,
    status: 'OPEN',
    assigned_officer: 'Inspector V. Raman',
    summary: 'Automated incident opened. Radar + Optical fusion confirmed unauthorized drone incursion into coastal defense sector.',
    created_at: '2026-09-10 16:42:21'
  };

  const evidenceTimeline = [
    { time: '16:42:10', type: 'RADAR_DETECTION', text: 'Simulated X-band coastal radar acquired aerial target signature at Range 520m.' },
    { time: '16:42:11', type: 'ASTRA_AI', text: 'ASTRA Micro-Doppler Classifier isolated Drone acoustic-RF profile (96.4% confidence).' },
    { time: '16:42:12', type: 'TRACK_SYSTEM', text: 'Unified Surveillance ID TRACK-0001 instantiated across system bus.' },
    { time: '16:42:13', type: 'OPTICAL_CUE', text: 'Spatial cueing vector generated; Naval Coastal Defense Cam-03 boresight locked.' },
    { time: '16:42:14', type: 'YOLO_AI', text: 'Optical YOLO detection confirmed Drone visual bounding box (94.8% confidence).' },
    { time: '16:42:15', type: 'SENSOR_FUSION', text: 'Sensor Fusion layer confirmed: Dual-signature RADAR + CAMERA CORRELATED.' },
    { time: '16:42:16', type: 'AUTHORIZATION_CHECK', text: 'Civil Airspace Registry check failed: Drone is unregistered (No DGCA UIN on file).' },
    { time: '16:42:19', type: 'TRAJECTORY_PREDICTION', text: 'Physics predictor alerted: Intrusion into Naval Defense Perimeter in 12 seconds.' },
    { time: '16:42:20', type: 'GEOFENCE_BREACH', text: 'Direct breach into INS Adyar Naval Base Restricted Airspace (0-1200m AGL).' },
    { time: '16:42:20', type: 'CRITICAL_ALERT', text: 'CRITICAL ALERT escalated to Coastal Police Command SOC.' },
    { time: '16:42:21', type: 'INCIDENT_CREATED', text: `Automated Case Dossier ${inc.incident_id} opened. QRT dispatched.` }
  ];

  const handleUpdate = (e) => {
    e.preventDefault();
    if (onUpdateIncident) {
      onUpdateIncident(inc.incident_id, {
        status: newStatus,
        notes: officerNotes
      });
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto text-xs font-sans select-none overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-aerodark-900 border border-aerodark-700">
            <FolderGit2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-100 tracking-wide">
              CIVIL LAW ENFORCEMENT INCIDENT DOSSIER & EVIDENCE
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              Tamper-evident audit chain of custody, sensor correlation evidence, and officer actions
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-sans text-xs">
          <span className="text-slate-400 font-medium">Status Filter:</span>
          {['ALL', 'OPEN', 'INVESTIGATING', 'CLOSED'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-md text-xs transition-all ${
                statusFilter === f
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'bg-aerodark-900 text-slate-400 hover:text-slate-200 border border-aerodark-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Incidents List */}
        <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Recorded Security Incidents
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[600px]">
            {incidents?.map((item) => (
              <div
                key={item.incident_id}
                onClick={() => onSelectIncident && onSelectIncident(item)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  inc.incident_id === item.incident_id
                    ? 'border-blue-500/50 bg-aerodark-800/80 shadow-sm'
                    : 'border-aerodark-700/70 bg-aerodark-900 hover:border-aerodark-600'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                  <span className="font-bold text-blue-400">{item.incident_id}</span>
                  <span className="px-1.5 py-0.5 rounded-md font-sans font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                    {item.severity}
                  </span>
                </div>
                <div className="font-semibold text-slate-200 text-xs mb-1">{item.incident_type}</div>
                <div className="text-[11px] text-slate-400 mb-1">{item.location_name}</div>
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 pt-1.5 border-t border-aerodark-700/60">
                  <span>TRACK: {item.track_id}</span>
                  <span className="text-blue-400 font-semibold">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center & Right: Incident Details and Evidence Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Incident Dossier Header Card */}
          <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-aerodark-700 pb-3">
              <div>
                <span className="font-mono font-bold text-base text-slate-100">{inc.incident_id}</span>
                <span className="ml-2 text-xs text-slate-400">· {inc.incident_type}</span>
              </div>
              <span className="px-3 py-1 rounded-md font-sans font-medium text-xs bg-red-500/15 text-red-300 border border-red-500/30">
                {inc.severity} THREAT
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs bg-aerodark-900 p-3 rounded-lg border border-aerodark-700">
              <div>
                <div className="text-slate-400 font-sans text-[11px]">ASSOCIATED TRACK</div>
                <div className="text-blue-400 font-bold text-xs mt-0.5">{inc.track_id}</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans text-[11px]">CASE STATUS</div>
                <div className="text-emerald-400 font-bold text-xs mt-0.5">{inc.status}</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans text-[11px]">ASSIGNED OFFICER</div>
                <div className="text-slate-200 font-bold text-xs mt-0.5">{inc.assigned_officer || 'Inspector V. Raman'}</div>
              </div>
              <div>
                <div className="text-slate-400 font-sans text-[11px]">TIME OF BREACH</div>
                <div className="text-slate-200 font-bold text-xs mt-0.5">{inc.created_at?.substring(11, 19) || '16:42:21'}</div>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-aerodark-900 p-3 rounded-lg border border-aerodark-700/60 leading-relaxed">
              <strong className="text-blue-400 uppercase font-semibold">Incident Summary:</strong> {inc.summary}
            </div>

            {/* Sensor Evidence Snapshots */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-aerodark-900 p-3 rounded-lg border border-aerodark-700 font-mono text-xs">
                <div className="flex items-center space-x-1.5 text-blue-400 font-semibold mb-2 font-sans">
                  <Radar className="w-4 h-4" />
                  <span className="uppercase text-[11px] tracking-wide">Radar Evidence Artifact</span>
                </div>
                <div className="text-slate-300 space-y-1 text-[11px]">
                  <div>Signature: X-Band Micro-Doppler Sequence</div>
                  <div>Model: ASTRA Random Forest Classifier</div>
                  <div>Confidence: 96.4% Drone Confidence</div>
                  <div>Doppler Frequency Shift: +142 Hz</div>
                </div>
              </div>

              <div className="bg-aerodark-900 p-3 rounded-lg border border-aerodark-700 font-mono text-xs">
                <div className="flex items-center space-x-1.5 text-blue-400 font-semibold mb-2 font-sans">
                  <Camera className="w-4 h-4" />
                  <span className="uppercase text-[11px] tracking-wide">Optical Evidence Artifact</span>
                </div>
                <div className="text-slate-300 space-y-1 text-[11px]">
                  <div>Sensor: Naval Coastal Cam-03 (EO/IR)</div>
                  <div>AI Engine: YOLO Visual Object Detector</div>
                  <div>Bounding Box: [265, 142, 375, 218]</div>
                  <div>Optical Confidence: 94.8% Drone</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Evidence Timeline */}
          <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 space-y-3.5 shadow-sm">
            <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Chain of Custody & Forensic Timeline</span>
            </div>

            <div className="space-y-2.5 text-xs relative pl-4 border-l-2 border-aerodark-700">
              {evidenceTimeline.map((item, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-aerodark-850"></div>
                  <div className="flex items-baseline space-x-2 font-mono">
                    <span className="text-blue-400 font-bold text-xs">{item.time}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-aerodark-900 text-slate-400 border border-aerodark-700 font-sans">
                      {item.type}
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs mt-0.5 font-sans">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Officer Action & Status Update Form */}
          <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 shadow-sm">
            <div className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-3">
              Law Enforcement Case Update
            </div>
            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Incident Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1 uppercase text-[10px]">Officer Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Civil law patrol identified drone landing site; flight telemetry logged."
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    className="w-full bg-aerodark-900 border border-aerodark-700 rounded-lg p-2.5 text-slate-200 outline-none focus:border-blue-500 font-sans text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-sm font-sans"
              >
                RECORD CASE ACTION IN AUDIT LOG
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
