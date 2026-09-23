import { create } from 'zustand';
import { SIMULATED_SHIFTS } from '../utils/mockShifts';
import { rankShifts } from '../utils/scoring';
import type {
  NavigationDestination,
  WeatherCondition,
  GroundState,
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
} from '../types/cockpit';

interface OperatorStoreState {
  // Navigation & Shell
  currentDestination: NavigationDestination;
  theme: 'night' | 'day';
  isDirectorOpen: boolean;
  isIncidentDrawerOpen: boolean;
  selectedContributor: ContributorDetail['id'] | null;
  walkaroundCompleted: boolean;
  walkaroundItems: WalkaroundCheckItem[];
  showSimulation: boolean;
  simulationSpeed: number; // 1 = 1x real time, 2 = 2x, etc.

  // Machine & Operator Metadata
  operatorName: string;
  operatorId: string;
  operatorSkill: string;
  machineModel: string;
  machineId: string;
  machineSerial: string;

  // Telemetry (AEMP 2.0 Standard fields)
  telemetry: TelemetryData;

  // Environment & Context
  weather: WeatherCondition;
  groundCondition: GroundState;
  maxSafeSlopeDeg: number;
  proximityMultiplier: number;
  cabVisibilityPct: number;

  // Active Task & Queue
  activeTask: TaskItem;
  upcomingQueue: TaskItem[];
  completedTasksHistory: {
    title: string;
    elapsedMinutes: number;
    nominalMinutes: number;
    efficiencyPct: number;
    completedAt: string;
  }[];

  // Safety Stack & Proximity Radar
  safetyEvents: SafetyEvent[];
  proximityTargets: ProximityTarget[];
  activeIncident: IncidentReport | null;

  // Training & Micro-Lessons
  activeLesson: MicroLesson;
  completedLessonsCount: number;

  // Machine Insights
  anomalyFlags: AnomalyFlag[];
  taskBenchmarks: TaskBenchmark[];

  // Contributor Signals & Computed Readiness
  seatbeltFastened: boolean;
  fatigueDetected: boolean;
  tiltAngleExcessive: boolean;
  extendedIdleActive: boolean;

  // Actions
  setDestination: (dest: NavigationDestination) => void;
  toggleTheme: () => void;
  toggleSimulation: () => void;
  toggleDirector: (open?: boolean) => void;
  toggleIncidentDrawer: (open?: boolean) => void;
  setSelectedContributor: (id: ContributorDetail['id'] | null) => void;
  toggleWalkaroundItem: (id: string) => void;
  completeWalkaround: () => void;
  setSimulationSpeed: (speed: number) => void;

  // Task Actions
  toggleTaskPause: () => void;
  completeActiveTask: () => void;
  logTaskIssue: (note: string) => void;

  // Safety & Incident Actions
  acknowledgeEvent: (eventId: string) => void;
  openIncidentReportForEvent: (event: SafetyEvent) => void;
  resolveActiveIncident: (notes?: string) => void;
  toggleVoiceMemo: () => void;
  togglePhotoProof: () => void;

  // Training Actions
  submitQuizAnswer: (chosenOptionIndex: number) => boolean;
  resetLesson: () => void;

  // Telemetry Tick
  tickSimulation: () => void;

  // Deterministic Director Injections
  injectWorkerRedZone: () => void;
  resolveWorkerRedZone: () => void;
  injectVehicleAmberZone: () => void;
  injectSeatbeltUnfasten: () => void;
  fastenSeatbelt: () => void;
  setWeather: (weather: WeatherCondition) => void;
  injectExcessiveTilt: (deg?: number) => void;
  injectHarshStop: () => void;
  injectIdleTimeout: () => void;
  injectFatigueThreshold: () => void;
  resetScenario: () => void;

  // Computed Getters
  getReadiness: () => {
    score: number;
    state: ReadinessState;
    contributors: ContributorDetail[];
  };
  getRankedShifts: () => import('../utils/scoring').RankedShift[];
}

const INITIAL_WALKAROUND: WalkaroundCheckItem[] = [
  { id: 'fluids', title: 'Engine Oil, Coolant & DEF Fluid Levels', category: 'Fluids & Power', checked: false },
  { id: 'hydraulic', title: 'Hydraulic Lines, Boom Cylinders & Hoses (No Weeping)', category: 'Hydraulics & Tracks', checked: false },
  { id: 'tracks', title: 'Track Shoe Bolts, Tension & Sprocket Teeth', category: 'Hydraulics & Tracks', checked: false },
  { id: 'cameras', title: 'Cat 360° Cameras, Radars & Lens Cleanliness', category: 'Safety & Visibility', checked: false },
  { id: 'ropes', title: 'ROPS Cab Glass, Mirrors & Emergency Egress Hammer', category: 'Safety & Visibility', checked: false },
  { id: 'seatbelt', title: 'Retractable Seatbelt Latch & Cab Horn Check', category: 'Safety & Visibility', checked: false },
];

