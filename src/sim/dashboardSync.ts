import { sim, TASKS, type SimSnapshot, type TaskDef } from './engine';
import { useLinkStore, type AlertLogEntry, type AnomalyLogEntry } from './link';
import { api, useBackendStore, type PlannedTask, type TrainingModule } from './backendApi';
import { LESSON_BANK } from './lessonBank';
import { BAR_TO_PSI, DEFAULT_ZONES, LIMITS, OPERATOR } from './siteConfig';
import { SEVERITY_RANK, type Alert, type Assessment, type Severity, type TaskPrediction } from './protocol';
import { useOperatorStore, type ReadinessView } from '../store/useOperatorStore';
import type {
  AnomalyFlag,
  CompletedTaskEntry,
  ContributorDetail,
  EventSeverity,
  MicroLesson,
  ProximityTarget,
  QuizQuestion,
  SafetyEvent,
  TaskBenchmark,
  TaskItem,
} from '../types/cockpit';

// One-way bridge: sim engine + backend cab socket + backend REST  →  dashboard store.
// Nothing here invents values; it only reshapes what those sources report so every page
// (and the 3D view's cab panel, which reads the same sources) shows the same numbers.

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const simTime = (iso: string | null | undefined) => (iso ? iso.slice(11, 16) : '--:--');
const r1 = (n: number) => Math.round(n * 10) / 10;

// ------------------------------------------------------------------ categorisation

type ContributorId = ContributorDetail['id'];

function contributorFor(type: string): ContributorId {
  if (/seatbelt|seat|out_of_cab|operator_out|left_seat/.test(type)) return 'seatbelt';
  if (/proximity|person|worker|near_miss|collision|blind/.test(type)) return 'proximity';
  if (/fatigue|break|continuous/.test(type)) return 'fatigue';
  if (/weather|lightning|rain|storm|wind|fog|dust|visibility|heat|conditions/.test(type)) return 'conditions';
  return 'machineBehavior';
}

const BREAKDOWN_KEYS: Record<ContributorId, string> = {
  seatbelt: 'seatbelt',
  proximity: 'proximity',
  machineBehavior: 'behaviour',
  fatigue: 'fatigue',
  conditions: 'conditions',
};

const CONTRIBUTOR_NAMES: Record<ContributorId, string> = {
  seatbelt: 'Operator Restraint',
  proximity: 'Proximity Radar',
  machineBehavior: 'Machine Dynamics',
  fatigue: 'Fatigue & Attention',
  conditions: 'Jobsite Conditions',
};

const scoreStatus = (score: number): ContributorDetail['status'] => (score >= 80 ? 'safe' : score >= 55 ? 'caution' : 'critical');

function moduleForTrigger(modules: TrainingModule[], trigger: string) {
  return modules.find((m) => m.triggers.includes(trigger));
}

// ------------------------------------------------------------------ readiness

