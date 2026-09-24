import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import type { TaskItem, AnomalyFlag, WalkaroundCheckItem } from '../types/cockpit';
import { ReadinessInstrument } from '../components/readiness/ReadinessInstrument';
import { ActiveTaskPanel } from '../components/task/ActiveTaskPanel';
import { SafetyProtocolStack } from '../components/safety/SafetyProtocolStack';
import { LiveTelemetryStrip } from '../components/telemetry/LiveTelemetryStrip';
import {
  GraduationCap,
  Sparkles,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  Circle,
  Layers,
  X,
  ArrowRight,
} from 'lucide-react';

export const TodayView: React.FC = () => {
  const {
    walkaroundCompleted,
    walkaroundItems,
    toggleWalkaroundItem,
    completeWalkaround,
    upcomingQueue,
    anomalyFlags,
    setDestination,
    getActiveLesson,
    machineId,
    machineModel,
    operatorName,
    operatorId,
  } = useOperatorStore();
  const activeLesson = getActiveLesson();

  const [isWalkaroundModalOpen, setIsWalkaroundModalOpen] = useState(false);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const selectedAnomaly = anomalyFlags.find((a: AnomalyFlag) => a.id === selectedAnomalyId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: '16px',
      }}
    >
      {/* Scrollable Cockpit Grid */}
      <div
        className="grid-2-col"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '16px',
        }}
      >
        {/* Left Column: Primary Operation Focus */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Task Focal Surface (Yellow) */}
          <ActiveTaskPanel onOpenWalkaroundModal={() => setIsWalkaroundModalOpen(true)} />

          {/* Upcoming Task Queue (Compact) */}
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} style={{ color: 'var(--cat-yellow)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Shift Task Sequence (Next in Line)
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {upcomingQueue.length} Operations Queued
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingQueue.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No further tasks planned for today (GET /api/tasks/today).</div>
              )}
              {upcomingQueue.map((item: TaskItem, idx: number) => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--cockpit-glass-border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(255, 184, 0, 0.12)',
                        color: 'var(--cat-yellow)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Planned {item.nominalMinutes} min • {item.volumeM3Target ?? '—'} m³ • Zone {item.zoneId}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.operationType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior Micro-Lesson Prompt Card (Electric Blue) — backend-recommended module */}
          {activeLesson && (<div
            className="blue-guidance-surface"
            style={{
              padding: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setDestination('training')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'var(--electric-blue)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px var(--electric-blue-glow)',
                }}
              >
                <GraduationCap size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span
                    style={{
                      background: 'rgba(14, 165, 233, 0.25)',
                      color: 'var(--electric-blue-light)',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {activeLesson.badge}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{activeLesson.estimatedMinutes} min · {activeLesson.format.replace('_', ' ')}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                  {activeLesson.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {activeLesson.anomalySummary}
                </div>
              </div>
            </div>

            <button
              className="cockpit-btn cockpit-btn-blue"
              style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}
            >
              <span>{activeLesson.completed ? 'Review Quiz' : 'Launch Scenario'}</span>
              <ArrowRight size={14} />
            </button>
          </div>)}
        </div>

        {/* Right Column: Readiness Instrument & Safety Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Readiness Score Instrument */}
          <ReadinessInstrument />

          {/* Safety Protocol Stack & Proximity Radar */}
          <SafetyProtocolStack />

          {/* Machine Insights Feed Card */}
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--electric-blue)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Machine Behavior &amp; Kinematic Flags
                </span>
              </div>
              <button
                onClick={() => setDestination('insights')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--electric-blue-light)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Full Feed</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {anomalyFlags.length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No anomalies flagged by the backend this shift.</div>
              )}
              {anomalyFlags.map((flag: AnomalyFlag) => (
                <div
                  key={flag.id}
                  onClick={() => setSelectedAnomalyId(flag.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--cockpit-glass-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span
                        style={{
                          background: 'rgba(255, 184, 0, 0.15)',
                          color: 'var(--cat-yellow)',
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '3px',
                        }}
                      >
                        {flag.ruleOrModelId}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="mono-num">
                        {flag.timestamp}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {flag.title}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Telemetry Strip Fixed Bottom */}
      <LiveTelemetryStrip />

      {/* Pre-Shift Walkaround Checklist Modal */}
      {isWalkaroundModalOpen && (
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
              maxWidth: '620px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: '1px solid var(--cat-yellow)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ClipboardCheck size={24} style={{ color: 'var(--cat-yellow)' }} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>
                    PRE-SHIFT WALKAROUND INSPECTION
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {machineId} {machineModel} • {operatorName} ({operatorId})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsWalkaroundModalOpen(false)}
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

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Verify each checkpoint around the machine. Signing off starts the shift: the sim sends shift_context and walkaround_completed to the backend.
            </p>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {walkaroundItems.map((item: WalkaroundCheckItem) => (
                <button
                  key={item.id}
                  onClick={() => toggleWalkaroundItem(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: item.checked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${item.checked ? 'rgba(16, 185, 129, 0.4)' : 'var(--cockpit-glass-border)'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ color: item.checked ? 'var(--safety-green)' : 'var(--text-muted)' }}>
                    {item.checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {item.category}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: item.checked ? '#ffffff' : 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px' }}>
              <button
                onClick={() => {
                  completeWalkaround();
                  setIsWalkaroundModalOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--cat-yellow)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Mark All Verified (Demo Shortcut)
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setIsWalkaroundModalOpen(false)}
                  className="cockpit-btn cockpit-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  disabled={!walkaroundCompleted && !walkaroundItems.every((i: WalkaroundCheckItem) => i.checked)}
                  onClick={() => {
                    completeWalkaround();
                    setIsWalkaroundModalOpen(false);
                  }}
                  className="cockpit-btn cockpit-btn-primary"
                  style={{
                    opacity: walkaroundCompleted || walkaroundItems.every((i: WalkaroundCheckItem) => i.checked) ? 1 : 0.5,
                  }}
                >
                  Sign Off &amp; Start Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anomaly Detail Popover */}
      {selectedAnomaly && (
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
                  Model Flag: {selectedAnomaly.ruleOrModelId}
                </span>
              </div>
              <button
                onClick={() => setSelectedAnomalyId(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
              {selectedAnomaly.title}
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>WHY FLAGGED:</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {selectedAnomaly.whyFlagged}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>EVIDENCE DATA:</div>
              <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedAnomaly.evidence.map((ev: string, i: number) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--cockpit-glass-border-blue)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--electric-blue-light)', marginBottom: '4px' }}>
                RECOMMENDED CORRECTIVE ACTION:
              </div>
              <div style={{ fontSize: '13px', color: '#ffffff' }}>
                {selectedAnomaly.recommendedAction}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setSelectedAnomalyId(null)}
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
