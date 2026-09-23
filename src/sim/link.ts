import { create } from 'zustand';
import { ENDPOINTS, type Assessment, type CabLang, type BackendError, type EndpointKey, type OutgoingMessage } from './protocol';

// Two WebSockets to the IronSense backend:
//   /ws/telemetry      — the sim sends every message here; the backend replies only with errors.
//   /ws/cab/EXC001     — the backend pushes `assessment` messages for the cab UI.
// Every outgoing message is also recorded (for the .jsonl download / replay).

export type SocketStatus = 'offline' | 'connecting' | 'open' | 'retrying';
export type BackendWake = 'unknown' | 'waking' | 'awake' | 'unreachable';

export interface ErrorEntry {
  at: number;
  reply: BackendError;
  sent: OutgoingMessage | null;
}

export interface ReplayState {
  name: string;
  sent: number;
  total: number;
}

interface LinkState {
  endpoint: EndpointKey;
  telStatus: SocketStatus;
  cabStatus: SocketStatus;
  wake: BackendWake;
  sentCount: number;
  errors: ErrorEntry[];
  assessment: Assessment | null;
  assessmentAt: number;
  recordCount: number;
  replay: ReplayState | null;
  muted: boolean;
  lang: CabLang;
  voice: boolean;
  setEndpoint: (endpoint: EndpointKey) => void;
  setMuted: (muted: boolean) => void;
  clearErrors: () => void;
  setVoice: (voice: boolean) => void;
}

export const useLinkStore = create<LinkState>((set) => ({
  endpoint: 'live',
  telStatus: 'offline',
  cabStatus: 'offline',
  wake: 'unknown',
  sentCount: 0,
  errors: [],
  assessment: null,
  assessmentAt: 0,
  recordCount: 0,
  replay: null,
  muted: false,
  lang: 'en',
  voice: true,
  setEndpoint: (endpoint) => set({ endpoint }),
  setMuted: (muted) => set({ muted }),
  clearErrors: () => set({ errors: [] }),
  setVoice: (voice) => set({ voice }),
}));

const MACHINE_ID = 'EXC001';
const MAX_QUEUE = 3000;
const RECENT_LIMIT = 400;

interface RecordedLine {
  t_ms: number;
  msg: OutgoingMessage;
}

class TelemetryLink {
  private tel: WebSocket | null = null;
  private cab: WebSocket | null = null;
  private wanted = false;
  private telOpenedOnce = false;
  private queue: string[] = [];
  private recent: OutgoingMessage[] = [];
  private retryTimers: ReturnType<typeof setTimeout>[] = [];
  private recordStart = 0;
  private recorded: RecordedLine[] = [];
  private replayTimer: ReturnType<typeof setTimeout> | null = null;
  private sentCount = 0;
  private countFlush: ReturnType<typeof setTimeout> | null = null;

  /** Called when the telemetry socket re-opens after a drop; returns a fresh shift_context to send first. */
  onTelemetryReopen: (() => OutgoingMessage | null) | null = null;
  /** Called every time the telemetry socket becomes open. */
  onTelemetryOpen: (() => void) | null = null;

  get isTelemetryOpen() {
    return this.tel?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (this.wanted) return;
    this.wanted = true;
    this.telOpenedOnce = false;
    this.wakeBackend();
    this.openTelemetry();
    this.openCab();
  }

  disconnect() {
    this.wanted = false;
    this.retryTimers.forEach(clearTimeout);
    this.retryTimers = [];
    this.tel?.close();
    this.cab?.close();
    this.tel = null;
    this.cab = null;
    this.queue = [];
    useLinkStore.setState({ telStatus: 'offline', cabStatus: 'offline' });
  }

  /** Switches the cab socket language (?lang=). Reconnects the cab socket if it is open. */
  setLang(lang: CabLang) {
    if (useLinkStore.getState().lang === lang) return;
    useLinkStore.setState({ lang });
    if (!this.wanted) return;
    const old = this.cab;
    this.cab = null;
    old?.close();
    this.openCab();
  }