function buildReadiness(a: Assessment | null, snap: SimSnapshot, anomalies: AnomalyLogEntry[], modules: TrainingModule[]): ReadinessView {
  if (!a) return { score: null, state: 'Offline', contributors: [] };
  const e = snap.exc;
  const shiftHours = snap.tick / 3600;
  const liveValue: Record<ContributorId, string> = {
    seatbelt: `${e.seatOccupied ? 'In seat' : 'Out of seat'} · ${e.seatbeltFastened ? 'Buckled' : 'Unbuckled'}`,
    proximity: snap.closestObjectM === null ? `Nothing within ${snap.sensingRangeM} m` : `${snap.closestObjectM} m closest · danger ${a.zones.danger_radius_m} m`,
    machineBehavior: `Pitch ${r1(e.pitchDeg)}° · swing ${Math.round(Math.abs(e.swingRateDps))}°/s`,
    fatigue: `${e.onBreak ? 'On break' : 'Operating'} · ${r1(shiftHours)} h into shift`,
    conditions: `${snap.weather} · ${snap.light} · ${sim.environment.visibility_m} m visibility`,
  };

  const contributors = (Object.keys(BREAKDOWN_KEYS) as ContributorId[]).map((id): ContributorDetail => {
    const score = a.readiness_breakdown[BREAKDOWN_KEYS[id]] ?? 100;
    const alerts = a.alerts.filter((al) => contributorFor(al.alert_type) === id).sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity]);
    const anoms = anomalies.filter((an) => an.active && contributorFor(an.anomaly.anomaly_type) === id);
    const top = alerts[0];
    const topAnom = anoms[0]?.anomaly;
    const trainingTitle = topAnom ? moduleForTrigger(modules, topAnom.anomaly_type)?.title : undefined;
    const reasonText = id === 'conditions' && a.zones.reason ? `Backend adjusted zones for: ${a.zones.reason}.` : '';
    return {
      id,
      name: CONTRIBUTOR_NAMES[id],
      score,
      status: top?.severity === 'critical' ? 'critical' : scoreStatus(score),
      headline: top?.message ?? (topAnom ? humanize(topAnom.anomaly_type) : score >= 100 ? 'No issues reported' : `Score ${score} / 100`),
      explanation:
        [top?.adjusted_threshold_note, topAnom?.explanation.join(' · '), reasonText].filter(Boolean).join(' ') ||
        'The backend reports no active alerts or anomalies for this factor.',
      triggerValue: liveValue[id],
      correctiveAction: top?.recommended_action ?? (trainingTitle ? `Complete training: ${trainingTitle}` : 'None required'),
    };
  });

  const hasCritical = a.alerts.some((al) => al.severity === 'critical');
  const hasWarn = a.alerts.some((al) => al.severity === 'warning' || al.severity === 'high');
  const score = a.readiness_score;
  const state = hasCritical || score < 55 ? 'Stop' : hasWarn || score < 80 ? 'Caution' : 'Optimal';
  return { score, state, contributors };
}

// ------------------------------------------------------------------ safety events

const EVENT_SEVERITY: Record<Severity, EventSeverity> = { info: 'advisory', warning: 'warning', high: 'critical', critical: 'critical' };

function toSafetyEvent(entry: AlertLogEntry, nowIso: string): SafetyEvent {
  const al = entry.alert;
  const secondsAgo = Math.max(0, (Date.parse(nowIso) - Date.parse(entry.firstSeen)) / 1000);
  const violation = /violation/i.test(al.message);
  return {
    id: al.alert_id,
    title: al.message,
    severity: violation ? 'violation' : EVENT_SEVERITY[entry.peakSeverity],
    triggerValue: `${humanize(al.alert_type)} · ${entry.peakSeverity.toUpperCase()}`,
    thresholdValue: al.adjusted_threshold_note ?? al.alert_id,
    reason: al.recommended_action ?? '',
    timestamp: simTime(entry.firstSeen),
    timeSecondsAgo: Number.isFinite(secondsAgo) ? secondsAgo : 0,
    acknowledged: entry.acknowledged,
    resolved: !entry.active,
    requiresIncidentReport: SEVERITY_RANK[entry.peakSeverity] >= SEVERITY_RANK.high,
    alertType: al.alert_type,
  };
}

// ------------------------------------------------------------------ tasks

const predictionsByTask = new Map<string, TaskPrediction>();

function plannedTasks(): PlannedTask[] {
  const fromBackend = useBackendStore.getState().tasksToday;
  if (fromBackend.length) return fromBackend;
  return TASKS.map((t: TaskDef) => ({
    task_id: t.task_id,
    task_type: t.task_type,
    zone_id: t.zone_id,
    planned_estimate_min: t.planned_estimate_min,
    target_volume_m3: t.target_volume_m3,
    scheduled_start: '',
  }));
}

function factorTags(pred: TaskPrediction | undefined) {
  return (pred?.factors ?? []).map((f) => `${humanize(f.factor)} ${f.effect_pct > 0 ? '+' : ''}${f.effect_pct}%`);
}

function toTaskItem(t: PlannedTask, status: TaskItem['status'], snap: SimSnapshot | null): TaskItem {
  const pred = predictionsByTask.get(t.task_id);
  const isCurrent = status === 'active' || status === 'paused';
  return {
    id: t.task_id,
    title: `${t.task_type} — ${t.zone_id}`,
    operationType: t.task_type,
    zoneId: t.zone_id,
    progressPct: isCurrent && snap ? r1(snap.taskProgressPct) : 0,
    elapsedSeconds: isCurrent && snap ? snap.taskElapsedSec : 0,
    predictedMinMinutes: pred?.p10_min ?? t.planned_estimate_min,
    predictedMaxMinutes: pred?.p90_min ?? t.planned_estimate_min,
    predictedP50Minutes: pred?.p50_min ?? null,
    remainingMinutes: isCurrent ? pred?.remaining_min ?? null : null,
    nominalMinutes: t.planned_estimate_min,
    volumeM3Target: t.target_volume_m3,
    volumeM3Current: isCurrent && snap ? r1(snap.volumeMovedM3) : 0,
    status,
    contextTags: [...factorTags(pred), `Zone ${t.zone_id}`, `Ground ${sim.environment.ground_condition}`],
    predictionFromBackend: Boolean(pred),
  };
}

