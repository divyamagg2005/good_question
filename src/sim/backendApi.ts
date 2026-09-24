import { create } from 'zustand';
import { ENDPOINTS } from './protocol';
import { useLinkStore } from './link';
import { MACHINE, OPERATOR } from './siteConfig';

// REST side of the IronSense backend (spec section 2). Everything the dashboard shows that the
// backend computes — profile, tasks, incidents, digest, training, readiness history — comes from
// here. Endpoints added in later backend builds are optional: a 404 just leaves that data empty.

export interface OperatorProfile {
  operator_id: string;
  skill_score: number;
  level: string;
  trend: string;
  strengths: string[];
  focus_areas: string[];
  components: Record<string, number>;
  as_of: string;
  weeks_of_history: number;
}

export interface PlannedTask {
  task_id: string;
  task_type: string;
  zone_id: string;
  planned_estimate_min: number;
  target_volume_m3: number;
  scheduled_start: string;
}

export interface Incident {
  id: number;
  machine_id: string;
  operator_id: string | null;
  incident_type: string;
  severity: string;
  cause: string;
  source: string;
  timestamp: string;
}

export interface Digest {
  operator_id: string;
  profile: OperatorProfile | null;
  baseline: Record<string, number | null>;
  tasks: { task_id?: string; task_type?: string; planned_min?: number; actual_min?: number; predicted_min?: number }[];
  alerts_by_severity: Record<string, number>;
  anomaly_counts: Record<string, number>;
  idle_min: number;
  fuel_used_l: number;
  seatbelt_compliance_pct: number | null;
  went_well: string | null;
  to_improve: string | null;
  suggested_training: { module_id: string; title: string; reason: string }[];
  incident_count: number;
  recent_incidents: { incident_type: string; severity: string; timestamp: string }[];
}

export interface TrainingModule {
  module_id: string;
  title: string;
  format: string;
  duration_min: number;
  triggers: string[];
  quiz_questions: number;
}

export interface TrainingData {
  recommendations: { module_id: string; title: string; reason: string }[];
  modules: TrainingModule[];
}

export interface ReadinessPoint {
  timestamp: string;
  readiness_score: number;
  readiness_breakdown: Record<string, number>;
}

export interface TrainingResult {
  score?: number;
  correct?: number;
  total?: number;
  passed?: boolean;
  [key: string]: unknown;
}

type Key = 'profile' | 'tasks' | 'incidents' | 'digest' | 'training' | 'readiness';

interface BackendState {
  profile: OperatorProfile | null;
  tasksToday: PlannedTask[];
  incidents: Incident[];
  digest: Digest | null;
  training: TrainingData | null;
  readinessHistory: ReadinessPoint[];
  latencyMs: number | null;
  lastUpdated: Partial<Record<Key, number>>;
  errors: Partial<Record<Key, string>>;
}

export const useBackendStore = create<BackendState>(() => ({
  profile: null,
  tasksToday: [],
  incidents: [],
  digest: null,
  training: null,
  readinessHistory: [],
  latencyMs: null,
  lastUpdated: {},
  errors: {},
}));

const base = () => ENDPOINTS[useLinkStore.getState().endpoint].http;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return (await res.json()) as T;
}

