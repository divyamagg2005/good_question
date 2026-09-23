import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import type { AnomalyFlag, TaskBenchmark } from '../types/cockpit';
import {
  Sparkles,
  TrendingUp,
  X,
  ChevronRight,
} from 'lucide-react';

export const InsightsView: React.FC = () => {
  const { anomalyFlags, taskBenchmarks, weather } = useOperatorStore();

  const [selectedFlag, setSelectedFlag] = useState<AnomalyFlag | null>(null);

  return (
    <div
      className="responsive-stack"
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        width: '100%',
        padding: '20px 24px',
        gap: '20px',
        overflowY: 'auto',
        // Top-align so each panel grows with its content instead of stretching to the viewport
        // height and letting overflowing content spill past its background.
        alignItems: 'flex-start',
      }}
    >
      {/* Left Column: Unusual Behaviors & Explainable Flags */}
      <div
        className="glass-panel"
        style={{
          flex: '1.1 1 0px',
          minWidth: 0,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--electric-blue)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              Kinematic &amp; Behavioral Anomaly Stream
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {anomalyFlags.length} Machine Flags Active
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Explainable ML models and rule-based edge inferencing analyze joystick inputs, hydraulic pressure transients, and GPS trajectories in real-time.
        </p>

        {/* List of Anomaly Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {anomalyFlags.map((flag: AnomalyFlag) => {
            const isHigh = flag.severity === 'high';
            const isMed = flag.severity === 'medium';
            const color = isHigh ? 'var(--safety-red)' : isMed ? 'var(--safety-amber)' : 'var(--cat-yellow)';

            return (
              <div
                key={flag.id}
                onClick={() => setSelectedFlag(flag)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${color}`,
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: color,
                        color: isHigh ? '#ffffff' : '#0d1117',
                        fontSize: '9px',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {flag.ruleOrModelId}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Source: {flag.sourceType}
                    </span>
                  </div>
                  <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {flag.timestamp}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                  {flag.title}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {flag.whyFlagged}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--electric-blue-light)', fontWeight: 700 }}>
                    Click to view telemetry evidence &amp; corrective action
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--electric-blue)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Predicted Task Ranges vs Actuals Comparison */}
      <div
        className="glass-panel"
        style={{
          flex: '1.3 1 0px',
          minWidth: 0,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: 'var(--cat-yellow)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              Predicted vs Actual Task Duration Benchmarks
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              color: weather === 'rain' ? 'var(--safety-amber)' : 'var(--safety-green)',
              fontWeight: 700,
            }}
          >
            {weather === 'rain' ? 'Rain Factor Active (+12m)' : 'Baseline Conditions'}
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Comparison of algorithmic predicted duration bands against actual cycle completion across heavy-equipment operations.
        </p>

        {/* Task Comparison Bands */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {taskBenchmarks.map((bm: TaskBenchmark, idx: number) => {
            const minTime = bm.predictedRange[0];
            const maxTime = bm.predictedRange[1];
            const hasStarted = bm.actualMinutes > 0;

            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--cockpit-glass-border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: 'rgba(255, 184, 0, 0.15)',
                        color: 'var(--cat-yellow)',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {bm.operation.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                      {bm.taskName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Predicted Band:</span>
                    <span className="mono-num" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cat-yellow)' }}>
                      {minTime}–{maxTime} min
                    </span>
                  </div>
                </div>

                {/* Restrained Visual Band Chart */}
                <div style={{ position: 'relative', height: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                  {/* Predicted Safe Envelope Band */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(minTime / 100) * 100}%`,
                      width: `${((maxTime - minTime) / 100) * 100}%`,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(255, 184, 0, 0.25)',
                      borderLeft: '2px solid var(--cat-yellow)',
                      borderRight: '2px solid var(--cat-yellow)',
                    }}
                  />

                  {/* Actual Marker if completed/active */}
                  {hasStarted && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(bm.actualMinutes / 100) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        background: bm.deltaMinutes <= 0 ? 'var(--safety-green)' : 'var(--safety-amber)',
                        boxShadow: `0 0 8px ${bm.deltaMinutes <= 0 ? 'var(--safety-green)' : 'var(--safety-amber)'}`,
                        zIndex: 10,
                      }}
                      title={`Actual Duration: ${bm.actualMinutes} min`}
                    />
                  )}
                </div>

                {/* Info Row: Delta and Primary Factor */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Primary Context Driver: <span style={{ color: '#ffffff', fontWeight: 600 }}>{bm.primaryFactor}</span>
                  </div>

                  {hasStarted ? (
                    <span
                      className="mono-num"
                      style={{
                        color: bm.deltaMinutes <= 0 ? 'var(--safety-green)' : 'var(--safety-amber)',
                        fontWeight: 800,
                      }}
                    >
                      Actual: {bm.actualMinutes}m ({bm.deltaMinutes > 0 ? `+${bm.deltaMinutes}m` : `${bm.deltaMinutes}m`})
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Pending Machine Dispatch</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flag Drill-Down Modal */}
      {selectedFlag && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 12, 16, 0.85)',
            backdropFilter: 'blur(16px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid var(--electric-blue)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--electric-blue)' }} />
                <span style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Rule / Model Audit: {selectedFlag.ruleOrModelId}
                </span>
              </div>
              <button
                onClick={() => setSelectedFlag(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
              {selectedFlag.title}
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>WHY FLAGGED:</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {selectedFlag.whyFlagged}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>EVIDENCE DATA:</div>
              <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedFlag.evidence.map((ev: string, i: number) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--cockpit-glass-border-blue)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--electric-blue-light)', marginBottom: '4px' }}>
                RECOMMENDED CORRECTIVE ACTION:
              </div>
              <div style={{ fontSize: '13px', color: '#ffffff' }}>
                {selectedFlag.recommendedAction}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setSelectedFlag(null)}
                className="cockpit-btn cockpit-btn-ghost"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