function buildTasks(snap: SimSnapshot) {
  const planned = plannedTasks();
  const done = new Map(snap.completedTasks.map((c) => [c.task.task_id, c]));
  const currentId = snap.taskId;
  let activeTask: TaskItem | null = null;
  const upcomingQueue: TaskItem[] = [];
  for (const t of planned) {
    if (done.has(t.task_id)) continue;
    if (t.task_id === currentId) activeTask = toTaskItem(t, snap.exc.onBreak ? 'paused' : 'active', snap);
    else upcomingQueue.push(toTaskItem(t, 'queued', null));
  }
  const completedTasksHistory: CompletedTaskEntry[] = [...snap.completedTasks].reverse().map((c) => ({
    taskId: c.task.task_id,
    title: `${c.task.task_type} — ${c.task.zone_id}`,
    elapsedMinutes: c.actualMin,
    nominalMinutes: c.task.planned_estimate_min,
    efficiencyPct: Math.round((c.task.planned_estimate_min / Math.max(0.1, c.actualMin)) * 100),
    completedAt: simTime(c.completedAt),
    volumeM3: c.volumeM3,
  }));

  const taskBenchmarks: TaskBenchmark[] = planned.map((t) => {
    const pred = predictionsByTask.get(t.task_id);
    const c = done.get(t.task_id);
    const range: [number, number] = pred ? [pred.p10_min, pred.p90_min] : [t.planned_estimate_min, t.planned_estimate_min];
    const topFactor = [...(pred?.factors ?? [])].sort((x, y) => Math.abs(y.effect_pct) - Math.abs(x.effect_pct))[0];
    const primaryFactor = topFactor ? `${humanize(topFactor.factor)} (${topFactor.effect_pct > 0 ? '+' : ''}${topFactor.effect_pct}%)` : pred ? 'No adjustment factors' : 'Plan only · no backend prediction yet';
    if (c) {
      const expected = pred?.p50_min ?? t.planned_estimate_min;
      return {
        taskId: t.task_id,
        taskName: `${t.task_type} (${t.task_id})`,
        operation: t.task_type,
        predictedRange: range,
        actualMinutes: c.actualMin,
        deltaMinutes: r1(c.actualMin - expected),
        status: c.actualMin > range[1] ? 'delayed' : c.actualMin < range[0] ? 'accelerated' : 'on-track',
        primaryFactor,
      };
    }
    const current = t.task_id === currentId;
    return {
      taskId: t.task_id,
      taskName: `${t.task_type} (${t.task_id})${current ? ' · current' : ''}`,
      operation: t.task_type,
      predictedRange: range,
      actualMinutes: current ? r1(snap.taskElapsedSec / 60) : null,
      deltaMinutes: null,
      status: current ? 'in-progress' : 'queued',
      primaryFactor,
    };
  });

  return { activeTask, upcomingQueue, completedTasksHistory, taskBenchmarks };
}

// ------------------------------------------------------------------ anomalies

function buildAnomalies(log: AnomalyLogEntry[], modules: TrainingModule[]): AnomalyFlag[] {
  return log.map(({ anomaly, firstSeen, active }) => {
    const module = moduleForTrigger(modules, anomaly.anomaly_type);
    return {
      id: anomaly.anomaly_type,
      severity: anomaly.score >= 0.75 ? 'high' : anomaly.score >= 0.5 ? 'medium' : 'low',
      ruleOrModelId: (anomaly.method ?? 'backend model').toUpperCase(),
      title: humanize(anomaly.anomaly_type),
      timestamp: simTime(firstSeen),
      sourceType: 'Backend anomaly model',
      whyFlagged: anomaly.explanation[0] ?? `Anomaly score ${anomaly.score.toFixed(2)}`,
      evidence: anomaly.explanation,
      recommendedAction: module ? `Complete ${module.module_id}: ${module.title} (${module.duration_min} min ${module.format.replace('_', ' ')})` : 'Review with your supervisor.',
      score: anomaly.score,
      active,
    };
  });
}

