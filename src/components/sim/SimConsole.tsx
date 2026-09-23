import { useEffect, useRef, useState } from 'react';
import { SCENARIOS, sim } from '../../sim/engine';
import { link, useLinkStore } from '../../sim/link';
import type { Light, Weather } from '../../sim/protocol';
import { useSim } from '../../sim/useSim';

// Director console for the IronSense sim: backend link, session, machine toggles, weather,
// the 12 spec scenarios and record/replay.

const WEATHERS: Weather[] = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Storm', 'Fog', 'Extreme Heat', 'Dust'];
const LIGHTS: Light[] = ['day', 'dusk', 'night'];
const TIME_SCALES = [1, 5, 10, 30, 60];

// Manual excavator keys (autopilot off). WASD stays with the camera.
type Axis = 'travel' | 'turn' | 'swing' | 'boom';
const KEYMAP: Record<string, [Axis, number]> = {
  KeyI: ['travel', 1], KeyK: ['travel', -1],
  KeyJ: ['turn', -1], KeyL: ['turn', 1],
  KeyU: ['swing', -1], KeyO: ['swing', 1],
  KeyY: ['boom', 1], KeyH: ['boom', -1],
};

function useManualKeys() {
  useEffect(() => {
    const held = new Set<string>();
    const apply = () => {
      const next = { travel: 0, turn: 0, swing: 0, boom: 0, hardBrake: held.has('KeyX') };
      held.forEach((code) => {
        const map = KEYMAP[code];
        if (map) next[map[0]] += map[1];
      });
      sim.input = next;
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (KEYMAP[e.code] || e.code === 'KeyX') { held.add(e.code); apply(); }
    };
    const up = (e: KeyboardEvent) => { if (held.delete(e.code)) apply(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
}

function Toggle({ label, on, onChange, disabled, danger }: { label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" className={`sim-toggle${on ? ' sim-toggle-on' : ''}${danger && !on ? ' sim-toggle-danger' : ''}`} disabled={disabled} onClick={() => onChange(!on)}>
      <span className="sim-toggle-knob" />{label}
    </button>
  );
}

const statusLabel: Record<string, string> = { offline: 'OFFLINE', connecting: 'CONNECTING', open: 'OPEN', retrying: 'RETRYING' };

export function SimConsole() {
  const snap = useSim();
  const endpoint = useLinkStore((s) => s.endpoint);
  const telStatus = useLinkStore((s) => s.telStatus);
  const cabStatus = useLinkStore((s) => s.cabStatus);
  const wake = useLinkStore((s) => s.wake);
  const sentCount = useLinkStore((s) => s.sentCount);
  const errors = useLinkStore((s) => s.errors);
  const recordCount = useLinkStore((s) => s.recordCount);
  const replay = useLinkStore((s) => s.replay);
  const muted = useLinkStore((s) => s.muted);
  const lang = useLinkStore((s) => s.lang);
  const voice = useLinkStore((s) => s.voice);
  const [collapsed, setCollapsed] = useState(false);
  const [seed, setSeed] = useState(String(snap.cfg.seed));
  const fileRef = useRef<HTMLInputElement>(null);
  useManualKeys();

  const e = snap.exc;
  const running = snap.status === 'running';
  const connected = telStatus !== 'offline';

  const start = () => {
    useLinkStore.setState({ assessment: null });
    sim.configure({ seed: Number(seed) || 42 });
    sim.start();
  };

  const onReplayFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      sim.stop();
      useLinkStore.setState({ assessment: null });
      link.replay(file.name, await file.text());
    } catch (err) {
      console.error('[IronSense] replay failed', err);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className={`simulation-hud sim-console${collapsed ? ' sim-console-collapsed' : ''}`}>
      <div className="sim-console-head">
        <strong>DIRECTOR · IRONSENSE</strong>
        <button type="button" onClick={() => setCollapsed((c) => !c)}>{collapsed ? '▸' : '▾'}</button>
      </div>
      {!collapsed && (
        <div className="sim-console-body">
          <section>
            <h4>Backend link</h4>
            <div className="sim-row">
              <select value={endpoint} disabled={connected} onChange={(ev) => useLinkStore.getState().setEndpoint(ev.target.value as 'live' | 'local')}>
                <option value="live">Live · onrender.com</option>
                <option value="local">Local · localhost:8000</option>
              </select>
              {connected
                ? <button type="button" className="sim-btn" onClick={() => { sim.stop(); link.disconnect(); }}>Disconnect</button>
                : <button type="button" className="sim-btn" onClick={() => link.connect()}>Connect</button>}
            </div>
            <div className="sim-status-line">
              <span><i className={`cab-dot cab-dot-${telStatus}`} />TELEMETRY {statusLabel[telStatus]}</span>
              <span><i className={`cab-dot cab-dot-${cabStatus}`} />CAB {statusLabel[cabStatus]}</span>
            </div>
            <div className="sim-status-line">
              <span>BACKEND {wake === 'waking' ? 'WAKING (UP TO ~1 MIN)' : wake.toUpperCase()}</span>
              <span>SENT {sentCount}</span>
            </div>
            {errors.length > 0 && (
              <div className="sim-errors">
                <div className="sim-row"><b>{errors.length} rejected</b><button type="button" onClick={() => useLinkStore.getState().clearErrors()}>clear</button></div>
                {errors.slice(0, 3).map((err, i) => (
                  <div key={i} className="sim-error">{err.reply.ref_msg_type} @ {err.reply.sim_tick}: {err.reply.detail}</div>
                ))}
                <small>Full sent message + reply logged to the browser console.</small>
              </div>
            )}
          </section>

          <section>
            <h4>Session</h4>
            <div className="sim-row">
              <label>Seed <input value={seed} onChange={(ev) => setSeed(ev.target.value)} disabled={running} /></label>
              <label>Speed
                <select value={snap.cfg.timeScale} onChange={(ev) => sim.configure({ timeScale: Number(ev.target.value) })}>
                  {TIME_SCALES.map((s) => <option key={s} value={s}>{s}×</option>)}
                </select>
              </label>
            </div>
            <div className="sim-row">
              <button type="button" className="sim-btn sim-btn-primary" onClick={start}>{snap.status === 'stopped' ? 'Start shift' : 'Restart scenario'}</button>
              {snap.status !== 'stopped' && <button type="button" className="sim-btn" onClick={() => sim.stop()}>Stop</button>}
            </div>
            <div className="sim-status-line">
              <span>{snap.status === 'waiting' ? 'WAITING FOR BACKEND…' : snap.status.toUpperCase()}</span>
              <span>TICK {snap.tick}</span>
            </div>
            <div className="sim-status-line"><span>{snap.timestamp}</span><span>{snap.taskId ?? 'NO TASK'} · {snap.taskProgressPct.toFixed(0)}%</span></div>
          </section>

          <section>
            <h4>Machine · EXC001</h4>
            <div className="sim-toggles">
              <Toggle label="Engine" on={e.engineOn} disabled={!running} onChange={(v) => sim.setEngine(v)} />
              <Toggle label="Seatbelt" on={e.seatbeltFastened} disabled={!running || !e.seatOccupied} danger onChange={(v) => sim.setSeatbelt(v)} />
              <Toggle label="Operator in seat" on={e.seatOccupied} disabled={!running} danger onChange={(v) => sim.setSeatOccupied(v)} />
              <Toggle label="Parking brake" on={e.parkingBrake} disabled={!running} onChange={(v) => sim.setParkingBrake(v)} />
              <Toggle label="Hyd. lockout" on={e.hydraulicLockout} disabled={!running} onChange={(v) => sim.setHydraulicLockout(v)} />
              <Toggle label="Autopilot" on={e.autopilot} disabled={!running} onChange={(v) => sim.setAutopilot(v)} />
              <Toggle label="On break" on={e.onBreak} disabled={!running} onChange={(v) => sim.setBreak(v)} />
              <button type="button" className="sim-btn" disabled={!running || e.refuelling} onClick={() => sim.refuel()}>{e.refuelling ? 'Refuelling…' : 'Refuel'}</button>
            </div>
            <div className="sim-status-line">
              <span>{snap.engineState.toUpperCase()} · {e.workMode.toUpperCase()}</span>
              <span>{Math.round(e.rpm)} RPM · {(Math.abs(e.speedMs) * 3.6).toFixed(1)} KM/H</span>
            </div>
            <div className="sim-status-line">
              <span>FUEL {e.fuelLevelPct.toFixed(1)}% · COOLANT {Math.round(e.coolantC)}°C</span>
              <span>PITCH {e.pitchDeg.toFixed(1)}°</span>
            </div>
            {!e.autopilot && <small className="sim-hint">Manual: I/K travel · J/L turn tracks · U/O swing · Y/H boom · X hard brake</small>}
          </section>

          <section>
            <h4>Environment</h4>
            <div className="sim-row">
              <select value={snap.weather} disabled={!running} onChange={(ev) => sim.setWeather(ev.target.value as Weather)}>
                {WEATHERS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <select value={snap.light} onChange={(ev) => sim.setLight(ev.target.value as Light)}>
                {LIGHTS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {snap.lightningKm !== null && <div className="sim-status-line"><span>⚡ LIGHTNING {snap.lightningKm} KM</span></div>}
          </section>

          <section>
            <h4>Scenarios {snap.scenario && <em>· running #{snap.scenario.id}</em>}</h4>
            <div className="sim-scenarios">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.blurb}
                  disabled={!running}
                  className={`sim-scenario${snap.scenario?.id === s.id ? ' sim-scenario-active' : ''}`}
                  onClick={() => sim.runScenario(s.id)}
                >
                  <b>{s.id}</b>{s.title}
                </button>
              ))}
            </div>
            {snap.scenario && (
              <div className="sim-row">
                <small className="sim-hint">{SCENARIOS[snap.scenario.id - 1].blurb}</small>
                <button type="button" className="sim-btn" onClick={() => sim.clearScenario()}>End</button>
              </div>
            )}
          </section>

          <section>
            <h4>Record &amp; replay</h4>
            <div className="sim-row">
              <button type="button" className="sim-btn" disabled={recordCount === 0} onClick={() => link.downloadRecording()}>Download .jsonl ({recordCount})</button>
              <button type="button" className="sim-btn" onClick={() => fileRef.current?.click()}>Replay file…</button>
              <input ref={fileRef} type="file" accept=".jsonl,.ndjson,.txt" hidden onChange={(ev) => void onReplayFile(ev.target.files?.[0])} />
            </div>
            {replay && (
              <div className="sim-row">
                <small className="sim-hint">Replaying {replay.name}: {replay.sent}/{replay.total}</small>
                <button type="button" className="sim-btn" onClick={() => link.stopReplay()}>Stop</button>
              </div>
            )}
          </section>

          <section>
            <h4>Cab alerts</h4>
            <div className="sim-row">
              <label>Language
                <select value={lang} onChange={(ev) => link.setLang(ev.target.value as 'en' | 'hi')}>
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </label>
            </div>
            <div className="sim-toggles">
              <Toggle label="Voice alerts" on={voice} onChange={(v) => useLinkStore.getState().setVoice(v)} />
              <Toggle label="Mute all sound" on={muted} onChange={(v) => useLinkStore.getState().setMuted(v)} />
            </div>
          </section>

          {snap.recentEvents.length > 0 && (
            <section>
              <h4>Recent events</h4>
              {snap.recentEvents.slice(0, 5).map((ev, i) => (
                <div key={i} className="sim-status-line"><span>{ev.type}</span><span>@{ev.tick}</span></div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
