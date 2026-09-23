import { link } from './link';
import {
  SCHEMA_VERSION,
  type EngineState,
  type EventSource,
  type EventType,
  type GroundCondition,
  type Light,
  type OutgoingMessage,
  type TravelDirection,
  type Weather,
  type WorkMode,
} from './protocol';
import {
  HAZARDS,
  MACHINE_HOME,
  SITE_H,
  SITE_W,
  TRUCK_BAY_SPOT,
  TRUCK_IN_PATH,
  TRUCK_OUT_PATH,
  ZONES,
  groundAt,
  pointInPolygon,
  type Vec2,
} from './site';

// The simulation only reports what the machine's sensors would see. It never decides whether
// something is dangerous — the backend does that and pushes assessments to the cab UI.
//
// Everything runs on a fixed 0.1 s sim-time step, so a given seed and the same director inputs
// replay identically. Message cadence follows spec section 4 (all in sim time).

export const MACHINE_ID = 'EXC001';
export const OPERATOR_ID = 'OP1001';
const STEP = 0.1;
const MAX_TRAVEL_MS = 1.5; // ≈ 5.4 km/h
const TURN_DPS = 20;
const TANK_L = 410;
const BUCKET_CAPACITY_KG = 1650;
const SOIL_KG_PER_M3 = 1800;
// Task volume is measured in bank (in-situ) m³; excavated soil swells ~30% in the bucket.
const SWELL_FACTOR = 1.3;
const TRIM_EVERY_CYCLES = 5;
const TRIM_SECONDS = 90;
const TRUCK_CAPACITY_KG = 9000;

// ---------------------------------------------------------------- helpers

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap180 = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
const norm360 = (deg: number) => ((deg % 360) + 360) % 360;
const approach = (current: number, target: number, maxDelta: number) =>
  current < target ? Math.min(target, current + maxDelta) : Math.max(target, current - maxDelta);
const moveAngle = (current: number, target: number, maxDelta: number) => {
  const diff = wrap180(target - current);
  return Math.abs(diff) <= maxDelta ? target : current + Math.sign(diff) * maxDelta;
};
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const compassBearing = (dx: number, dy: number) => norm360((Math.atan2(dx, dy) * 180) / Math.PI);
const lag = (current: number, target: number, tau: number, dt: number) => current + (target - current) * (1 - Math.exp(-dt / tau));

// ---------------------------------------------------------------- weather

interface EnvPreset {
  ambient: number;
  humidity: number;
  rain: number;
  wind: number;
  gust: number;
  visibility: number;
  dust: number;
  ground: GroundCondition;
  lightning: number | null;
}

export const WEATHER_PRESETS: Record<Weather, EnvPreset> = {
  Sunny: { ambient: 29, humidity: 42, rain: 0, wind: 9, gust: 16, visibility: 10000, dust: 2, ground: 'dry', lightning: null },
  Cloudy: { ambient: 24, humidity: 64, rain: 0, wind: 14, gust: 24, visibility: 8000, dust: 1, ground: 'dry', lightning: null },
  Rainy: { ambient: 21, humidity: 88, rain: 6.5, wind: 18, gust: 32, visibility: 400, dust: 0, ground: 'wet', lightning: null },
  Windy: { ambient: 23, humidity: 48, rain: 0, wind: 42, gust: 68, visibility: 5000, dust: 5, ground: 'dry', lightning: null },
  Storm: { ambient: 19, humidity: 96, rain: 24, wind: 55, gust: 88, visibility: 150, dust: 0, ground: 'muddy', lightning: 6 },
  Fog: { ambient: 13, humidity: 99, rain: 0, wind: 4, gust: 8, visibility: 60, dust: 0, ground: 'wet', lightning: null },
  'Extreme Heat': { ambient: 44, humidity: 16, rain: 0, wind: 8, gust: 15, visibility: 9000, dust: 4, ground: 'dry', lightning: null },
  Dust: { ambient: 33, humidity: 20, rain: 0, wind: 36, gust: 58, visibility: 250, dust: 9, ground: 'loose', lightning: null },
};

// ---------------------------------------------------------------- scenarios (spec section 9)

export interface ScenarioInfo {
  id: number;
  title: string;
  blurb: string;
}

export const SCENARIOS: ScenarioInfo[] = [
  { id: 1, title: 'Worker in blind spot', blurb: 'W03 walks behind the machine to < 5 m while it swings' },
  { id: 2, title: 'Seatbelt off while moving', blurb: 'Belt unfastened, machine shuttles. Fasten belt to end' },
  { id: 3, title: 'Left cab, engine running', blurb: 'Operator leaves the seat. Return operator to end' },
  { id: 4, title: 'Truck delayed, long idle', blurb: 'No truck for 25 sim min, machine waits, operator unbuckles' },
  { id: 5, title: 'Rain starts', blurb: 'Weather changes to Rainy, ground wet, visibility drops' },
  { id: 6, title: 'Lightning', blurb: 'Storm rolls in, lightning at 6 km' },
  { id: 7, title: 'Steep slope', blurb: 'Machine drives up the SL01 ramp, pitch passes 15°' },
  { id: 8, title: 'Unsafe operation', blurb: 'Fast swing > 55 °/s, then travel with bucket at 3.2 m' },
  { id: 9, title: 'Fuel theft', blurb: 'Engine off, fuel level drops 15% over 10 sim min' },
  { id: 10, title: 'Overheating', blurb: 'Coolant climbs past 105 °C, fault code raised' },
  { id: 11, title: 'Fatigue', blurb: 'Switches to 60× and keeps working with no break (4 sim h ≈ 4 real min)' },
  { id: 12, title: 'Near miss report', blurb: 'Operator files a manual near miss' },
];

interface ScenarioRun {
  id: number;
  startTick: number;
  stage: number;
  stageTick: number;
}

// ---------------------------------------------------------------- world entities

export type Phase = 'dig' | 'swing_loaded' | 'dump' | 'swing_empty' | 'wait' | 'grade';

export interface Excavator {
  x: number;
  y: number;
  height: number;
  headingDeg: number;
  speedMs: number;
  accelMs2: number;
  swingDeg: number;
  swingRateDps: number;
  bucketHeightM: number;
  payloadKg: number;
  pitchDeg: number;
  rollDeg: number;
  engineOn: boolean;
  rpm: number;
  loadPct: number;
  fuelRateLph: number;
  coolantC: number;
  hydOilC: number;
  cabTempC: number;
  fuelLevelPct: number;
  defLevelPct: number;
  batteryV: number;
  cumHours: number;
  cumIdleHours: number;
  cumFuelL: number;
  loadCycles: number;
  seatOccupied: boolean;
  seatbeltFastened: boolean;
  parkingBrake: boolean;
  hydraulicLockout: boolean;
  onBreak: boolean;
  refuelling: boolean;
  autopilot: boolean;
  workMode: WorkMode;
  phase: Phase;
  faultCodes: string[];
}

export interface Person {
  id: string;
  role: 'labourer' | 'spotter' | 'surveyor' | 'supervisor' | 'visitor' | 'public';
  x: number;
  y: number;
  headingDeg: number;
  speedMs: number;
  home: Vec2;
  wander: number;
  target: Vec2 | null;
  pauseUntil: number;
  scripted: boolean;
}