const INITIAL_TASK: TaskItem = {
  id: 'TSK-1049',
  title: 'Earth Excavation — Utility Trench B4',
  operationType: 'Trenching',
  progressPct: 64,
  elapsedSeconds: 42 * 60 + 15,
  predictedMinMinutes: 65,
  predictedMaxMinutes: 75,
  nominalMinutes: 68,
  material: 'Dense Wet Clay / Glacial Till',
  trenchDepthM: 3.4,
  volumeM3Target: 180,
  volumeM3Current: 115,
  status: 'active',
  contextTags: ['Wet Clay', 'Grade Tolerance ±20mm', 'Tier-4 Operator (-5m)', 'Rain Factor (+12m)'],
};

const INITIAL_QUEUE: TaskItem[] = [
  {
    id: 'TSK-1050',
    title: 'Aggregate Bedding Placement (C-33 Stone)',
    operationType: 'Loading',
    progressPct: 0,
    elapsedSeconds: 0,
    predictedMinMinutes: 45,
    predictedMaxMinutes: 55,
    nominalMinutes: 50,
    material: 'Graded Crushed Granite 20mm',
    volumeM3Target: 95,
    status: 'queued',
    contextTags: ['Laser Guided', 'Spreader Bucket Attached'],
  },
  {
    id: 'TSK-1051',
    title: 'Reinforced Concrete Pipe Lowering (48" Storm)',
    operationType: 'Excavation',
    progressPct: 0,
    elapsedSeconds: 0,
    predictedMinMinutes: 80,
    predictedMaxMinutes: 95,
    nominalMinutes: 85,
    material: 'Precast RCP Segments (4.2 Tonnes)',
    status: 'queued',
    contextTags: ['Crane Hook Certified', 'Trench Box Shield Active'],
  },
  {
    id: 'TSK-1052',
    title: 'Compacted Lift Backfill & Final Grade Check',
    operationType: 'Grading',
    progressPct: 0,
    elapsedSeconds: 0,
    predictedMinMinutes: 55,
    predictedMaxMinutes: 65,
    nominalMinutes: 60,
    material: 'Engineered Structural Fill',
    status: 'queued',
    contextTags: ['Density Test Req', 'Compactor Sync'],
  },
];

const LESSON_RED_ZONE: MicroLesson = {
  id: 'LES-PROX-01',
  triggerEventId: 'EVT-PROX-01',
  title: 'Ground-Worker Red Zone Protocols & Implement Isolation',
  badge: 'Critical Safety Protocol',
  estimatedMinutes: 2,
  anomalySummary: 'Worker detected inside the high-risk swing radius (<5.0m) while hydraulic implement was engaged.',
  recommendation: 'Immediately lower the bucket to grade, disengage the hydraulic lockout lever, and await radio visual confirmation.',
  quiz: {
    question: 'A grade-checker steps into your excavation red zone (4.2m) unannounced. What is your mandatory immediate response?',
    scenarioDiagramText: '[Excavator Cab] <---- 4.2m Hazard Zone ----> [Worker in Vest]',
    options: [
      {
        text: 'Honk the cab horn twice and continue digging at half speed while monitoring mirror.',
        isCorrect: false,
        feedback: 'Incorrect. Sounding the horn without isolating hydraulic pressure violates Tier-1 jobsite isolation standards.',
      },
      {
        text: 'Ground the bucket immediately, disengage hydraulic pilot lever, and establish eye contact.',
        isCorrect: true,
        feedback: 'Correct! Mandatory protocol: Ground implement immediately, flip hydraulic lockout lever, and await clear radio confirmation before re-energizing.',
      },
      {
        text: 'Swing the cab 90 degrees away from the worker to create distance.',
        isCorrect: false,
        feedback: 'Incorrect. Swinging introduces dynamic counterweight pinch points and increases tail-swing strike hazards.',
      },
    ],
  },
  completed: false,
};

const LESSON_RAIN_SLOPE: MicroLesson = {
  id: 'LES-SLOPE-02',
  title: 'Slope Stability & Heavy Wet Clay Traction Management',
  badge: 'Weather Adaptation',
  estimatedMinutes: 2,
  anomalySummary: 'Active precipitation detected. Working slope limit dynamically curtailed from 25° down to 15° to prevent bench slide.',
  recommendation: 'Position tracks perpendicular to the trench wall, use bench stepping, and maintain bucket low to center machine gravity.',
  quiz: {
    question: 'When rain softens clay slopes above 12° pitch, how should your excavator tracks be aligned to the trench face?',
    options: [
      {
        text: 'Tracks parallel to the trench for rapid lateral egress.',
        isCorrect: false,
        feedback: 'Incorrect. Parallel tracks create shear slip planes along wet clay trenches.',
      },
      {
        text: 'Tracks perpendicular to trench edge with sprockets to the rear to maximize ballast stability.',
        isCorrect: true,
        feedback: 'Correct! Perpendicular track orientation keeps the machine grounded, preventing lateral slippage, with sprockets protected at the rear.',
      },
      {
        text: 'Turn tracks 45 degrees with counterweight uphill.',
        isCorrect: false,
        feedback: 'Incorrect. Angled tracks lose full surface grip on saturated clay benches.',
      },
    ],
  },
  completed: false,
};

const DESTINATIONS: NavigationDestination[] = ['today', 'safety', 'training', 'insights', 'digest'];

