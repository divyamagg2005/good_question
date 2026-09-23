import React from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import {
  Gauge,
  Zap,
  Fuel,
  Activity,
  Compass,
  Thermometer,
  Radio,
} from 'lucide-react';

export const LiveTelemetryStrip: React.FC = () => {
  const { telemetry, maxSafeSlopeDeg } = useOperatorStore();

  const isRpmHigh = telemetry.engineRpm > 2100;
  const isPressureHigh = telemetry.hydraulicPressurePsi > 3750;
  const isTiltHigh = telemetry.pitchDeg > maxSafeSlopeDeg;
  const isObjectClose = telemetry.closestObjectDistM < 5.0;

  const items = [
    {
      id: 'rpm',
      label: 'ENGINE SPEED',
      value: telemetry.engineRpm.toLocaleString(),
      unit: 'RPM',
      icon: <Gauge size={16} />,
      status: isRpmHigh ? 'warning' : 'safe',
      nominal: '1,200–2,000',
      trendPct: Math.min(100, (telemetry.engineRpm / 2400) * 100),
    },
    {
      id: 'speed',
      label: 'GROUND SPEED',
      value: telemetry.groundSpeedKmh.toFixed(1),
      unit: 'KM/H',
      icon: <Zap size={16} />,
      status: 'safe',
      nominal: '0.0–5.5 Max',
      trendPct: Math.min(100, (telemetry.groundSpeedKmh / 5.5) * 100),
    },
    {
      id: 'fuel',
      label: 'FUEL LEVEL',
      value: `${telemetry.fuelLevelPct}%`,
      unit: 'DEF 92%',
      icon: <Fuel size={16} />,
      status: telemetry.fuelLevelPct < 20 ? 'warning' : 'safe',
      nominal: 'Range ~5.8h',
      trendPct: telemetry.fuelLevelPct,
    },
    {
      id: 'pressure',
      label: 'HYDRAULIC MAIN',
      value: telemetry.hydraulicPressurePsi.toLocaleString(),
      unit: 'PSI',
      icon: <Activity size={16} />,
      status: isPressureHigh ? 'warning' : 'safe',
      nominal: '< 3,800 PSI',
      trendPct: Math.min(100, (telemetry.hydraulicPressurePsi / 4200) * 100),
    },
    {
      id: 'tilt',
      label: 'CHASSIS PITCH',
      value: `${telemetry.pitchDeg}°`,
      unit: `LIM ${maxSafeSlopeDeg}°`,
      icon: <Compass size={16} />,
      status: isTiltHigh ? 'danger' : 'safe',
      nominal: `Max ${maxSafeSlopeDeg}° Safe`,
      trendPct: Math.min(100, (telemetry.pitchDeg / 30) * 100),
    },
    {
      id: 'temp',
      label: 'CAB ENVIRONMENT',
      value: `${telemetry.cabTempC.toFixed(1)}°`,
      unit: 'CELSIUS',
      icon: <Thermometer size={16} />,
      status: 'safe',
      nominal: 'HVAC Auto 21°',
      trendPct: 65,
    },
    {
      id: 'radar',
      label: 'CLOSEST OBJECT',
      value: `${telemetry.closestObjectDistM.toFixed(1)}m`,
      unit: telemetry.closestObjectDistM < 5.0 ? 'RED ZONE' : 'CLEAR',
      icon: <Radio size={16} />,
      status: isObjectClose ? 'danger' : telemetry.closestObjectDistM < 12.0 ? 'warning' : 'safe',
      nominal: '> 15.0m Normal',
      trendPct: Math.min(100, (telemetry.closestObjectDistM / 25) * 100),
    },
  ];

  return (
    <footer
      className="glass-panel"
      style={{
        margin: '0 20px 16px 20px',
        padding: '12px 18px',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '12px',
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        const isDanger = item.status === 'danger';
        const isWarning = item.status === 'warning';
        const statusColor = isDanger
          ? 'var(--safety-red)'
          : isWarning
          ? 'var(--safety-amber)'
          : 'var(--text-primary)';

        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              borderRight: '1px solid rgba(255, 255, 255, 0.06)',
              paddingRight: '10px',
            }}
          >
            {/* Label and Icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--text-muted)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              <span>{item.label}</span>
              <div style={{ color: statusColor }}>{item.icon}</div>
            </div>

            {/* Value & Tabular Numerals (zero layout shift) */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span
                className="mono-num"
                style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  color: statusColor,
                  lineHeight: 1.1,
                }}
              >
                {item.value}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {item.unit}
              </span>
            </div>

            {/* Threshold mini trend bar */}
            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginTop: '2px',
              }}
            >
              <div
                style={{
                  width: `${item.trendPct}%`,
                  height: '100%',
                  background: statusColor,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Nominal range indicator */}
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              {item.nominal}
            </div>
          </div>
        );
      })}
    </footer>
  );
};
