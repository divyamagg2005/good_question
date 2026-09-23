// Cockpit domain models and AEMP Telemetry Types

export type NavigationDestination = 'today' | 'safety' | 'training' | 'insights' | 'digest';

export type WeatherCondition = 'clear' | 'rain' | 'dust' | 'darkness' | 'heat';
export type GroundState = 'firm' | 'muddy' | 'loose';
export type ConnectionHealth = 'cellular-lte' | 'mesh-active' | 'degraded' | 'offline';

export type ReadinessState = 'Optimal' | 'Caution' | 'Stop';

export interface ContributorDetail {
  id: 'seatbelt' | 'proximity' | 'fatigue' | 'machineBehavior' | 'conditions';
  name: string;
  score: number; // 0-100
  weight: number;
  status: 'safe' | 'caution' | 'critical';
  headline: string;
  explanation: string;
  triggerValue: string;
  correctiveAction: string;
}

// AEMP 2.0 (ISO 15143-3) standard inspired equipment fields with plain operator labels
export interface TelemetryData {
  engineRpm: number;          // Engine Speed (RPM)
  groundSpeedKmh: number;     // Machine Ground Speed (km/h)
  fuelLevelPct: number;       // Fuel Level (0-100%)
  hydraulicPressurePsi: number;// System Hydraulic Pressure (PSI)
  pitchDeg: number;           // Chassis Pitch / Tilt Angle (degrees)
  rollDeg: number;            // Chassis Lateral Roll (degrees)
  cabTempC: number;           // Operator Environment Temperature (°C)
  closestObjectDistM: number; // Radar/Lidar closest object (meters)
  engineHours: number;        // Accumulated Operating Hours
  gpsQuality: 'RTK Fix' | 'DGPS' | 'Standard' | 'Searching';
  networkLatencyMs: number;
}

export interface TaskItem {
  id: string;
  title: string;
  operationType: 'Excavation' | 'Trenching' | 'Loading' | 'Grading' | 'Demolition';
  progressPct: number;        // 0-100
  elapsedSeconds: number;
  predictedMinMinutes: number;
  predictedMaxMinutes: number;
  nominalMinutes: number;
  material: string;
  trenchDepthM?: number;
  volumeM3Target?: number;
  volumeM3Current?: number;
  status: 'active' | 'queued' | 'paused' | 'completed';
  contextTags: string[];
}

export type EventSeverity = 'advisory' | 'warning' | 'critical' | 'violation';

export interface SafetyEvent {
  id: string;
  title: string;
  severity: EventSeverity;
  triggerValue: string;
  thresholdValue: string;
  reason: string;
  timestamp: string;
  timeSecondsAgo: number;
  acknowledged: boolean;
  resolved: boolean;
  requiresIncidentReport?: boolean;
}

export interface ProximityTarget {
  id: string;
  name: string;
  type: 'worker' | 'vehicle' | 'hazard' | 'structure';
  distanceM: number;
  zone: 'red' | 'amber' | 'green';
  angleDeg: number;          // 0 = front of cab, 90 = right, 180 = rear, 270 = left
  speedKmh?: number;
  role?: string;
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface MicroLesson {
  id: string;
  triggerEventId?: string;
  title: string;
  badge: string;
  estimatedMinutes: number;
  anomalySummary: string;
  recommendation: string;
  quiz: {
    question: string;
    scenarioDiagramText?: string;
    options: QuizOption[];
  };
  completed: boolean;
  passedScore?: number;
}

export interface AnomalyFlag {
  id: string;
  severity: 'low' | 'medium' | 'high';
  ruleOrModelId: string;     // e.g. "RULE-TILT-89", "ML-IDLE-402"
  title: string;
  timestamp: string;
  sourceType: 'Sensor Telemetry' | 'Computer Vision' | 'Operator Input' | 'Kinematics';
  whyFlagged: string;
  evidence: string[];
  recommendedAction: string;
}

export interface TaskBenchmark {
  taskName: string;
  operation: 'Excavation' | 'Trenching' | 'Loading' | 'Grading' | 'Demolition';
  predictedRange: [number, number]; // [min, max]
  actualMinutes: number;
  deltaMinutes: number;
  status: 'on-track' | 'delayed' | 'accelerated';
  primaryFactor: string;
}

export interface WalkaroundCheckItem {
  id: string;
  title: string;
  category: 'Fluids & Power' | 'Hydraulics & Tracks' | 'Safety & Visibility';
  checked: boolean;
  note?: string;
}

export interface IncidentReport {
  id: string;
  eventId: string;
  eventTitle: string;
  timestamp: string;
  telemetrySnapshot: {
    engineRpm: number;
    hydraulicPressurePsi: number;
    pitchDeg: number;
    closestObjectDistM: number;
    groundSpeedKmh: number;
  };
  hasVoiceMemo: boolean;
  voiceMemoDurationSec: number;
  hasPhotoProof: boolean;
  notes: string;
  resolved: boolean;
}