export interface HaulTruck {
  id: string;
  state: 'away' | 'arriving' | 'loading' | 'departing';
  x: number;
  y: number;
  headingDeg: number;
  speedMs: number;
  path: Vec2[];
  pathIndex: number;
  loadKg: number;
  returnAt: number;
  visible: boolean;
}

export interface SimConfig {
  timeScale: number;
  seed: number;
  scenarioId: string;
  shiftStartIso: string;
}

interface TaskDef {
  task_id: string;
  task_type: string;
  zone_id: string;
  planned_estimate_min: number;
  target_volume_m3: number;
  scheduled_offset_s: number;
}

const TASKS: TaskDef[] = [
  { task_id: 'T002', task_type: 'Trenching', zone_id: 'ZONE_B', planned_estimate_min: 45, target_volume_m3: 36.9, scheduled_offset_s: 0 },
  { task_id: 'T003', task_type: 'Material Loading', zone_id: 'LOAD_BAY', planned_estimate_min: 30, target_volume_m3: 24, scheduled_offset_s: 3600 },
];

export type SimStatus = 'stopped' | 'waiting' | 'running';

export interface SimSnapshot {
  status: SimStatus;
  tick: number;
  timestamp: string;
  cfg: SimConfig;
  exc: Excavator;
  engineState: EngineState;
  weather: Weather;
  light: Light;
  lightningKm: number | null;
  scenario: { id: number; title: string; stage: number } | null;
  taskId: string | null;
  taskProgressPct: number;
  volumeMovedM3: number;
  truckState: HaulTruck['state'];
  sensed: number;
  recentEvents: { tick: number; type: EventType }[];
}

// ---------------------------------------------------------------- engine

function todayShiftStart() {
  const now = new Date();
  return `${now.toISOString().slice(0, 10)}T07:30:00Z`;
}

function freshExcavator(): Excavator {
  return {
    x: MACHINE_HOME.x,
    y: MACHINE_HOME.y,
    height: 0,
    headingDeg: MACHINE_HOME.headingDeg,
    speedMs: 0,
    accelMs2: 0,
    swingDeg: 0,
    swingRateDps: 0,
    bucketHeightM: 0.4,
    payloadKg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    engineOn: false,
    rpm: 0,
    loadPct: 0,
    fuelRateLph: 0,
    coolantC: 26,
    hydOilC: 26,
    cabTempC: 27,
    fuelLevelPct: 72,
    defLevelPct: 71,
    batteryV: 25.4,
    cumHours: 1524.3,
    cumIdleHours: 312.7,
    cumFuelL: 98234.5,
    loadCycles: 48213,
    seatOccupied: true,
    seatbeltFastened: true,
    parkingBrake: false,
    hydraulicLockout: false,
    onBreak: false,
    refuelling: false,
    autopilot: true,
    workMode: 'idle',
    phase: 'swing_empty',
    faultCodes: [],
  };
}

function freshPeople(): Person[] {
  const person = (id: string, role: Person['role'], home: Vec2, wander: number): Person => ({
    id, role, x: home[0], y: home[1], headingDeg: 0, speedMs: 0, home, wander, target: null, pauseUntil: 0, scripted: false,
  });
  return [
    person('W03', 'labourer', [206, 60], 4),
    person('SP01', 'spotter', [254, 97], 2),
    person('SV01', 'surveyor', [188, 96], 5),
  ];
}

function freshTruck(): HaulTruck {
  return {
    id: 'TRK02', state: 'loading', x: TRUCK_BAY_SPOT[0], y: TRUCK_BAY_SPOT[1], headingDeg: 0, speedMs: 0,
    path: [], pathIndex: 0, loadKg: 0, returnAt: 0, visible: true,
  };
}

type Listener = () => void;

export class SimEngine {
  cfg: SimConfig = { timeScale: 10, seed: 42, scenarioId: 'demo_live', shiftStartIso: todayShiftStart() };
  status: SimStatus = 'stopped';

  tick = 0;
  simTime = 0;
  exc: Excavator = freshExcavator();
  people: Person[] = freshPeople();
  truck: HaulTruck = freshTruck();
  weather: Weather = 'Sunny';
  light: Light = 'day';
  lightningKm: number | null = null;

  /** Manual keyboard input, -1..1 each. Only used when autopilot is off. */
  input = { travel: 0, turn: 0, swing: 0, boom: 0, hardBrake: false };

  private rng = mulberry32(42);
  private accumulator = 0;
  private lastFrame = 0;
  private bgTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();
  private lastNotify = 0;
  private snapshot: SimSnapshot | null = null;

  private scenario: ScenarioRun | null = null;
  private eventSeq = 0;
  private sessionTag = '';
  private recentEvents: { tick: number; type: EventType }[] = [];

  private lastOperationTick = -Infinity;
  private lastStatusTick = -Infinity;
  private lastEnvironmentTick = -Infinity;
  private motionSamples: number[][] = [];
  private motionStartTick = 0;
  private proximityActive = false;
  private prevDistances = new Map<string, number>();
  private sensedCount = 0;
  private personNear = false;
  private idleSinceTick: number | null = null;
  private zonesInside = new Set<string>();
  private tiltArmed = true;
  private collisionCooldown = new Map<string, number>();
  private harshArmed = true;

  private cycleTargetPayload = BUCKET_CAPACITY_KG;
  private cycleDumpTo: 'truck' | 'spoil' = 'spoil';
  private cycleSwingMax = 26;
  private fastSwingCycles = 0;
  private truckDelayed = false;
  private waitStartTick: number | null = null;
  private coolantOverride: number | null = null;
  private fuelTheftUntil: number | null = null;
  private refuelLitres = 0;
  private restartAfterRefuel = false;
  private cyclesSinceTrim = 0;
  private trimPending = false;
  private trimTime = 0;

  private taskIndex = -1;
  private taskActive = false;
  private volumeMovedM3 = 0;
  private nextTaskAt: number | null = null;

  private drive: { waypoints: Vec2[]; headingDeg: number | null; then?: () => void } | null = null;
  private shuttle: { program: { travel: number; dur: number }[]; index: number; t: number; bucket: number } | null = null;

  // -------------------------------------------------------------- lifecycle

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = (): SimSnapshot => {
    if (!this.snapshot) this.snapshot = this.buildSnapshot();
    return this.snapshot;
  };

  configure(partial: Partial<SimConfig>) {
    const scaleChanged = partial.timeScale !== undefined && partial.timeScale !== this.cfg.timeScale;
    this.cfg = { ...this.cfg, ...partial };
    // time_scale lives in shift_context; a change means resending it (spec: "resend if something changes").
    if (scaleChanged && this.status === 'running') link.send(this.buildShiftContext());
    this.notify(true);
  }

  /** Resets the world and starts a fresh session once the telemetry socket is open. */
  start() {
    link.stopReplay();
    this.resetWorld();
    this.status = 'waiting';
    link.onTelemetryOpen = () => { if (this.status === 'waiting') this.begin(); };
    link.onTelemetryReopen = () => (this.status === 'running' ? this.buildShiftContext() : null);
    link.connect();
    if (link.isTelemetryOpen) this.begin();
    this.ensureBackgroundTimer();
    this.notify(true);
  }