// Start on the view named in the URL hash so deep links and refreshes land on the right page.
function initialDestination(): NavigationDestination {
  if (typeof window === 'undefined') return 'today';
  const hash = window.location.hash.replace('#/', '').replace('#', '') as NavigationDestination;
  return DESTINATIONS.includes(hash) ? hash : 'today';
}

export const useOperatorStore = create<OperatorStoreState>((set, get) => ({
  // Navigation & Shell
  currentDestination: initialDestination(),
  theme: 'night',
  isDirectorOpen: false,
  isIncidentDrawerOpen: false,
  selectedContributor: null,
  walkaroundCompleted: false,
  walkaroundItems: INITIAL_WALKAROUND,
  showSimulation: false,
  simulationSpeed: 1,

  // Metadata
  operatorName: 'Marcus Vance',
  operatorId: 'OP-4092',
  operatorSkill: 'Level 4 Master Operator',
  machineModel: 'CAT 336 Next Gen',
  machineId: 'EXC-842',
  machineSerial: 'CAT0336H842K',

  // Telemetry (AEMP standard)
  telemetry: {
    engineRpm: 1845,
    groundSpeedKmh: 3.4,
    fuelLevelPct: 76,
    hydraulicPressurePsi: 3420,
    pitchDeg: 4.8,
    rollDeg: 1.6,
    cabTempC: 21.8,
    closestObjectDistM: 16.5,
    engineHours: 2842.4,
    gpsQuality: 'RTK Fix',
    networkLatencyMs: 38,
  },

  // Environment & Context
  weather: 'clear',
  groundCondition: 'firm',
  maxSafeSlopeDeg: 25,
  proximityMultiplier: 1.0,
  cabVisibilityPct: 100,

  // Active Task & Queue
  activeTask: INITIAL_TASK,
  upcomingQueue: INITIAL_QUEUE,
  completedTasksHistory: [
    {
      title: 'Topsoil Stripping & Haul Staging',
      elapsedMinutes: 44,
      nominalMinutes: 48,
      efficiencyPct: 109,
      completedAt: '08:45 AM',
    },
    {
      title: 'Rock Outcrop Pre-Shearing & Ripping',
      elapsedMinutes: 72,
      nominalMinutes: 70,
      efficiencyPct: 97,
      completedAt: '10:15 AM',
    },
  ],

  // Safety Stack & Radar
  safetyEvents: [
    {
      id: 'EVT-ROUTINE-01',
      title: 'Pre-Shift Systems Diagnostics',
      severity: 'advisory',
      triggerValue: 'Passed 100%',
      thresholdValue: 'Nominal',
      reason: 'Telematics ECU, hydraulic valves, and Tier-4 emissions verified within factory envelope.',
      timestamp: '07:30 AM',
      timeSecondsAgo: 3600,
      acknowledged: true,
      resolved: true,
    },
  ],
  proximityTargets: [
    {
      id: 'TGT-W1',
      name: 'J. Miller (Site Surveyor)',
      type: 'worker',
      distanceM: 16.5,
      zone: 'green',
      angleDeg: 45,
      role: 'Grade Checker',
    },
    {
      id: 'TGT-V1',
      name: 'CAT 745 Haul Truck #12',
      type: 'vehicle',
      distanceM: 24.2,
      zone: 'green',
      angleDeg: 210,
      speedKmh: 12.4,
    },
  ],
  activeIncident: null,

  // Training
  activeLesson: LESSON_RAIN_SLOPE,
  completedLessonsCount: 1,

  // Machine Insights
  anomalyFlags: [
    {
      id: 'ANOM-01',
      severity: 'low',
      ruleOrModelId: 'RULE-HYD-RELIEF',
      title: 'Transient Hydraulic Spikes During Breakout',
      timestamp: '09:22 AM',
      sourceType: 'Sensor Telemetry',
      whyFlagged: 'Cylinder pressure breached 3,800 PSI 3 times over 10 minutes in hard rock strata.',
      evidence: ['Peak: 3,920 PSI on stick curl', 'Oil temp: 82°C (nominal)', 'Breakout angle: 68°'],
      recommendedAction: 'Engage Smart Boom float mode when cycling over fractured bedrock to reduce cylinder stress.',
    },
  ],
  taskBenchmarks: [
    {
      taskName: 'Earth Excavation',
      operation: 'Excavation',
      predictedRange: [40, 50],
      actualMinutes: 44,
      deltaMinutes: -2,
      status: 'on-track',
      primaryFactor: 'Optimum bucket cycle time (16.2s)',
    },
    {
      taskName: 'Utility Trenching (Current)',
      operation: 'Trenching',
      predictedRange: [65, 75],
      actualMinutes: 42,
      deltaMinutes: 0,
      status: 'on-track',
      primaryFactor: 'Laser depth guidance locked (±15mm)',
    },
    {
      taskName: 'Material Loading (Upcoming)',
      operation: 'Loading',
      predictedRange: [45, 55],
      actualMinutes: 0,
      deltaMinutes: 0,
      status: 'on-track',
      primaryFactor: 'Truck queue spacing 4.5m',
    },
    {
      taskName: 'Precision Grading',
      operation: 'Grading',
      predictedRange: [55, 65],
      actualMinutes: 0,
      deltaMinutes: 0,
      status: 'on-track',
      primaryFactor: 'Cross-slope compensation active',
    },
    {
      taskName: 'Demolition Ripping',
      operation: 'Demolition',
      predictedRange: [70, 85],
      actualMinutes: 72,
      deltaMinutes: +2,
      status: 'on-track',
      primaryFactor: 'Reinforced rebar density variance',
    },
  ],

  // Contributor Signals
  seatbeltFastened: true,
  fatigueDetected: false,
  tiltAngleExcessive: false,
  extendedIdleActive: false,

  // Actions
  setDestination: (dest) => set({ currentDestination: dest }),
  toggleTheme: () => {
    const next = get().theme === 'night' ? 'day' : 'night';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
    set({ theme: next });
  },
  toggleSimulation: () => set((s) => ({ showSimulation: !s.showSimulation })),
  toggleDirector: (open) => set((s) => ({ isDirectorOpen: open !== undefined ? open : !s.isDirectorOpen })),
  toggleIncidentDrawer: (open) => set((s) => ({ isIncidentDrawerOpen: open !== undefined ? open : !s.isIncidentDrawerOpen })),
  setSelectedContributor: (id) => set({ selectedContributor: id }),

  toggleWalkaroundItem: (id) =>
    set((s) => {
      const items = s.walkaroundItems.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
      const allChecked = items.every((i) => i.checked);
      return { walkaroundItems: items, walkaroundCompleted: allChecked };
    }),

  completeWalkaround: () =>
    set((s) => ({
      walkaroundCompleted: true,
      walkaroundItems: s.walkaroundItems.map((i) => ({ ...i, checked: true })),
    })),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  // Task Actions
  toggleTaskPause: () =>
    set((s) => {
      const isPaused = s.activeTask.status === 'paused';
      return {
        activeTask: {
          ...s.activeTask,
          status: isPaused ? 'active' : 'paused',
        },
      };
    }),

  completeActiveTask: () =>
    set((s) => {
      const current = s.activeTask;
      const historyEntry = {
        title: current.title,
        elapsedMinutes: Math.round(current.elapsedSeconds / 60),
        nominalMinutes: current.nominalMinutes,
        efficiencyPct: Math.round((current.nominalMinutes / Math.max(1, current.elapsedSeconds / 60)) * 100),
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (s.upcomingQueue.length === 0) {
        return {
          activeTask: { ...current, progressPct: 100, status: 'completed' },
          completedTasksHistory: [historyEntry, ...s.completedTasksHistory],
        };
      }

      const [nextTask, ...remainingQueue] = s.upcomingQueue;
      return {
        activeTask: { ...nextTask, status: 'active', progressPct: 5, elapsedSeconds: 60 },
        upcomingQueue: remainingQueue,
        completedTasksHistory: [historyEntry, ...s.completedTasksHistory],
      };
    }),

  logTaskIssue: (note) =>
    set((s) => {
      const newEvent: SafetyEvent = {
        id: `EVT-ISSUE-${Date.now().toString().slice(-4)}`,
        title: `Operator Note: ${note || 'Trench Grade Adjustment'}`,
        severity: 'advisory',
        triggerValue: 'Logged by Operator',
        thresholdValue: 'Manual Entry',
        reason: note || 'Sub-surface boulder encountered at station 0+42. Slight adjustment to trench line needed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeSecondsAgo: 0,
        acknowledged: true,
        resolved: true,
      };
      return { safetyEvents: [newEvent, ...s.safetyEvents] };
    }),

  // Safety & Incident Actions
  acknowledgeEvent: (eventId) =>
    set((s) => ({
      safetyEvents: s.safetyEvents.map((evt) => (evt.id === eventId ? { ...evt, acknowledged: true } : evt)),
    })),

  openIncidentReportForEvent: (event) => {
    const s = get();
    const incident: IncidentReport = {
      id: `INC-${Date.now().toString().slice(-5)}`,
      eventId: event.id,
      eventTitle: event.title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      telemetrySnapshot: {
        engineRpm: s.telemetry.engineRpm,
        hydraulicPressurePsi: s.telemetry.hydraulicPressurePsi,
        pitchDeg: s.telemetry.pitchDeg,
        closestObjectDistM: s.telemetry.closestObjectDistM,
        groundSpeedKmh: s.telemetry.groundSpeedKmh,
      },
      hasVoiceMemo: false,
      voiceMemoDurationSec: 0,
      hasPhotoProof: true,
      notes: 'Personnel walked within implement swing radius without prior horn acknowledgement.',
      resolved: false,
    };
    set({ activeIncident: incident, isIncidentDrawerOpen: true });
  },

  resolveActiveIncident: (notes) =>
    set((s) => {
      const incident = s.activeIncident;
      if (!incident) return { isIncidentDrawerOpen: false };
      const updatedEvents = s.safetyEvents.map((evt) =>
        evt.id === incident.eventId ? { ...evt, resolved: true, acknowledged: true } : evt
      );
      return {
        activeIncident: { ...incident, resolved: true, notes: notes || incident.notes },
        safetyEvents: updatedEvents,
        isIncidentDrawerOpen: false,
      };
    }),

  toggleVoiceMemo: () =>
    set((s) => {
      if (!s.activeIncident) return {};
      const nextMemo = !s.activeIncident.hasVoiceMemo;
      return {
        activeIncident: {
          ...s.activeIncident,
          hasVoiceMemo: nextMemo,
          voiceMemoDurationSec: nextMemo ? 12 : 0,
        },
      };
    }),

  togglePhotoProof: () =>
    set((s) => {
      if (!s.activeIncident) return {};
      return {
        activeIncident: {
          ...s.activeIncident,
          hasPhotoProof: !s.activeIncident.hasPhotoProof,
        },
      };
    }),

  submitQuizAnswer: (chosenOptionIndex) => {
    const s = get();
    const lesson = s.activeLesson;
    const option = lesson.quiz.options[chosenOptionIndex];
    if (option && option.isCorrect) {
      set({
        activeLesson: { ...lesson, completed: true, passedScore: 100 },
        completedLessonsCount: s.completedLessonsCount + 1,
      });
      return true;
    }
    return false;
  },

  resetLesson: () =>
    set((s) => ({
      activeLesson: { ...s.activeLesson, completed: false, passedScore: undefined },
    })),

  // Continuous Telemetry Ticker (roughly 1Hz)
  tickSimulation: () =>
    set((s) => {
      if (s.simulationSpeed === 0) return {};

      // Deterministic subtle wave oscillations for realistic live instrumentation
      const jitterRpm = Math.floor(Math.sin(Date.now() / 1500) * 18);
      const jitterPsi = Math.floor(Math.cos(Date.now() / 1800) * 25);
      const jitterPitch = Number((s.telemetry.pitchDeg + (Math.sin(Date.now() / 2500) * 0.1)).toFixed(1));

      // Advance active task progress if active
      let task = s.activeTask;
      if (task.status === 'active' && s.walkaroundCompleted) {
        const nextElapsed = task.elapsedSeconds + s.simulationSpeed;
        const totalEstimatedSec = task.nominalMinutes * 60;
        const nextProgress = Math.min(99, Number(((nextElapsed / totalEstimatedSec) * 100).toFixed(1)));
        task = {
          ...task,
          elapsedSeconds: nextElapsed,
          progressPct: nextProgress,
        };
      }

      return {
        telemetry: {
          ...s.telemetry,
          engineRpm: Math.max(850, s.telemetry.engineRpm + jitterRpm),
          hydraulicPressurePsi: Math.max(1200, s.telemetry.hydraulicPressurePsi + jitterPsi),
          pitchDeg: jitterPitch,
        },
        activeTask: task,
      };
    }),

  // Director Injections
  injectWorkerRedZone: () => {
    const newTarget: ProximityTarget = {
      id: 'TGT-RED-01',
      name: 'R. Davis (Pipe Layer)',
      type: 'worker',
      distanceM: 3.8,
      zone: 'red',
      angleDeg: 15,
      role: 'Trench Spotter',
    };

    const redEvent: SafetyEvent = {
      id: 'EVT-PROX-01',
      title: 'CRITICAL: Worker in Excavation Red Zone',
      severity: 'critical',
      triggerValue: '3.8 meters (Threshold < 5.0m)',
      thresholdValue: '5.0 m Minimum Clearance',
      reason: 'Ground worker R. Davis entered the implement rotation arc while hydraulic pilot is active.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: false,
      resolved: false,
      requiresIncidentReport: true,
    };

    set((s) => ({
      proximityTargets: [newTarget, ...s.proximityTargets.filter((t) => t.id !== 'TGT-RED-01')],
      safetyEvents: [redEvent, ...s.safetyEvents],
      telemetry: { ...s.telemetry, closestObjectDistM: 3.8 },
      activeLesson: LESSON_RED_ZONE,
    }));

    // Auto trigger incident drawer
    get().openIncidentReportForEvent(redEvent);
  },

  resolveWorkerRedZone: () => {
    set((s) => ({
      proximityTargets: s.proximityTargets.filter((t) => t.id !== 'TGT-RED-01'),
      telemetry: { ...s.telemetry, closestObjectDistM: 16.5 },
      safetyEvents: s.safetyEvents.map((e) => (e.id === 'EVT-PROX-01' ? { ...e, resolved: true, acknowledged: true } : e)),
    }));
  },

  injectVehicleAmberZone: () => {
    const newTarget: ProximityTarget = {
      id: 'TGT-AMBER-01',
      name: 'CAT 980M Wheel Loader #03',
      type: 'vehicle',
      distanceM: 9.4,
      zone: 'amber',
      angleDeg: 120,
      speedKmh: 8.2,
    };
    const amberEvent: SafetyEvent = {
      id: `EVT-AMBER-${Date.now().toString().slice(-4)}`,
      title: 'Proximity Warning: Support Vehicle in Amber Zone',
      severity: 'warning',
      triggerValue: '9.4 meters',
      thresholdValue: '12.0m Support Zone',
      reason: 'Wheel Loader #03 approaching spoil heap area inside rear counterweight buffer.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: false,
      resolved: false,
    };
    set((s) => ({
      proximityTargets: [newTarget, ...s.proximityTargets.filter((t) => t.id !== 'TGT-AMBER-01')],
      safetyEvents: [amberEvent, ...s.safetyEvents],
      telemetry: { ...s.telemetry, closestObjectDistM: 9.4 },
    }));
  },

  injectSeatbeltUnfasten: () => {
    const seatbeltEvt: SafetyEvent = {
      id: `EVT-BELT-${Date.now().toString().slice(-4)}`,
      title: 'OPERATOR SEATBELT UNFASTENED',
      severity: 'violation',
      triggerValue: 'Latch Disengaged',
      thresholdValue: 'Continuous Fastened Req',
      reason: 'Cab latch switch opened while machine is energized and in gear.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: false,
      resolved: false,
    };
    set((s) => ({
      seatbeltFastened: false,
      safetyEvents: [seatbeltEvt, ...s.safetyEvents],
    }));
  },

  fastenSeatbelt: () =>
    set((s) => ({
      seatbeltFastened: true,
      safetyEvents: s.safetyEvents.map((e) => (e.title.includes('SEATBELT') ? { ...e, resolved: true, acknowledged: true } : e)),
    })),

  setWeather: (weather) => {
    const isRain = weather === 'rain';
    const isDust = weather === 'dust';
    const isDark = weather === 'darkness';
    const isHeat = weather === 'heat';

    let maxSlope = 25;
    let proxMult = 1.0;
    let ground: GroundState = 'firm';
    let visibility = 100;

    if (isRain) {
      maxSlope = 15; // Tightened limit
      proxMult = 1.4; // Safety buffer expanded
      ground = 'muddy';
      visibility = 75;
    } else if (isDust) {
      proxMult = 1.3;
      visibility = 60;
    } else if (isDark) {
      proxMult = 1.25;
      visibility = 50;
    } else if (isHeat) {
      ground = 'loose';
    }

    const weatherEvt: SafetyEvent = {
      id: `EVT-WX-${Date.now().toString().slice(-4)}`,
      title: isRain ? 'Weather Alert: Heavy Rain & Saturated Ground' : `Environmental Condition: ${weather.toUpperCase()}`,
      severity: isRain ? 'warning' : 'advisory',
      triggerValue: isRain ? 'Precipitation > 14mm/h' : 'Telemetry update',
      thresholdValue: `Safe Slope Limit: ${maxSlope}°`,
      reason: isRain
        ? 'Trench slope envelope reduced from 25° to 15°. Proximity radar boundary scaled +40% for stopping distance.'
        : `Working conditions updated to ${weather}. Machine envelope adjusted.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: !isRain,
      resolved: !isRain,
    };

    set((s) => ({
      weather,
      groundCondition: ground,
      maxSafeSlopeDeg: maxSlope,
      proximityMultiplier: proxMult,
      cabVisibilityPct: visibility,
      safetyEvents: [weatherEvt, ...s.safetyEvents],
      activeLesson: isRain ? LESSON_RAIN_SLOPE : s.activeLesson,
    }));
  },

  injectExcessiveTilt: (deg = 19.5) => {
    const tiltEvt: SafetyEvent = {
      id: `EVT-TILT-${Date.now().toString().slice(-4)}`,
      title: 'ROLLOVER RISK: Excessive Chassis Pitch/Tilt',
      severity: 'critical',
      triggerValue: `${deg}° Pitch`,
      thresholdValue: `${get().maxSafeSlopeDeg}° Max Limit`,
      reason: `Machine angle of ${deg}° exceeds current site limit (${get().maxSafeSlopeDeg}°). Risk of track undercutting.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: false,
      resolved: false,
    };
    set((s) => ({
      tiltAngleExcessive: true,
      telemetry: { ...s.telemetry, pitchDeg: deg },
      safetyEvents: [tiltEvt, ...s.safetyEvents],
    }));
  },

  injectHarshStop: () => {
    const stopEvt: SafetyEvent = {
      id: `EVT-STOP-${Date.now().toString().slice(-4)}`,
      title: 'Harsh Hydraulic Deceleration Recorded',
      severity: 'warning',
      triggerValue: 'Slew Decel 4.8G',
      thresholdValue: 'Max 2.0G',
      reason: 'Rapid counter-swing joystick reversal caused high pressure surge in swing motor relief circuit.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: false,
      resolved: false,
    };
    set((s) => ({
      safetyEvents: [stopEvt, ...s.safetyEvents],
    }));
  },

  injectIdleTimeout: () => {
    const idleEvt: SafetyEvent = {
      id: `EVT-IDLE-${Date.now().toString().slice(-4)}`,
      title: 'Extended High Idle Detected (>20 min)',
      severity: 'advisory',
      triggerValue: '21.4 Minutes Idle',
      thresholdValue: '10.0 Min Auto-Shutdown Advisory',
      reason: 'Engine idling at 1,400 RPM without hydraulic implement command. Fuel consumption waste: 4.8L/hr.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: true,
      resolved: false,
    };
    set((s) => ({
      extendedIdleActive: true,
      safetyEvents: [idleEvt, ...s.safetyEvents],
    }));
  },

  injectFatigueThreshold: () => {
    const fatigueEvt: SafetyEvent = {
      id: `EVT-FATIGUE-${Date.now().toString().slice(-4)}`,
      title: 'Operator Fatigue Advisory: Continuous Cycle Drift',
      severity: 'warning',
      triggerValue: 'Cycle Variance +42%',
      thresholdValue: '< 15% Baseline Variance',
      reason: 'Camera eye-gaze tracking and irregular stick modulation indicate operator fatigue accumulation.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeSecondsAgo: 0,
      acknowledged: false,
      resolved: false,
    };
    set((s) => ({
      fatigueDetected: true,
      safetyEvents: [fatigueEvt, ...s.safetyEvents],
    }));
  },

  resetScenario: () => {
    set({
      weather: 'clear',
      groundCondition: 'firm',
      maxSafeSlopeDeg: 25,
      proximityMultiplier: 1.0,
      seatbeltFastened: true,
      fatigueDetected: false,
      tiltAngleExcessive: false,
      extendedIdleActive: false,
      proximityTargets: [
        {
          id: 'TGT-W1',
          name: 'J. Miller (Site Surveyor)',
          type: 'worker',
          distanceM: 16.5,
          zone: 'green',
          angleDeg: 45,
          role: 'Grade Checker',
        },
        {
          id: 'TGT-V1',
          name: 'CAT 745 Haul Truck #12',
          type: 'vehicle',
          distanceM: 24.2,
          zone: 'green',
          angleDeg: 210,
          speedKmh: 12.4,
        },
      ],
      telemetry: {
        engineRpm: 1845,
        groundSpeedKmh: 3.4,
        fuelLevelPct: 76,
        hydraulicPressurePsi: 3420,
        pitchDeg: 4.8,
        rollDeg: 1.6,
        cabTempC: 21.8,
        closestObjectDistM: 16.5,
        engineHours: 2842.4,
        gpsQuality: 'RTK Fix',
        networkLatencyMs: 38,
      },
      safetyEvents: [
        {
          id: 'EVT-ROUTINE-01',
          title: 'Pre-Shift Systems Diagnostics',
          severity: 'advisory',
          triggerValue: 'Passed 100%',
          thresholdValue: 'Nominal',
          reason: 'ECU verified nominal envelope.',
          timestamp: '07:30 AM',
          timeSecondsAgo: 3600,
          acknowledged: true,
          resolved: true,
        },
      ],
      activeIncident: null,
      isIncidentDrawerOpen: false,
      activeLesson: LESSON_RAIN_SLOPE,
    });
  },

  // Dynamic Readiness Score Calculation (Always Connected & Explainable)
  getReadiness: () => {
    const s = get();

    // 1. Seatbelt contributor
    const seatbeltScore = s.seatbeltFastened ? 100 : 25;
    const seatbeltStatus = s.seatbeltFastened ? 'safe' : 'critical';

    // 2. Proximity contributor
    const hasRedWorker = s.proximityTargets.some((t) => t.zone === 'red');
    const hasAmber = s.proximityTargets.some((t) => t.zone === 'amber');
    let proximityScore = 100;
    let proximityStatus: 'safe' | 'caution' | 'critical' = 'safe';
    if (hasRedWorker) {
      proximityScore = 10;
      proximityStatus = 'critical';
    } else if (hasAmber) {
      proximityScore = 65;
      proximityStatus = 'caution';
    }

    // 3. Fatigue contributor
    const fatigueScore = s.fatigueDetected ? 35 : 100;
    const fatigueStatus = s.fatigueDetected ? 'caution' : 'safe';

    // 4. Machine Behavior contributor
    let behaviorScore = 100;
    let behaviorStatus: 'safe' | 'caution' | 'critical' = 'safe';
    if (s.tiltAngleExcessive) {
      behaviorScore = 20;
      behaviorStatus = 'critical';
    } else if (s.extendedIdleActive) {
      behaviorScore = 70;
      behaviorStatus = 'caution';
    }

    // 5. Environmental Conditions contributor
    let conditionsScore = 100;
    let conditionsStatus: 'safe' | 'caution' | 'critical' = 'safe';
    if (s.weather === 'rain') {
      conditionsScore = 65;
      conditionsStatus = 'caution';
    } else if (s.weather === 'dust' || s.weather === 'darkness') {
      conditionsScore = 75;
      conditionsStatus = 'caution';
    }

    // Check if training was passed for active lesson
    const trainingBonus = s.activeLesson.completed ? 10 : 0;

    // Weighted Overall Score
    // Seatbelt: 25%, Proximity: 30%, Behavior: 20%, Fatigue: 15%, Conditions: 10%
    let overall =
      seatbeltScore * 0.25 +
      proximityScore * 0.3 +
      behaviorScore * 0.2 +
      fatigueScore * 0.15 +
      conditionsScore * 0.1;

    overall = Math.min(100, Math.max(0, Math.round(overall + trainingBonus)));

    // State classification
    let state: ReadinessState = 'Optimal';
    if (overall < 60 || hasRedWorker || !s.seatbeltFastened || s.tiltAngleExcessive) {
      state = 'Stop';
    } else if (overall < 85 || hasAmber || s.weather === 'rain' || s.fatigueDetected) {
      state = 'Caution';
    }

    const contributors: ContributorDetail[] = [
      {
        id: 'seatbelt',
        name: 'Operator Restraint',
        score: seatbeltScore,
        weight: 25,
        status: seatbeltStatus,
        headline: s.seatbeltFastened ? 'Seatbelt Securely Buckled' : 'SEATBELT UNLATCHED — IMMEDIATE HAZARD',
        explanation: s.seatbeltFastened
          ? 'ROPS certified 3-point harness latch switch is closed and confirmed active.'
          : 'Operator cab latch disengaged. Safety interlock requires seatbelt fastened before heavy ground work.',
        triggerValue: s.seatbeltFastened ? 'Buckled' : 'Unbuckled',
        correctiveAction: s.seatbeltFastened ? 'None required' : 'Fasten seatbelt securely until audible latch clicks.',
      },
      {
        id: 'proximity',
        name: 'Proximity Radar',
        score: proximityScore,
        weight: 30,
        status: proximityStatus,
        headline: hasRedWorker
          ? 'WORKER IN CRITICAL RED ZONE (<5.0m)'
          : hasAmber
          ? 'Vehicle in Amber Transition Zone'
          : 'Working Envelope Clear',
        explanation: hasRedWorker
          ? `Worker detected ${s.telemetry.closestObjectDistM}m from excavator counterweight/bucket. Machine swing restricted.`
          : hasAmber
          ? `Support vehicle detected within ${s.telemetry.closestObjectDistM}m buffer.`
          : '360° radar sensors and cameras report zero personnel within primary safety envelope (>15m safe).',
        triggerValue: `${s.telemetry.closestObjectDistM}m Closest Target`,
        correctiveAction: hasRedWorker
          ? 'Ground implement immediately and verify verbal radio clearance with spotter.'
          : hasAmber
          ? 'Sound horn and verify loader trajectory before swinging.'
          : 'Maintain active visual mirror sweep.',
      },
      {
        id: 'fatigue',
        name: 'Fatigue & Attention',
        score: fatigueScore,
        weight: 15,
        status: fatigueStatus,
        headline: s.fatigueDetected ? 'Fatigue Cycle Drift Detected' : 'Operator Vigilance Optimal',
        explanation: s.fatigueDetected
          ? 'Cycle telemetry analysis recorded 42% timing variance and micro-head droop events.'
          : 'Operator response times and stick input smoothness are within optimal Tier-4 baseline.',
        triggerValue: s.fatigueDetected ? 'Cycle Drift +42%' : 'Nominal Baseline',
        correctiveAction: s.fatigueDetected
          ? 'Take mandated 15-minute hydration & stretch break at the staging trailer.'
          : 'Continue scheduled shift rotation.',
      },
      {
        id: 'machineBehavior',
        name: 'Machine Dynamics',
        score: behaviorScore,
        weight: 20,
        status: behaviorStatus,
        headline: s.tiltAngleExcessive
          ? 'CRITICAL TILT / ROLLOVER RISK'
          : s.extendedIdleActive
          ? 'Extended High Idle Advisory'
          : 'Kinematics & Pressures Normal',
        explanation: s.tiltAngleExcessive
          ? `Current chassis pitch of ${s.telemetry.pitchDeg}° exceeds maximum certified slope limit (${s.maxSafeSlopeDeg}°).`
          : s.extendedIdleActive
          ? 'Engine has been idling continuously without hydraulic cycle for over 20 minutes.'
          : 'Hydraulic pressures, swing deceleration, and chassis balance are inside normal factory envelope.',
        triggerValue: `${s.telemetry.pitchDeg}° Pitch`,
        correctiveAction: s.tiltAngleExcessive
          ? 'Re-orient tracks down-slope and swing bucket uphill immediately.'
          : s.extendedIdleActive
          ? 'Engage auto-idle or shut down engine if waiting on haul trucks.'
          : 'Standard operation.',
      },
      {
        id: 'conditions',
        name: 'Jobsite Conditions',
        score: conditionsScore,
        weight: 10,
        status: conditionsStatus,
        headline:
          s.weather === 'rain'
            ? 'Heavy Rain — Soil Softened (Slope Limit 15°)'
            : s.weather === 'dust'
            ? 'High Dust — Reduced Visibility'
            : 'Favorable Ground Conditions',
        explanation:
          s.weather === 'rain'
            ? 'Rain softened clay bench; maximum safe slope limit curtailed to 15° and proximity radar zone scaled 1.4x.'
            : s.weather === 'dust'
            ? 'Suspended particulate matter reduced cab optical visibility to 60%.'
            : 'Dry, firm ground conditions with clear visibility and optimal traction.',
        triggerValue: s.weather.toUpperCase(),
        correctiveAction:
          s.weather === 'rain'
            ? 'Operate tracks perpendicular to trench edge and maintain bucket close to chassis.'
            : 'Ensure work lights and auxiliary strobes are active.',
      },
    ];

    return {
      score: overall,
      state,
      contributors,
    };
  },

  getRankedShifts: () => {
    return rankShifts(SIMULATED_SHIFTS);
  },
}));
