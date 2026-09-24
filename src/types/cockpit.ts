// Cockpit domain models. Every value in these shapes is filled from a live source:
// the sim engine (machine sensors), the backend cab socket (assessment) or backend REST.

import type { GroundCondition, Light, Weather } from '../sim/protocol';

export type NavigationDestination = 'today' | 'safety' | 'training' | 'insights' | 'digest';

export type WeatherCondition = Weather;
export type GroundState = GroundCondition;
export type LightCondition = Light;

/** 'Offline' = no backend assessment received yet this session. */
export type ReadinessState = 'Optimal' | 'Caution' | 'Stop' | 'Offline';

export interface ContributorDetail {
  id: 'seatbelt' | 'proximity' | 'fatigue' | 'machineBehavior' | 'conditions';
  name: string;
  score: number; // 0-100, from the backend readiness_breakdown
  status: 'safe' | 'caution' | 'critical';
  headline: string;
  explanation: string;
  triggerValue: string;
  correctiveAction: string;
}

// AEMP 2.0 (ISO 15143-3) inspired machine fields, read from the sim's sensor state.
export interface TelemetryData {
  engineRpm: number;
  groundSpeedKmh: number;
  fuelLevelPct: number;
  defLevelPct: number;
  hydraulicPressurePsi: number;
  pitchDeg: number;
  rollDeg: number;
  cabTempC: number;
  coolantTempC: number;
  /** Closest sensed object, null when nothing is in sensor range. */
  closestObjectDistM: number | null;
  engineHours: number;
  /** Machine heading, 0 = north, clockwise. */
  headingDeg: number;
  /** Round-trip time of the last backend health check, null when unreachable. */
  networkLatencyMs: number | null;
}

export interface TaskItem {
  id: string;
  title: string;
  operationType: string;
  zoneId: string;
  progressPct: number; // 0-100
  elapsedSeconds: number; // sim seconds
  predictedMinMinutes: number;
  predictedMaxMinutes: number;
  predictedP50Minutes: number | null;
  remainingMinutes: number | null;
  nominalMinutes: number;
  volumeM3Target?: number;
  volumeM3Current?: number;
  status: 'active' | 'queued' | 'paused' | 'completed';
  contextTags: string[];
  /** True when the P10–P90 band comes from the backend model, false when it's the plan. */
  predictionFromBackend: boolean;
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
  alertType: string;
}

export interface ProximityTarget {
  id: string;
  name: string;
  type: 'worker' | 'vehicle' | 'hazard' | 'structure';
  distanceM: number;
  zone: 'red' | 'amber' | 'green';
  angleDeg: number; // 0 = front of cab, 90 = right, 180 = rear, 270 = left
  inBlindSpot?: boolean;
  role?: string;
}

export interface QuizQuestion {
  question: string;
  options: { text: string; feedback?: string }[];
  /** Only present for locally-authored fallback questions; backend modules grade server-side. */
  correctIndex?: number;
}

export interface MicroLesson {
  id: string; // backend module_id
  title: string;
  badge: string;
  format: string;
  estimatedMinutes: number;
  anomalySummary: string;
  recommendation: string;
  questions: QuizQuestion[];
  /** 'backend' when the questions came from GET /api/training/modules/{id}. */
  questionSource: 'backend' | 'local';
  completed: boolean;
  passedScore?: number;
  resultNote?: string;
}

export interface AnomalyFlag {
  id: string;
  severity: 'low' | 'medium' | 'high';
  ruleOrModelId: string;
  title: string;
  timestamp: string;
  sourceType: string;
  whyFlagged: string;
  evidence: string[];
  recommendedAction: string;
  score: number;
  active: boolean;
}

export interface TaskBenchmark {
  taskId: string;
  taskName: string;
  operation: string;
  predictedRange: [number, number]; // [min, max]
  actualMinutes: number | null;
  deltaMinutes: number | null;
  status: 'on-track' | 'delayed' | 'accelerated' | 'queued' | 'in-progress';
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
  alertType: string;
  severity: string;
  timestamp: string;
  telemetrySnapshot: {
    engineRpm: number;
    hydraulicPressurePsi: number;
    pitchDeg: number;
    closestObjectDistM: number | null;
    groundSpeedKmh: number;
  };
  hasVoiceMemo: boolean;
  voiceMemoDurationSec: number;
  hasPhotoProof: boolean;
  notes: string;
  resolved: boolean;
  submitError?: string;
}

export interface CompletedTaskEntry {
  taskId: string;
  title: string;
  elapsedMinutes: number;
  nominalMinutes: number;
  efficiencyPct: number;
  completedAt: string;
  volumeM3: number;
}
