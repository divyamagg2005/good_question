import { create } from 'zustand';
import { SIMULATED_SHIFTS } from '../utils/mockShifts';
import { rankShifts } from '../utils/scoring';
import { sim } from '../sim/engine';
import { useLinkStore } from '../sim/link';
import { api } from '../sim/backendApi';
import { DEFAULT_ZONES, LIMITS, MACHINE, OPERATOR } from '../sim/siteConfig';
import type {
  NavigationDestination,
  WeatherCondition,
  GroundState,
  LightCondition,
  TelemetryData,
  TaskItem,
  SafetyEvent,
  ProximityTarget,
  MicroLesson,
  AnomalyFlag,
  TaskBenchmark,
  WalkaroundCheckItem,
  IncidentReport,
  ReadinessState,
  ContributorDetail,
  CompletedTaskEntry,
} from '../types/cockpit';

// Dashboard store. It holds NO mock data: every data field below is written by
// src/sim/dashboardSync.ts from the sim engine, the backend cab socket and backend REST.
// Actions drive those same sources, so the 3D sim, both director consoles and every
// dashboard page always show the same values.

export interface ReadinessView {
  score: number | null;
  state: ReadinessState;
  contributors: ContributorDetail[];
}

export interface OperatorStoreState {
  // Navigation & shell (UI-only state)
  currentDestination: NavigationDestination;
  isDirectorOpen: boolean;
  isIncidentDrawerOpen: boolean;
  selectedContributor: ContributorDetail['id'] | null;
  walkaroundItems: WalkaroundCheckItem[];
  walkaroundCompleted: boolean;
  showSimulation: boolean;

  // Live session
  simStatus: 'stopped' | 'waiting' | 'running';
  simulationSpeed: number;
  simClock: string | null;
  backendLinked: boolean;

  // Identity
  operatorName: string;
  operatorId: string;
  operatorSkill: string;
  machineModel: string;
  machineId: string;

  // Machine telemetry
  telemetry: TelemetryData;

  // Environment & backend-computed zones
  weather: WeatherCondition;
  light: LightCondition;
  groundCondition: GroundState;
  visibilityM: number;
  maxSafeSlopeDeg: number;
  dangerRadiusM: number;
  cautionRadiusM: number;
  zoneReason: string | null;
  proximityMultiplier: number;
  sensingRangeM: number;

  // Tasks
  activeTask: TaskItem | null;
  upcomingQueue: TaskItem[];
  completedTasksHistory: CompletedTaskEntry[];

  // Safety
  safetyEvents: SafetyEvent[];
  proximityTargets: ProximityTarget[];
  activeIncident: IncidentReport | null;

  // Training
  lessons: MicroLesson[];
  activeLessonId: string | null;
  completedLessonsCount: number;

  // Insights
  anomalyFlags: AnomalyFlag[];
  taskBenchmarks: TaskBenchmark[];

  // Contributor signals
  seatbeltFastened: boolean;
  seatOccupied: boolean;
  onBreak: boolean;
  fatigueDetected: boolean;
  tiltAngleExcessive: boolean;
  extendedIdleActive: boolean;

  readiness: ReadinessView;

  // Actions
  setDestination: (dest: NavigationDestination) => void;
  toggleSimulation: () => void;
  toggleDirector: (open?: boolean) => void;
  toggleIncidentDrawer: (open?: boolean) => void;
  setSelectedContributor: (id: ContributorDetail['id'] | null) => void;
  toggleWalkaroundItem: (id: string) => void;
  completeWalkaround: () => void;
  setSimulationSpeed: (speed: number) => void;

  toggleTaskPause: () => void;
  completeActiveTask: () => void;
  logTaskIssue: (note: string) => void;

  acknowledgeEvent: (eventId: string) => void;
  openIncidentReportForEvent: (event: SafetyEvent) => void;
  resolveActiveIncident: (notes?: string) => Promise<void>;
  toggleVoiceMemo: () => void;
  togglePhotoProof: () => void;

  selectLesson: (moduleId: string) => void;
  submitQuiz: (answers: number[]) => Promise<{ passed: boolean; score: number | null; note: string }>;
  resetLesson: () => void;

  setWeather: (weather: WeatherCondition) => void;
  setLight: (light: LightCondition) => void;
  runScenario: (id: number) => void;
  resetScenario: () => void;

  getReadiness: () => ReadinessView;
  getActiveLesson: () => MicroLesson | null;
  getRankedShifts: () => import('../utils/scoring').RankedShift[];
}