  stop() {
    this.status = 'stopped';
    this.notify(true);
  }

  /** Advance from the render loop (smooth). A background timer covers hidden tabs / other pages. */
  frame() {
    const now = performance.now();
    if (this.lastFrame === 0) this.lastFrame = now;
    const realDt = Math.min(2, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.advance(realDt);
  }

  private ensureBackgroundTimer() {
    if (this.bgTimer) return;
    this.lastFrame = performance.now();
    this.bgTimer = setInterval(() => {
      if (performance.now() - this.lastFrame > 150) this.frame();
    }, 100);
  }

  private resetWorld() {
    this.rng = mulberry32(this.cfg.seed);
    this.tick = 0;
    this.simTime = 0;
    this.accumulator = 0;
    this.exc = freshExcavator();
    this.people = freshPeople();
    this.truck = freshTruck();
    this.weather = 'Sunny';
    this.lightningKm = null;
    this.scenario = null;
    this.eventSeq = 0;
    this.sessionTag = (Date.now() % 1679616).toString(36).toUpperCase().padStart(4, '0');
    this.recentEvents = [];
    this.lastOperationTick = -Infinity;
    this.lastStatusTick = -Infinity;
    this.lastEnvironmentTick = -Infinity;
    this.motionSamples = [];
    this.proximityActive = false;
    this.prevDistances.clear();
    this.sensedCount = 0;
    this.personNear = false;
    this.idleSinceTick = null;
    this.zonesInside.clear();
    this.tiltArmed = true;
    this.collisionCooldown.clear();
    this.harshArmed = true;
    this.fastSwingCycles = 0;
    this.cyclesSinceTrim = 0;
    this.trimPending = false;
    this.trimTime = 0;
    this.truckDelayed = false;
    this.waitStartTick = null;
    this.coolantOverride = null;
    this.fuelTheftUntil = null;
    this.taskIndex = -1;
    this.taskActive = false;
    this.volumeMovedM3 = 0;
    this.nextTaskAt = null;
    this.drive = null;
    this.shuttle = null;
    this.input = { travel: 0, turn: 0, swing: 0, boom: 0, hardBrake: false };
  }

  private begin() {
    this.status = 'running';
    link.startRecording();
    link.send(this.buildShiftContext());
    this.sendEnvironment();
    this.emit('walkaround_completed', { issues: [] }, 'operator');
    this.checkGeofence();
    this.notify(true);
  }

  // -------------------------------------------------------------- time

  private advance(realDt: number) {
    if (this.status !== 'running' || link.isReplaying) return;
    this.accumulator += realDt * this.cfg.timeScale;
    // Guard against a huge catch-up after the tab was frozen.
    this.accumulator = Math.min(this.accumulator, 120);
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      this.step(STEP);
      this.simTime = Math.round((this.simTime + STEP) * 10) / 10;
      if (this.simTime >= this.tick + 1) {
        this.tick += 1;
        this.perSecond();
      }
    }
    this.notify(false);
  }

