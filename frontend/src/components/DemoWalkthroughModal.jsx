import React from 'react';
import { CheckCircle2, Play, AlertOctagon, X } from 'lucide-react';

export default function DemoWalkthroughModal({ currentStep, isOpen, onClose }) {
  if (!isOpen) return null;

  const demoSteps = [
    { step: 1, label: 'Simulated Radar Starts', detail: 'X-Band Coastal Surveillance transmitter active' },
    { step: 2, label: 'Radar Signal Appears', detail: 'Micro-Doppler frequency shift detected' },
    { step: 3, label: 'ASTRA Preprocesses Signal', detail: 'StandardScaler normalizes 300 radar features' },
    { step: 4, label: 'Object Classified by ASTRA', detail: 'Random Forest predicts DRONE with 96.4% confidence' },
    { step: 5, label: 'Unified TRACK-0001 Created', detail: 'Persistent target identifier instantiated' },
    { step: 6, label: 'Target Rendered on OSM Map', detail: 'Track blip appears at coastal perimeter' },
    { step: 7, label: 'Coherent Track Movement', detail: 'Physics kinematics update lat/lon/altitude/speed' },
    { step: 8, label: 'Camera Coverage Identified', detail: 'Spatial intersection with Naval Cam-03 FOV cone' },
    { step: 9, label: 'Camera Associated to Track', detail: 'Optical boresight locked onto TRACK-0001' },
    { step: 10, label: 'YOLO Visual Inference Runs', detail: 'Computer vision scans optical frame for UAV profile' },
    { step: 11, label: 'Radar + Camera Correlated', detail: 'Dual-signature sensor fusion confirmed (95.6%)' },
    { step: 12, label: 'Drone Registry Verified', detail: 'DGCA civil drone registry query dispatched' },
    { step: 13, label: 'Authorization Check Fails', detail: 'Drone is unregistered; no active mission permit' },
    { step: 14, label: 'Approaching Restricted Zone', detail: 'Target vectors toward INS Adyar Naval Perimeter' },
    { step: 15, label: 'Trajectory Prediction Projected', detail: 'Physics predictor warns of breach in 12 seconds' },
    { step: 16, label: 'Threat Risk Escalates', detail: 'Explainable risk engine calculates CRITICAL (85/100)' },
    { step: 17, label: 'Geofence Breach Occurs', detail: 'Direct incursion into Naval Base restricted 3D zone' },
    { step: 18, label: 'Critical Threat Alert Raised', detail: 'Audio-visual alert triggered on Officer console' },
    { step: 19, label: 'Automated Incident Created', detail: 'Case Dossier INC-2026-001 opened for investigation' },
    { step: 20, label: 'Forensic Evidence Populated', detail: 'Radar spectrum + Camera frame snapshots linked' },
    { step: 21, label: 'Audit Trail Recorded', detail: 'Tamper-evident chain of custody saved to SQLite DB' }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-aerodark-900/95 backdrop-blur-md border border-aerodark-700 rounded-xl p-4 max-w-md w-full shadow-2xl font-sans text-xs select-none">
      <div className="flex items-center justify-between border-b border-aerodark-700 pb-2.5 mb-2.5">
        <div className="flex items-center space-x-2 text-slate-100 font-semibold text-xs tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Full Surveillance Demonstration Runner</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-aerodark-800 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[11px] font-mono text-slate-300 mb-3 flex items-center justify-between">
        <span>SEQUENCE STEP: <strong className="text-blue-400 font-bold">{currentStep} OF 21</strong></span>
        <span className="text-emerald-400 font-semibold">{Math.round((currentStep / 21) * 100)}% COMPLETED</span>
      </div>

      {/* Active Step Card */}
      {currentStep > 0 && currentStep <= 21 && (
        <div className="bg-aerodark-850 p-3 rounded-lg border border-blue-500/30 mb-3 space-y-1 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-100 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{demoSteps[currentStep - 1]?.label}</span>
          </div>
          <div className="text-slate-400 text-xs pl-6 leading-relaxed">
            {demoSteps[currentStep - 1]?.detail}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-aerodark-950 rounded-full overflow-hidden border border-aerodark-700">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${(currentStep / 21) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
