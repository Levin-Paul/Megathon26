import React from 'react';
import { Play, Pause, RotateCcw, Square, Sliders, ShieldCheck, AlertTriangle, Radio, Users, Crosshair } from 'lucide-react';

const SCENARIO_BUTTONS = [
  { id: 'AUTHORIZED_DRONE', label: '1. AUTHORIZED DRONE', color: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15' },
  { id: 'UNREGISTERED_DRONE', label: '2. UNREGISTERED DRONE', color: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/15' },
  { id: 'ALTITUDE_VIOLATION', label: '3. ALTITUDE VIOLATION', color: 'border-red-500/40 text-red-300 hover:bg-red-500/15' },
  { id: 'TEMP_RED_ZONE_VIOLATION', label: '4. TEMP RED-ZONE VIOLATION', color: 'border-red-600/50 text-red-200 bg-red-600/10 hover:bg-red-600/20' },
  { id: 'LOST_LINK', label: '5. LOST LINK TEST', color: 'border-purple-500/40 text-purple-300 hover:bg-purple-500/15' },
  { id: 'SENSOR_CONFLICT', label: '6. SENSOR CONFLICT', color: 'border-blue-500/40 text-blue-300 hover:bg-blue-500/15' },
  { id: 'MULTI_OBJECT', label: '7. MULTI-OBJECT', color: 'border-slate-500/40 text-slate-300 hover:bg-slate-500/15' }
];

export default function SimulationControls({
  simState,
  scenarios,
  activeScenarioKey,
  speed,
  autoCycle = false,
  secondsUntilCycle = 0,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onSpeedChange,
  onScenarioChange,
  onToggleAutoCycle
}) {
  const isRunning = simState === 'RUNNING';
  const isPaused = simState === 'PAUSED';

  return (
    <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3 text-xs flex flex-col space-y-2.5 shadow-sm select-none font-sans">
      {/* Top Bar: Controls & Quick Action Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Scenario Dropdown */}
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">SCENARIO:</span>
          <select
            value={activeScenarioKey}
            onChange={(e) => onScenarioChange(e.target.value)}
            className="bg-aerodark-900 border border-aerodark-700 text-xs font-sans text-slate-200 px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:border-blue-500 transition-colors"
          >
            {scenarios?.map((s) => (
              <option key={s.id} value={s.id} className="bg-aerodark-900 text-slate-200">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Play / Pause / Reset Controls */}
        <div className="flex items-center space-x-2">
          {!isRunning ? (
            <button
              onClick={isPaused ? onResume : () => onStart(activeScenarioKey, speed)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? 'RESUME' : 'START SIM'}</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </button>
          )}

          <button
            onClick={onStop}
            className="flex items-center space-x-1.5 bg-aerodark-800 hover:bg-aerodark-750 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-aerodark-700 transition-all cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>STOP</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center space-x-1.5 bg-aerodark-800 hover:bg-aerodark-750 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-aerodark-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>

          {/* Auto Rotation Toggle (Default OFF per requirement) */}
          <button
            onClick={onToggleAutoCycle}
            title="Autonomously cycles through scenarios (Default: OFF)"
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
              autoCycle
                ? 'bg-blue-600/15 text-blue-300 border-blue-500/30'
                : 'bg-aerodark-800 text-slate-400 border-aerodark-700 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoCycle ? 'bg-blue-400' : 'bg-slate-500'}`}></span>
            <span>{autoCycle ? '⚡ AUTO-ROTATION: ON' : 'AUTO-ROTATION: OFF'}</span>
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center space-x-1 font-sans text-xs">
          <span className="text-slate-400 mr-1.5">SPEED:</span>
          {[1.0, 2.0, 5.0].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer border ${
                speed === s
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-aerodark-900 text-slate-400 border-aerodark-700 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Bar: 7 Explicit Track-A Scenario Quick-Launch Buttons */}
      <div className="pt-2 border-t border-aerodark-700/60 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          TRACK-A DEMOS:
        </span>
        {SCENARIO_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            onClick={() => {
              onScenarioChange(btn.id);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${btn.color} ${
              activeScenarioKey === btn.id ? 'ring-1 ring-white/30 font-bold' : ''
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