  timestampOf(tick: number) {
    const ms = Date.parse(this.cfg.shiftStartIso) + tick * 1000;
    return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  private envelope(msgType: string): OutgoingMessage {
    return { msg_type: msgType, schema_version: SCHEMA_VERSION, timestamp: this.timestampOf(this.tick), sim_tick: this.tick, machine_id: MACHINE_ID };
  }

  // -------------------------------------------------------------- physics step (fixed 0.1 s)

  private get canOperate() {
    const e = this.exc;
    return e.engineOn && e.seatOccupied && !e.onBreak && !e.hydraulicLockout && !e.refuelling;
  }

  private step(dt: number) {
    const e = this.exc;
    const prevSwing = e.swingDeg;
    let travelCmd = 0;
    let turnCmd = 0;
    let hardBrake = false;

    if (this.canOperate) {
      if (this.drive) {
        [travelCmd, turnCmd] = this.driveStep(dt);
      } else if (this.shuttle) {
        travelCmd = this.shuttleStep(dt);
      } else if (e.autopilot && this.taskActive) {
        this.autopilotStep(dt);
      } else if (!e.autopilot) {
        travelCmd = this.input.travel;
        turnCmd = this.input.turn;
        hardBrake = this.input.hardBrake;
        e.swingDeg = wrap180(e.swingDeg + this.input.swing * 24 * dt);
        e.bucketHeightM = Math.max(-2, Math.min(5.5, e.bucketHeightM + this.input.boom * 1.1 * dt));
      }
    }

    // Travel
    const targetSpeed = e.parkingBrake || !this.canOperate ? 0 : travelCmd * MAX_TRAVEL_MS;
    const prevSpeed = e.speedMs;
    const rate = hardBrake ? 3.2 : Math.abs(targetSpeed) > Math.abs(prevSpeed) ? 0.7 : 1.4;
    e.speedMs = approach(prevSpeed, targetSpeed, rate * dt);
    e.accelMs2 = (e.speedMs - prevSpeed) / dt;
    const braking = Math.sign(e.accelMs2) === -Math.sign(prevSpeed) && Math.abs(prevSpeed) > 0.05;
    if (braking && Math.abs(e.accelMs2) > 2.5 && this.harshArmed) {
      this.harshArmed = false;
      this.emit('harsh_brake', { accel_ms2: r1(-Math.abs(e.accelMs2)) });
    }
    if (Math.abs(e.speedMs) < 0.01) this.harshArmed = true;
    if (this.canOperate) e.headingDeg = norm360(e.headingDeg + turnCmd * TURN_DPS * dt);
    const h = (e.headingDeg * Math.PI) / 180;
    e.x = Math.max(4, Math.min(SITE_W - 4, e.x + Math.sin(h) * e.speedMs * dt));
    e.y = Math.max(4, Math.min(SITE_H - 4, e.y + Math.cos(h) * e.speedMs * dt));
    e.swingRateDps = wrap180(e.swingDeg - prevSwing) / dt;

    // Terrain: the SL01 ramp rises to the west (uphill = heading 270).
    const ground = groundAt(e.x, e.y);
    e.height = ground.height;
    const rel = ((e.headingDeg - 270) * Math.PI) / 180;
    const vib = e.workMode === 'dig' ? 1.6 : e.engineOn ? 0.4 : 0;
    e.pitchDeg = ground.gradeDeg * Math.cos(rel) + vib + (this.rng() - 0.5) * 0.3 * (e.engineOn ? 1 : 0);
    e.rollDeg = ground.gradeDeg * Math.sin(rel) + (this.rng() - 0.5) * 0.3 * (e.engineOn ? 1 : 0);
    const tilt = Math.max(Math.abs(e.pitchDeg), Math.abs(e.rollDeg));
    if (tilt > 15 && this.tiltArmed) {
      this.tiltArmed = false;
      this.emit('tilt_warning', { pitch_deg: r1(e.pitchDeg), roll_deg: r1(e.rollDeg) });
    } else if (tilt < 12) {
      this.tiltArmed = true;
    }

    // Work mode
    if (e.onBreak) e.workMode = 'break';
    else if (!e.engineOn) e.workMode = 'idle';
    else if (Math.abs(e.speedMs) > 0.05) e.workMode = 'travel';
    else if (this.canOperate && e.autopilot && this.taskActive && !this.drive && !this.shuttle && e.phase !== 'wait') e.workMode = e.phase;
    else if (Math.abs(e.swingRateDps) > 2) e.workMode = e.payloadKg > 100 ? 'swing_loaded' : 'swing_empty';
    else e.workMode = 'idle';

    this.engineStep(dt);
    this.peopleStep(dt);
    this.truckStep(dt);
    this.collisionCheck();
  }

  private engineStep(dt: number) {
    const e = this.exc;
    const env = WEATHER_PRESETS[this.weather];
    const working = e.engineOn && e.workMode !== 'idle' && e.workMode !== 'break';
    const loadTargets: Record<WorkMode, number> = { idle: 10, break: 8, dig: 78, swing_loaded: 62, dump: 44, swing_empty: 40, travel: 55, grade: 50 };
    const loadTarget = e.engineOn ? loadTargets[e.workMode] + (this.rng() - 0.5) * 6 : 0;
    e.loadPct = lag(e.loadPct, loadTarget, 1.2, dt);
    const rpmTarget = !e.engineOn ? 0 : working ? 1650 + (this.rng() - 0.5) * 80 : 900 + (this.rng() - 0.5) * 40;
    e.rpm = lag(e.rpm, rpmTarget, 1.0, dt);
    e.fuelRateLph = e.engineOn ? 2 + e.loadPct * 0.2 : 0;

    const coolantTarget = this.coolantOverride ?? (!e.engineOn ? env.ambient : working ? 84 + e.loadPct * 0.06 : 80);
    e.coolantC = lag(e.coolantC, coolantTarget, this.coolantOverride ? 90 : 150, dt);
    const oilTarget = !e.engineOn ? env.ambient : working ? 52 + e.loadPct * 0.2 : 48;
    e.hydOilC = lag(e.hydOilC, oilTarget, 300, dt);
    const acTarget = env.ambient > 35 ? 24 + (env.ambient - 35) * 0.6 : Math.min(env.ambient, 24);
    e.cabTempC = lag(e.cabTempC, e.engineOn ? acTarget : env.ambient, 240, dt);
    e.batteryV = e.engineOn ? 27.6 : 25.2;

    if (e.coolantC > 105 && !e.faultCodes.includes('COOLANT_HIGH_TEMP')) {
      e.faultCodes = [...e.faultCodes, 'COOLANT_HIGH_TEMP'];
      this.emit('fault_code', { code: 'COOLANT_HIGH_TEMP' });
    } else if (e.coolantC < 95 && e.faultCodes.includes('COOLANT_HIGH_TEMP')) {
      e.faultCodes = e.faultCodes.filter((code) => code !== 'COOLANT_HIGH_TEMP');
    }

    const hours = dt / 3600;
    const litres = e.fuelRateLph * hours;
    e.cumFuelL += litres;
    e.fuelLevelPct -= (litres / TANK_L) * 100;
    e.defLevelPct -= litres * 0.0005;
    if (this.fuelTheftUntil !== null && this.simTime < this.fuelTheftUntil) e.fuelLevelPct -= (1.5 / 60) * dt;
    if (e.refuelling) {
      const add = Math.min((100 - e.fuelLevelPct) / 100 * TANK_L, 1.2 * dt);
      e.fuelLevelPct += (add / TANK_L) * 100;
      this.refuelLitres += add;
      if (e.fuelLevelPct >= 99.5) this.finishRefuel();
    }
    e.fuelLevelPct = Math.max(0, Math.min(100, e.fuelLevelPct));
    if (e.engineOn) {
      e.cumHours += hours;
      if (!working) e.cumIdleHours += hours;
    }
  }

  // -------------------------------------------------------------- autopilot dig cycle

  private autopilotStep(dt: number) {
    const e = this.exc;
    const truckReady = this.truck.state === 'loading';
    switch (e.phase) {
      case 'dig': {
        e.swingDeg = moveAngle(e.swingDeg, 0, this.cycleSwingMax * dt);
        e.bucketHeightM = approach(e.bucketHeightM, -1.7, 1.3 * dt);
        if (e.bucketHeightM < -1) e.payloadKg = Math.min(this.cycleTargetPayload, e.payloadKg + (this.cycleTargetPayload / 8) * dt);
        if (e.payloadKg >= this.cycleTargetPayload) {
          this.cycleDumpTo = truckReady ? 'truck' : 'spoil';
          e.phase = 'swing_loaded';
        }
        break;
      }
      case 'swing_loaded': {
        const target = this.cycleDumpTo === 'truck' ? 90 : -92;
        e.swingDeg = moveAngle(e.swingDeg, target, this.cycleSwingMax * dt);
        e.bucketHeightM = approach(e.bucketHeightM, this.cycleDumpTo === 'truck' ? 2.4 : 1.6, 1.2 * dt);
        if (Math.abs(wrap180(e.swingDeg - target)) < 0.5) e.phase = 'dump';
        break;
      }
      case 'dump': {
        const dumped = Math.min(e.payloadKg, (this.cycleTargetPayload / 2.2) * dt);
        e.payloadKg -= dumped;
        if (this.cycleDumpTo === 'truck' && this.truck.state === 'loading') this.truck.loadKg += dumped;
        this.volumeMovedM3 += dumped / (SOIL_KG_PER_M3 * SWELL_FACTOR);
        if (e.payloadKg <= 0.5) {
          e.payloadKg = 0;
          e.loadCycles += 1;
          this.onCycleComplete();
          e.phase = 'swing_empty';
        }
        break;
      }
      case 'swing_empty': {
        e.swingDeg = moveAngle(e.swingDeg, 0, this.cycleSwingMax * dt);
        e.bucketHeightM = approach(e.bucketHeightM, 0.4, 1.3 * dt);
        if (Math.abs(wrap180(e.swingDeg)) < 0.5) {
          if (this.truckDelayed && !truckReady) {
            e.phase = 'wait';
            this.waitStartTick = this.tick;
          } else if (this.trimPending) {
            // Periodically trim/grade the trench floor between bucket passes.
            this.trimPending = false;
            this.trimTime = 0;
            e.phase = 'grade';
          } else {
            this.beginDig();
          }
        }
        break;
      }
      case 'grade': {
        this.trimTime += dt;
        e.swingDeg = moveAngle(e.swingDeg, Math.sin(this.trimTime * 0.25) * 8, 10 * dt);
        e.bucketHeightM = approach(e.bucketHeightM, -1.4 + Math.sin(this.trimTime * 0.6) * 0.25, 0.8 * dt);
        if (this.trimTime >= TRIM_SECONDS) this.beginDig();
        break;
      }
      case 'wait': {
        if (truckReady) {
          this.waitStartTick = null;
          this.beginDig();
        }
        break;
      }
    }
  }

  private beginDig() {
    this.exc.phase = 'dig';
    this.cycleTargetPayload = BUCKET_CAPACITY_KG * (0.82 + this.rng() * 0.18);
    this.cycleSwingMax = this.fastSwingCycles > 0 ? 68 : 18 + this.rng() * 5;
  }

  private onCycleComplete() {
    this.cyclesSinceTrim += 1;
    if (this.cyclesSinceTrim >= TRIM_EVERY_CYCLES) {
      this.cyclesSinceTrim = 0;
      this.trimPending = true;
    }
    if (this.fastSwingCycles > 0) {
      this.fastSwingCycles -= 1;
      if (this.fastSwingCycles === 0 && this.scenario?.id === 8) {
        // Second half of scenario 8: travel with the bucket held high.
        this.shuttle = { program: [{ travel: -1, dur: 8 }, { travel: 1, dur: 8 }], index: 0, t: 0, bucket: 3.2 };
        this.setStage(2);
      }
    }
    const task = TASKS[this.taskIndex];
    if (this.taskActive && task && this.volumeMovedM3 >= task.target_volume_m3) {
      this.taskActive = false;
      this.emit('task_complete', { task_id: task.task_id, volume_moved_m3: r1(this.volumeMovedM3) });
      if (this.taskIndex + 1 < TASKS.length) this.nextTaskAt = this.tick + 60;
    }
  }

  // -------------------------------------------------------------- scripted movement

  private driveStep(dt: number): [number, number] {
    const e = this.exc;
    const d = this.drive!;
    e.swingDeg = moveAngle(e.swingDeg, 0, 24 * dt);
    e.bucketHeightM = approach(e.bucketHeightM, 0.8, 1.2 * dt);
    const wp = d.waypoints[0];
    if (wp) {
      const dx = wp[0] - e.x;
      const dy = wp[1] - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.8) {
        d.waypoints.shift();
        return [0, 0];
      }
      const err = wrap180(compassBearing(dx, dy) - e.headingDeg);
      if (Math.abs(err) > 8) return [0, Math.sign(err)];
      return [Math.min(1, dist / 4 + 0.2), Math.max(-1, Math.min(1, err / 10))];
    }
    if (d.headingDeg !== null) {
      const err = wrap180(d.headingDeg - e.headingDeg);
      if (Math.abs(err) > 1.5) return [0, Math.sign(err) * Math.min(1, Math.abs(err) / 10 + 0.3)];
    }
    if (Math.abs(e.speedMs) < 0.02) {
      this.drive = null;
      d.then?.();
    }
    return [0, 0];
  }