const INITIAL_WALKAROUND: WalkaroundCheckItem[] = [
  { id: 'fluids', title: 'Engine Oil, Coolant & DEF Fluid Levels', category: 'Fluids & Power', checked: false },
  { id: 'hydraulic', title: 'Hydraulic Lines, Boom Cylinders & Hoses (No Weeping)', category: 'Hydraulics & Tracks', checked: false },
  { id: 'tracks', title: 'Track Shoe Bolts, Tension & Sprocket Teeth', category: 'Hydraulics & Tracks', checked: false },
  { id: 'cameras', title: '360° Cameras, Radars & Lens Cleanliness', category: 'Safety & Visibility', checked: false },
  { id: 'ropes', title: 'ROPS Cab Glass, Mirrors & Emergency Egress Hammer', category: 'Safety & Visibility', checked: false },
  { id: 'seatbelt', title: 'Retractable Seatbelt Latch & Cab Horn Check', category: 'Safety & Visibility', checked: false },
];

const DESTINATIONS: NavigationDestination[] = ['today', 'safety', 'training', 'insights', 'digest'];

// Start on the view named in the URL hash so deep links and refreshes land on the right page.
function initialDestination(): NavigationDestination {
  if (typeof window === 'undefined') return 'today';
  const hash = window.location.hash.replace('#/', '').replace('#', '') as NavigationDestination;
  return DESTINATIONS.includes(hash) ? hash : 'today';
}

/** Starts the shift in the sim (and so the telemetry feed) if it isn't already running. */
function ensureShiftStarted() {
  if (sim.status === 'stopped') sim.start();
}

