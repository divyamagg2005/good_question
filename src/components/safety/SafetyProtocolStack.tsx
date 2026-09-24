import React from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import {
  ShieldAlert,
  Radio,
  Lock,
  Compass,
  Eye,
  Maximize2,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface SafetyProtocolStackProps {
  onExpandToFullSafety?: () => void;
}

export const SafetyProtocolStack: React.FC<SafetyProtocolStackProps> = ({ onExpandToFullSafety }) => {
  const {
    seatbeltFastened,
    fatigueDetected,
    tiltAngleExcessive,
    maxSafeSlopeDeg,
    dangerRadiusM,
    cautionRadiusM,
    sensingRangeM,
    telemetry,
    safetyEvents,
    proximityTargets,
    acknowledgeEvent,
    openIncidentReportForEvent,
    setDestination,
  } = useOperatorStore();

  const handleExpand = () => {
    if (onExpandToFullSafety) {
      onExpandToFullSafety();
    } else {
      setDestination('safety');
    }
  };

  const hasRedWorker = proximityTargets.some((t) => t.zone === 'red');
  // Mini radar: sensor range fills a 58 px radius; rings and targets share the scale.
  const pxPerM = 58 / sensingRangeM;

  // Filter unacknowledged or recent events
  const displayEvents = safetyEvents.slice(0, 4);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} style={{ color: hasRedWorker ? 'var(--safety-red)' : 'var(--cat-yellow)' }} />
          <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Safety Protocol Stack & Radar
          </span>
        </div>

        <button
          onClick={handleExpand}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--cockpit-glass-border)',
            borderRadius: '6px',
            color: 'var(--cat-yellow)',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="Open Full Screen Radar & Incident Center"
        >
          <Maximize2 size={13} />
          <span>Expand Field</span>
        </button>
      </div>

      {/* Mini Top-Down Proximity Radar Preview */}
      <div
        onClick={handleExpand}
        style={{
          height: '140px',
          background: 'radial-gradient(circle, rgba(14, 23, 38, 0.9) 0%, rgba(9, 12, 16, 0.98) 100%)',
          borderRadius: '10px',
          border: `1px solid ${hasRedWorker ? 'var(--safety-red)' : 'var(--cockpit-glass-border)'}`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: hasRedWorker ? '0 0 16px rgba(239, 68, 68, 0.3)' : 'none',
        }}
      >
        {/* Dynamic Concentric Rings */}
        <div
          style={{
            position: 'absolute',
            width: `${sensingRangeM * pxPerM * 2}px`,
            height: `${sensingRangeM * pxPerM * 2}px`,
            borderRadius: '50%',
            border: '1px dashed rgba(16, 185, 129, 0.4)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: `${cautionRadiusM * pxPerM * 2}px`,
            height: `${cautionRadiusM * pxPerM * 2}px`,
            borderRadius: '50%',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: `${dangerRadiusM * pxPerM * 2}px`,
            height: `${dangerRadiusM * pxPerM * 2}px`,
            borderRadius: '50%',
            border: '1.5px solid rgba(239, 68, 68, 0.8)',
            background: hasRedWorker ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            pointerEvents: 'none',
          }}
        />

        {/* Center Excavator Icon */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            background: 'var(--cat-yellow)',
            color: '#0d1117',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '11px',
            zIndex: 10,
            boxShadow: '0 0 10px var(--cat-yellow-glow)',
          }}
        >
          EXC
        </div>

        {/* Dynamic Targets plotted on mini-radar */}
        {proximityTargets.map((tgt) => {
          // Compute polar offset
          const rad = (tgt.angleDeg - 90) * (Math.PI / 180);
          const scaledDist = Math.min(58, tgt.distanceM * pxPerM);
          const posX = Math.cos(rad) * scaledDist;
          const posY = Math.sin(rad) * scaledDist;

          const isRed = tgt.zone === 'red';
          const isAmber = tgt.zone === 'amber';

          return (
            <div
              key={tgt.id}
              style={{
                position: 'absolute',
                transform: `translate(${posX}px, ${posY}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  width: isRed ? '14px' : '10px',
                  height: isRed ? '14px' : '10px',
                  borderRadius: '50%',
                  background: isRed ? '#ef4444' : isAmber ? '#f59e0b' : '#10b981',
                  boxShadow: isRed ? '0 0 10px #ef4444' : 'none',
                  border: '1.5px solid #ffffff',
                  animation: isRed ? 'pulse-badge 1s infinite' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: isRed ? '#ef4444' : '#f0f4f8',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '1px 4px',
                  borderRadius: '3px',
                }}
                className="mono-num"
              >
                {tgt.distanceM}m
              </span>
            </div>
          );
        })}

        {/* Click to expand overlay label */}
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            right: '8px',
            fontSize: '9px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Radio size={10} />
          <span>RADAR 360° ACTIVE (CLICK TO OPEN)</span>
        </div>
      </div>

      {/* Safety Protocol Status Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {/* Seatbelt */}
        <div
          style={{
            background: seatbeltFastened ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.18)',
            border: `1px solid ${seatbeltFastened ? 'rgba(16, 185, 129, 0.3)' : 'var(--safety-red)'}`,
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
            <Lock size={12} />
            <span>SEATBELT</span>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: seatbeltFastened ? 'var(--safety-green)' : 'var(--safety-red)',
            }}
          >
            {seatbeltFastened ? 'LATCHED' : 'UNFASTENED'}
          </span>
        </div>

        {/* Slope / Tilt Limit */}
        <div
          style={{
            background: tiltAngleExcessive ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${tiltAngleExcessive ? 'var(--safety-red)' : 'var(--cockpit-glass-border)'}`,
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
            <Compass size={12} />
            <span>SLOPE ENVELOPE</span>
          </div>
          <span
            className="mono-num"
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: tiltAngleExcessive ? 'var(--safety-red)' : 'var(--text-primary)',
            }}
          >
            {telemetry.pitchDeg}° / {maxSafeSlopeDeg}° Max
          </span>
        </div>

        {/* Fatigue Status */}
        <div
          style={{
            background: fatigueDetected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.08)',
            border: `1px solid ${fatigueDetected ? 'var(--safety-amber)' : 'rgba(16, 185, 129, 0.3)'}`,
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
            <Eye size={12} />
            <span>VIGILANCE</span>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: fatigueDetected ? 'var(--safety-amber)' : 'var(--safety-green)',
            }}
          >
            {fatigueDetected ? 'BACKEND FLAG' : 'ALERT'}
          </span>
        </div>
      </div>

      {/* Real-time Safety Event Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          ACTIVE PROTOCOL LOG:
        </div>

        {displayEvents.map((evt) => {
          const isCritical = evt.severity === 'critical' || evt.severity === 'violation';
          const isWarning = evt.severity === 'warning';
          const badgeColor = isCritical ? 'var(--safety-red)' : isWarning ? 'var(--safety-amber)' : 'var(--safety-green)';

          return (
            <div
              key={evt.id}
              style={{
                background: isCritical
                  ? 'rgba(239, 68, 68, 0.14)'
                  : isWarning
                  ? 'rgba(245, 158, 11, 0.08)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${badgeColor}`,
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                animation: isCritical && !evt.acknowledged ? 'pulse-border-red 2s infinite' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: badgeColor,
                      color: isCritical ? '#ffffff' : '#0d1117',
                      fontSize: '9px',
                      fontWeight: 900,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {evt.severity}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {evt.title}
                  </span>
                </div>
                <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {evt.timestamp}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: badgeColor }}>{evt.triggerValue}</strong> — {evt.reason}
              </div>

              {/* Action buttons if unacknowledged or incident required */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                {evt.requiresIncidentReport && (
                  <button
                    onClick={() => openIncidentReportForEvent(evt)}
                    style={{
                      background: 'rgba(14, 165, 233, 0.2)',
                      border: '1px solid var(--electric-blue)',
                      color: 'var(--electric-blue-light)',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FileSpreadsheet size={12} />
                    <span>Incident Docket</span>
                  </button>
                )}

                {!evt.acknowledged ? (
                  <button
                    onClick={() => acknowledgeEvent(evt.id)}
                    className="cockpit-btn"
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      minHeight: '32px',
                      background: badgeColor,
                      color: isCritical ? '#ffffff' : '#0d1117',
                    }}
                  >
                    Acknowledge
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--safety-green)' }}>
                    <CheckCircle size={12} />
                    <span>Logged & Verified</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
