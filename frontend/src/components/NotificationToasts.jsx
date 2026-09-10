import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Radar, 
  AlertTriangle, 
  ShieldAlert, 
  Wifi, 
  Activity, 
  Crosshair, 
  X
} from 'lucide-react';

// Web Audio API tactical sound synthesizer
export function playTacticalSound(type = 'ping', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'ping') {
      // Radar sweep contact ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'alert') {
      // Two-tone warning beep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.setValueAtTime(1046, now + 0.09);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.27);
    } else if (type === 'rf') {
      // Electronic high-pitched chirp
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.20);
    }
  } catch (e) {
    // Gracefully handle browser autoplay blocks
  }
}

export default function NotificationToasts({ 
  currentTrack, 
  onPinTarget, 
  onOpenRadar,
  soundEnabled = true,
  onAddNotification
}) {
  const [toasts, setToasts] = useState([]);
  const lastTrackIdRef = useRef(null);
  const lastRfFreqRef = useRef(null);
  const lastGeofenceRef = useRef(null);
  const lastRemoteIdRef = useRef(null);

  const addToast = (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newToast = {
      ...toast,
      id,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false })
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
    if (onAddNotification) {
      onAddNotification(newToast);
    }

    // Notification automatically disappears in 2 seconds once popped up
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);

    // Sound effect
    if (soundEnabled) {
      if (toast.category === 'DRONE' || toast.category === 'BREACH') {
        playTacticalSound('alert', true);
      } else if (toast.category === 'RF' || toast.category === 'REMOTE_ID') {
        playTacticalSound('rf', true);
      } else {
        playTacticalSound('ping', true);
      }
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Monitor incoming track changes & generate pop-ups
  useEffect(() => {
    if (!currentTrack) return;

    const trackId = currentTrack.track_id;
    const objType = currentTrack.object_type;
    const riskLevel = currentTrack.risk?.level || 'LOW';
    const intel = currentTrack.electronic_intel;
    const geofence = currentTrack.geofence?.status;

    // 1. Drone / Target acquisition notification
    if (trackId && trackId !== lastTrackIdRef.current) {
      lastTrackIdRef.current = trackId;

      if (objType === 'DRONE' || objType === 'HELICOPTER / STEALTH UAV') {
        addToast({
          category: 'DRONE',
          severity: riskLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          title: `🎯 TARGET ACQUIRED: ${trackId}`,
          subtitle: `${objType} (${((currentTrack.radar_confidence || 0.96) * 100).toFixed(1)}% Conf)`,
          details: `ALT: ${currentTrack.altitude_m}m | SPD: ${currentTrack.speed_mps} m/s | RNG: ${currentTrack.range_m}m`,
          track: currentTrack
        });
      } else if (objType === 'BIRD') {
        addToast({
          category: 'WILDLIFE',
          severity: 'INFO',
          title: `🌊 ORGANIC CONTACT: ${trackId}`,
          subtitle: `Sea Bird Flock · Zero Defense Threat`,
          details: `ALT: ${currentTrack.altitude_m}m | Natural Doppler Wing Flapping`,
          track: currentTrack
        });
      } else if (objType === 'AIRCRAFT') {
        addToast({
          category: 'AIRCRAFT',
          severity: 'INFO',
          title: `✈️ CIVIL AIRWAY TARGET: ${trackId}`,
          subtitle: `Commercial Passenger Aircraft`,
          details: `ALT: ${currentTrack.altitude_m}m | Speed: ${currentTrack.speed_mps} m/s`,
          track: currentTrack
        });
      }
    }

    // 2. Electronic RF Emission notification
    if (intel && intel.has_rf_emission && intel.frequency_mhz !== lastRfFreqRef.current) {
      lastRfFreqRef.current = intel.frequency_mhz;

      addToast({
        category: 'RF',
        severity: intel.frequency_mhz > 5000 ? 'CRITICAL' : 'WARNING',
        title: `⚡ RF EMISSION DETECTED: ${intel.frequency_mhz} MHz`,
        subtitle: `${intel.rf_band} · Protocol: ${intel.protocol}`,
        details: `SIGNAL: ${intel.signal_strength_dbm} dBm | SNR: ${intel.snr_db} dB | HOPPING: ${intel.hopping_rate_hz} hops/s`,
        track: currentTrack
      });
    }

    // 3. Remote ID Beacon broadcast notification
    if (intel && intel.remote_id && intel.remote_id.uin !== lastRemoteIdRef.current) {
      lastRemoteIdRef.current = intel.remote_id.uin;

      addToast({
        category: 'REMOTE_ID',
        severity: intel.remote_id.status === 'VERIFIED_DGCA' ? 'SUCCESS' : 'WARNING',
        title: `📡 REMOTE ID BROADCAST: ${intel.remote_id.uin}`,
        subtitle: `Operator Dist: ~${intel.remote_id.operator_distance_m}m · Status: ${intel.remote_id.status}`,
        details: `${intel.remote_id.broadcast_type}`,
        track: currentTrack
      });
    }

    // 4. Geofence violation notification
    if (geofence === 'RESTRICTED_ZONE_VIOLATION' && lastGeofenceRef.current !== 'RESTRICTED_ZONE_VIOLATION') {
      lastGeofenceRef.current = 'RESTRICTED_ZONE_VIOLATION';

      addToast({
        category: 'BREACH',
        severity: 'CRITICAL',
        title: `🚨 GEOFENCE BREACH: ${trackId}`,
        subtitle: `Direct Intrusion into Coastal Defense Restricted Airspace`,
        details: `Law Enforcement Action: Breach Alert Logged & Telemetry Archived`,
        track: currentTrack
      });
    } else if (geofence !== 'RESTRICTED_ZONE_VIOLATION') {
      lastGeofenceRef.current = geofence;
    }
  }, [currentTrack]);

  // Auto-dismiss toasts fallback after 2 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, prev.length - 1));
    }, 2000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <div className="fixed top-16 right-4 z-45 flex flex-col items-end space-y-2.5 max-w-sm w-full pointer-events-none select-none">
      {/* Active Toast Stack */}
      <div className="flex flex-col space-y-2.5 w-full">
        {toasts.map((toast) => {
          const isCritical = toast.severity === 'CRITICAL';
          const isSuccess = toast.severity === 'SUCCESS';

          let borderClass = 'border-l-4 border-l-blue-500 border-aerodark-700';
          let titleColor = 'text-blue-400';
          let icon = <Radar className="w-4 h-4 text-blue-400" />;

          if (isCritical) {
            borderClass = 'border-l-4 border-l-red-500 border-aerodark-700';
            titleColor = 'text-red-400';
            icon = <AlertTriangle className="w-4 h-4 text-red-400" />;
          } else if (toast.category === 'RF') {
            borderClass = 'border-l-4 border-l-amber-500 border-aerodark-700';
            titleColor = 'text-amber-400';
            icon = <Radio className="w-4 h-4 text-amber-400" />;
          } else if (toast.category === 'REMOTE_ID') {
            borderClass = isSuccess ? 'border-l-4 border-l-emerald-500 border-aerodark-700' : 'border-l-4 border-l-indigo-500 border-aerodark-700';
            titleColor = isSuccess ? 'text-emerald-400' : 'text-indigo-300';
            icon = <Wifi className="w-4 h-4 text-indigo-400" />;
          } else if (isSuccess) {
            borderClass = 'border-l-4 border-l-emerald-500 border-aerodark-700';
            titleColor = 'text-emerald-400';
            icon = <Activity className="w-4 h-4 text-emerald-400" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full bg-aerodark-900 border ${borderClass} rounded-xl shadow-xl p-3.5 text-xs backdrop-blur-md transform transition-all duration-300 animate-in slide-in-from-right-8`}
            >
              {/* Toast Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-aerodark-800 border border-aerodark-700 shrink-0">
                    {icon}
                  </div>
                  <div>
                    <div className={`font-semibold text-xs tracking-wide uppercase ${titleColor}`}>
                      {toast.title}
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium">
                      {toast.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 ml-2">
                  <span className="text-[10px] font-mono text-slate-400">{toast.timestamp}</span>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-aerodark-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Toast Details */}
              {toast.details && (
                <div className="mt-2 text-[11px] font-mono text-slate-300 bg-aerodark-950/70 border border-aerodark-700/60 rounded-md px-2.5 py-1.5 leading-snug">
                  {toast.details}
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-2.5 pt-2 border-t border-aerodark-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onPinTarget && onPinTarget(toast.track)}
                    className="flex items-center space-x-1 bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md font-medium text-[10px] tracking-wide transition-all cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>PIN ON MAP</span>
                  </button>

                  <button
                    onClick={onOpenRadar}
                    className="flex items-center space-x-1 bg-aerodark-800 hover:bg-aerodark-700 text-slate-200 border border-aerodark-700 px-2.5 py-1 rounded-md font-medium text-[10px] tracking-wide transition-all cursor-pointer"
                  >
                    <Radar className="w-3 h-3" />
                    <span>VIEW RADAR</span>
                  </button>
                </div>

                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                  REAL-TIME SIGINT
                </span>
              </div>

              {/* 2-Second Auto-Dismiss Indicator Bar */}
              <div className="w-full bg-aerodark-800/80 h-0.5 rounded-full overflow-hidden mt-2">
                <div className={`h-full animate-shrink-width ${isCritical ? 'bg-red-500' : toast.category === 'RF' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
