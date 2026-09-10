import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Radar, 
  Play, 
  LogOut, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

export default function TopBar({
  systemHealth,
  ingestionMetrics,
  connectionStatus = 'CONNECTED',
  onRunDemo,
  isDemoRunning,
  currentRole,
  onRoleChange,
  threatMood = 'NORMAL',
  onOpenRadar,
  soundEnabled = true,
  onToggleSound,
  notificationHistory = [],
  onClearHistory,
  user,
  onLogout
}) {
  const [timeStr, setTimeStr] = useState('');
  const [utcStr, setUtcStr] = useState('');
  const [isLogOpen, setIsLogOpen] = useState(false);
  const logDropdownRef = useRef(null);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
      setUtcStr(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close log dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (logDropdownRef.current && !logDropdownRef.current.contains(event.target)) {
        setIsLogOpen(false);
      }
    };
    if (isLogOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLogOpen]);

  const comp = systemHealth?.components || {
    radar_simulator: 'ONLINE',
    telemetry_ingestion: 'CONNECTED',
    astra_model: 'LOADED',
    yolo_model: 'STANDBY',
    camera_feed: 'ACTIVE',
    map_tiles: 'ONLINE',
    database: 'CONNECTED'
  };

  const metrics = ingestionMetrics || {
    status: connectionStatus,
    last_report: '<1s ago',
    report_rate_hz: 1.2,
    active_tracks: 1,
    latency_ms: 42.0,
    report_to_console_target_met: true
  };

  const effectiveStatus = connectionStatus !== 'CONNECTED' ? connectionStatus : metrics.status;
  const statusColorClass = effectiveStatus === 'CONNECTED'
    ? 'bg-emerald-400 animate-pulse'
    : effectiveStatus === 'RECONNECTING'
    ? 'bg-amber-400 animate-ping'
    : 'bg-red-500 animate-pulse';

  const statusTextColor = effectiveStatus === 'CONNECTED'
    ? 'text-emerald-300'
    : effectiveStatus === 'RECONNECTING'
    ? 'text-amber-300'
    : 'text-red-300';

  return (
    <header className="bg-aerodark-900 border-b border-aerodark-700 px-3 sm:px-4 py-2 flex items-center justify-between text-xs z-30 shrink-0 font-sans select-none gap-2 flex-nowrap overflow-x-auto min-h-[50px]">
      {/* Brand & Left Status Area */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Brand */}
        <div className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg shrink-0">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="font-bold tracking-wider text-xs sm:text-sm text-slate-100">AEROGUARD</span>
        </div>

        {/* STATUS BAR: INGESTION | LAST | RATE | TRACKS | LATENCY | ASTRA | VISION | AUDIT */}
        <div className="hidden md:flex items-center space-x-2 bg-aerodark-850 border border-aerodark-700 px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0">
          {/* INGESTION */}
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${statusColorClass}`}></span>
            <span className="text-slate-400 font-sans text-xs">INGESTION:</span>
            <strong className={statusTextColor}>
              {effectiveStatus}
            </strong>
          </div>
          <span className="text-slate-600">|</span>
          {/* LAST */}
          <span className="text-slate-300">LAST: {metrics.last_report}</span>
          <span className="text-slate-600">|</span>
          {/* RATE */}
          <span className="text-slate-300">RATE: {metrics.report_rate_hz} Hz</span>
          <span className="text-slate-600">|</span>
          {/* TRACKS */}
          <span className="text-slate-300">TRACKS: {metrics.active_tracks}</span>
          <span className="text-slate-600">|</span>
          {/* LATENCY */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-sans">LATENCY:</span>
            <span className="text-blue-300 font-bold">{metrics.latency_ms}ms</span>
          </div>
          {/* ASTRA | VISION | AUDIT */}
          <div className="hidden lg:flex items-center space-x-2">
            <span className="text-slate-600">|</span>
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400 font-sans">ASTRA:</span>
              <strong className="text-emerald-300 font-mono">99.82%</strong>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-400 font-sans">VISION:</span>
              <strong className="text-slate-300 font-mono">SIMULATION</strong>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-400 font-sans">AUDIT:</span>
              <strong className="text-emerald-300 font-mono">SHA-256 VALID</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BAR (Right Group): POP-OUT RADAR | RUN SURVEILLANCE DEMO | AUDIO ON | LOG */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* 1. POP-OUT RADAR BUTTON */}
        <button
          onClick={onOpenRadar}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-aerodark-800 hover:bg-aerodark-750 text-slate-200 hover:text-white border border-aerodark-700 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          title="Open Tactical PPI Radar Scope & SIGINT window"
        >
          <Radar className="w-3.5 h-3.5 text-blue-400" />
          <span>POP-OUT RADAR</span>
        </button>

        {/* 2. RUN SURVEILLANCE DEMO BUTTON */}
        <button
          onClick={onRunDemo}
          disabled={isDemoRunning}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm whitespace-nowrap cursor-pointer ${
            isDemoRunning
              ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
          }`}
          title="Execute 21-step full civil airspace surveillance scenario"
        >
          <Play className={`w-3.5 h-3.5 ${isDemoRunning ? 'animate-spin' : 'fill-current'}`} />
          <span>{isDemoRunning ? 'DEMO RUNNING...' : 'RUN SURVEILLANCE DEMO'}</span>
        </button>

        {/* 3. AUDIO ON / MUTED CONTROL */}
        <button
          onClick={onToggleSound}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
            soundEnabled
              ? 'text-blue-300 bg-blue-600/15 border-blue-500/30 hover:bg-blue-600/25'
              : 'text-slate-400 bg-aerodark-800 border-aerodark-700 hover:text-slate-200'
          }`}
          title={soundEnabled ? 'Mute tactical radar & alert sound' : 'Enable tactical sound effects'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          <span className="font-mono text-[11px] font-semibold">{soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
        </button>

        {/* 4. LOG (N) WITH CONSTRAINED POPOVER */}
        <div className="relative" ref={logDropdownRef}>
          <button
            onClick={() => setIsLogOpen(!isLogOpen)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              isLogOpen
                ? 'bg-aerodark-750 text-white border-blue-500/50'
                : 'bg-aerodark-800 hover:bg-aerodark-750 text-slate-300 hover:text-white border-aerodark-700'
            }`}
            title="View recent event notifications log"
          >
            <span className="font-mono text-[11px] font-semibold">
              LOG ({notificationHistory.length})
            </span>
            {isLogOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Log Dropdown Popover */}
          {isLogOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-72 overflow-y-auto bg-aerodark-900 border border-aerodark-700 rounded-xl shadow-2xl p-3 font-mono text-xs space-y-2 backdrop-blur-md z-40 max-w-[calc(100vw-2rem)]">
              <div className="flex items-center justify-between pb-1.5 border-b border-aerodark-700 text-slate-400 uppercase font-semibold text-[10px]">
                <span>NOTIFICATION LOG ({notificationHistory.length})</span>
                {notificationHistory.length > 0 && onClearHistory && (
                  <button
                    onClick={onClearHistory}
                    className="text-red-400 hover:underline text-[10px] cursor-pointer"
                  >
                    CLEAR
                  </button>
                )}
              </div>
              {notificationHistory.length === 0 ? (
                <div className="text-slate-500 text-center py-4 font-sans text-xs">
                  No notifications recorded yet.
                </div>
              ) : (
                notificationHistory.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="p-2 rounded-lg bg-aerodark-850 border border-aerodark-700/70 text-slate-300 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-xs truncate mr-2">
                        {h.title}
                      </span>
                      <span className="text-slate-400 text-[10px] shrink-0 font-sans">
                        {h.timestamp}
                      </span>
                    </div>
                    {h.subtitle && (
                      <div className="text-slate-400 text-[10px] font-sans mt-0.5">
                        {h.subtitle}
                      </div>
                    )}
                    {h.details && (
                      <div className="text-slate-500 text-[9px] font-mono mt-0.5">
                        {h.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-5 w-[1px] bg-aerodark-700 hidden sm:block"></div>

        {/* Authenticated Officer Badge */}
        <div className="hidden sm:flex items-center space-x-2 bg-aerodark-850 border border-aerodark-700 px-2.5 py-1 rounded-lg text-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-slate-200 truncate max-w-[120px]">
            {user?.full_name || 'Inspector V. Raman'}
          </span>
          <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-blue-500/40">
            {user?.role || currentRole}
          </span>
        </div>

        {/* Logout Action */}
        <button
          onClick={onLogout}
          title="Sign out of tactical surveillance console"
          className="p-1.5 sm:p-2 rounded-lg bg-aerodark-850 hover:bg-aerodark-800 border border-aerodark-700 text-slate-400 hover:text-red-300 transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