// ------------------------------------------------------------------ training

const moduleQuestions = new Map<string, QuizQuestion[] | null>();
const moduleFetches = new Set<string>();

function questionsFor(moduleId: string): { questions: QuizQuestion[]; source: 'backend' | 'local' } {
  const fromBackend = moduleQuestions.get(moduleId);
  if (fromBackend && fromBackend.length) return { questions: fromBackend, source: 'backend' };
  if (!moduleFetches.has(moduleId)) {
    moduleFetches.add(moduleId);
    void api.getTrainingModule(moduleId).then((res) => {
      moduleQuestions.set(moduleId, res ? res.questions.map((q) => ({ question: q.question, options: q.options.map((text) => ({ text })) })) : null);
      if (res) scheduleSync();
    });
  }
  const bank = LESSON_BANK[moduleId];
  return { questions: bank ? [bank.question] : [], source: 'local' };
}

function buildLessons(a: Assessment | null, anomalies: AnomalyLogEntry[]): MicroLesson[] {
  const { training, digest } = useBackendStore.getState();
  const modules = training?.modules ?? [];
  const recs = [...(a?.training_recommendations ?? []), ...(training?.recommendations ?? []), ...(digest?.suggested_training ?? [])];
  const seen = new Set<string>();
  const ordered: { module_id: string; title: string; reason: string | null }[] = [];
  for (const r of recs) {
    if (seen.has(r.module_id)) continue;
    seen.add(r.module_id);
    ordered.push(r);
  }
  // Everything else in the backend catalogue stays browsable after the recommendations.
  for (const m of modules) if (!seen.has(m.module_id)) ordered.push({ module_id: m.module_id, title: m.title, reason: null });

  const prev = new Map(useOperatorStore.getState().lessons.map((l) => [l.id, l]));
  return ordered.map((r) => {
    const meta = modules.find((m) => m.module_id === r.module_id);
    const trigger = r.reason ? anomalies.find((an) => an.anomaly.anomaly_type === r.reason) : undefined;
    const { questions, source } = questionsFor(r.module_id);
    const old = prev.get(r.module_id);
    return {
      id: r.module_id,
      title: meta?.title ?? r.title,
      badge: r.reason ? `Recommended · ${humanize(r.reason)}` : 'Catalogue',
      format: meta?.format ?? 'micro_lesson',
      estimatedMinutes: meta?.duration_min ?? 0,
      anomalySummary: trigger?.anomaly.explanation.join(' · ') ?? (r.reason ? `Recommended by the backend because of: ${humanize(r.reason)}.` : 'Available in the training catalogue.'),
      recommendation: LESSON_BANK[r.module_id]?.recommendation ?? '',
      questions,
      questionSource: source,
      completed: old?.completed ?? false,
      passedScore: old?.passedScore,
      resultNote: old?.resultNote,
    };
  });
}

// ------------------------------------------------------------------ main sync