async function load<T>(key: Key, path: string, apply: (data: T) => Partial<BackendState>) {
  try {
    const data = await request<T>(path);
    useBackendStore.setState((s) => ({ ...apply(data), lastUpdated: { ...s.lastUpdated, [key]: Date.now() }, errors: { ...s.errors, [key]: undefined } }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[IronSense] ${key} refresh failed: ${message}`);
    useBackendStore.setState((s) => ({ errors: { ...s.errors, [key]: message } }));
  }
}

const op = encodeURIComponent(OPERATOR.id);
const machine = encodeURIComponent(MACHINE.id);

export const api = {
  refreshProfile: () => load<OperatorProfile>('profile', `/api/operators/${op}/profile`, (profile) => ({ profile })),
  refreshTasks: () => load<{ tasks: PlannedTask[] }>('tasks', `/api/tasks/today?operator_id=${op}`, (d) => ({ tasksToday: d.tasks ?? [] })),
  refreshIncidents: () => load<Incident[]>('incidents', `/api/incidents?operator_id=${op}`, (incidents) => ({ incidents })),
  refreshDigest: () => load<Digest>('digest', `/api/digest/${op}`, (digest) => ({ digest, profile: digest.profile ?? useBackendStore.getState().profile })),
  refreshTraining: () => load<TrainingData>('training', `/api/training/recommendations/${op}`, (training) => ({ training })),
  refreshReadiness: () => load<ReadinessPoint[]>('readiness', `/api/readiness/history?machine_id=${machine}`, (readinessHistory) => ({ readinessHistory })),

  async ping() {
    const started = performance.now();
    try {
      await request('/api/health');
      useBackendStore.setState({ latencyMs: Math.round(performance.now() - started) });
    } catch {
      useBackendStore.setState({ latencyMs: null });
    }
  },

  refreshAll() {
    return Promise.all([
      api.refreshProfile(),
      api.refreshTasks(),
      api.refreshIncidents(),
      api.refreshDigest(),
      api.refreshTraining(),
      api.refreshReadiness(),
    ]);
  },

  /**
   * Quiz questions for a module (backend 2+: GET /api/training/modules/{id}). Correct answers are
   * not included — the server grades them. Returns null when the endpoint isn't deployed.
   */
  async getTrainingModule(moduleId: string): Promise<{ questions: { question: string; options: string[] }[]; videoUrl: string | null } | null> {
    try {
      const data = await request<Record<string, unknown>>(`/api/training/modules/${encodeURIComponent(moduleId)}`);
      const raw = (data.questions ?? data.quiz ?? (data.module as Record<string, unknown> | undefined)?.questions) as unknown[] | undefined;
      if (!Array.isArray(raw) || raw.length === 0) return null;
      const questions = raw.map((q) => {
        const item = q as Record<string, unknown>;
        const opts = (item.options ?? item.choices ?? []) as unknown[];
        return {
          question: String(item.question ?? item.text ?? item.prompt ?? ''),
          options: opts.map((o) => (typeof o === 'string' ? o : String((o as Record<string, unknown>).text ?? (o as Record<string, unknown>).label ?? ''))),
        };
      });
      return { questions, videoUrl: typeof data.video_url === 'string' ? data.video_url : null };
    } catch {
      return null;
    }
  },

  /** Books an instructor session (backend 2+: POST /api/training/book). One slot per hour. */
  async bookTraining(moduleId: string, preferredSlotIso: string) {
    return request<{ booking_id: string; confirmed_slot: string; [key: string]: unknown }>('/api/training/book', {
      method: 'POST',
      body: JSON.stringify({ operator_id: OPERATOR.id, module_id: moduleId, preferred_slot: preferredSlotIso }),
    });
  },

  /** Manual incident / near-miss report (spec: POST /api/incidents). */
  async reportIncident(incidentType: string, severity: string, note: string) {
    await request('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({ machine_id: MACHINE.id, operator_id: OPERATOR.id, incident_type: incidentType, severity, note }),
    });
    void api.refreshIncidents();
    void api.refreshDigest();
  },

  /** Marks a training module done; `answers` is the chosen option index per question. */
  async completeTraining(moduleId: string, answers: number[], quizScore: number) {
    const result = await request<TrainingResult>('/api/training/complete', {
      method: 'POST',
      body: JSON.stringify({ operator_id: OPERATOR.id, module_id: moduleId, answers, quiz_score: quizScore }),
    });
    void api.refreshTraining();
    void api.refreshDigest();
    return result;
  },
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let fastTimer: ReturnType<typeof setInterval> | null = null;

/** Starts background refreshes. Slow data every 60 s, live-ish data every 15 s. */
export function startBackendPolling() {
  if (pollTimer) return;
  void api.ping();
  void api.refreshAll();
  pollTimer = setInterval(() => {
    void api.ping();
    void api.refreshProfile();
    void api.refreshTasks();
    void api.refreshTraining();
  }, 60_000);
  fastTimer = setInterval(() => {
    void api.refreshIncidents();
    void api.refreshDigest();
    void api.refreshReadiness();
  }, 15_000);
  // Re-fetch everything when switching between the live and local backend.
  useLinkStore.subscribe((state, prev) => {
    if (state.endpoint !== prev.endpoint) void api.refreshAll();
  });
}

export function stopBackendPolling() {
  if (pollTimer) clearInterval(pollTimer);
  if (fastTimer) clearInterval(fastTimer);
  pollTimer = null;
  fastTimer = null;
}
