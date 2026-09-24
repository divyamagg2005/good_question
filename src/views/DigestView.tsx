import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import { useBackendStore, type ReadinessPoint } from '../sim/backendApi';
import {
  ClipboardList,
  User,
  Users,
  TrendingUp,
  CheckCircle2,
  ThumbsUp,
  Target,
  GraduationCap,
} from 'lucide-react';
import { LeaderboardWorkspace } from './LeaderboardWorkspace';

// End-of-shift digest. Readiness trend comes from GET /api/readiness/history, the summary
// (went well / to improve / training / incidents) from GET /api/digest/{operator}, and completed
// work from the sim's task log — nothing here is hardcoded.

const MAX_POINTS = 8;

function bucketHistory(history: ReadinessPoint[]) {
  const sorted = [...history].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  if (sorted.length <= MAX_POINTS) {
    return sorted.map((p) => ({ time: p.timestamp.slice(11, 16), score: Math.round(p.readiness_score) }));
  }
  // Split into equal time-ordered buckets and average each one.
  const size = Math.ceil(sorted.length / MAX_POINTS);
  const points: { time: string; score: number }[] = [];
  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size);
    const avg = chunk.reduce((sum, p) => sum + p.readiness_score, 0) / chunk.length;
    points.push({ time: chunk[chunk.length - 1].timestamp.slice(11, 16), score: Math.round(avg) });
  }
  return points;
}

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const scoreColor = (s: number) => (s >= 85 ? 'var(--safety-green)' : s >= 60 ? 'var(--safety-amber)' : 'var(--safety-red)');