  /** Acknowledges an alert over the cab socket: {"msg_type":"ack","alert_id":...}. */
  ack(alertId: string) {
    if (this.cab?.readyState === WebSocket.OPEN) this.cab.send(JSON.stringify({ msg_type: 'ack', alert_id: alertId }));
  }

  send(msg: OutgoingMessage) {
    const text = JSON.stringify(msg);
    this.remember(msg);
    this.record(msg);
    if (this.tel && this.tel.readyState === WebSocket.OPEN) {
      this.tel.send(text);
      this.bumpSent();
    } else {
      this.queue.push(text);
      if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    }
  }

  // ---------- record & replay ----------

  startRecording() {
    this.recordStart = performance.now();
    this.recorded = [];
    useLinkStore.setState({ recordCount: 0 });
  }

  downloadRecording() {
    if (this.recorded.length === 0) return;
    const body = this.recorded.map((line) => JSON.stringify(line)).join('\n') + '\n';
    const blob = new Blob([body], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const first = this.recorded[0].msg;
    a.href = url;
    a.download = `ironsense_${String(first.scenario_id ?? 'session')}_${first.timestamp.replace(/[:]/g, '-')}.jsonl`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Plays a recorded .jsonl file back over the telemetry socket at its recorded timing. */
  replay(name: string, text: string) {
    const lines: RecordedLine[] = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RecordedLine)
      .filter((line) => line && typeof line.t_ms === 'number' && line.msg);
    if (lines.length === 0) throw new Error('No recorded messages in file');
    this.stopReplay();
    this.connect();
    let index = 0;
    const startedAt = performance.now();
    useLinkStore.setState({ replay: { name, sent: 0, total: lines.length } });
    const pump = () => {
      const elapsed = performance.now() - startedAt;
      while (index < lines.length && lines[index].t_ms <= elapsed) {
        const msg = lines[index].msg;
        const textMsg = JSON.stringify(msg);
        this.remember(msg);
        if (this.tel && this.tel.readyState === WebSocket.OPEN) {
          this.tel.send(textMsg);
          this.bumpSent();
        } else {
          this.queue.push(textMsg);
        }
        index += 1;
      }
      useLinkStore.setState({ replay: { name, sent: index, total: lines.length } });
      if (index >= lines.length) {
        this.replayTimer = null;
        setTimeout(() => useLinkStore.setState({ replay: null }), 1500);
        return;
      }
      const wait = Math.max(0, Math.min(250, lines[index].t_ms - (performance.now() - startedAt)));
      this.replayTimer = setTimeout(pump, wait);
    };
    pump();
  }

  stopReplay() {
    if (this.replayTimer) clearTimeout(this.replayTimer);
    this.replayTimer = null;
    useLinkStore.setState({ replay: null });
  }

  get isReplaying() {
    return this.replayTimer !== null;
  }

  // ---------- internals ----------

  private base() {
    return ENDPOINTS[useLinkStore.getState().endpoint];
  }

  private wakeBackend() {
    useLinkStore.setState({ wake: 'waking' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    fetch(`${this.base().http}/api/health`, { signal: controller.signal })
      .then((res) => useLinkStore.setState({ wake: res.ok ? 'awake' : 'unreachable' }))
      .catch(() => useLinkStore.setState({ wake: 'unreachable' }))
      .finally(() => clearTimeout(timeout));
  }

  private scheduleRetry(fn: () => void) {
    const timer = setTimeout(() => {
      this.retryTimers = this.retryTimers.filter((t) => t !== timer);
      if (this.wanted) fn();
    }, 3000);
    this.retryTimers.push(timer);
  }

  private openTelemetry() {
    useLinkStore.setState({ telStatus: this.telOpenedOnce ? 'retrying' : 'connecting' });
    const ws = new WebSocket(`${this.base().ws}/ws/telemetry`);
    this.tel = ws;
    ws.onopen = () => {
      if (this.tel !== ws) return;
      useLinkStore.setState({ telStatus: 'open', wake: 'awake' });
      if (this.telOpenedOnce && this.onTelemetryReopen) {
        const context = this.onTelemetryReopen();
        if (context) {
          ws.send(JSON.stringify(context));
          this.remember(context);
          this.record(context);
          this.bumpSent();
        }
      }
      this.telOpenedOnce = true;
      const pending = this.queue;
      this.queue = [];
      pending.forEach((text) => ws.send(text));
      if (pending.length) this.bumpSent(pending.length);
      this.onTelemetryOpen?.();
    };
    ws.onmessage = (event) => this.handleTelemetryReply(event.data);
    ws.onclose = () => {
      if (this.tel !== ws) return;
      if (!this.wanted) return;
      useLinkStore.setState({ telStatus: 'retrying' });
      this.scheduleRetry(() => this.openTelemetry());
    };
    ws.onerror = () => { /* onclose follows and handles the retry */ };
  }

  private openCab() {
    useLinkStore.setState({ cabStatus: useLinkStore.getState().cabStatus === 'offline' ? 'connecting' : 'retrying' });
    const ws = new WebSocket(`${this.base().ws}/ws/cab/${MACHINE_ID}?lang=${useLinkStore.getState().lang}`);
    this.cab = ws;
    ws.onopen = () => {
      if (this.cab === ws) useLinkStore.setState({ cabStatus: 'open', wake: 'awake' });
    };
    ws.onmessage = (event) => {
      let data: unknown;
      try { data = JSON.parse(String(event.data)); } catch { console.warn('[IronSense] cab socket sent non-JSON', event.data); return; }
      const msg = data as { msg_type?: string };
      if (msg.msg_type === 'assessment') {
        useLinkStore.setState({ assessment: data as Assessment, assessmentAt: Date.now() });
      } else {
        console.info('[IronSense] cab socket message', data);
      }
    };
    ws.onclose = () => {
      if (this.cab !== ws || !this.wanted) return;
      useLinkStore.setState({ cabStatus: 'retrying' });
      this.scheduleRetry(() => this.openCab());
    };
    ws.onerror = () => { /* onclose follows */ };
  }

  private handleTelemetryReply(raw: unknown) {
    let data: unknown;
    try { data = JSON.parse(String(raw)); } catch { console.warn('[IronSense] telemetry socket sent non-JSON', raw); return; }
    const reply = data as BackendError;
    if (reply.msg_type !== 'error') {
      console.info('[IronSense] telemetry socket message', data);
      return;
    }
    const sent = this.recent.find((m) => m.msg_type === reply.ref_msg_type && m.sim_tick === reply.sim_tick) ?? null;
    console.error(`[IronSense] backend rejected ${reply.ref_msg_type} @ tick ${reply.sim_tick}: ${reply.detail}`, { sent, reply });
    useLinkStore.setState((state) => ({ errors: [{ at: Date.now(), reply, sent }, ...state.errors].slice(0, 25) }));
  }

  private remember(msg: OutgoingMessage) {
    this.recent.unshift(msg);
    if (this.recent.length > RECENT_LIMIT) this.recent.length = RECENT_LIMIT;
  }

  private record(msg: OutgoingMessage) {
    if (this.isReplaying) return;
    this.recorded.push({ t_ms: Math.round(performance.now() - this.recordStart), msg });
    if (this.recorded.length % 20 === 1) useLinkStore.setState({ recordCount: this.recorded.length });
  }

  // Sent-count updates are throttled so a 60× time scale doesn't re-render the console 60×/s.
  private bumpSent(n = 1) {
    this.sentCount += n;
    if (this.countFlush) return;
    this.countFlush = setTimeout(() => {
      this.countFlush = null;
      useLinkStore.setState({ sentCount: this.sentCount, recordCount: this.recorded.length });
    }, 250);
  }
}

export const link = new TelemetryLink();
