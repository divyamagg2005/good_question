import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import {
  ClipboardList,
  User,
  Users,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

export const DigestView: React.FC = () => {
  const {
    operatorName,
    operatorId,
    machineId,
    telemetry,
    completedTasksHistory,
    safetyEvents,
    activeTask,
    getReadiness,
    completedLessonsCount,
  } = useOperatorStore();

  const [activeTab, setActiveTab] = useState<'operator' | 'supervisor'>('operator');
  const [signedOff, setSignedOff] = useState(false);

  const { score } = getReadiness();

  // Synthetic hourly readiness points for the shift trend
  const readinessTrendPoints = [
    { time: '08:00', score: 98 },
    { time: '09:00', score: 96 },
    { time: '10:00', score: 92 },
    { time: '11:00', score: 88 },
    { time: '12:00', score: 94 },
    { time: '13:00', score: 90 },
    { time: 'Current', score: score },
  ];

  const totalEvents = safetyEvents.length;
  const criticalEvents = safetyEvents.filter((e) => e.severity === 'critical' || e.severity === 'violation').length;
  const resolvedEvents = safetyEvents.filter((e) => e.resolved).length;

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
              Shift 1 (07:00–15:30) • {operatorName} ({operatorId}) • {machineId}
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

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        {/* Left Column: Readiness Trend & Task Rollup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Readiness Trend Chart */}
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} style={{ color: 'var(--cat-yellow)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Readiness Score Trend Across Shift
                </span>
              </div>
              <span className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--safety-green)' }}>
                Shift Average: 93 / 100
              </span>
            </div>

            {/* Sparkline / Bar Graph */}
            <div
              style={{
                height: '110px',
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
                const heightPct = (pt.score / 100) * 80;
                const barColor =
                  pt.score >= 85
                    ? 'var(--safety-green)'
                    : pt.score >= 60
                    ? 'var(--safety-amber)'
                    : 'var(--safety-red)';

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
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pt.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completed Work vs Predicted Estimates */}
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--safety-green)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Completed Shift Operations
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {completedTasksHistory.length} Cycles Completed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {completedTasksHistory.map((task, tidx) => (
                <div
                  key={tidx}
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
                      {task.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Completed at {task.completedAt} • Nominal: {task.nominalMinutes}m
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono-num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cat-yellow)' }}>
                        {task.elapsedMinutes} min
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--safety-green)', fontWeight: 700 }}>
                        {task.efficiencyPct}% Efficiency
                      </div>
                    </div>
                    <CheckCircle2 size={18} style={{ color: 'var(--safety-green)' }} />
                  </div>
                </div>
              ))}

              {/* Active In-Progress Task */}
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
                    Elapsed: {Math.round(activeTask.elapsedSeconds / 60)}m • Predicted: {activeTask.predictedMinMinutes}–{activeTask.predictedMaxMinutes}m
                  </div>
                </div>
                <span className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--cat-yellow)' }}>
                  {activeTask.progressPct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Safety & Compliance Rollup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Key Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SAFETY EVENTS RECORDED</div>
              <div className="mono-num" style={{ fontSize: '24px', fontWeight: 900, color: criticalEvents > 0 ? 'var(--safety-red)' : 'var(--text-primary)' }}>
                {totalEvents}{' '}
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--safety-green)' }}>
                  ({resolvedEvents} Resolved)
                </span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MICRO-LESSONS PASSED</div>
              <div className="mono-num" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--electric-blue-light)' }}>
                {completedLessonsCount} Certified
              </div>
            </div>
          </div>

          {/* Supervisor View Special: Machine Telematics & Fleet Rollup */}
          {activeTab === 'supervisor' ? (
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--electric-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: 'var(--electric-blue)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--electric-blue-light)' }}>
                  Supervisor Compliance &amp; ECU Audit
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Operator Skill Level:</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>Level 4 Master (No restrictions)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Engine Run Hours:</span>
                  <span className="mono-num" style={{ fontWeight: 700, color: '#ffffff' }}>{telemetry.engineHours.toFixed(1)} hrs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Fuel Consumed:</span>
                  <span className="mono-num" style={{ fontWeight: 700, color: '#ffffff' }}>42.6 Liters (18.4 L/hr avg)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hydraulic Peak Relief Events:</span>
                  <span className="mono-num" style={{ fontWeight: 700, color: 'var(--safety-amber)' }}>1 (Within Tolerance)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Proximity Incidents Closed:</span>
                  <span style={{ fontWeight: 700, color: 'var(--safety-green)' }}>100% Signed Off</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: 'var(--safety-green)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Operator Safety &amp; Training Digest
                </span>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                All mandatory safety interlocks and training scenario verifications have been closed out. Your machine readiness score is currently in the Optimal band.
              </p>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--safety-green)' }}>
                  NEXT RECOMMENDED TRAINING:
                </div>
                <div style={{ fontSize: '12px', color: '#ffffff', marginTop: '2px' }}>
                  Advanced Grade Laser Autonomy &amp; Cat Grade with Assist
                </div>
              </div>
            </div>
          )}

          {/* Shift Sign-off Button */}
          <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
              Digital Shift Sign-Off
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Transmit telematics rollup, completed task log, and incident records to Caterpillar Jobsite Cloud.
            </p>

            {!signedOff ? (
              <button
                onClick={() => setSignedOff(true)}
                className="cockpit-btn cockpit-btn-primary"
                style={{ width: '100%' }}
              >
                <FileCheck size={16} />
                <span>Submit &amp; Sign Off Shift Report</span>
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid var(--safety-green)',
                  borderRadius: '6px',
                  color: 'var(--safety-green)',
                  fontWeight: 800,
                  fontSize: '12px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Shift Report Transmitted to Jobsite Cloud</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