function sync() {
  const snap = sim.getSnapshot();
  const link = useLinkStore.getState();
  const backend = useBackendStore.getState();
  const store = useOperatorStore.getState();
  const a = link.assessment;
  const e = snap.exc;
  const modules = backend.training?.modules ?? [];
  const env = sim.environment;

  if (a?.task_prediction) predictionsByTask.set(a.task_prediction.task_id, a.task_prediction);
  if (snap.status === 'stopped' && snap.tick === 0) predictionsByTask.clear();

  const roles = new Map(snap.sensedObjects.map((o) => [o.id, o.role]));
  const proximityTargets: ProximityTarget[] = (a?.proximity_view ?? []).map((o) => ({
    id: o.object_id,
    name: `${o.object_id}${roles.get(o.object_id) ? ` · ${humanize(roles.get(o.object_id)!)}` : ''}`,
    type: o.object_type === 'person' ? 'worker' : o.object_type === 'vehicle' || o.object_type === 'machine' ? 'vehicle' : 'structure',
    distanceM: o.distance_m,
    zone: o.zone === 'red' || o.zone === 'amber' ? o.zone : 'green',
    angleDeg: o.bearing_deg,
    inBlindSpot: o.in_blind_spot,
    role: roles.get(o.object_id),
  }));

  const activeTypes = [...(a?.alerts ?? []).map((al: Alert) => al.alert_type), ...link.anomalyLog.filter((x) => x.active).map((x) => x.anomaly.anomaly_type)];
  const dangerRadiusM = a?.zones.danger_radius_m ?? DEFAULT_ZONES.dangerM;
  const lessons = buildLessons(a, link.anomalyLog);
  const profile = backend.profile ?? backend.digest?.profile ?? null;

  useOperatorStore.setState({
    simStatus: snap.status,
    simulationSpeed: snap.cfg.timeScale,
    simClock: snap.status === 'stopped' ? null : snap.timestamp,
    backendLinked: link.telStatus === 'open' && link.cabStatus === 'open',
    walkaroundCompleted: store.walkaroundCompleted || snap.status !== 'stopped',

    operatorSkill: profile ? `${profile.level} · skill ${profile.skill_score}` : OPERATOR.skillLevel,

    telemetry: {
      engineRpm: Math.round(e.rpm),
      groundSpeedKmh: r1(Math.abs(e.speedMs) * 3.6),
      fuelLevelPct: r1(e.fuelLevelPct),
      defLevelPct: Math.round(e.defLevelPct),
      hydraulicPressurePsi: Math.round(e.hydPressureBar * BAR_TO_PSI),
      pitchDeg: r1(e.pitchDeg),
      rollDeg: r1(e.rollDeg),
      cabTempC: r1(e.cabTempC),
      coolantTempC: Math.round(e.coolantC),
      closestObjectDistM: snap.closestObjectM,
      engineHours: r1(e.cumHours),
      headingDeg: Math.round(e.headingDeg) % 360,
      networkLatencyMs: backend.latencyMs,
    },

    weather: snap.weather,
    light: snap.light,
    groundCondition: env.ground_condition,
    visibilityM: env.visibility_m,
    maxSafeSlopeDeg: LIMITS.tiltWarningDeg,
    dangerRadiusM,
    cautionRadiusM: a?.zones.caution_radius_m ?? DEFAULT_ZONES.cautionM,
    zoneReason: a?.zones.reason ?? null,
    proximityMultiplier: dangerRadiusM / DEFAULT_ZONES.dangerM,
    sensingRangeM: snap.sensingRangeM,

    ...buildTasks(snap),

    safetyEvents: link.alertLog.map((entry) => toSafetyEvent(entry, a?.timestamp ?? snap.timestamp)),
    proximityTargets,

    lessons,
    activeLessonId: store.activeLessonId && lessons.some((l) => l.id === store.activeLessonId) ? store.activeLessonId : lessons[0]?.id ?? null,

    anomalyFlags: buildAnomalies(link.anomalyLog, modules),

    seatbeltFastened: e.seatbeltFastened,
    seatOccupied: e.seatOccupied,
    onBreak: e.onBreak,
    fatigueDetected: activeTypes.some((t) => /fatigue/.test(t)),
    tiltAngleExcessive: Math.abs(e.pitchDeg) > LIMITS.tiltWarningDeg || Math.abs(e.rollDeg) > LIMITS.tiltWarningDeg || activeTypes.some((t) => /tilt|slope/.test(t)),
    extendedIdleActive: activeTypes.some((t) => /idl/.test(t)),

    readiness: buildReadiness(a, snap, link.anomalyLog, modules),
  });
}

let pending: ReturnType<typeof setTimeout> | null = null;
function scheduleSync() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    sync();
  }, 120);
}

let started = false;

/** Wires the sim, cab socket and REST data into the dashboard store. Call once at app start. */
export function startDashboardSync() {
  if (started) return;
  started = true;
  sim.subscribe(scheduleSync);
  useBackendStore.subscribe(scheduleSync);
  useLinkStore.subscribe((state, prev) => {
    scheduleSync();
    // The backend opens incidents for serious alerts; refresh the list when one appears.
    const newSerious = state.alertLog.some((e) => SEVERITY_RANK[e.peakSeverity] >= SEVERITY_RANK.high && !prev.alertLog.some((p) => p.alert.alert_id === e.alert.alert_id && p.peakSeverity === e.peakSeverity));
    if (newSerious) setTimeout(() => { void api.refreshIncidents(); void api.refreshDigest(); }, 2000);
  });
  sync();
}
