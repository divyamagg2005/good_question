import React, { useState } from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import { SCENARIOS, sim } from '../../sim/engine';
import { useSim } from '../../sim/useSim';
import type { LightCondition, WeatherCondition } from '../../types/cockpit';
import { SlidersHorizontal, X, RotateCcw, Clock, CloudSun, PlayCircle, Square } from 'lucide-react';

// Dashboard director console. Every control drives the same sim engine as the 3D view's
// console, so scenarios, weather and machine state stay in sync everywhere.

const WEATHERS: WeatherCondition[] = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Storm', 'Fog', 'Extreme Heat', 'Dust'];
const LIGHTS: LightCondition[] = ['day', 'dusk', 'night'];
const SPEEDS = [1, 5, 10, 30, 60];

const sectionTitle: React.CSSProperties = { fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' };

function chip(active: boolean, disabled = false): React.CSSProperties {
  return {
    padding: '8px 6px',
    borderRadius: '6px',
    background: active ? 'var(--cat-yellow)' : 'rgba(255, 255, 255, 0.05)',
    color: active ? '#0d1117' : '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    textAlign: 'center',
  };
}

export const DirectorConsole: React.FC = () => {
  const {
    isDirectorOpen,
    toggleDirector,
    simulationSpeed,
    setSimulationSpeed,
    setWeather,
    setLight,
    runScenario,
    resetScenario,
    completeWalkaround,
    setDestination,
    simClock,
    backendLinked,
  } = useOperatorStore();
  const snap = useSim();
  const [currentDemoStep, setCurrentDemoStep] = useState(1);

  if (!isDirectorOpen) return null;

  const running = snap.status === 'running';
  const e = snap.exc;

  const handleRunScriptStep = (step: number) => {
    setCurrentDemoStep(step);
    switch (step) {
      case 1:
        completeWalkaround();
        setDestination('today');
        break;
      case 2:
        setWeather('Rainy');
        setDestination('today');
        break;
      case 3:
        runScenario(1);
        setDestination('safety');
        break;
      case 4:
        runScenario(2);
        setDestination('safety');
        break;
      case 5:
        resetScenario();
        setDestination('training');
        break;
      case 6:
        setDestination('insights');
        break;
    }
  };

  const toggles = [
    { label: 'Engine', on: e.engineOn, set: (v: boolean) => sim.setEngine(v) },
    { label: 'Seatbelt', on: e.seatbeltFastened, set: (v: boolean) => sim.setSeatbelt(v), disabled: !e.seatOccupied },
    { label: 'Operator in seat', on: e.seatOccupied, set: (v: boolean) => sim.setSeatOccupied(v) },
    { label: 'On break', on: e.onBreak, set: (v: boolean) => sim.setBreak(v) },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '460px',
        maxWidth: '90vw',
        background: 'rgba(10, 14, 22, 0.98)',
        backdropFilter: 'blur(28px)',
        borderLeft: '2px solid var(--cat-yellow)',
        boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.9)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cat-yellow)', color: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>DIRECTOR SCENARIO CONSOLE</h2>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Drives the live sim · Ctrl+Shift+D</div>
          </div>
        </div>
        <button
          onClick={() => toggleDirector(false)}
          aria-label="Close director console"
          style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '6px', color: '#ffffff', padding: '6px', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Live status */}
      <div className="mono-num" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px' }}>
        <span>SIM {snap.status.toUpperCase()}</span>
        <span>{simClock ? simClock.replace('T', ' ').replace('Z', ' UTC') : '--'}</span>
        <span style={{ color: backendLinked ? 'var(--safety-green)' : 'var(--safety-amber)' }}>{backendLinked ? 'BACKEND LIVE' : 'BACKEND OFFLINE'}</span>
      </div>

      {/* Guided sequencer */}
      <div style={{ background: 'rgba(255, 184, 0, 0.08)', border: '1px solid rgba(255, 184, 0, 0.3)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cat-yellow)', textTransform: 'uppercase' }}>Guided Demo Scenario Sequencer</div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Step {currentDemoStep} of 6</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[
            '1. Walkaround & Start',
            '2. Inject Rain',
            '3. Worker Blind Spot',
            '4. Seatbelt Off',
            '5. Resolve & Train',
            '6. Check Insights',
          ].map((label, i) => (
            <button key={label} onClick={() => handleRunScriptStep(i + 1)} style={{ ...chip(currentDemoStep === i + 1), fontSize: '10px', padding: '8px 4px' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scenarios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={sectionTitle}>Spec Scenarios</div>
          {snap.scenario && (
            <button onClick={() => sim.clearScenario()} className="cockpit-btn" style={{ padding: '4px 10px', fontSize: '11px', minHeight: '28px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}>
              <Square size={12} />
              End scenario #{snap.scenario.id}
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {SCENARIOS.map((s) => {
            const active = snap.scenario?.id === s.id;
            return (
              <button
                key={s.id}
                title={s.blurb}
                aria-label={`Scenario ${s.id}: ${s.title}`}
                onClick={() => runScenario(s.id)}
                style={{ ...chip(active), display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', padding: '8px' }}
              >
                <PlayCircle size={13} style={{ flexShrink: 0 }} />
                <span>{s.id}. {s.title}</span>
              </button>
            );
          })}
        </div>
        {snap.scenario && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{SCENARIOS[snap.scenario.id - 1]?.blurb}</div>}
      </div>

      {/* Machine toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={sectionTitle}>Machine · {snap.engineState.toUpperCase()} · {e.workMode.replace('_', ' ').toUpperCase()}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {toggles.map((t) => {
            const disabled = !running || Boolean(t.disabled);
            return (
              <button key={t.label} disabled={disabled} onClick={() => t.set(!t.on)} style={chip(t.on, disabled)}>
                {t.label}: {t.on ? 'ON' : 'OFF'}
              </button>
            );
          })}
        </div>
        {!running && <div style={{ fontSize: '11px', color: 'var(--safety-amber)' }}>Complete walkaround to start the shift.</div>}
      </div>

      {/* Environment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CloudSun size={14} /> Environment
        </div>
        <select
          value={snap.weather}
          onChange={(ev) => setWeather(ev.target.value as WeatherCondition)}
          style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', color: '#ffffff', border: '1px solid var(--cockpit-glass-border)', fontSize: '12px' }}
        >
          {WEATHERS.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {LIGHTS.map((l) => (
            <button key={l} onClick={() => setLight(l)} style={{ ...chip(snap.light === l), textTransform: 'capitalize' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Sim speed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} /> Simulation Speed
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSimulationSpeed(s)} style={chip(simulationSpeed === s)}>
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button onClick={resetScenario} className="cockpit-btn cockpit-btn-ghost" style={{ width: '100%', marginTop: 'auto' }}>
        <RotateCcw size={16} />
        <span>Reset scenario &amp; weather</span>
      </button>
    </div>
  );
};
