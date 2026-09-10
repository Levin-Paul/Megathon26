import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function LiveDetectionCard({ track }) {
  if (!track) return null;

  const risk = track.risk || {
    level: 'LOW',
    score: 15,
    reasons: ['Normal airspace transit']
  };

  const auth = track.authorization || {
    status: 'UNKNOWN',
    reason: 'Evaluating registry status...'
  };

  const geofence = track.geofence || {
    status: 'CLEAR',
    reason: 'Clear of restricted zones'
  };

  const trajectory = track.trajectory || {};
  const breach = trajectory.breach_prediction;

  const getRiskBadgeColor = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default:
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3.5 text-xs flex flex-col space-y-3 shadow-sm select-none font-sans">
      {/* Target ID and Risk Header */}
      <div className="flex items-center justify-between border-b border-aerodark-700 pb-2.5">
        <div className="flex items-center space-x-2.5">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            risk.level === 'CRITICAL'
              ? 'bg-red-500 animate-pulse'
              : risk.level === 'HIGH'
              ? 'bg-amber-500'
              : risk.level === 'MEDIUM'
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}></div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">UNIFIED TRACK ID</div>
            <div className="text-base font-bold font-mono text-slate-100">{track.track_id}</div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-[11px] text-slate-400 font-medium">ASSESSED THREAT LEVEL</div>
          <div className={`px-2.5 py-1 rounded-md font-semibold text-xs border ${getRiskBadgeColor(risk.level)}`}>
            {risk.level} ({risk.score || 85}/100)
          </div>
        </div>
      </div>

      {/* Target Telemetry Grid */}
      <div className="grid grid-cols-3 gap-2.5 bg-aerodark-900 p-2.5 rounded-lg border border-aerodark-700">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">CLASS</div>
          <div className="text-blue-300 font-semibold text-xs mt-0.5">{track.object_type}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">CONFIDENCE</div>
          <div className="text-emerald-400 font-mono font-semibold text-xs mt-0.5">{((track.radar_confidence || 0.96) * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">RANGE</div>
          <div className="text-slate-200 font-mono font-semibold text-xs mt-0.5">{track.range_m || 420} m</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">ALTITUDE</div>
          <div className="text-slate-200 font-mono font-semibold text-xs mt-0.5">{track.altitude_m} m AGL</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">SPEED</div>
          <div className="text-slate-200 font-mono font-semibold text-xs mt-0.5">{track.speed_mps} m/s</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 font-medium">HEADING</div>
          <div className="text-slate-200 font-mono font-semibold text-xs mt-0.5">{track.heading_deg}°</div>
        </div>
      </div>

      {/* Real-time GPS Position */}
      <div className="flex items-center justify-between text-xs bg-aerodark-900/60 px-3 py-1.5 rounded-lg border border-aerodark-700">
        <span className="text-slate-400 font-medium">GPS COORDINATES:</span>
        <span className="text-slate-200 font-mono font-semibold">{track.latitude?.toFixed(5)}° N, {track.longitude?.toFixed(5)}° E</span>
      </div>

      {/* Authorization & Geofence Checks */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-aerodark-900/60 border border-aerodark-700">
          <span className="text-slate-400 font-medium">REGISTRATION & PERMIT:</span>
          <span
            className={`font-semibold text-xs px-2 py-0.5 rounded ${
              auth.status === 'AUTHORIZED'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-300 border border-red-500/30'
            }`}
          >
            {auth.status}
          </span>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-aerodark-900/60 border border-aerodark-700">
          <span className="text-slate-400 font-medium">GEOFENCE INTEGRITY:</span>
          <span
            className={`font-semibold text-xs px-2 py-0.5 rounded ${
              geofence.status === 'CLEAR'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-300 border border-red-500/30'
            }`}
          >
            {geofence.status}
          </span>
        </div>
      </div>

      {/* Forward Trajectory Breach Indicator */}
      {breach && (
        <div className="bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-lg text-xs text-amber-200 space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>PROJECTED AIRSPACE BREACH</span>
          </div>
          <div>Zone: <strong className="text-white">{breach.zone_name}</strong></div>
          <div>Estimated Incursion in: <strong className="text-red-300 font-mono">{breach.estimated_seconds}s</strong> ({breach.predicted_distance_m}m)</div>
        </div>
      )}

      {/* Transparent "WHY THIS RISK?" Explanation */}
      <div className="bg-aerodark-900 p-2.5 rounded-lg border border-aerodark-700 text-xs">
        <div className="text-slate-400 font-medium mb-1.5 flex items-center justify-between">
          <span className="uppercase tracking-wider text-[11px]">EXPLAINABLE RISK FACTORS:</span>
          <span className="text-blue-300 font-mono font-semibold text-[11px]">{risk.reasons?.length || 0} FACTORS</span>
        </div>
        <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
          {risk.reasons?.map((reason, idx) => (
            <li key={idx} className="truncate">
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
