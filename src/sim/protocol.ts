// IronSense telemetry contract v1 — the shapes the simulation sends and the cab UI receives.
// Field names must match the backend exactly; it validates every field and rejects renames.

export const SCHEMA_VERSION = '1.0';

export const ENDPOINTS = {
  live: { http: 'https://good-question-backend.onrender.com', ws: 'wss://good-question-backend.onrender.com' },
  local: { http: 'http://localhost:8000', ws: 'ws://localhost:8000' },
} as const;
export type EndpointKey = keyof typeof ENDPOINTS;

export type Weather = 'Sunny' | 'Cloudy' | 'Rainy' | 'Windy' | 'Storm' | 'Fog' | 'Extreme Heat' | 'Dust';
export type Light = 'day' | 'dusk' | 'night';
export type GroundCondition = 'dry' | 'wet' | 'muddy' | 'loose';
export type EngineState = 'off' | 'idle' | 'running';
export type WorkMode = 'idle' | 'dig' | 'swing_loaded' | 'dump' | 'swing_empty' | 'travel' | 'grade' | 'break';
export type TravelDirection = 'forward' | 'reverse' | 'stationary';
export type EventSource = 'sensor' | 'operator' | 'director_console';
export type Severity = 'info' | 'warning' | 'high' | 'critical';

export type EventType =
  | 'engine_start' | 'engine_stop'
  | 'seatbelt_fastened' | 'seatbelt_unfastened'
  | 'operator_left_seat' | 'operator_returned'
  | 'geofence_enter' | 'geofence_exit'
  | 'harsh_brake' | 'collision' | 'tilt_warning' | 'fault_code'
  | 'refuel_start' | 'refuel_end'
  | 'task_start' | 'task_complete'
  | 'break_start' | 'break_end'
  | 'weather_change' | 'lightning_nearby'
  | 'walkaround_completed'
  | 'manual_near_miss' | 'manual_incident';

export interface Envelope {
  msg_type: string;
  schema_version: string;
  timestamp: string;
  sim_tick: number;
  machine_id: string;
}

// Anything the sim sends; kept loose on purpose — the engine builds each shape explicitly.
export type OutgoingMessage = Envelope & Record<string, unknown>;

export interface BackendError {
  msg_type: 'error';
  ref_msg_type: string;
  sim_tick: number;
  detail: string;
}

export interface ProximityViewItem {
  object_id: string;
  object_type: string;
  distance_m: number;
  bearing_deg: number;
  zone: 'red' | 'amber' | 'green' | string;
  in_blind_spot: boolean;
}

export interface Alert {
  alert_id: string;
  alert_type: string;
  severity: Severity;
  message: string;
  recommended_action?: string | null;
  adjusted_threshold_note?: string | null;
  /** One short sentence for text-to-speech (backend 2+). */
  voice_text?: string | null;
  params?: Record<string, unknown>;
}

export interface Anomaly {
  anomaly_type: string;
  score: number;
  method?: string;
  explanation: string[];
  explanation_items?: unknown[];
}

export interface TaskPrediction {
  task_id: string;
  planned_min: number;
  p10_min: number;
  p50_min: number;
  p90_min: number;
  remaining_min: number;
  factors: { factor: string; effect_pct: number }[];
}

export interface TrainingRecommendation {
  module_id: string;
  title: string;
  reason: string;
}

export interface Assessment {
  msg_type: 'assessment';
  timestamp: string;
  machine_id: string;
  readiness_score: number;
  readiness_breakdown: Record<string, number>;
  zones: { danger_radius_m: number; caution_radius_m: number; reason: string | null };
  proximity_view: ProximityViewItem[];
  alerts: Alert[];
  anomalies: Anomaly[];
  task_prediction: TaskPrediction | null;
  training_recommendations: TrainingRecommendation[];
  /** Language the backend actually used (backend 2+). */
  lang?: CabLang;
}

export type CabLang = 'en' | 'hi';

export const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, high: 2, critical: 3 };
