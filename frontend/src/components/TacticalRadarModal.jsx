import React, { useState, useEffect, useRef } from 'react';
import { 
  Radar, 
  X, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Radio, 
  Wifi, 
  ShieldAlert, 
  Activity, 
  Crosshair, 
  FileText,
  ShieldCheck,
  RotateCw,
  Compass,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { playTacticalSound } from './NotificationToasts';

export default function TacticalRadarModal({
  isOpen,
  onClose,
  currentTrack,
  historyTrail = [],
  soundEnabled = true,
  onToggleSound,
  onPinTarget
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [rangeScaleM, setRangeScaleM] = useState(3000); // 1000m, 3000m, 5000m
  const [sweepSpeedSec, setSweepSpeedSec] = useState(3.0); // 1.5s, 3.0s, 5.0s
  const [colorTheme, setColorTheme] = useState('CYAN'); // CYAN, GREEN, AMBER, STEALTH
  const [evidenceLogged, setEvidenceLogged] = useState(false);
  const [audioPingSweep, setAudioPingSweep] = useState(true);

  const prevBearingRef = useRef(null);

  // Sound ping on sweep revolutions
  useEffect(() => {
    if (!isOpen || !soundEnabled || !audioPingSweep) return;
    const interval = setInterval(() => {
      playTacticalSound('ping', true);
    }, sweepSpeedSec * 1000);
    return () => clearInterval(interval);
  }, [isOpen, soundEnabled, audioPingSweep, sweepSpeedSec]);

  // Station Center (Chennai Naval Coastal Ops Center)
  const stationLat = 13.065;
  const stationLon = 80.295;

  if (!isOpen) return null;

  // Calculate Polar Coordinates (R, Bearing Theta) from Station to Track
  const targetLat = currentTrack?.latitude || stationLat + 0.008;
  const targetLon = currentTrack?.longitude || stationLon + 0.005;

  const dLat = (targetLat - stationLat) * 111000;
  const dLon = (targetLon - stationLon) * 111000 * Math.cos((stationLat * Math.PI) / 180);
  const rawRange = Math.sqrt(dLat * dLat + dLon * dLon);
  const rangeM = Math.round(currentTrack?.range_m || rawRange);

  // Bearing in degrees (0° North, 90° East)
  let bearingDeg = Math.round((Math.atan2(dLon, dLat) * 180) / Math.PI);
  if (bearingDeg < 0) bearingDeg += 360;

  // Bearing quadrant text
  const getBearingText = (deg) => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W';
    return 'NW';
  };

  // Normalized Polar coordinates to percentage (Center is 50%, 50%)
  const maxR = rangeScaleM;
  const normalizedR = Math.min(0.92, rawRange / maxR);
  const radAngle = (bearingDeg - 90) * (Math.PI / 180); // 0° is North
  const blipX = 50 + normalizedR * 46 * Math.cos(radAngle);
  const blipY = 50 + normalizedR * 46 * Math.sin(radAngle);

  // History trail points normalized to radar
  const radarTrail = (historyTrail || []).slice(-15).map(([hLat, hLon]) => {
    const dhLat = (hLat - stationLat) * 111000;
    const dhLon = (hLon - stationLon) * 111000 * Math.cos((stationLat * Math.PI) / 180);
    const hRange = Math.sqrt(dhLat * dhLat + dhLon * dhLon);
    let hBear = Math.round((Math.atan2(dhLon, dhLat) * 180) / Math.PI);
    if (hBear < 0) hBear += 360;
    const hNormR = Math.min(0.95, hRange / maxR);
    const hRad = (hBear - 90) * (Math.PI / 180);
    return {
      x: 50 + hNormR * 46 * Math.cos(hRad),
      y: 50 + hNormR * 46 * Math.sin(hRad)
    };
  });

  // Color theme mapping
  const themes = {
    CYAN: {
      primary: '#38BDF8',
      primaryGlow: 'rgba(56, 189, 248, 0.15)',
      ringBorder: 'rgba(56, 189, 248, 0.20)',
      crosshair: 'rgba(56, 189, 248, 0.15)',
      bg: 'bg-aerodark-950',
      panelBg: 'bg-aerodark-850',
      border: 'border-aerodark-700',
      text: 'text-sky-300',
      sweepGradient: 'linear-gradient(45deg, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0) 70%)'
    },
    GREEN: {
      primary: '#10B981',
      primaryGlow: 'rgba(16, 185, 129, 0.15)',
      ringBorder: 'rgba(16, 185, 129, 0.20)',
      crosshair: 'rgba(16, 185, 129, 0.15)',
      bg: 'bg-aerodark-950',
      panelBg: 'bg-aerodark-850',
      border: 'border-emerald-500/40',
      text: 'text-emerald-300',
      sweepGradient: 'linear-gradient(45deg, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)'
    },
    AMBER: {
      primary: '#F59E0B',
      primaryGlow: 'rgba(245, 158, 11, 0.15)',
      ringBorder: 'rgba(245, 158, 11, 0.20)',
      crosshair: 'rgba(245, 158, 11, 0.15)',
      bg: 'bg-aerodark-950',
      panelBg: 'bg-aerodark-850',
      border: 'border-amber-500/40',
      text: 'text-amber-300',
      sweepGradient: 'linear-gradient(45deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%)'
    },
    STEALTH: {
      primary: '#EF4444',
      primaryGlow: 'rgba(239, 68, 68, 0.15)',
      ringBorder: 'rgba(239, 68, 68, 0.20)',
      crosshair: 'rgba(239, 68, 68, 0.15)',
      bg: 'bg-aerodark-950',
      panelBg: 'bg-aerodark-850',
      border: 'border-red-500/40',
      text: 'text-red-300',
      sweepGradient: 'linear-gradient(45deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0) 70%)'
    }
  };

  const currentTheme = themes[colorTheme] || themes.CYAN;
  const intel = currentTrack?.electronic_intel || {};
  const isDrone = currentTrack?.object_type === 'DRONE' || currentTrack?.object_type === 'HELICOPTER / STEALTH UAV';
  const riskLevel = currentTrack?.risk?.level || 'LOW';

  // Target Blip Color
  const blipColor = 
    riskLevel === 'CRITICAL' || currentTrack?.object_type === 'HELICOPTER / STEALTH UAV' ? '#EF4444' :
    riskLevel === 'HIGH' ? '#F59E0B' :
    currentTrack?.object_type === 'BIRD' ? '#38BDF8' :
    currentTrack?.object_type === 'AIRCRAFT' ? '#818CF8' : '#10B981';

  // Pop-Out to Standalone External Browser Window (for Multi-Monitor Ops)
  const handleOpenStandaloneWindow = () => {
    const win = window.open(
      '', 
      'AeroGuardRadarPopout', 
      'width=1100,height=800,menubar=no,toolbar=no,location=no,status=no'
    );
    if (!win) {
      alert('Pop-up window blocked by browser. Please allow pop-ups for this site.');
      return;
    }

    win.document.title = 'AeroGuard — Standalone Tactical Radar & SIGINT Scope';
    win.document.body.style.backgroundColor = '#030712';
    win.document.body.style.color = '#F3F4F6';
    win.document.body.style.fontFamily = 'monospace';
    win.document.body.style.margin = '0';
    win.document.body.style.overflow = 'hidden';

    win.document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100vh; padding: 16px; background: #030712; color: #38BDF8; font-family: monospace;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">
          <div style="font-size: 16px; font-weight: bold; letter-spacing: 2px;">📡 AEROGUARD TACTICAL PPI RADAR SCOPE</div>
          <div style="font-size: 12px; color: #10B981; border: 1px solid #10B981; padding: 2px 8px; border-radius: 4px;">ACTIVE PPI FEED</div>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="width: 480px; height: 480px; border-radius: 50%; border: 2px solid rgba(56, 189, 248, 0.4); position: relative; background: radial-gradient(circle, #082f49 0%, #030712 70%); display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 360px; height: 360px; border-radius: 50%; border: 1px solid rgba(56, 189, 248, 0.25);"></div>
            <div style="position: absolute; width: 240px; height: 240px; border-radius: 50%; border: 1px solid rgba(56, 189, 248, 0.25);"></div>
            <div style="position: absolute; width: 120px; height: 120px; border-radius: 50%; border: 1px solid rgba(56, 189, 248, 0.25);"></div>
            <div style="position: absolute; width: 100%; height: 1px; background: rgba(56, 189, 248, 0.3);"></div>
            <div style="position: absolute; height: 100%; width: 1px; background: rgba(56, 189, 248, 0.3);"></div>
            <div style="position: absolute; top: 38%; left: 62%; width: 14px; height: 14px; background: ${blipColor}; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 15px ${blipColor};"></div>
            <div style="color: #fff; font-size: 11px; position: absolute; top: 32%; left: 66%; background: rgba(0,0,0,0.7); padding: 2px 6px; border: 1px solid #38BDF8;">
              ${currentTrack?.track_id || 'TRACK-0001'} | ${currentTrack?.object_type || 'DRONE'} | ${rangeM}m
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; background: #0f172a; padding: 8px 12px; border: 1px solid #1e293b; border-radius: 4px;">
          <span>RANGE: ${rangeM}m | BEARING: ${bearingDeg}° (${getBearingText(bearingDeg)})</span>
          <span>ALTITUDE: ${currentTrack?.altitude_m || 88}m | SPEED: ${currentTrack?.speed_mps || 18} m/s</span>
          <span>RF EMISSION: ${intel?.frequency_mhz || '2437'} MHz (${intel?.protocol || 'FHSS'})</span>
        </div>
      </div>
    `;
  };

  // Minimized Floating HUD Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-3 bg-aerodark-900/95 border border-aerodark-700 p-2.5 rounded-xl shadow-xl backdrop-blur-md font-mono text-xs select-none">
        <div className="relative w-9 h-9 rounded-full border border-aerodark-700 bg-aerodark-950 flex items-center justify-center overflow-hidden shrink-0">
          <div 
            className="absolute inset-0 rounded-full animate-radar-sweep origin-center pointer-events-none"
            style={{ animationDuration: `${sweepSpeedSec}s` }}
          >
            <div className="w-1/2 h-1/2 absolute top-0 right-0 origin-bottom-left" style={{ background: currentTheme.sweepGradient }}></div>
          </div>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: blipColor }}></div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-200">RADAR SCOPE</span>
            <span className="text-[10px] text-blue-400 font-semibold">{currentTrack?.track_id || 'TRACK-0001'}</span>
          </div>
          <span className="text-[10px] text-slate-400">R: {rangeM}m | θ: {bearingDeg}° {getBearingText(bearingDeg)}</span>
        </div>

        <div className="flex items-center space-x-1 pl-2 border-l border-aerodark-700">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-aerodark-800 transition-colors"
            title="Restore Radar Window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-aerodark-800 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm select-none animate-in fade-in-50 duration-200`}>
      {/* Main Radar Scope Window Card */}
      <div className={`flex flex-col rounded-xl border border-aerodark-700 bg-aerodark-900 shadow-2xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl max-h-[92vh]'
      }`}>
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-aerodark-900 border-b border-aerodark-700 font-sans text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="font-semibold text-slate-100 tracking-wide uppercase text-sm">
                TACTICAL RADAR PPI SCOPE & ELECTRONIC SPECTRUM
              </span>
            </div>
            <span className="hidden md:inline-block text-slate-600">|</span>
            <span className="hidden md:inline-block text-[11px] text-slate-400 font-mono">
              STATION: CHENNAI NAVAL COASTAL RADAR [13.065°N, 80.295°E]
            </span>
          </div>

          {/* Window Action Controls */}
          <div className="flex items-center space-x-2">
            {/* Audio Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded-md transition-colors ${
                soundEnabled ? 'text-blue-400 bg-blue-600/15 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Mute Sonar Pings' : 'Enable Sonar Pings'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Standalone Window Pop-Out Button */}
            <button
              onClick={handleOpenStandaloneWindow}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all"
              title="Pop out into separate external browser window for dual-monitor displays"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">2ND MONITOR</span>
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-aerodark-800 transition-colors"
              title="Minimize to Floating Bar"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            {/* Maximize / Fullscreen */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-aerodark-800 transition-colors"
              title={isFullscreen ? 'Restore Size' : 'Fullscreen'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-aerodark-800 transition-colors"
              title="Close Radar Scope"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tactical Control Ribbon */}
        <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-aerodark-950/60 border-b border-aerodark-700 font-sans text-xs gap-2">
          {/* Target Summary Tag */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 uppercase text-[11px] font-medium">Target:</span>
            <span className="px-2 py-0.5 rounded-md font-mono font-semibold bg-aerodark-800 border border-aerodark-700 text-blue-400 text-xs">
              {currentTrack?.track_id || 'TRACK-0001'}
            </span>
            <span className="px-2 py-0.5 rounded-md font-medium bg-aerodark-800 border border-aerodark-700 text-slate-200 text-xs">
              {currentTrack?.object_type || 'DRONE'} ({((currentTrack?.radar_confidence || 0.96) * 100).toFixed(1)}%)
            </span>
            <span className={`px-2 py-0.5 rounded-md font-medium text-[10px] ${
              riskLevel === 'CRITICAL' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
              riskLevel === 'HIGH' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
              'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}>
              DEFCON {riskLevel}
            </span>
          </div>

          {/* Radar Controls: Range, Speed, Theme */}
          <div className="flex items-center space-x-3 font-mono text-xs">
            {/* Range Scale */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 font-sans text-[11px]">RANGE:</span>
              {[1000, 3000, 5000].map((r) => (
                <button
                  key={r}
                  onClick={() => setRangeScaleM(r)}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    rangeScaleM === r
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'bg-aerodark-800 text-slate-400 hover:text-slate-200 border border-aerodark-700'
                  }`}
                >
                  {r >= 1000 ? `${r / 1000}KM` : `${r}M`}
                </button>
              ))}
            </div>

            {/* Sweep Speed */}
            <div className="hidden sm:flex items-center space-x-1">
              <span className="text-slate-400 font-sans text-[11px]">SWEEP:</span>
              {[
                { label: 'FAST', sec: 1.5 },
                { label: 'NORM', sec: 3.0 },
                { label: 'SLOW', sec: 5.0 }
              ].map((s) => (
                <button
                  key={s.sec}
                  onClick={() => setSweepSpeedSec(s.sec)}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    sweepSpeedSec === s.sec
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'bg-aerodark-800 text-slate-400 hover:text-slate-200 border border-aerodark-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Color Theme */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 font-sans text-[11px]">CRT:</span>
              {['CYAN', 'GREEN', 'AMBER', 'STEALTH'].map((t) => (
                <button
                  key={t}
                  onClick={() => setColorTheme(t)}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    colorTheme === t ? 'scale-125 border-white ring-2 ring-blue-500/50' : 'border-aerodark-700 opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor:
                      t === 'CYAN' ? '#38BDF8' :
                      t === 'GREEN' ? '#10B981' :
                      t === 'AMBER' ? '#F59E0B' : '#EF4444'
                  }}
                  title={`Radar Theme: ${t}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Radar Scope View & SIGINT Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
          {/* Left / Center 7 Cols: Massive PPI Radar Scope Display */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 rounded-xl bg-aerodark-950 border border-aerodark-700 relative overflow-hidden">
            {/* Tactical Polar Scope Container */}
            <div className="relative w-full max-w-[460px] aspect-square flex items-center justify-center">
              {/* Outer Azimuth Degrees Ring */}
              <div 
                className="absolute inset-0 rounded-full border-2 flex items-center justify-center transition-colors duration-500"
                style={{ borderColor: currentTheme.primary, boxShadow: `0 0 30px ${currentTheme.primaryGlow}` }}
              >
                {/* 360° Compass Degree Markings */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                  const rad = (deg - 90) * (Math.PI / 180);
                  const x = 50 + 47 * Math.cos(rad);
                  const y = 50 + 47 * Math.sin(rad);
                  const label = deg === 0 ? '000° N' : deg === 90 ? '090° E' : deg === 180 ? '180° S' : deg === 270 ? '270° W' : `${deg.toString().padStart(3, '0')}°`;

                  return (
                    <div
                      key={deg}
                      className="absolute font-mono text-[9px] font-bold text-slate-400"
                      style={{
                        top: `${y}%`,
                        left: `${x}%`,
                        transform: 'translate(-50%, -50%)',
                        color: deg % 90 === 0 ? currentTheme.primary : undefined
                      }}
                    >
                      {label}
                    </div>
                  );
                })}

                {/* 15° Minor Radial Ticks */}
                {[...Array(24)].map((_, i) => {
                  const deg = i * 15;
                  return (
                    <div
                      key={deg}
                      className="absolute w-full h-[1px] pointer-events-none"
                      style={{
                        transform: `rotate(${deg}deg)`,
                        background: `linear-gradient(to right, ${currentTheme.crosshair} 0%, transparent 8%, transparent 92%, ${currentTheme.crosshair} 100%)`
                      }}
                    />
                  );
                })}
              </div>

              {/* Concentric Range Rings */}
              {/* Outer Ring (100% of Range Scale) */}
              <div 
                className="absolute inset-4 rounded-full border transition-colors duration-500"
                style={{ borderColor: currentTheme.ringBorder }}
              >
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-slate-400 bg-aerodark-950 px-1 rounded">
                  {rangeScaleM >= 1000 ? `${rangeScaleM / 1000}km` : `${rangeScaleM}m`}
                </span>
              </div>

              {/* 75% Range Ring */}
              <div 
                className="absolute inset-16 rounded-full border transition-colors duration-500"
                style={{ borderColor: currentTheme.ringBorder }}
              >
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-500 bg-aerodark-950 px-1 rounded">
                  {Math.round(rangeScaleM * 0.75)}m
                </span>
              </div>

              {/* 50% Range Ring */}
              <div 
                className="absolute inset-28 rounded-full border transition-colors duration-500"
                style={{ borderColor: currentTheme.ringBorder }}
              >
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-500 bg-aerodark-950 px-1 rounded">
                  {Math.round(rangeScaleM * 0.5)}m
                </span>
              </div>

              {/* 25% Inner Range Ring */}
              <div 
                className="absolute inset-40 rounded-full border transition-colors duration-500"
                style={{ borderColor: currentTheme.ringBorder }}
              >
                <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-500 bg-aerodark-950 px-1 rounded">
                  {Math.round(rangeScaleM * 0.25)}m
                </span>
              </div>

              {/* Crosshair Axes (N-S, E-W) */}
              <div 
                className="absolute w-full h-[1px] pointer-events-none"
                style={{ backgroundColor: currentTheme.crosshair }}
              />
              <div 
                className="absolute h-full w-[1px] pointer-events-none"
                style={{ backgroundColor: currentTheme.crosshair }}
              />

              {/* Rotating PPI Radar Sweep Line & Phosphor Glow Wedge */}
              <div 
                className="absolute inset-4 rounded-full pointer-events-none animate-radar-sweep"
                style={{ animationDuration: `${sweepSpeedSec}s` }}
              >
                <div 
                  className="w-1/2 h-1/2 absolute top-0 right-0 origin-bottom-left"
                  style={{ background: currentTheme.sweepGradient }}
                />
                <div 
                  className="w-1/2 h-[2px] absolute top-1/2 right-0 origin-left"
                  style={{ 
                    transform: 'translateY(-1px)',
                    backgroundColor: currentTheme.primary,
                    boxShadow: `0 0 10px ${currentTheme.primary}` 
                  }}
                />
              </div>

              {/* Track History Trail Breadcrumbs on Radar */}
              {radarTrail.map((p, idx) => (
                <div
                  key={idx}
                  className="absolute w-1.5 h-1.5 rounded-full pointer-events-none transition-all duration-300"
                  style={{
                    top: `${p.y}%`,
                    left: `${p.x}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: blipColor,
                    opacity: 0.15 + (idx / radarTrail.length) * 0.55
                  }}
                />
              ))}

              {/* Live Target Contact Blip */}
              <div
                className="absolute z-20 transition-all duration-500 cursor-pointer group"
                style={{
                  top: `${blipY}%`,
                  left: `${blipX}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => onPinTarget && onPinTarget(currentTrack)}
              >
                {/* Sonar Pulse Ripple */}
                <div 
                  className="absolute -inset-2.5 rounded-full border-2 animate-ping"
                  style={{ borderColor: blipColor, opacity: 0.75 }}
                />

                {/* Blip Core */}
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-xl flex items-center justify-center"
                  style={{ backgroundColor: blipColor, boxShadow: `0 0 16px ${blipColor}` }}
                >
                  <div className="w-1 h-1 rounded-full bg-white"></div>
                </div>

                {/* Velocity Vector Line showing heading */}
                {currentTrack?.heading_deg !== undefined && (
                  <div
                    className="absolute top-1/2 left-1/2 w-8 h-[2px] origin-left pointer-events-none"
                    style={{
                      transform: `rotate(${currentTrack.heading_deg - 90}deg)`,
                      backgroundColor: blipColor,
                      boxShadow: `0 0 6px ${blipColor}`
                    }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                )}

                {/* Tactical Callout HUD Overlay */}
                <div className="absolute left-6 top-0 -translate-y-1/2 bg-aerodark-950/95 border border-aerocyan-500/70 rounded p-2 text-[10px] font-mono text-slate-200 shadow-2xl whitespace-nowrap pointer-events-none">
                  <div className="font-bold flex items-center space-x-1 text-aerocyan-300">
                    <Crosshair className="w-3 h-3" />
                    <span>LOCKED: {currentTrack?.track_id || 'TRACK-0001'}</span>
                  </div>
                  <div className="text-slate-300">
                    TYPE: <strong className="text-white">{currentTrack?.object_type || 'DRONE'}</strong> ({((currentTrack?.radar_confidence || 0.96) * 100).toFixed(1)}%)
                  </div>
                  <div className="text-slate-400">
                    POLAR: {rangeM}m | {bearingDeg}° {getBearingText(bearingDeg)}
                  </div>
                  <div className="text-slate-400">
                    ALT: {currentTrack?.altitude_m || 88}m | SPD: {currentTrack?.speed_mps || 18} m/s
                  </div>
                </div>
              </div>

              {/* Station Center Origin (Station 0,0) */}
              <div className="absolute z-10 w-2.5 h-2.5 rounded-full bg-aerocyan-400 border border-white flex items-center justify-center shadow-lg">
                <div className="w-1 h-1 rounded-full bg-aerodark-950"></div>
              </div>
            </div>

            {/* 4 Corner Polar Readouts */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-aerodark-700 text-[10px] font-mono">
              <div className="bg-aerodark-850 p-2 rounded-lg border border-aerodark-700">
                <div className="text-slate-400 font-medium">RANGE (R)</div>
                <div className="text-blue-400 font-semibold text-xs mt-0.5">{rangeM.toLocaleString()} m</div>
              </div>
              <div className="bg-aerodark-850 p-2 rounded-lg border border-aerodark-700">
                <div className="text-slate-400 font-medium">BEARING (θ)</div>
                <div className="text-blue-400 font-semibold text-xs mt-0.5">{bearingDeg.toString().padStart(3, '0')}° {getBearingText(bearingDeg)}</div>
              </div>
              <div className="bg-aerodark-850 p-2 rounded-lg border border-aerodark-700">
                <div className="text-slate-400 font-medium">ELEVATION (Z)</div>
                <div className="text-slate-200 font-semibold text-xs mt-0.5">+{currentTrack?.altitude_m || 88} m AGL</div>
              </div>
              <div className="bg-aerodark-850 p-2 rounded-lg border border-aerodark-700">
                <div className="text-slate-400 font-medium">DOPPLER VELOCITY</div>
                <div className="text-emerald-400 font-semibold text-xs mt-0.5">{currentTrack?.speed_mps || 18} m/s</div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Dedicated RF Electronic Signals & SIGINT Monitor */}
          <div className="lg:col-span-5 flex flex-col space-y-3 font-sans">
            {/* Section 1: Real-Time RF Electronic Emission */}
            <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3.5 text-xs space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-aerodark-700">
                <div className="flex items-center space-x-2">
                  <Radio className={`w-4 h-4 ${intel.has_rf_emission ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-xs">RF Electronic Spectrum</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                  intel.has_rf_emission ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-aerodark-800 text-slate-400 border border-aerodark-700'
                }`}>
                  {intel.has_rf_emission ? 'EMISSION DETECTED' : 'RADIO SILENT'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-aerodark-900 p-2.5 rounded-lg border border-aerodark-700/70">
                  <div className="text-[10px] text-slate-400 font-sans">FREQUENCY</div>
                  <div className="font-bold text-blue-400 text-sm mt-0.5">
                    {intel.frequency_mhz > 0 ? `${intel.frequency_mhz} MHz` : 'NONE'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{intel.rf_band || 'Dual-Band ISM'}</div>
                </div>

                <div className="bg-aerodark-900 p-2.5 rounded-lg border border-aerodark-700/70">
                  <div className="text-[10px] text-slate-400 font-sans">SIGNAL STRENGTH (RSSI)</div>
                  <div className="font-bold text-amber-400 text-sm mt-0.5">
                    {intel.signal_strength_dbm || -82} dBm
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">SNR: {intel.snr_db || 12} dB</div>
                </div>
              </div>

              {/* Live Signal Strength Meter */}
              <div className="space-y-1 font-mono">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className="font-sans uppercase">Spectrum Power</span>
                  <span>{intel.signal_strength_dbm ? `${intel.signal_strength_dbm} dBm` : '-90 dBm (FLOOR)'}</span>
                </div>
                <div className="w-full h-2 bg-aerodark-900 rounded-full overflow-hidden border border-aerodark-700 flex">
                  {[...Array(20)].map((_, i) => {
                    const normPower = Math.max(0, Math.min(20, Math.round(((intel.signal_strength_dbm || -95) + 105) / 3)));
                    const isActive = i <= normPower;
                    return (
                      <div
                        key={i}
                        className={`flex-1 mx-[1px] rounded-sm transition-all duration-300 ${
                          isActive
                            ? i > 15 ? 'bg-red-500' : i > 10 ? 'bg-amber-400' : 'bg-blue-400'
                            : 'bg-aerodark-800'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-aerodark-700 font-mono">
                <span>PROTOCOL: <strong className="text-slate-100">{intel.protocol || 'Proprietary FHSS'}</strong></span>
                <span>HOPPING: <strong className="text-slate-100">{intel.hopping_rate_hz || 1200} hops/s</strong></span>
              </div>
            </div>

            {/* Section 2: Remote ID Broadcast Decoder */}
            <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3.5 text-xs space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-aerodark-700">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-xs">Remote ID Broadcast</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                  intel.remote_id?.status === 'VERIFIED_DGCA' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                  intel.remote_id?.status === 'ADS_B_TRANSPONDER' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' :
                  'bg-red-500/15 text-red-300 border border-red-500/30'
                }`}>
                  {intel.remote_id?.status || 'NO BROADCAST'}
                </span>
              </div>

              {intel.remote_id ? (
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">BROADCAST UIN:</span>
                    <span className="font-bold text-blue-400">{intel.remote_id.uin}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">OPERATOR DISTANCE:</span>
                    <span className="font-medium text-slate-200">~{intel.remote_id.operator_distance_m}m to Ground Pilot</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans">ESTIMATED PILOT GPS:</span>
                    <span className="font-medium text-slate-200">{intel.remote_id.operator_lat}°N, {intel.remote_id.operator_lon}°E</span>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-aerodark-900 p-2 rounded-lg border border-aerodark-700/60 font-sans">
                    Transmitter: {intel.remote_id.broadcast_type}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xs py-2 text-center">
                  Zero Remote ID broadcast detected. Target operating in covert or non-transmitting mode.
                </div>
              )}
            </div>

            {/* Section 3: Micro-Doppler Rotor Spectrum */}
            <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3.5 text-xs space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-aerodark-700">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-xs">Micro-Doppler Harmonics</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">ASTRA 300-DIM SIGNATURE</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="bg-aerodark-900 p-2 rounded-lg border border-aerodark-700/60">
                  <div className="text-slate-400 font-sans">ROTOR RPM</div>
                  <div className="font-bold text-blue-400 text-xs mt-0.5">
                    {intel.micro_doppler?.rotor_rpm ? `${intel.micro_doppler.rotor_rpm} RPM` : '0 RPM'}
                  </div>
                </div>
                <div className="bg-aerodark-900 p-2 rounded-lg border border-aerodark-700/60">
                  <div className="text-slate-400 font-sans">BLADE FREQ</div>
                  <div className="font-bold text-slate-200 text-xs mt-0.5">
                    {intel.micro_doppler?.blade_freq_hz ? `${intel.micro_doppler.blade_freq_hz} Hz` : 'N/A'}
                  </div>
                </div>
                <div className="bg-aerodark-900 p-2 rounded-lg border border-aerodark-700/60">
                  <div className="text-slate-400 font-sans">RCS (m²)</div>
                  <div className="font-bold text-emerald-400 text-xs mt-0.5">
                    {intel.micro_doppler?.rcs_m2 !== undefined ? `${intel.micro_doppler.rcs_m2} m²` : '0.02 m²'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-aerodark-700 font-mono">
                <span>SIGNATURE: <strong className="text-slate-100">{intel.micro_doppler?.signature_type || 'MODULATED_PROP'}</strong></span>
                <span>HARMONICS: <strong className="text-slate-100">{intel.micro_doppler?.harmonic_count || 4} PEAKS</strong></span>
              </div>
            </div>

            {/* Section 4: Identification, Sensor Correlation & Evidence Dossier (Strictly In-Scope Civil Law Enforcement) */}
            <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3.5 text-xs space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-aerodark-700">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-xs">Identification & Evidence Dossier</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-600/15 text-blue-300 border border-blue-500/30">
                  PASSIVE SURVEILLANCE
                </span>
              </div>

              <div className="text-[11px] text-slate-300 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">TARGET CLASS:</span>
                  <strong className="text-slate-100">{currentTrack?.object_type || 'AERIAL_OBJECT'} (Aircraft / Vessel)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">SENSOR CORRELATION:</span>
                  <strong className="text-emerald-400">
                    {currentTrack?.fusion_mode || 'RADAR + OPTICAL CORRELATED'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">DOSSIER AUDIT ID:</span>
                  <strong className="text-blue-400">
                    EVD-2026-{currentTrack?.track_id || 'TRK-001'}
                  </strong>
                </div>
                <div className="text-[10px] text-slate-400 bg-aerodark-900 p-2 rounded-lg border border-aerodark-700/60 font-sans">
                  Civil Law Enforcement Scope: Continuous detection, classification, multi-sensor correlation, and tamper-evident evidence archiving. Zero interdiction or active signal interference.
                </div>
              </div>

              {/* Log Forensic Evidence Button */}
              <button
                onClick={() => {
                  setEvidenceLogged(true);
                  playTacticalSound('ping', true);
                  setTimeout(() => setEvidenceLogged(false), 3000);
                }}
                className={`w-full py-2 rounded-lg font-sans font-medium text-xs tracking-wide transition-all flex items-center justify-center space-x-2 shadow-sm ${
                  evidenceLogged
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
                }`}
              >
                {evidenceLogged ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>FORENSIC EVIDENCE DOSSIER PRESERVED</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>LOG FORENSIC EVIDENCE DOSSIER</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
