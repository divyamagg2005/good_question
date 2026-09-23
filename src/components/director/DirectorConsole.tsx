import React, { useState } from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import type { WeatherCondition } from '../../types/cockpit';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  AlertTriangle,
  UserX,
  Truck,
  Compass,
  Clock,
  Eye,
  Lock,
} from 'lucide-react';

export const DirectorConsole: React.FC = () => {
  const {
    isDirectorOpen,
    toggleDirector,
    simulationSpeed,
    setSimulationSpeed,
    weather,
    setWeather,
    seatbeltFastened,
    fastenSeatbelt,
    injectSeatbeltUnfasten,
    injectWorkerRedZone,
    resolveWorkerRedZone,
    injectVehicleAmberZone,
    injectExcessiveTilt,
    injectHarshStop,
    injectIdleTimeout,
    injectFatigueThreshold,
    resetScenario,
    completeWalkaround,
    setDestination,
  } = useOperatorStore();

  const [currentDemoStep, setCurrentDemoStep] = useState(1);

  if (!isDirectorOpen) return null;

  // Scripted Demo Step Sequencer
  const handleRunScriptStep = (step: number) => {
    setCurrentDemoStep(step);
    switch (step) {
      case 1:
        // Step 1: Complete walkaround & Start Earth Excavation
        completeWalkaround();
        setDestination('today');
        break;
      case 2:
        // Step 2: Inject rain -> slope limit tightens to 15, readiness drops with explanation
        setWeather('rain');
        setDestination('today');
        break;
      case 3:
        // Step 3: Worker enters red zone -> critical alert, proximity field expands, incident captured
        injectWorkerRedZone();
        setDestination('safety');
        break;
      case 4:
        // Step 4: Resolve incident & open training
        resolveWorkerRedZone();
        setDestination('training');
        break;
      case 5:
        // Step 5: Complete quiz & update readiness & digest
        setDestination('training');
        break;
      case 6:
        // Step 6: Show Insights explaining anomaly & task estimate change
        setDestination('insights');
        break;
      default:
        break;
    }
  };

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
        justifyContent: 'space-between',
        padding: '24px',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--cat-yellow)',
                color: '#0d1117',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                DIRECTOR SCENARIO CONSOLE
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Deterministic Demo Controls (Ctrl+Shift+D)
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleDirector(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scripted Demo Path (1-Click Walkthrough) */}
        <div
          style={{
            background: 'rgba(255, 184, 0, 0.08)',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cat-yellow)', textTransform: 'uppercase' }}>
              Guided Demo Scenario Sequencer
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Step {currentDemoStep} of 6</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {[
              { step: 1, label: '1. Walkaround & Start' },
              { step: 2, label: '2. Inject Rain' },
              { step: 3, label: '3. Red-Zone Worker' },
              { step: 4, label: '4. Resolve & Train' },
              { step: 5, label: '5. Pass Quiz' },
              { step: 6, label: '6. Check Insights' },
            ].map((btn) => (
              <button
                key={btn.step}
                onClick={() => handleRunScriptStep(btn.step)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '6px',
                  background: currentDemoStep === btn.step ? 'var(--cat-yellow)' : 'rgba(255, 255, 255, 0.05)',
                  color: currentDemoStep === btn.step ? '#0d1117' : '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Individual Deterministic Injection Triggers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Discrete Injection Controls:
          </div>

          {/* 1. Proximity Triggers */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={injectWorkerRedZone}
              className="cockpit-btn"
              style={{
                flex: 1,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                fontSize: '11px',
                padding: '8px',
              }}
            >
              <UserX size={15} />
              <span>Worker in Red Zone (&lt;5m)</span>
            </button>

            <button
              onClick={injectVehicleAmberZone}
              className="cockpit-btn"
              style={{
                flex: 1,
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                border: '1px solid #f59e0b',
                fontSize: '11px',
                padding: '8px',
              }}
            >
              <Truck size={15} />
              <span>Loader in Amber</span>
            </button>
          </div>

          {/* 2. Seatbelt Toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={seatbeltFastened ? injectSeatbeltUnfasten : fastenSeatbelt}
              className="cockpit-btn"
              style={{
                flex: 1,
                background: seatbeltFastened ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.25)',
                color: seatbeltFastened ? '#ffffff' : '#ef4444',
                border: `1px solid ${seatbeltFastened ? 'var(--cockpit-glass-border)' : '#ef4444'}`,
                fontSize: '11px',
              }}
            >
              <Lock size={15} />
              <span>{seatbeltFastened ? 'Unfasten Seatbelt (Inject)' : 'Fasten Seatbelt (Safe)'}</span>
            </button>
          </div>

          {/* 3. Weather Conditions Selector */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              ENVIRONMENT &amp; GROUND CONDITIONS:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {(['clear', 'rain', 'dust', 'darkness', 'heat'] as WeatherCondition[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWeather(w)}
                  style={{
                    padding: '8px 2px',
                    borderRadius: '6px',
                    background: weather === w ? 'var(--electric-blue)' : 'rgba(255, 255, 255, 0.04)',
                    color: weather === w ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--cockpit-glass-border)',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Machine Kinematic Injections (Tilt & Harsh Stop) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => injectExcessiveTilt(19.8)}
              className="cockpit-btn cockpit-btn-ghost"
              style={{ flex: 1, fontSize: '11px' }}
            >
              <Compass size={15} />
              <span>Excessive Tilt (19.8°)</span>
            </button>

            <button
              onClick={injectHarshStop}
              className="cockpit-btn cockpit-btn-ghost"
              style={{ flex: 1, fontSize: '11px' }}
            >
              <AlertTriangle size={15} />
              <span>Harsh Stop (4.8G)</span>
            </button>
          </div>

          {/* 5. Operator Idle & Fatigue */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={injectIdleTimeout}
              className="cockpit-btn cockpit-btn-ghost"
              style={{ flex: 1, fontSize: '11px' }}
            >
              <Clock size={15} />
              <span>20-Min Idle Spike</span>
            </button>

            <button
              onClick={injectFatigueThreshold}
              className="cockpit-btn cockpit-btn-ghost"
              style={{ flex: 1, fontSize: '11px' }}
            >
              <Eye size={15} />
              <span>Fatigue Cycle Drift</span>
            </button>
          </div>
        </div>

        {/* Simulation Speed Control */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            SIMULATION SPEED:
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { val: 0, label: 'Pause' },
              { val: 0.5, label: '0.5x' },
              { val: 1, label: '1x (Real)' },
              { val: 2, label: '2x' },
              { val: 5, label: '5x' },
            ].map((spd) => (
              <button
                key={spd.val}
                onClick={() => setSimulationSpeed(spd.val)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '6px',
                  background: simulationSpeed === spd.val ? 'var(--cat-yellow)' : 'rgba(255, 255, 255, 0.05)',
                  color: simulationSpeed === spd.val ? '#0d1117' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: '1px solid var(--cockpit-glass-border)',
                  cursor: 'pointer',
                }}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div style={{ paddingTop: '20px', borderTop: '1px solid var(--cockpit-glass-border)' }}>
        <button
          onClick={resetScenario}
          className="cockpit-btn cockpit-btn-ghost"
          style={{ width: '100%', borderColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <RotateCcw size={16} />
          <span>Reset All Scenario Injections to Nominal</span>
        </button>
      </div>
    </div>
  );
};