export const DigestView: React.FC = () => {
  const {
    operatorName,
    operatorId,
    machineId,
    simClock,
    completedTasksHistory,
    safetyEvents,
    activeTask,
    getReadiness,
    completedLessonsCount,
  } = useOperatorStore();
  const readinessHistory = useBackendStore((s) => s.readinessHistory);
  const digest = useBackendStore((s) => s.digest);
  const digestError = useBackendStore((s) => s.errors.digest);
  const historyError = useBackendStore((s) => s.errors.readiness);

  const [activeTab, setActiveTab] = useState<'operator' | 'supervisor'>('operator');

  const { score } = getReadiness();

  const readinessTrendPoints = bucketHistory(readinessHistory);
  if (score !== null) readinessTrendPoints.push({ time: 'Now', score });
  const shiftAverage = readinessTrendPoints.length
    ? Math.round(readinessTrendPoints.reduce((sum, p) => sum + p.score, 0) / readinessTrendPoints.length)
    : null;

  const totalEvents = safetyEvents.length;
  const criticalEvents = safetyEvents.filter((e) => e.severity === 'critical' || e.severity === 'violation').length;
  const resolvedEvents = safetyEvents.filter((e) => e.resolved).length;

  const tile: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '6px' };

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        padding: '20px 24px',
        gap: '20px',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Top Controls: Dual Tabs (Operator vs Supervisor) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={22} style={{ color: 'var(--cat-yellow)' }} />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
              SHIFT DIGEST &amp; TELEMETRY ROLLUP
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {simClock ? `Sim time ${simClock.replace('T', ' ').slice(0, 16)} UTC` : 'Shift not started'} • {operatorName} ({operatorId}) • {machineId}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--cockpit-glass-border)',
            borderRadius: '8px',
            padding: '3px',
          }}
        >
          <button
            onClick={() => setActiveTab('operator')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'operator' ? 'var(--cat-yellow)' : 'transparent',
              color: activeTab === 'operator' ? '#0d1117' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <User size={14} />
            <span>Operator View</span>
          </button>

          <button
            onClick={() => setActiveTab('supervisor')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'supervisor' ? 'var(--electric-blue)' : 'transparent',
              color: activeTab === 'supervisor' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={14} />
            <span>Supervisor Audit View</span>
          </button>
        </div>
      </div>

      {activeTab === 'operator' ? (
        <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '20px', alignItems: 'start' }}>
          {/* Left Column: Readiness Trend & Task Rollup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} style={{ color: 'var(--cat-yellow)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                    Readiness Score Trend ({machineId})
                  </span>
                </div>
                <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: shiftAverage === null ? 'var(--text-muted)' : scoreColor(shiftAverage) }}>
                  Average: {shiftAverage ?? '--'} / 100
                </span>
              </div>

              {readinessTrendPoints.length === 0 ? (
                <div style={{ fontSize: '12px', color: historyError ? 'var(--safety-amber)' : 'var(--text-muted)', padding: '20px 0' }}>
                  {historyError ? `Could not load readiness history: ${historyError}` : 'No readiness history yet. Points appear as the backend scores this machine.'}
                </div>
              ) : (
                <div
                  style={{
                    height: '150px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  {readinessTrendPoints.map((pt, pidx) => {
                    // Scale from a 40 baseline so a few points of difference is still visible.
                    const heightPct = Math.max(8, Math.min(100, 20 + ((pt.score - 40) / 60) * 80));
                    const barColor = scoreColor(pt.score);
                    return (
                      <div
                        key={pidx}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          height: '100%',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <span className="mono-num" style={{ fontSize: '10px', fontWeight: 800, color: barColor }}>
                          {pt.score}
                        </span>
                        <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '28px',
                              height: `${heightPct}%`,
                              background: barColor,
                              borderRadius: '4px',
                              transition: 'height 0.4s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pt.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--safety-green)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                    Completed Shift Operations
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {completedTasksHistory.length} Task{completedTasksHistory.length === 1 ? '' : 's'} Completed
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedTasksHistory.length === 0 && !activeTask && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No tasks completed yet this shift.</div>
                )}
                {completedTasksHistory.map((task) => (
                  <div
                    key={task.taskId}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--cockpit-glass-border)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                        {task.title} ({task.taskId})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Completed at {task.completedAt} • Planned: {task.nominalMinutes}m • {task.volumeM3} m³
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cat-yellow)' }}>
                          {task.elapsedMinutes} min
                        </div>
                        <div style={{ fontSize: '10px', color: task.efficiencyPct >= 100 ? 'var(--safety-green)' : 'var(--safety-amber)', fontWeight: 700 }}>
                          {task.efficiencyPct}% of plan pace
                        </div>
                      </div>
                      <CheckCircle2 size={18} style={{ color: 'var(--safety-green)' }} />
                    </div>
                  </div>
                ))}

                {activeTask && (
                  <div
                    style={{
                      background: 'rgba(255, 184, 0, 0.08)',
                      border: '1px dashed var(--cat-yellow)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cat-yellow)' }}>
                        [CURRENTLY ACTIVE] {activeTask.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Elapsed: {Math.round(activeTask.elapsedSeconds / 60)}m •{' '}
                        {activeTask.predictionFromBackend
                          ? `Predicted: ${activeTask.predictedMinMinutes}–${activeTask.predictedMaxMinutes}m`
                          : `Planned: ${activeTask.nominalMinutes}m`}
                      </div>
                    </div>
                    <span className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--cat-yellow)' }}>
                      {activeTask.progressPct.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Backend digest & safety rollup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="glass-panel" style={{ padding: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ALERTS THIS SESSION</div>
                <div className="mono-num" style={{ fontSize: '24px', fontWeight: 900, color: criticalEvents > 0 ? 'var(--safety-red)' : 'var(--text-primary)' }}>
                  {totalEvents}{' '}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--safety-green)' }}>({resolvedEvents} cleared)</span>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MODULES PASSED</div>
                <div className="mono-num" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--electric-blue-light)' }}>
                  {completedLessonsCount}
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={16} style={{ color: 'var(--cat-yellow)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Backend Shift Digest</span>
              </div>

              {!digest ? (
                <div style={{ fontSize: '12px', color: digestError ? 'var(--safety-amber)' : 'var(--text-muted)' }}>
                  {digestError ? `Could not load digest: ${digestError}` : 'Loading digest from the backend…'}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <ThumbsUp size={15} style={{ color: 'var(--safety-green)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>WENT WELL</div>
                      <div style={{ fontSize: '13px', color: '#ffffff' }}>{digest.went_well ?? '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <Target size={15} style={{ color: 'var(--safety-amber)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TO IMPROVE</div>
                      <div style={{ fontSize: '13px', color: '#ffffff' }}>{digest.to_improve ? humanize(digest.to_improve) : '—'}</div>
                    </div>
                  </div>

                  {digest.suggested_training.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SUGGESTED TRAINING</div>
                      {digest.suggested_training.map((t) => (
                        <div key={t.module_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#ffffff' }}>
                          <GraduationCap size={13} style={{ color: 'var(--electric-blue-light)' }} />
                          <span>{t.title}</span>
                          <span style={{ color: 'var(--text-muted)' }}>({t.module_id} · {humanize(t.reason)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {(['warning', 'high', 'critical'] as const).map((sev) => (
                      <div key={sev} style={tile}>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{sev} alerts</div>
                        <div className="mono-num" style={{ fontSize: '16px', fontWeight: 800, color: sev === 'warning' ? 'var(--safety-amber)' : 'var(--safety-red)' }}>
                          {digest.alerts_by_severity[sev] ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div style={tile}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>IDLE</div>
                      <div className="mono-num" style={{ fontSize: '14px', fontWeight: 800 }}>{digest.idle_min} min</div>
                    </div>
                    <div style={tile}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>FUEL USED</div>
                      <div className="mono-num" style={{ fontSize: '14px', fontWeight: 800 }}>{digest.fuel_used_l} L</div>
                    </div>
                    <div style={tile}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>SEATBELT</div>
                      <div className="mono-num" style={{ fontSize: '14px', fontWeight: 800 }}>
                        {digest.seatbelt_compliance_pct === null ? '—' : `${digest.seatbelt_compliance_pct}%`}
                      </div>
                    </div>
                  </div>

                  {Object.keys(digest.anomaly_counts).length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Anomalies:</strong>{' '}
                      {Object.entries(digest.anomaly_counts).map(([k, v]) => `${humanize(k)} ×${v}`).join(' · ')}
                    </div>
                  )}

                  {Object.keys(digest.baseline).length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      <strong>Your baseline:</strong>{' '}
                      {Object.entries(digest.baseline).map(([k, v]) => `${humanize(k)} ${v ?? '—'}`).join(' · ')}
                    </div>
                  )}
                </>
              )}
            </div>

            {digest && (
              <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Recent Incidents</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{digest.incident_count} on record</span>
                </div>
                {digest.recent_incidents.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No incidents recorded.</div>
                )}
                {digest.recent_incidents.map((inc, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#ffffff' }}>{humanize(inc.incident_type)}</span>
                    <span style={{ color: inc.severity === 'high' || inc.severity === 'critical' ? 'var(--safety-red)' : 'var(--safety-amber)', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800 }}>
                      {inc.severity} · {inc.timestamp.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <LeaderboardWorkspace />
      )}
    </div>
  );
};
