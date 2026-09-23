import React, { useState } from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import type { ContributorDetail } from '../../types/cockpit';
import {
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  Info,
  X,
  ChevronRight,
  Radio,
  Eye,
  Activity,
  CloudSun,
  Lock,
} from 'lucide-react';

export const ReadinessInstrument: React.FC = () => {
  const { getReadiness, setSelectedContributor } = useOperatorStore();
  const { score, state, contributors } = getReadiness();

  const [activeModalId, setActiveModalId] = useState<ContributorDetail['id'] | null>(null);

  // SVG circular geometry
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (state === 'Optimal') return 'var(--safety-green)';
    if (state === 'Caution') return 'var(--safety-amber)';
    return 'var(--safety-red)';
  };

  const getStatusIcon = () => {
    if (state === 'Optimal') return <ShieldCheck size={18} />;
    if (state === 'Caution') return <AlertTriangle size={18} />;
    return <OctagonAlert size={18} />;
  };

  const getContributorIcon = (id: ContributorDetail['id']) => {
    switch (id) {
      case 'seatbelt':
        return <Lock size={15} />;
      case 'proximity':
        return <Radio size={15} />;
      case 'fatigue':
        return <Eye size={15} />;
      case 'machineBehavior':
        return <Activity size={15} />;
      case 'conditions':
        return <CloudSun size={15} />;
    }
  };

  const currentDetail = contributors.find((c) => c.id === activeModalId);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '18px', background: getColor(), borderRadius: '2px' }} />
          <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            System Readiness Instrument
          </span>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background:
              state === 'Optimal'
                ? 'rgba(16, 185, 129, 0.15)'
                : state === 'Caution'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(239, 68, 68, 0.2)',
            color: getColor(),
            fontWeight: 800,
            fontSize: '11px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {getStatusIcon()}
          <span>{state}</span>
        </div>
      </div>

      {/* Main Gauge & Contributors Group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
        {/* Circular SVG Gauge */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
            />
            {/* Value Stroke */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={getColor()}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
              }}
            />
          </svg>

          {/* Central Numeric Score */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              className="mono-num"
              style={{
                fontSize: '44px',
                fontWeight: 900,
                color: getColor(),
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginTop: '4px',
                textTransform: 'uppercase',
              }}
            >
              READINESS / 100
            </span>
          </div>
        </div>

        {/* 5 Selectable Contributing Signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            SELECT CONTRIBUTING SIGNAL TO EXPLAIN:
          </div>

          {contributors.map((contrib) => {
            const isSelected = activeModalId === contrib.id;
            const contribColor =
              contrib.status === 'safe'
                ? 'var(--safety-green)'
                : contrib.status === 'caution'
                ? 'var(--safety-amber)'
                : 'var(--safety-red)';

            return (
              <button
                key={contrib.id}
                onClick={() => {
                  setActiveModalId(contrib.id);
                  setSelectedContributor(contrib.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? `1px solid ${contribColor}` : '1px solid var(--cockpit-glass-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: contribColor }}>{getContributorIcon(contrib.id)}</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {contrib.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{contrib.triggerValue}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="mono-num"
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: contribColor,
                    }}
                  >
                    {contrib.score}%
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contributor Explainability Modal / Card Drawer */}
      {currentDetail && (
        <div
          style={{
            position: 'absolute',
            inset: '10px',
            background: 'rgba(15, 20, 30, 0.96)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: `1px solid ${
              currentDetail.status === 'safe'
                ? 'var(--safety-green)'
                : currentDetail.status === 'caution'
                ? 'var(--safety-amber)'
                : 'var(--safety-red)'
            }`,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 50,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} style={{ color: 'var(--cat-yellow)' }} />
                <span style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Signal Audit: {currentDetail.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveModalId(null);
                  setSelectedContributor(null);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                borderLeft: `4px solid ${
                  currentDetail.status === 'safe'
                    ? 'var(--safety-green)'
                    : currentDetail.status === 'caution'
                    ? 'var(--safety-amber)'
                    : 'var(--safety-red)'
                }`,
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                {currentDetail.headline}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {currentDetail.explanation}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CURRENT READING</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }} className="mono-num">
                  {currentDetail.triggerValue}
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SCORE IMPACT (WEIGHT)</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cat-yellow)' }} className="mono-num">
                  {currentDetail.score}% ({currentDetail.weight}% of Total)
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--electric-blue-light)', marginBottom: '4px' }}>
                RECOMMENDED OPERATOR ACTION:
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {currentDetail.correctiveAction}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              onClick={() => {
                setActiveModalId(null);
                setSelectedContributor(null);
              }}
              className="cockpit-btn cockpit-btn-ghost"
              style={{ padding: '8px 20px', fontSize: '12px' }}
            >
              Close Signal Audit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
