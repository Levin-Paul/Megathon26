import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, AlertTriangle, ScanLine, Crosshair } from 'lucide-react';

export default function CameraFusionPanel({ currentTrack, cameras, selectedCamera, onSelectCamera }) {
  const [cameraMode, setCameraMode] = useState('DEMO'); // DEMO, WEBCAM, UPLOAD
  const [sensorFilter, setSensorFilter] = useState('DAYLIGHT'); // DAYLIGHT, FLIR, NVG
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState(null);
  const [isUploadedImage, setIsUploadedImage] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [isInferring, setIsInferring] = useState(false);
  const [inferenceLatencyMs, setInferenceLatencyMs] = useState(null);
  const [visionMode, setVisionMode] = useState('SIMULATION / MODEL PENDING');
  const [liveDetections, setLiveDetections] = useState(null);

  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const inferIntervalRef = useRef(null);

  const activeCam = selectedCamera || (cameras && cameras[2]) || {
    camera_id: 'CAM-03',
    name: 'Naval Coastal Defense Cam-03',
    status: 'ACTIVE',
    fov_deg: 95.0,
    heading_deg: 85.0
  };

  const fusion = currentTrack?.fusion || {
    fusion_status: 'CORRELATED',
    display_status: 'RADAR + CAMERA CORRELATED',
    correlation_badge: 'CORRELATED',
    fused_confidence: 0.956,
    conflict: false
  };

  // Determine active detections: live inference result > track's camera_detection > default synthetic
  const activeDetections = liveDetections !== null ? liveDetections : (currentTrack?.camera_detection || [
    {
      class_name: currentTrack?.object_type || 'DRONE',
      confidence: 0.948,
      bbox: [265, 142, 375, 218],
      track_id: currentTrack?.track_id || 'DRN-001'
    }
  ]);

  const objType = currentTrack?.object_type || 'DRONE';

  // Perform frame capture and inference against backend /api/vision/infer
  const captureAndInferFrame = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let captured = false;

    if (cameraMode === 'WEBCAM' && videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      captured = true;
    } else if (cameraMode === 'UPLOAD' && isUploadedImage && imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
      captured = true;
    } else if (cameraMode === 'UPLOAD' && !isUploadedImage && videoRef.current && videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      captured = true;
    }

    if (!captured) return;

    try {
      setIsInferring(true);
      const base64Data = canvas.toDataURL('image/jpeg', 0.65);
      const res = await fetch('/api/vision/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: base64Data,
          sensor_mode: sensorFilter === 'DAYLIGHT' ? 'EO' : sensorFilter,
          camera_id: activeCam.camera_id,
          track_id: currentTrack?.track_id,
          target_hint: {
            class_name: currentTrack?.object_type || 'DRONE',
            is_multi: currentTrack?.track_id?.includes('MULTI')
          }
        })
      });

      const data = await res.json();
      if (data?.success) {
        setLiveDetections(data.detections || []);
        setInferenceLatencyMs(data.inference_time_ms || 18.4);
        setVisionMode(data.vision_mode || 'SIMULATION / MODEL PENDING');
      }
    } catch (e) {
      console.warn('Vision inference call error:', e);
    } finally {
      setIsInferring(false);
    }
  };

  // Setup/Teardown Webcam
  useEffect(() => {
    if (cameraMode === 'WEBCAM') {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setWebcamError('Camera API not supported in current browser context (requires HTTPS or localhost).');
        setCameraMode('DEMO');
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } })
        .then((stream) => {
          webcamStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setWebcamError(null);
          inferIntervalRef.current = setInterval(captureAndInferFrame, 1500);
        })
        .catch((err) => {
          console.warn('Webcam not available:', err);
          setWebcamError('Webcam access unavailable or permission denied. Switched to Demo Feed.');
          setCameraMode('DEMO');
        });
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      if (inferIntervalRef.current) {
        clearInterval(inferIntervalRef.current);
        inferIntervalRef.current = null;
      }
      if (cameraMode === 'DEMO') {
        setLiveDetections(null);
        setInferenceLatencyMs(null);
        setVisionMode('SIMULATION / MODEL PENDING');
      }
    }

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (inferIntervalRef.current) {
        clearInterval(inferIntervalRef.current);
      }
    };
  }, [cameraMode, sensorFilter]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isImg = file.type.startsWith('image/');
      setIsUploadedImage(isImg);
      const url = URL.createObjectURL(file);
      setUploadedMediaUrl(url);
      setCameraMode('UPLOAD');
      setLiveDetections(null);

      if (isImg) {
        setTimeout(() => {
          captureAndInferFrame();
        }, 300);
      }
    }
  };

  const getBadgeStyle = () => {
    if (fusion.conflict) {
      return 'bg-red-500/10 text-slate-200 border-red-500/30';
    }
    if (fusion.correlation_badge === 'CORRELATED') {
      return 'bg-emerald-500/10 text-slate-200 border-emerald-500/30';
    }
    if (fusion.correlation_badge === 'SEARCHING') {
      return 'bg-amber-500/10 text-slate-200 border-amber-500/30';
    }
    return 'bg-aerodark-900 text-slate-200 border-aerodark-700';
  };

  const renderTargetSilhouette = () => {
    const isThermal = sensorFilter === 'FLIR';
    const isNvg = sensorFilter === 'NVG';

    const strokeColor = isThermal ? '#FFFFFF' : isNvg ? '#4ADE80' : '#CBD5E1';
    const bodyColor = isThermal ? '#FFFFFF' : isNvg ? '#22C55E' : '#94A3B8';
    const glowClass = isThermal ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]' : isNvg ? 'drop-shadow-[0_0_5px_rgba(74,222,128,0.6)]' : '';

    if (objType === 'BIRD') {
      return (
        <svg viewBox="0 0 100 40" className={`w-24 h-10 ${glowClass} transition-all duration-300`}>
          <path
            d="M 5 20 Q 25 2 50 16 Q 75 2 95 20 Q 72 12 50 20 Q 28 12 5 20 Z"
            fill={bodyColor}
            opacity="0.9"
          />
          <circle cx="50" cy="18" r="3.5" fill={bodyColor} />
          <path d="M 48 20 L 52 20 L 50 26 Z" fill={bodyColor} />
        </svg>
      );
    }

    if (objType === 'AIRCRAFT') {
      return (
        <svg viewBox="0 0 120 60" className={`w-32 h-14 ${glowClass} transition-all duration-300`}>
          <ellipse cx="60" cy="30" rx="38" ry="6" fill={bodyColor} />
          <polygon points="56,30 68,30 96,12 88,12" fill={bodyColor} />
          <polygon points="56,30 68,30 96,48 88,48" fill={bodyColor} />
          <polygon points="26,30 32,30 42,20 38,20" fill={bodyColor} />
          <polygon points="26,30 32,30 42,40 38,40" fill={bodyColor} />
          <rect x="68" y="21" width="10" height="3" rx="1.5" fill="#38BDF8" opacity={isThermal ? '1' : '0.8'} />
          <rect x="68" y="36" width="10" height="3" rx="1.5" fill="#38BDF8" opacity={isThermal ? '1' : '0.8'} />
        </svg>
      );
    }

    if (objType === 'HELICOPTER / STEALTH UAV') {
      return (
        <svg viewBox="0 0 100 50" className={`w-24 h-12 ${glowClass} transition-all duration-300`}>
          <polygon points="50,6 94,40 50,33 6,40" fill={bodyColor} opacity="0.92" />
          <polygon points="50,14 74,34 50,30 26,34" fill={isThermal ? '#F59E0B' : '#38BDF8'} opacity="0.4" />
          <ellipse cx="50" cy="22" rx="4" ry="7" fill={isThermal ? '#EF4444' : '#0EA5E9'} />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 100 60" className={`w-24 h-14 ${glowClass} transition-all duration-300`}>
        <line x1="18" y1="14" x2="82" y2="46" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        <line x1="18" y1="46" x2="82" y2="14" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="18" cy="14" rx="14" ry="4" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="3, 3" className="animate-spin" />
        <ellipse cx="82" cy="14" rx="14" ry="4" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="3, 3" className="animate-spin" />
        <ellipse cx="18" cy="46" rx="14" ry="4" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="3, 3" className="animate-spin" />
        <ellipse cx="82" cy="46" rx="14" ry="4" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="3, 3" className="animate-spin" />
        <rect x="40" y="22" width="20" height="16" rx="3" fill={bodyColor} />
        <circle cx="50" cy="30" r="3.5" fill={isThermal ? '#EF4444' : '#38BDF8'} />
        <circle cx="18" cy="14" r="2" fill="#EF4444" />
        <circle cx="82" cy="14" r="2" fill="#10B981" />
      </svg>
    );
  };

  return (
    <div className="bg-aerodark-850 border border-aerodark-700 rounded-xl p-3.5 text-xs flex flex-col space-y-3 select-none shadow-sm font-sans">
      <canvas ref={canvasRef} width={640} height={360} className="hidden" />

      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-aerodark-700 pb-2.5">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 uppercase tracking-wide text-xs">
            Optical Sensor & YOLO Visual AI
          </span>
        </div>

        {/* Camera Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">CAMERA:</span>
          <select
            value={activeCam.camera_id}
            onChange={(e) => {
              const found = cameras?.find((c) => c.camera_id === e.target.value);
              if (found && onSelectCamera) onSelectCamera(found);
            }}
            className="bg-aerodark-900 border border-aerodark-700 text-xs text-slate-200 px-2.5 py-1 rounded-md outline-none cursor-pointer"
          >
            {cameras?.map((c) => (
              <option key={c.camera_id} value={c.camera_id}>
                {c.camera_id} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feed Source & Optical Filter Controls */}
      <div className="flex flex-wrap items-center justify-between bg-aerodark-900 px-3 py-1.5 rounded-lg border border-aerodark-700 text-xs gap-2">
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 font-medium mr-1">FEED:</span>
          <button
            onClick={() => setCameraMode('DEMO')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs cursor-pointer ${
              cameraMode === 'DEMO'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-aerodark-800'
            }`}
          >
            DEMO FEED
          </button>
          <button
            onClick={() => setCameraMode('WEBCAM')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs cursor-pointer ${
              cameraMode === 'WEBCAM'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-aerodark-800'
            }`}
          >
            WEBCAM
          </button>
          <label className="cursor-pointer">
            <span
              className={`px-2.5 py-1 rounded-md transition-all inline-block font-medium text-xs ${
                cameraMode === 'UPLOAD'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-aerodark-800'
              }`}
            >
              UPLOAD
            </span>
            <input type="file" accept="video/*,image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Sensor Mode Switcher: DAYLIGHT / FLIR THERMAL / NVG GREEN */}
        <div className="flex items-center space-x-1 border-l border-aerodark-700 pl-3">
          <span className="text-slate-400 font-medium mr-1">SENSOR:</span>
          <button
            onClick={() => setSensorFilter('DAYLIGHT')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              sensorFilter === 'DAYLIGHT' ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EO
          </button>
          <button
            onClick={() => setSensorFilter('FLIR')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              sensorFilter === 'FLIR' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FLIR (IR)
          </button>
          <button
            onClick={() => setSensorFilter('NVG')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              sensorFilter === 'NVG' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            NVG
          </button>
        </div>
      </div>

      {webcamError && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-xs">
          {webcamError}
        </div>
      )}

      {/* Optical Viewport with Tactical Frame */}
      <div className="relative w-full h-48 bg-aerodark-950 border border-aerodark-700 rounded-lg overflow-hidden flex items-center justify-center">
        {cameraMode === 'WEBCAM' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              sensorFilter === 'FLIR'
                ? 'filter grayscale contrast-150 brightness-110'
                : sensorFilter === 'NVG'
                ? 'filter hue-rotate-90 saturate-150 brightness-90'
                : ''
            }`}
          />
        ) : cameraMode === 'UPLOAD' && uploadedMediaUrl ? (
          isUploadedImage ? (
            <img
              ref={imageRef}
              src={uploadedMediaUrl}
              alt="Uploaded Visual Feed"
              className={`w-full h-full object-contain ${
                sensorFilter === 'FLIR'
                  ? 'filter grayscale contrast-150 brightness-110'
                  : sensorFilter === 'NVG'
                  ? 'filter hue-rotate-90 saturate-150 brightness-90'
                  : ''
              }`}
            />
          ) : (
            <video
              ref={videoRef}
              src={uploadedMediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className={`w-full h-full object-cover ${
                sensorFilter === 'FLIR'
                  ? 'filter grayscale contrast-150 brightness-110'
                  : sensorFilter === 'NVG'
                  ? 'filter hue-rotate-90 saturate-150 brightness-90'
                  : ''
              }`}
            />
          )
        ) : (
          /* High-Fidelity EO/IR Maritime Surveillance Canvas */
          <div
            className={`relative w-full h-full flex items-center justify-center transition-colors duration-500 ${
              sensorFilter === 'FLIR'
                ? 'bg-gradient-to-b from-[#111622] via-[#1a2332] to-[#0f1725]'
                : sensorFilter === 'NVG'
                ? 'bg-gradient-to-b from-[#021f10] via-[#053319] to-[#02180c]'
                : 'bg-gradient-to-b from-[#0B1528] via-[#112340] to-[#0B172B]'
            }`}
          >
            {/* Horizon & Coastal Sea Vector */}
            <div
              className={`absolute top-[48%] w-full h-[1px] ${
                sensorFilter === 'FLIR'
                  ? 'bg-white/15'
                  : sensorFilter === 'NVG'
                  ? 'bg-emerald-500/25'
                  : 'bg-blue-500/20'
              }`}
            ></div>
            <div
              className={`absolute top-[49%] w-full h-full ${
                sensorFilter === 'FLIR'
                  ? 'bg-[#0a0e14]/70'
                  : sensorFilter === 'NVG'
                  ? 'bg-[#011409]/60'
                  : 'bg-[#071120]/50'
              }`}
            ></div>

            {/* Coastal Patrol Craft / Landmark in distance */}
            <div className="absolute bottom-5 right-10 w-20 h-2.5 bg-black/30 rounded-sm"></div>

            {/* Precision Crosshairs & Boresight Ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
              <div className="w-20 h-[1px] bg-current"></div>
              <div className="h-20 w-[1px] bg-current absolute"></div>
              <div className="w-14 h-14 rounded-full border border-current absolute"></div>
            </div>

            {/* Target Silhouette In Optical Boresight */}
            <div
              className="absolute flex items-center justify-center transition-all duration-700"
              style={{
                top: '40%',
                left: '46%'
              }}
            >
              {renderTargetSilhouette()}
            </div>
          </div>
        )}

        {/* Multi-Object Dynamic YOLO Bounding Box Overlays */}
        {activeDetections.map((det, idx) => {
          const bbox = det.bbox || [265, 142, 375, 218];
          const x1 = Math.max(0, bbox[0]);
          const y1 = Math.max(0, bbox[1]);
          const x2 = Math.min(640, bbox[2]);
          const y2 = Math.min(360, bbox[3]);

          const leftPct = (x1 / 640) * 100;
          const topPct = (y1 / 360) * 100;
          const widthPct = Math.max(12, ((x2 - x1) / 640) * 100);
          const heightPct = Math.max(16, ((y2 - y1) / 360) * 100);

          return (
            <div
              key={idx}
              className={`absolute border-2 rounded-sm pointer-events-none transition-all duration-300 ${
                sensorFilter === 'FLIR'
                  ? 'border-amber-400'
                  : sensorFilter === 'NVG'
                  ? 'border-emerald-400'
                  : 'border-blue-400'
              }`}
              style={{
                top: `${topPct}%`,
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`
              }}
            >
              {/* Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-current"></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-current"></div>
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-current"></div>
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-current"></div>

              {/* YOLO Label Tag */}
              <div className="absolute -top-5 left-0 bg-blue-600 text-white font-sans font-semibold text-[10px] px-2 py-0.5 rounded-t-md flex items-center space-x-1 whitespace-nowrap shadow-sm">
                <ScanLine className="w-3 h-3" />
                <span className="uppercase">{det.class_name}</span>
                <span className="font-mono">{((det.confidence || 0.94) * 100).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}

        {/* Top-Left Telemetry Stamp */}
        <div className="absolute top-2 left-2 bg-aerodark-900/90 backdrop-blur border border-aerodark-700 px-2.5 py-1 rounded-md text-[10px] text-slate-300 space-y-0.5 font-sans">
          <div className="text-blue-300 font-semibold flex items-center space-x-1">
            <Crosshair className="w-3 h-3 text-blue-400" />
            <span>{activeCam.name}</span>
          </div>
          <div className="text-slate-400">
            CUE: <span className="font-mono text-slate-200">{currentTrack?.heading_deg || 12}°</span> | FOV: <span className="font-mono text-slate-200">{activeCam.fov_deg || 95}°</span>
          </div>
          <div className="text-slate-400">
            FILTER: <strong className="text-slate-200">{sensorFilter}</strong> | MODE: <strong className="text-blue-300">{cameraMode === 'DEMO' ? 'SIMULATION' : 'LIVE'}</strong>
          </div>
        </div>

        {/* Top-Right Vision Engine Status Tag */}
        <div className="absolute top-2 right-2 bg-aerodark-900/90 backdrop-blur border border-aerodark-700 px-2 py-1 rounded-md text-[10px] flex items-center space-x-1.5 font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${cameraMode === 'WEBCAM' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <span className="text-slate-400 font-sans">INFERENCE:</span>
          <span className="text-slate-200 font-semibold">
            {cameraMode === 'DEMO' ? 'SIMULATION MODE' : (visionMode === 'YOLO' ? 'NATIVE YOLO' : 'FALLBACK MODE')}
          </span>
          {inferenceLatencyMs && (
            <span className="text-emerald-400 font-bold ml-1">({inferenceLatencyMs}ms)</span>
          )}
        </div>

        {/* Bottom-Right Target Lock Status */}
        <div className="absolute bottom-2 right-2 bg-aerodark-900/90 backdrop-blur border border-aerodark-700 px-2.5 py-1 rounded-md text-[10px] flex items-center space-x-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-400 font-medium">LOCK:</span>
          <span className="text-slate-200 font-mono font-semibold">{currentTrack?.track_id || 'STANDBY'}</span>
        </div>
      </div>

      {/* Sensor Fusion Correlation Bar */}
      <div className={`p-2.5 rounded-lg border flex items-center justify-between ${getBadgeStyle()}`}>
        <div className="flex items-center space-x-2.5">
          {fusion.conflict ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <div>
            <div className="font-semibold text-xs text-slate-100 tracking-wide">{fusion.display_status}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{fusion.detail}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase text-slate-400 font-medium">FUSED CONFIDENCE</div>
          <div className="text-sm font-semibold font-mono text-emerald-400">{((fusion.fused_confidence || 0.95) * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
