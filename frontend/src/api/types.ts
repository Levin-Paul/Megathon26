export interface ComponentStatus {
  status: 'ONLINE' | 'OFFLINE' | 'SIMULATION' | 'NOT_CONFIGURED' | 'ERROR';
  details?: string;
  latency_ms?: number;
  model?: string;
  params?: number;
  threshold?: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
  components: {
    backend: ComponentStatus;
    rf_model: ComponentStatus;
    vision: ComponentStatus;
    radar: ComponentStatus;
    fusion: ComponentStatus;
  };
}

export interface RFPredictResponse {
  classification: 'DRONE' | 'NON-DRONE';
  probability: number;
  confidence: number;
  threshold: number;
  model: string;
  latency_ms: number;
  features_processed: number;
  modality: string;
  waveform?: {
    i: number[];
    q: number[];
  };
}

export interface RFSample {
  sample_id: string;
  label: number;
  ground_truth: string;
  description: string;
  features: number[];
  waveform: {
    i: number[];
    q: number[];
  };
}

export interface RadarTarget {
  target_id: string;
  has_target: boolean;
  range_m: number;
  azimuth_deg: number;
  elevation_deg: number;
  radial_velocity_mps: number;
  estimated_rcs_dbms: number;
  confidence: number;
  is_simulated: boolean;
  source: string;
  track_length: number;
  kinematic_class_hint: string;
  color?: string;
  symbol?: string;
  label?: string;
  type?: string;
}

export interface VisionDetection {
  box: number[];
  label: string;
  confidence: number;
  is_drone: boolean;
  area_ratio: number;
  occluded: boolean;
  lighting: string;
}

export interface VisionPredictResponse {
  status: 'ONLINE' | 'SIMULATION' | 'NOT_CONFIGURED';
  has_target: boolean;
  primary_detection: VisionDetection | null;
  all_detections: VisionDetection[];
  drone_confidence: number;
  inference_time_ms: number;
  frame_width: number;
  frame_height: number;
  modality: string;
  note?: string;
}

export interface FusionEvidence {
  modality: string;
  is_available: boolean;
  detected_target: boolean;
  drone_probability: number;
  confidence: number;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface FusionDecision {
  classification: 'DRONE' | 'NON-DRONE' | 'UNCERTAIN';
  overall_confidence: number;
  fused_drone_score: number;
  sensor_agreement: number;
  conflicts: string[];
  active_modalities: string[];
  rationale: string;
  evidence_summary?: Record<string, any>;
  latency_ms?: number;
}

export interface DemoScenario {
  scenario_id: string;
  title: string;
  narrative: string;
  expected_state: string;
  classification: string;
  overall_confidence: number;
  fused_drone_score: number;
  sensor_agreement: number;
  conflicts: string[];
  active_modalities: string[];
  rationale: string;
  radar: FusionEvidence | null;
  vision: FusionEvidence | null;
  rf: FusionEvidence | null;
  latency_ms: number;
}

export interface DetectionEvent {
  id: number;
  timestamp: number;
  target_id: string | null;
  radar_state: string | null;
  vision_state: string | null;
  rf_state: string | null;
  fusion_result: string;
  confidence: number;
  details: Record<string, any>;
}
