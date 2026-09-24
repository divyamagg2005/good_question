import React from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import { BAR_TO_PSI, LIMITS } from '../../sim/siteConfig';
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
  const { telemetry, maxSafeSlopeDeg, dangerRadiusM, cautionRadiusM, sensingRangeM, simStatus } = useOperatorStore();

  // Thresholds: machine limits from the shared site config (spec §7); zone radii from the backend.
  const closest = telemetry.closestObjectDistM;
  const isRpmHigh = telemetry.engineRpm > LIMITS.rpmOverRev;
  const hydMaxPsi = LIMITS.hydPressureMaxBar * BAR_TO_PSI;
  const isPressureHigh = telemetry.hydraulicPressurePsi > hydMaxPsi;
  const isTiltHigh = Math.abs(telemetry.pitchDeg) > maxSafeSlopeDeg;
  const isObjectClose = closest !== null && closest < dangerRadiusM;
  const isObjectCaution = closest !== null && closest < cautionRadiusM;
  const isCabHot = telemetry.cabTempC > LIMITS.cabHeatStressC;
  const offline = simStatus === 'stopped';

  const items = [
    {
      id: 'rpm',
      label: 'ENGINE SPEED',
      value: telemetry.engineRpm.toLocaleString(),
      unit: 'RPM',
      icon: <Gauge size={16} />,
      status: isRpmHigh ? 'warning' : 'safe',
      nominal: `${LIMITS.rpmWorking[0].toLocaleString()}–${LIMITS.rpmWorking[1].toLocaleString()} working`,
      trendPct: Math.min(100, (telemetry.engineRpm / LIMITS.rpmOverRev) * 100),
    },
    {
      id: 'speed',
      label: 'GROUND SPEED',
      value: telemetry.groundSpeedKmh.toFixed(1),
      unit: 'KM/H',
      icon: <Zap size={16} />,
      status: telemetry.groundSpeedKmh > LIMITS.groundSpeedSiteMaxKmh ? 'warning' : 'safe',
      nominal: `0.0–${LIMITS.groundSpeedMaxKmh} travel`,
      trendPct: Math.min(100, (telemetry.groundSpeedKmh / LIMITS.groundSpeedSiteMaxKmh) * 100),
    },
    {
      id: 'fuel',
      label: 'FUEL LEVEL',
      value: `${telemetry.fuelLevelPct.toFixed(1)}%`,
      unit: `DEF ${telemetry.defLevelPct}%`,
      icon: <Fuel size={16} />,
      status: telemetry.fuelLevelPct < LIMITS.fuelLowPct ? 'warning' : 'safe',
      nominal: `Low below ${LIMITS.fuelLowPct}%`,
      trendPct: telemetry.fuelLevelPct,
    },
    {
      id: 'pressure',
      label: 'HYDRAULIC MAIN',
      value: telemetry.hydraulicPressurePsi.toLocaleString(),
      unit: 'PSI',
      icon: <Activity size={16} />,
      status: isPressureHigh ? 'warning' : 'safe',
      nominal: `< ${Math.round(hydMaxPsi).toLocaleString()} PSI`,
      trendPct: Math.min(100, (telemetry.hydraulicPressurePsi / hydMaxPsi) * 100),
    },
    {
      id: 'tilt',
      label: 'CHASSIS PITCH',
      value: `${telemetry.pitchDeg}°`,
      unit: `LIM ${maxSafeSlopeDeg}°`,
      icon: <Compass size={16} />,
      status: isTiltHigh ? 'danger' : 'safe',
      nominal: `Roll ${telemetry.rollDeg}°`,
      trendPct: Math.min(100, (Math.abs(telemetry.pitchDeg) / maxSafeSlopeDeg) * 100),
    },
    {
      id: 'temp',
      label: 'CAB ENVIRONMENT',
      value: `${telemetry.cabTempC.toFixed(1)}°`,
      unit: 'CELSIUS',
      icon: <Thermometer size={16} />,
      status: isCabHot ? 'warning' : 'safe',
      nominal: `Coolant ${telemetry.coolantTempC}°C`,
      trendPct: Math.min(100, (telemetry.cabTempC / LIMITS.cabHeatStressC) * 100),
    },
    {
      id: 'radar',
      label: 'CLOSEST OBJECT',
      value: closest === null ? '—' : `${closest.toFixed(1)}m`,
      unit: isObjectClose ? 'RED ZONE' : isObjectCaution ? 'CAUTION' : 'CLEAR',
      icon: <Radio size={16} />,
      status: isObjectClose ? 'danger' : isObjectCaution ? 'warning' : 'safe',
      nominal: closest === null ? `Nothing within ${sensingRangeM} m` : `Danger < ${dangerRadiusM} m · caution < ${cautionRadiusM} m`,
      trendPct: closest === null ? 100 : Math.min(100, (closest / sensingRangeM) * 100),
    },
  ].map((item) => (offline ? { ...item, status: 'safe', nominal: 'Shift not started' } : item));

  return (
    <footer
      id="telemetry-rail"
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