export const useOperatorStore = create<OperatorStoreState>((set, get) => ({
  currentDestination: initialDestination(),
  isDirectorOpen: false,
  isIncidentDrawerOpen: false,
  selectedContributor: null,
  walkaroundItems: INITIAL_WALKAROUND,
  walkaroundCompleted: false,
  showSimulation: false,

  simStatus: 'stopped',
  simulationSpeed: sim.cfg.timeScale,
  simClock: null,
  backendLinked: false,

  operatorName: OPERATOR.displayName,
  operatorId: OPERATOR.id,
  operatorSkill: OPERATOR.skillLevel,
  machineModel: MACHINE.model,
  machineId: MACHINE.id,

  telemetry: {
    engineRpm: 0,
    groundSpeedKmh: 0,
    fuelLevelPct: 0,
    defLevelPct: 0,
    hydraulicPressurePsi: 0,
    pitchDeg: 0,
    rollDeg: 0,
    cabTempC: 0,
    coolantTempC: 0,
    closestObjectDistM: null,
    engineHours: 0,
    headingDeg: 0,
    networkLatencyMs: null,
  },

  weather: 'Sunny',
  light: 'day',
  groundCondition: 'dry',
  visibilityM: 0,
  maxSafeSlopeDeg: LIMITS.tiltWarningDeg,
  dangerRadiusM: DEFAULT_ZONES.dangerM,
  cautionRadiusM: DEFAULT_ZONES.cautionM,
  zoneReason: null,
  proximityMultiplier: 1,
  sensingRangeM: LIMITS.proximityRangeM,

  activeTask: null,
  upcomingQueue: [],
  completedTasksHistory: [],

  safetyEvents: [],
  proximityTargets: [],
  activeIncident: null,

  lessons: [],
  activeLessonId: null,
  completedLessonsCount: 0,

  anomalyFlags: [],
  taskBenchmarks: [],

  seatbeltFastened: true,
  seatOccupied: true,
  onBreak: false,
  fatigueDetected: false,
  tiltAngleExcessive: false,
  extendedIdleActive: false,

  readiness: { score: null, state: 'Offline', contributors: [] },

  // ---------------------------------------------------------------- navigation
  setDestination: (dest) => set({ currentDestination: dest }),
  toggleSimulation: () => set((s) => ({ showSimulation: !s.showSimulation })),
  toggleDirector: (open) => set((s) => ({ isDirectorOpen: open !== undefined ? open : !s.isDirectorOpen })),
  toggleIncidentDrawer: (open) => set((s) => ({ isIncidentDrawerOpen: open !== undefined ? open : !s.isIncidentDrawerOpen })),
  setSelectedContributor: (id) => set({ selectedContributor: id }),

  // ---------------------------------------------------------------- walkaround → starts the shift
  toggleWalkaroundItem: (id) => {
    const items = get().walkaroundItems.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
    const allChecked = items.every((i) => i.checked);
    set({ walkaroundItems: items });
    if (allChecked) get().completeWalkaround();
  },

  completeWalkaround: () => {
    set((s) => ({ walkaroundItems: s.walkaroundItems.map((i) => ({ ...i, checked: true })), walkaroundCompleted: true }));
    ensureShiftStarted();
  },

  setSimulationSpeed: (speed) => sim.configure({ timeScale: speed }),

  // ---------------------------------------------------------------- task (driven by the sim)
  toggleTaskPause: () => sim.setBreak(!sim.exc.onBreak),
  completeActiveTask: () => sim.completeTaskNow(),
  logTaskIssue: (note) => {
    sim.reportIncident(note || 'Operator logged a task issue');
    // The backend turns the manual_incident event into an incident; pick it up shortly.
    setTimeout(() => { void api.refreshIncidents(); }, 2500);
  },

  // ---------------------------------------------------------------- safety
  acknowledgeEvent: (eventId) => useLinkStore.getState().acknowledgeAlert(eventId),

  openIncidentReportForEvent: (event) => {
    const t = get().telemetry;
    const incident: IncidentReport = {
      id: `REPORT-${event.id}`,
      eventId: event.id,
      eventTitle: event.title,
      alertType: event.alertType,
      severity: event.severity,
      timestamp: event.timestamp,
      telemetrySnapshot: {
        engineRpm: t.engineRpm,
        hydraulicPressurePsi: t.hydraulicPressurePsi,
        pitchDeg: t.pitchDeg,
        closestObjectDistM: t.closestObjectDistM,
        groundSpeedKmh: t.groundSpeedKmh,
      },
      hasVoiceMemo: false,
      voiceMemoDurationSec: 0,
      hasPhotoProof: false,
      notes: event.reason,
      resolved: false,
    };
    set({ activeIncident: incident, isIncidentDrawerOpen: true });
  },

  resolveActiveIncident: async (notes) => {
    const incident = get().activeIncident;
    if (!incident) {
      set({ isIncidentDrawerOpen: false });
      return;
    }
    const severity = incident.severity === 'violation' ? 'critical' : incident.severity === 'advisory' ? 'info' : incident.severity;
    try {
      await api.reportIncident(incident.alertType, severity, notes || incident.notes);
      useLinkStore.getState().acknowledgeAlert(incident.eventId);
      set({ activeIncident: { ...incident, resolved: true, notes: notes || incident.notes }, isIncidentDrawerOpen: false });
    } catch (err) {
      set({ activeIncident: { ...incident, submitError: err instanceof Error ? err.message : String(err) } });
    }
  },

  toggleVoiceMemo: () =>
    set((s) => (s.activeIncident ? { activeIncident: { ...s.activeIncident, hasVoiceMemo: !s.activeIncident.hasVoiceMemo, voiceMemoDurationSec: s.activeIncident.hasVoiceMemo ? 0 : 12 } } : {})),
  togglePhotoProof: () =>
    set((s) => (s.activeIncident ? { activeIncident: { ...s.activeIncident, hasPhotoProof: !s.activeIncident.hasPhotoProof } } : {})),

  // ---------------------------------------------------------------- training
  selectLesson: (moduleId) => set({ activeLessonId: moduleId }),

  submitQuiz: async (answers) => {
    const lesson = get().getActiveLesson();
    if (!lesson) return { passed: false, score: null, note: 'No lesson selected' };
    // Local questions carry the answer; backend questions are graded by the server.
    const local = lesson.questionSource === 'local';
    const localCorrect = local ? lesson.questions.filter((q, i) => q.correctIndex === answers[i]).length : 0;
    const localScore = local ? Math.round((localCorrect / Math.max(1, lesson.questions.length)) * 100) : null;
    let passed = local ? (localScore ?? 0) >= 60 : false;
    let score = localScore;
    let note = '';
    try {
      const result = await api.completeTraining(lesson.id, local ? [] : answers, localScore ?? 0);
      if (typeof result.score === 'number') score = Math.round(result.score <= 1 ? result.score * 100 : result.score);
      if (typeof result.passed === 'boolean') passed = result.passed;
      note = typeof result.correct === 'number' && typeof result.total === 'number' ? `${result.correct}/${result.total} correct (graded by backend)` : 'Recorded by backend';
    } catch (err) {
      note = `Not recorded: ${err instanceof Error ? err.message : String(err)}`;
    }
    if (passed) {
      set((s) => ({
        lessons: s.lessons.map((l) => (l.id === lesson.id ? { ...l, completed: true, passedScore: score ?? undefined, resultNote: note } : l)),
        completedLessonsCount: s.completedLessonsCount + 1,
      }));
    } else {
      set((s) => ({ lessons: s.lessons.map((l) => (l.id === lesson.id ? { ...l, resultNote: note } : l)) }));
    }
    return { passed, score, note };
  },

  resetLesson: () =>
    set((s) => ({ lessons: s.lessons.map((l) => (l.id === s.activeLessonId ? { ...l, completed: false, passedScore: undefined, resultNote: undefined } : l)) })),

  // ---------------------------------------------------------------- director → sim
  setWeather: (weather) => {
    ensureShiftStarted();
    sim.setWeather(weather);
  },
  setLight: (light) => sim.setLight(light),
  runScenario: (id) => {
    ensureShiftStarted();
    sim.runScenario(id);
  },
  resetScenario: () => {
    sim.clearScenario();
    sim.setWeather('Sunny');
    sim.setLight('day');
  },

  // ---------------------------------------------------------------- getters
  getReadiness: () => get().readiness,
  getActiveLesson: () => {
    const s = get();
    return s.lessons.find((l) => l.id === s.activeLessonId) ?? s.lessons[0] ?? null;
  },
  getRankedShifts: () => rankShifts(SIMULATED_SHIFTS),
}));
