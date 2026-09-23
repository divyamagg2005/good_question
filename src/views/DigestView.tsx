import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import {
  ClipboardList,
  User,
  Users,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { LeaderboardWorkspace } from './LeaderboardWorkspace';

export const DigestView: React.FC = () => {
  const {
    operatorName,
    operatorId,
    machineId,
    completedTasksHistory,
    safetyEvents,
    activeTask,
    getReadiness,
    completedLessonsCount,
  } = useOperatorStore();

  const [activeTab, setActiveTab] = useState<'operator' | 'supervisor'>('operator');

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

      {/* Main Content Grid or Leaderboard */}
      {activeTab === 'operator' ? (
        <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '20px' }}>
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

          </div>
        </div>
      ) : (
        <LeaderboardWorkspace />
      )}
    </div>
  );
};
