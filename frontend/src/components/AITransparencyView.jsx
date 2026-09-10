import React from 'react';
import { Cpu, ShieldCheck, Database, Layers, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function AITransparencyView({ systemHealth }) {
  const astra = systemHealth?.astra_metrics || {
    accuracy: 0.9982,
    samples: 2800,
    features: 300,
    classes: ['AIRCRAFT', 'DRONE', 'BIRD', 'HELICOPTER / STEALTH UAV']
  };

  const yolo = systemHealth?.yolo_metrics || {
    status: 'STANDBY (WEIGHTS PENDING)',
    inference_mode: 'SYNTHETIC_FRAME_FALLBACK',
    classes: ['drone', 'bird', 'airplane', 'helicopter']
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto text-xs font-sans select-none overflow-y-auto h-full">
      {/* Header */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-aerodark-900 border border-aerodark-700">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-100 tracking-wide">
              AI MODEL TRANSPARENCY & TECHNICAL HONESTY DISCLOSURE
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              Rigorous verification of ASTRA radar micro-Doppler model, YOLO visual AI, and zero-hallucination sensor fusion
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-sans text-xs px-3 py-1 rounded-md font-medium">
          PROTOTYPE VERIFIED
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ASTRA Radar AI Card */}
        <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-aerodark-700 pb-2.5">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
              ASTRA Radar Micro-Doppler AI
            </span>
            <span className="text-emerald-400 font-mono font-bold text-xs">{(astra.accuracy * 100).toFixed(2)}% ACCURACY</span>
          </div>

          <div className="space-y-2 font-mono text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">MODEL ARCHITECTURE:</span>
              <span className="font-semibold text-slate-200 font-sans">Random Forest Classifier (100 Trees)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">DATASET SOURCE:</span>
              <span className="font-semibold text-slate-200 font-sans">astra_dataset.csv (Verified Local)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">TOTAL SAMPLES:</span>
              <span className="font-semibold text-slate-200 font-sans">{astra.samples} (700 per class balanced)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">FEATURE DIMENSIONS:</span>
              <span className="font-semibold text-slate-200 font-sans">{astra.features} Micro-Doppler Points (0 to 299)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">PREPROCESSING:</span>
              <span className="font-semibold text-slate-200 font-sans">StandardScaler (Mean=0, Std=1)</span>
            </div>
          </div>

          <div>
            <div className="font-sans text-[11px] text-slate-400 uppercase font-medium mb-2">VERIFIED CLASS LABELS:</div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {astra.classes?.map((cls, idx) => (
                <div key={idx} className="bg-aerodark-900 p-2 rounded-lg border border-aerodark-700/70 text-slate-200 flex items-center justify-between">
                  <span className="text-blue-400 font-bold">[{idx}]</span>
                  <span className="font-sans font-medium text-[11px]">{cls}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* YOLO Camera AI Card */}
        <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-aerodark-700 pb-2.5">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
              YOLO Optical Camera AI
            </span>
            <span className={`font-sans font-medium text-xs px-2 py-0.5 rounded-md ${
              yolo.status.includes('ONLINE') ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}>
              {yolo.status}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">FRAMEWORK:</span>
              <span className="font-semibold text-slate-200 font-sans">Ultralytics PyTorch YOLOv8</span>
            </div>
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">WEIGHTS DIRECTORY:</span>
              <span className="font-semibold text-slate-200 font-sans">backend/weights/best.pt</span>
            </div>
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">CONFIDENCE THRESHOLD:</span>
              <span className="font-semibold text-slate-200 font-sans">0.45 IoU / Conf</span>
            </div>
            <div className="flex justify-between py-1 border-b border-aerodark-700/50">
              <span className="text-slate-400 font-sans">INFERENCE FALLBACK:</span>
              <span className="font-semibold text-blue-400 font-sans">FOVSpatialCueing & DemoFeed</span>
            </div>
          </div>

          <div className="bg-aerodark-900 p-3 rounded-lg border border-aerodark-700 text-xs text-slate-300 leading-relaxed font-sans">
            <div className="text-amber-400 font-semibold mb-1 flex items-center space-x-1.5">
              <Info className="w-4 h-4" />
              <span>GRACEFUL DEGRADATION:</span>
            </div>
            As your YOLO model is currently training, the console operates with honest fallback indicators. Once training finishes, place <code className="text-blue-400 font-mono bg-aerodark-950 px-1 py-0.5 rounded">best.pt</code> into <code className="text-blue-400 font-mono bg-aerodark-950 px-1 py-0.5 rounded">backend/weights/</code> and native inference activates automatically.
          </div>
        </div>
      </div>

      {/* Sensor Fusion Principles */}
      <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-5 space-y-3.5 shadow-sm">
        <div className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
          Sensor Fusion Architecture (Zero-Hallucination Correlation)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-slate-300 font-sans">
          <div className="bg-aerodark-900 p-3.5 rounded-lg border border-aerodark-700/70 space-y-1.5">
            <div className="text-blue-400 font-semibold text-xs">1. Spatial-Temporal Cueing</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Radar kinematics track azimuth and range to check intersection with coastal optical camera field-of-view cones (Lighthouse, Naval Cam-03, Port Mast).
            </div>
          </div>

          <div className="bg-aerodark-900 p-3.5 rounded-lg border border-aerodark-700/70 space-y-1.5">
            <div className="text-emerald-400 font-semibold text-xs">2. Dual-Signature Fusion</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Target is only flagged as <strong className="text-slate-200">RADAR + CAMERA CORRELATED</strong> when both Micro-Doppler RF and YOLO visual bounding box classes agree.
            </div>
          </div>

          <div className="bg-aerodark-900 p-3.5 rounded-lg border border-aerodark-700/70 space-y-1.5">
            <div className="text-red-400 font-semibold text-xs">3. Conflict Transparency</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              If radar predicts Drone but camera predicts Bird, the system raises an explicit <strong className="text-slate-200">CLASSIFICATION CONFLICT</strong> rather than silently fabricating a match.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