  private shuttleStep(dt: number) {
    const e = this.exc;
    const s = this.shuttle!;
    e.swingDeg = moveAngle(e.swingDeg, 0, 24 * dt);
    e.bucketHeightM = approach(e.bucketHeightM, s.bucket, 1.2 * dt);
    s.t += dt;
    if (s.t >= s.program[s.index].dur) {
      s.t = 0;
      s.index = (s.index + 1) % s.program.length;
    }
    return s.program[s.index].travel;
  }

  private returnHome(then?: () => void) {
    this.shuttle = null;
    const e = this.exc;
    if (Math.hypot(e.x - MACHINE_HOME.x, e.y - MACHINE_HOME.y) < 0.8 && Math.abs(wrap180(e.headingDeg - MACHINE_HOME.headingDeg)) < 2) {
      then?.();
      return;
    }
    this.drive = { waypoints: [[MACHINE_HOME.x, MACHINE_HOME.y]], headingDeg: MACHINE_HOME.headingDeg, then };
  }

  // -------------------------------------------------------------- NPCs

  private peopleStep(dt: number) {
    const e = this.exc;
    for (const p of this.people) {
      if (p.scripted && p.id === 'W03' && this.scenario?.id === 1 && this.scenario.stage < 2) {
        // Scenario 1: stay ~4 m directly behind the upper structure (counterweight side).
        const facing = ((e.headingDeg + e.swingDeg) * Math.PI) / 180;
        const standOff = this.scenario.stage === 0 ? 3.6 : 4.0;
        p.target = [e.x - Math.sin(facing) * standOff, e.y - Math.cos(facing) * standOff];
        const dist = Math.hypot(p.x - e.x, p.y - e.y);
        p.speedMs = dist < 7 ? 2.6 : 0.9;
      }
      if (!p.target) {
        if (this.simTime >= p.pauseUntil) {
          const angle = this.rng() * Math.PI * 2;
          const radius = this.rng() * p.wander;
          p.target = [p.home[0] + Math.cos(angle) * radius, p.home[1] + Math.sin(angle) * radius];
          p.speedMs = 0.7 + this.rng() * 0.5;
        }
        continue;
      }
      const dx = p.target[0] - p.x;
      const dy = p.target[1] - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.15) {
        if (!p.scripted) {
          p.target = null;
          p.pauseUntil = this.simTime + 3 + this.rng() * 8;
        }
        continue;
      }
      const stepLen = Math.min(dist, p.speedMs * dt);
      p.x += (dx / dist) * stepLen;
      p.y += (dy / dist) * stepLen;
      p.headingDeg = compassBearing(dx, dy);
    }
  }

  private truckStep(dt: number) {
    const t = this.truck;
    if (t.state === 'away') {
      if (this.simTime >= t.returnAt) {
        t.state = 'arriving';
        t.path = TRUCK_IN_PATH.map((p) => [...p] as Vec2);
        t.pathIndex = 1;
        [t.x, t.y] = t.path[0];
        t.visible = true;
        t.loadKg = 0;
        if (this.truckDelayed) {
          this.truckDelayed = false;
          if (this.scenario?.id === 4) this.finishScenario4();
        }
      }
      return;
    }
    if (t.state === 'loading') {
      t.speedMs = 0;
      if (t.loadKg >= TRUCK_CAPACITY_KG && this.exc.phase !== 'dump') {
        t.state = 'departing';
        t.path = TRUCK_OUT_PATH.map((p) => [...p] as Vec2);
        t.pathIndex = 1;
      }
      return;
    }
    const wp = t.path[t.pathIndex];
    const dx = wp[0] - t.x;
    const dy = wp[1] - t.y;
    const dist = Math.hypot(dx, dy);
    const last = t.pathIndex === t.path.length - 1;
    const cruise = last && t.state === 'arriving' ? Math.max(1.2, Math.min(5, dist / 3)) : 5;
    t.speedMs = approach(t.speedMs, cruise, 1.5 * dt);
    const stepLen = Math.min(dist, t.speedMs * dt);
    if (dist > 0.01) {
      t.x += (dx / dist) * stepLen;
      t.y += (dy / dist) * stepLen;
      t.headingDeg = moveAngle(t.headingDeg, compassBearing(dx, dy), 60 * dt);
    }
    if (dist - stepLen < 0.2) {
      if (!last) {
        t.pathIndex += 1;
      } else if (t.state === 'arriving') {
        t.state = 'loading';
        t.headingDeg = 0;
        t.speedMs = 0;
      } else {
        t.state = 'away';
        t.visible = false;
        t.x = -100;
        t.y = -100;
        t.returnAt = this.simTime + (this.truckDelayed ? 1500 : 240 + this.rng() * 180);
      }
    }
  }

  private collisionCheck() {
    const e = this.exc;
    const objects: { id: string; x: number; y: number; r: number }[] = this.people.map((p) => ({ id: p.id, x: p.x, y: p.y, r: 2.6 }));
    if (this.truck.visible) objects.push({ id: this.truck.id, x: this.truck.x, y: this.truck.y, r: 5 });
    for (const o of objects) {
      if (Math.hypot(o.x - e.x, o.y - e.y) < o.r && (this.collisionCooldown.get(o.id) ?? -Infinity) < this.simTime) {
        this.collisionCooldown.set(o.id, this.simTime + 30);
        this.emit('collision', { object_id: o.id });
      }
    }
  }

  // -------------------------------------------------------------- once per sim second

  private perSecond() {
    const e = this.exc;
    if (this.tick === 1) this.setEngine(true, 'sensor');
    if (this.tick === 2 && this.taskIndex < 0) this.startNextTask();
    if (this.nextTaskAt !== null && this.tick >= this.nextTaskAt) {
      this.nextTaskAt = null;
      this.startNextTask();
    }

    // Idle tracking (engine on, not working) drives the 30 s operation cadence.
    const engineState = this.engineState;
    if (engineState === 'idle') this.idleSinceTick ??= this.tick;
    else this.idleSinceTick = null;

    this.scenarioTick();
    this.checkGeofence();
    this.sendProximity();

    if (e.engineOn) {
      if (this.motionSamples.length >= 10) {
        link.send({
          ...this.envelope('motion_batch'),
          start_timestamp: this.timestampOf(this.motionStartTick),
          sample_interval_s: 1,
          fields: ['pitch_deg', 'roll_deg', 'longitudinal_accel_ms2', 'swing_angle_deg', 'swing_rate_dps', 'bucket_height_m', 'bucket_payload_kg'],
          samples: this.motionSamples,
        });
        this.motionSamples = [];
      }
      if (this.motionSamples.length === 0) this.motionStartTick = this.tick;
      this.motionSamples.push([
        r1(e.pitchDeg), r1(e.rollDeg), r2(e.accelMs2), Math.round(wrap180(e.swingDeg)), Math.round(e.swingRateDps), r1(e.bucketHeightM), Math.round(e.payloadKg),
      ]);

      const idleLong = this.idleSinceTick !== null && this.tick - this.idleSinceTick > 120;
      const interval = this.personNear ? 2 : idleLong ? 30 : 10;
      if (this.tick - this.lastOperationTick >= interval) this.sendOperation();
    } else {
      this.motionSamples = [];
    }

    if (this.tick - this.lastStatusTick >= (e.engineOn ? 60 : 300)) this.sendStatus();
    if (this.tick - this.lastEnvironmentTick >= 900) this.sendEnvironment();
  }

  get engineState(): EngineState {
    const e = this.exc;
    if (!e.engineOn) return 'off';
    return e.workMode === 'idle' || e.workMode === 'break' ? 'idle' : 'running';
  }

  private sendOperation() {
    const e = this.exc;
    this.lastOperationTick = this.tick;
    const speedKmh = Math.abs(e.speedMs) * 3.6;
    const direction: TravelDirection = speedKmh < 0.1 ? 'stationary' : e.speedMs > 0 ? 'forward' : 'reverse';
    const pressureByMode: Record<WorkMode, number> = { idle: 35, break: 30, dig: 310, swing_loaded: 240, dump: 180, swing_empty: 150, travel: 210, grade: 200 };
    link.send({
      ...this.envelope('operation'),
      operator_id: OPERATOR_ID,
      task_id: this.taskActive ? TASKS[this.taskIndex].task_id : null,
      engine: { state: this.engineState, rpm: Math.round(e.rpm), load_pct: Math.round(e.loadPct), fuel_rate_lph: r1(e.fuelRateLph) },
      motion: {
        position: { x_m: r1(e.x), y_m: r1(e.y) },
        heading_deg: Math.round(norm360(e.headingDeg)) % 360,
        ground_speed_kmh: r1(speedKmh),
        travel_direction: direction,
        parking_brake: e.parkingBrake,
        hydraulic_lockout: e.hydraulicLockout,
        travel_alarm_active: direction !== 'stationary',
      },
      implement: { work_mode: e.workMode, hydraulic_pressure_bar: Math.round(pressureByMode[e.workMode] + (this.rng() - 0.5) * 20) },
      cab: { seat_occupied: e.seatOccupied, seatbelt_fastened: e.seatbeltFastened, door_open: null, controls_active: this.canOperate && e.workMode !== 'idle' },
    });
  }

  private sendStatus() {
    const e = this.exc;
    this.lastStatusTick = this.tick;
    const task = TASKS[this.taskIndex];
    link.send({
      ...this.envelope('status'),
      engine: {
        coolant_temp_c: Math.round(e.coolantC),
        fuel_level_pct: r1(e.fuelLevelPct),
        cumulative_hours: r1(e.cumHours),
        cumulative_idle_hours: r1(e.cumIdleHours),
        cumulative_fuel_used_l: r1(e.cumFuelL),
        def_level_pct: Math.round(e.defLevelPct),
        battery_voltage_v: r1(e.batteryV),
      },
      implement: { hydraulic_oil_temp_c: Math.round(e.hydOilC), cumulative_load_cycles: e.loadCycles },
      cab: { cab_temp_c: Math.round(e.cabTempC) },
      task: task
        ? { task_id: task.task_id, progress_pct: r1(Math.min(100, (this.volumeMovedM3 / task.target_volume_m3) * 100)), volume_moved_m3: r1(this.volumeMovedM3) }
        : { task_id: null, progress_pct: null, volume_moved_m3: null },
      diagnostics: { active_fault_codes: [...e.faultCodes] },
    });
  }

  private sendEnvironment() {
    this.lastEnvironmentTick = this.tick;
    const env = WEATHER_PRESETS[this.weather];
    const lightCap = this.light === 'night' ? 250 : this.light === 'dusk' ? 2000 : Infinity;
    link.send({
      ...this.envelope('environment'),
      environment: {
        weather: this.weather,
        ambient_temp_c: env.ambient,
        humidity_pct: env.humidity,
        rain_mm_h: env.rain,
        wind_speed_kmh: env.wind,
        wind_gust_kmh: env.gust,
        visibility_m: Math.min(env.visibility, lightCap),
        light: this.light,
        dust_index: env.dust,
        ground_condition: env.ground,
        lightning_distance_km: this.lightningKm,
      },
    });
  }

  private get sensingRange() {
    return this.weather === 'Storm' || this.weather === 'Fog' || this.light === 'night' ? 35 : 20;
  }

  private confidence(sensor: 'radar' | 'camera', dist: number) {
    let c = sensor === 'radar' ? 0.92 : 0.96;
    const w = this.weather;
    if (w === 'Rainy') c -= sensor === 'camera' ? 0.12 : 0.05;
    if (w === 'Storm') c -= sensor === 'camera' ? 0.25 : 0.1;
    if (w === 'Fog') c -= sensor === 'camera' ? 0.4 : 0.05;
    if (w === 'Dust') c -= sensor === 'camera' ? 0.3 : 0.06;
    if (this.light === 'night' && sensor === 'camera') c -= 0.2;
    c -= (dist / this.sensingRange) * 0.08;
    return r2(Math.max(0.3, Math.min(0.99, c)));
  }

  private sendProximity() {
    const e = this.exc;
    const range = this.sensingRange;
    const facing = e.headingDeg + e.swingDeg;
    const objects: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    let personNear = false;
    const consider = (id: string, type: 'person' | 'vehicle', role: string, x: number, y: number) => {
      const dx = x - e.x;
      const dy = y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) return;
      seen.add(id);
      if (type === 'person' && dist <= 20) personNear = true;
      const prev = this.prevDistances.get(id);
      this.prevDistances.set(id, dist);
      const sensor = type === 'person' ? 'radar' : 'camera';
      objects.push({
        object_id: id,
        object_type: type,
        role,
        distance_m: r1(dist),
        bearing_deg: Math.round(norm360(compassBearing(dx, dy) - facing)) % 360,
        relative_speed_ms: prev === undefined ? 0 : r1(dist - prev),
        sensor,
        detection_confidence: this.confidence(sensor, dist),
      });
    };
    this.people.forEach((p) => consider(p.id, 'person', p.role, p.x, p.y));
    if (this.truck.visible) consider(this.truck.id, 'vehicle', 'dump_truck', this.truck.x, this.truck.y);
    for (const id of [...this.prevDistances.keys()]) if (!seen.has(id)) this.prevDistances.delete(id);
    this.personNear = personNear;
    this.sensedCount = objects.length;

    if (objects.length > 0) {
      this.proximityActive = true;
      link.send({ ...this.envelope('proximity'), objects });
    } else if (this.proximityActive) {
      // One empty message when everything leaves range, then stop.
      this.proximityActive = false;
      link.send({ ...this.envelope('proximity'), objects: [] });
    }
  }

  private checkGeofence() {
    const e = this.exc;
    for (const zone of ZONES) {
      const inside = pointInPolygon([e.x, e.y], zone.polygon);
      const was = this.zonesInside.has(zone.zone_id);
      if (inside && !was) {
        this.zonesInside.add(zone.zone_id);
        this.emit('geofence_enter', { zone_id: zone.zone_id });
      } else if (!inside && was) {
        this.zonesInside.delete(zone.zone_id);
        this.emit('geofence_exit', { zone_id: zone.zone_id });
      }
    }
  }

  private startNextTask() {
    this.taskIndex += 1;
    const task = TASKS[this.taskIndex];
    if (!task) return;
    this.taskActive = true;
    this.volumeMovedM3 = 0;
    this.beginDig();
    this.emit('task_start', { task_id: task.task_id });
  }

  buildShiftContext(): OutgoingMessage {
    const start = this.cfg.shiftStartIso;
    return {
      ...this.envelope('shift_context'),
      time_scale: this.cfg.timeScale,
      scenario_id: this.cfg.scenarioId,
      seed: this.cfg.seed,
      site_id: 'SITE01',
      machine: { machine_id: MACHINE_ID, model: 'CAT 320', machine_type: 'excavator', machine_age_yrs: 4 },
      operator: { operator_id: OPERATOR_ID, skill_level: 'Intermediate', shift_start: start },
      daily_tasks: TASKS.map((t) => ({
        task_id: t.task_id,
        task_type: t.task_type,
        zone_id: t.zone_id,
        planned_estimate_min: t.planned_estimate_min,
        target_volume_m3: t.target_volume_m3,
        scheduled_start: new Date(Date.parse(start) + (1800 + t.scheduled_offset_s) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      })),
      zones: ZONES,
      hazards: HAZARDS.map((h) => (h.clearance_height_m === undefined ? { hazard_id: h.hazard_id, hazard_type: h.hazard_type, line: h.line } : h)),
      walkaround_checklist_result: { completed: true, issues: [] },
    };
  }

  // -------------------------------------------------------------- events

  private emit(type: EventType, details: Record<string, unknown> = {}, source: EventSource = 'sensor') {
    this.eventSeq += 1;
    link.send({
      ...this.envelope('event'),
      operator_id: OPERATOR_ID,
      event_id: `EV-${this.sessionTag}-${String(this.eventSeq).padStart(4, '0')}`,
      event_type: type,
      source,
      details,
    });
    this.recentEvents = [{ tick: this.tick, type }, ...this.recentEvents].slice(0, 8);
    this.notify(true);
  }

  // -------------------------------------------------------------- director / operator controls

  private get live() {
    return this.status === 'running';
  }

  setEngine(on: boolean, source: EventSource = 'director_console') {
    if (!this.live || this.exc.engineOn === on) return;
    this.exc.engineOn = on;
    this.emit(on ? 'engine_start' : 'engine_stop', {}, source);
    if (on) this.lastOperationTick = -Infinity;
    else {
      this.exc.speedMs = 0;
      this.lastStatusTick = this.tick - 300 + 5; // switch to the 300 s heartbeat promptly
    }
  }

  setSeatbelt(fastened: boolean, source: EventSource = 'director_console') {
    const e = this.exc;
    if (!this.live || e.seatbeltFastened === fastened || (fastened && !e.seatOccupied)) return;
    e.seatbeltFastened = fastened;
    this.emit(fastened ? 'seatbelt_fastened' : 'seatbelt_unfastened', {}, source);
    if (fastened && this.scenario?.id === 2) this.endScenario2();
  }

  setSeatOccupied(occupied: boolean, source: EventSource = 'director_console') {
    const e = this.exc;
    if (!this.live || e.seatOccupied === occupied) return;
    if (!occupied && e.seatbeltFastened) this.setSeatbelt(false, source);
    e.seatOccupied = occupied;
    this.emit(occupied ? 'operator_returned' : 'operator_left_seat', {}, source);
    if (occupied && this.scenario?.id === 3) {
      this.setSeatbelt(true, source);
      this.scenario = null;
    }
  }

  setParkingBrake(on: boolean) {
    if (this.live) this.exc.parkingBrake = on;
    this.notify(true);
  }

  setHydraulicLockout(on: boolean) {
    if (this.live) this.exc.hydraulicLockout = on;
    this.notify(true);
  }

  setAutopilot(on: boolean) {
    if (!this.live) return;
    this.exc.autopilot = on;
    this.input = { travel: 0, turn: 0, swing: 0, boom: 0, hardBrake: false };
    if (on) {
      const e = this.exc;
      e.payloadKg = 0;
      e.phase = 'swing_empty';
      this.returnHome();
    }
    this.notify(true);
  }

  setBreak(on: boolean) {
    const e = this.exc;
    if (!this.live || e.onBreak === on) return;
    e.onBreak = on;
    this.emit(on ? 'break_start' : 'break_end', {}, 'operator');
  }

  refuel() {
    const e = this.exc;
    if (!this.live || e.refuelling) return;
    // Refuel with the engine off; it restarts once the tank is full.
    this.restartAfterRefuel = e.engineOn;
    if (e.engineOn) this.setEngine(false, 'operator');
    e.refuelling = true;
    this.refuelLitres = 0;
    this.emit('refuel_start', {}, 'operator');
  }

  private finishRefuel() {
    this.exc.refuelling = false;
    this.emit('refuel_end', { litres: Math.round(this.refuelLitres) }, 'operator');
    if (this.restartAfterRefuel) this.setEngine(true, 'operator');
  }

  setWeather(next: Weather, source: EventSource = 'director_console') {
    if (!this.live || next === this.weather) return;
    const from = this.weather;
    this.weather = next;
    this.lightningKm = WEATHER_PRESETS[next].lightning;
    this.emit('weather_change', { from, to: next }, source);
    if (this.lightningKm !== null) this.emit('lightning_nearby', { distance_km: this.lightningKm }, source);
    this.sendEnvironment();
  }

  setLight(next: Light) {
    if (next === this.light) return;
    this.light = next;
    if (this.live) this.sendEnvironment();
    this.notify(true);
  }

  reportNearMiss(note: string) {
    if (this.live) this.emit('manual_near_miss', { note }, 'operator');
  }

  // -------------------------------------------------------------- scenarios

  get activeScenarioId() {
    return this.scenario?.id ?? null;
  }

  private setStage(stage: number) {
    if (this.scenario) {
      this.scenario.stage = stage;
      this.scenario.stageTick = this.tick;
    }
    this.notify(true);
  }

  runScenario(id: number) {
    if (!this.live) return;
    this.clearScenario();
    this.scenario = { id, startTick: this.tick, stage: 0, stageTick: this.tick };
    const e = this.exc;
    switch (id) {
      case 1: {
        const w = this.people.find((p) => p.id === 'W03')!;
        w.scripted = true;
        break;
      }
      case 2:
        if (!e.engineOn) this.setEngine(true);
        this.setSeatbelt(false);
        this.shuttle = { program: [{ travel: -1, dur: 10 }, { travel: 1, dur: 10 }], index: 0, t: 0, bucket: 0.8 };
        break;
      case 3:
        if (!e.engineOn) this.setEngine(true);
        this.setSeatbelt(false);
        break;
      case 4:
        this.truckDelayed = true;
        if (this.truck.state === 'loading') this.truck.loadKg = TRUCK_CAPACITY_KG;
        else if (this.truck.state === 'away') this.truck.returnAt = this.simTime + 1500;
        break;
      case 5:
        this.setWeather('Rainy');
        this.scenario = null;
        break;
      case 6:
        this.setWeather('Storm');
        this.scenario = null;
        break;
      case 7:
        if (!e.engineOn) this.setEngine(true);
        this.shuttle = null;
        this.drive = {
          waypoints: [[228, 69], [214, 69], [204, 69]],
          headingDeg: 270,
          then: () => this.setStage(1),
        };
        break;
      case 8:
        this.fastSwingCycles = 2;
        this.cycleSwingMax = 68;
        break;
      case 9:
        this.setEngine(false);
        this.fuelTheftUntil = this.simTime + 600;
        break;
      case 10:
        this.coolantOverride = 112;
        break;
      case 11:
        this.setBreak(false);
        this.configure({ timeScale: 60 });
        break;
      case 12:
        this.reportNearMiss('Worker walked behind me');
        this.scenario = null;
        break;
    }
    this.notify(true);
  }

  /** Stops the active scenario and puts the machine back to normal work. */
  clearScenario() {
    const s = this.scenario;
    if (!s) return;
    this.scenario = null;
    const w = this.people.find((p) => p.id === 'W03')!;
    switch (s.id) {
      case 1:
        w.scripted = false;
        w.target = [...w.home] as Vec2;
        w.speedMs = 1.1;
        break;
      case 2:
        this.setSeatbelt(true);
        this.returnHome();
        break;
      case 3:
        this.setSeatOccupied(true);
        this.setSeatbelt(true);
        break;
      case 4:
        this.finishScenario4();
        break;
      case 7:
      case 8:
        this.fastSwingCycles = 0;
        this.returnHome();
        break;
      case 9:
        this.fuelTheftUntil = null;
        this.setEngine(true);
        break;
      case 10:
        this.coolantOverride = null;
        break;
    }
    this.notify(true);
  }

  private endScenario2() {
    this.scenario = null;
    this.returnHome();
  }

  private finishScenario4() {
    this.truckDelayed = false;
    if (this.truck.state === 'away') this.truck.returnAt = Math.min(this.truck.returnAt, this.simTime + 5);
    if (!this.exc.seatbeltFastened && this.exc.seatOccupied) this.setSeatbelt(true, 'sensor');
    if (this.scenario?.id === 4) this.scenario = null;
  }

  private scenarioTick() {
    const s = this.scenario;
    if (!s) return;
    const e = this.exc;
    const since = this.tick - s.stageTick;
    switch (s.id) {
      case 1: {
        const w = this.people.find((p) => p.id === 'W03')!;
        const dist = Math.hypot(w.x - e.x, w.y - e.y);
        if (s.stage === 0 && dist < 4.6) this.setStage(1);
        else if (s.stage === 1 && since >= 15) {
          this.setStage(2);
          w.target = [...w.home] as Vec2;
          w.speedMs = 1.1;
        } else if (s.stage === 2 && Math.hypot(w.x - w.home[0], w.y - w.home[1]) < 0.3) {
          w.scripted = false;
          w.target = null;
          this.scenario = null;
        }
        break;
      }
      case 3:
        if (s.stage === 0 && since >= 3) {
          this.setSeatOccupied(false, 'sensor');
          this.setStage(1);
        }
        break;
      case 4:
        if (s.stage === 0 && this.waitStartTick !== null && this.tick - this.waitStartTick >= 180) {
          this.setSeatbelt(false, 'sensor');
          this.setStage(1);
        }
        break;
      case 7:
        if (s.stage === 1 && since >= 20) {
          this.setStage(2);
          this.drive = {
            waypoints: [[214, 69], [228, 69], [MACHINE_HOME.x, MACHINE_HOME.y]],
            headingDeg: MACHINE_HOME.headingDeg,
            then: () => { this.scenario = null; this.notify(true); },
          };
        }
        break;
      case 8:
        if (s.stage === 2 && since >= 36) {
          this.shuttle = null;
          this.returnHome(() => { this.scenario = null; this.notify(true); });
          this.setStage(3);
        }
        break;
      case 9:
        if (this.fuelTheftUntil !== null && this.simTime >= this.fuelTheftUntil + 60) {
          this.fuelTheftUntil = null;
          this.scenario = null;
          this.setEngine(true, 'sensor');
        }
        break;
    }
  }

  // -------------------------------------------------------------- snapshot for React

  private buildSnapshot(): SimSnapshot {
    const task = TASKS[this.taskIndex];
    const s = this.scenario;
    return {
      status: this.status,
      tick: this.tick,
      timestamp: this.timestampOf(this.tick),
      cfg: { ...this.cfg },
      exc: { ...this.exc, faultCodes: [...this.exc.faultCodes] },
      engineState: this.engineState,
      weather: this.weather,
      light: this.light,
      lightningKm: this.lightningKm,
      scenario: s ? { id: s.id, title: SCENARIOS[s.id - 1].title, stage: s.stage } : null,
      taskId: this.taskActive && task ? task.task_id : null,
      taskProgressPct: task ? Math.min(100, (this.volumeMovedM3 / task.target_volume_m3) * 100) : 0,
      volumeMovedM3: this.volumeMovedM3,
      truckState: this.truck.state,
      sensed: this.sensedCount,
      recentEvents: this.recentEvents,
    };
  }

  private notify(force: boolean) {
    const now = performance.now();
    if (!force && now - this.lastNotify < 200) return;
    this.lastNotify = now;
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}

export const sim = new SimEngine();

