import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import { useBackendStore } from '../sim/backendApi';
import type { ProximityTarget, SafetyEvent } from '../types/cockpit';
import {
  ShieldAlert,
  FileSpreadsheet,
  Mic,
  Camera,
  CheckCircle,
  Compass,
  Activity,
  User,
  Truck,
  X,
  Volume2,
} from 'lucide-react';

export const SafetyView: React.FC = () => {
  const {
    weather,
    maxSafeSlopeDeg,
    proximityMultiplier,
    proximityTargets,
    safetyEvents,
    activeIncident,
    isIncidentDrawerOpen,
    toggleIncidentDrawer,
    openIncidentReportForEvent,
    resolveActiveIncident,
    toggleVoiceMemo,
    togglePhotoProof,
    acknowledgeEvent,
    dangerRadiusM,
    cautionRadiusM,
    zoneReason,
    sensingRangeM,
    telemetry,
    machineModel,
    visibilityM,
    groundCondition,
  } = useOperatorStore();
  const incidents = useBackendStore((s) => s.incidents);
  const incidentsError = useBackendStore((s) => s.errors.incidents);

  const [incidentNotes, setIncidentNotes] = useState('');

  const hasRedTarget = proximityTargets.some((t: ProximityTarget) => t.zone === 'red');

  // One scale for rings and targets: the sensor range fills the radar.
  const radarBaseSize = 340;
  const pxPerM = 170 / sensingRangeM;
  const redRadius = dangerRadiusM * pxPerM;
  const amberRadius = cautionRadiusM * pxPerM;
  const greenRadius = sensingRangeM * pxPerM;
  const adverse = zoneReason !== null || proximityMultiplier > 1;
  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(telemetry.headingDeg / 45) % 8];

  return (
    <div
      className="responsive-stack"
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left/Center: Dynamic Full Top-Down Radar Field */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 20px',
          gap: '12px',
          overflowY: 'auto',
        }}
      >
        {/* Conditions Adaptation Banner */}
        <div
          style={{
            background: adverse ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${adverse ? 'var(--electric-blue)' : 'var(--cockpit-glass-border)'}`,
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={18} style={{ color: adverse ? 'var(--electric-blue-light)' : 'var(--cat-yellow)' }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#ffffff' }}>
                Active Safety Adaptations ({weather.toUpperCase()} CONDITION)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {zoneReason
                  ? `Backend widened the zones (${zoneReason}): danger ${dangerRadiusM} m, caution ${cautionRadiusM} m.`
                  : `Backend zones: danger ${dangerRadiusM} m, caution ${cautionRadiusM} m.`}{' '}
                Ground {groundCondition}, visibility {visibilityM.toLocaleString()} m, sensors report to {sensingRangeM} m.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              ZONE SCALE: <span className="mono-num" style={{ color: 'var(--cat-yellow)' }}>{proximityMultiplier.toFixed(1)}x</span>
            </div>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              TILT LIMIT: <span className="mono-num" style={{ color: Math.abs(telemetry.pitchDeg) > maxSafeSlopeDeg ? 'var(--safety-red)' : 'var(--safety-green)' }}>{maxSafeSlopeDeg}°</span>
            </div>
          </div>
        </div>

        {/* Top-Down Proximity Radar Visualization */}
        <div
          className="glass-panel"
          style={{
            flex: 1,
            minHeight: '440px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: 'radial-gradient(circle, rgba(16, 24, 40, 0.95) 0%, rgba(9, 12, 17, 0.98) 100%)',
          }}
        >
          {/* Radar Sweep Effect */}
          <div
            className="animate-radar-sweep"
            style={{
              position: 'absolute',
              width: `${radarBaseSize * 1.5}px`,
              height: `${radarBaseSize * 1.5}px`,
              background: 'conic-gradient(from 0deg, rgba(14, 165, 233, 0.15) 0deg, rgba(14, 165, 233, 0) 60deg, transparent 360deg)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          {/* Concentric Safety Zones */}
          {/* Green Zone (Outer) */}
          <div
            style={{
              position: 'absolute',
              width: `${greenRadius * 2}px`,
              height: `${greenRadius * 2}px`,
              borderRadius: '50%',
              border: '1.5px dashed rgba(16, 185, 129, 0.45)',
              background: 'rgba(16, 185, 129, 0.02)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--safety-green)', marginTop: '-8px', background: 'rgba(0,0,0,0.8)', padding: '0 4px' }}>
              SENSOR RANGE ({sensingRangeM} M)
            </span>
          </div>

          {/* Amber Zone (Buffer) */}
          <div
            style={{
              position: 'absolute',
              width: `${amberRadius * 2}px`,
              height: `${amberRadius * 2}px`,
              borderRadius: '50%',
              border: '2px solid rgba(245, 158, 11, 0.6)',
              background: 'rgba(245, 158, 11, 0.05)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--safety-amber)', marginTop: '-8px', background: 'rgba(0,0,0,0.8)', padding: '0 4px' }}>
              AMBER CAUTION ZONE ({dangerRadiusM}–{cautionRadiusM} M)
            </span>
          </div>

          {/* Red Zone (Implement Swing Danger Zone) */}
          <div
            style={{
              position: 'absolute',
              width: `${redRadius * 2}px`,
              height: `${redRadius * 2}px`,
              borderRadius: '50%',
              border: `2.5px solid ${hasRedTarget ? 'var(--safety-red)' : 'rgba(239, 68, 68, 0.7)'}`,
              background: hasRedTarget ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.08)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              animation: hasRedTarget ? 'pulse-border-red 1.2s infinite' : 'none',
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--safety-red)', marginTop: '-8px', background: 'rgba(0,0,0,0.8)', padding: '0 4px' }}>
              RED DANGER ZONE (&lt; {dangerRadiusM} M)
            </span>
          </div>

          {/* Center Excavator Footprint */}
          <div
            style={{
              position: 'relative',
              width: '46px',
              height: '64px',
              background: 'linear-gradient(180deg, #ffb800 0%, #d97706 100%)',
              borderRadius: '6px',
              border: '2px solid #0d1117',
              boxShadow: '0 0 20px var(--cat-yellow-glow)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 2px',
              zIndex: 30,
            }}
          >
            {/* Tracks */}
            <div style={{ width: '38px', height: '6px', background: '#0d1117', borderRadius: '2px' }} />
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#0d1117' }}>{machineModel.replace('CAT ', '')}</div>
            <div style={{ width: '38px', height: '6px', background: '#0d1117', borderRadius: '2px' }} />
          </div>

          {/* Dynamic Radar Targets */}
          {proximityTargets.map((tgt: ProximityTarget) => {
            const rad = (tgt.angleDeg - 90) * (Math.PI / 180);
            const scaledDist = tgt.distanceM * pxPerM;
            const posX = Math.cos(rad) * scaledDist;
            const posY = Math.sin(rad) * scaledDist;

            const isRed = tgt.zone === 'red';
            const isAmber = tgt.zone === 'amber';
            const targetColor = isRed ? 'var(--safety-red)' : isAmber ? 'var(--safety-amber)' : 'var(--safety-green)';

            return (
              <div
                key={tgt.id}
                style={{
                  position: 'absolute',
                  transform: `translate(${posX}px, ${posY}px)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 40,
                }}
              >
                <div
                  style={{
                    width: isRed ? '28px' : '22px',
                    height: isRed ? '28px' : '22px',
                    borderRadius: '50%',
                    background: targetColor,
                    border: '2px solid #ffffff',
                    color: isRed ? '#ffffff' : '#0d1117',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 12px ${targetColor}`,
                    animation: isRed ? 'pulse-badge 1s infinite' : 'none',
                  }}
                >
                  {tgt.type === 'worker' ? <User size={isRed ? 16 : 13} /> : <Truck size={isRed ? 16 : 13} />}
                </div>

                <div
                  style={{
                    background: 'rgba(9, 12, 16, 0.92)',
                    border: `1px solid ${targetColor}`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  <div>{tgt.name}</div>
                  <div className="mono-num" style={{ color: targetColor, fontWeight: 900 }}>
                    {tgt.distanceM}m · {tgt.angleDeg}° ({tgt.zone.toUpperCase()}{tgt.inBlindSpot ? ' · BLIND SPOT' : ''})
                  </div>
                </div>
              </div>
            );
          })}

          {/* Compass Orientation Indicator */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            <Compass size={16} />
            <span>HEADING {telemetry.headingDeg.toString().padStart(3, '0')}° {compass} · TARGET BEARINGS RELATIVE TO CAB</span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--safety-red)' }} />
              <span>Red &lt;{dangerRadiusM}m</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--safety-amber)' }} />
              <span>Amber {dangerRadiusM}–{cautionRadiusM}m</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--safety-green)' }} />
              <span>Green &gt;{cautionRadiusM}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Safety Events & Incident Log */}
      <div
        style={{
          width: '380px',
          background: 'var(--cockpit-panel-bg)',
          borderLeft: '1px solid var(--cockpit-glass-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '14px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--cat-yellow)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              Event Log &amp; Incidents
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {safetyEvents.length} Recorded
          </span>
        </div>
        {safetyEvents.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No backend alerts this shift. Alerts from the cab socket appear here as they happen.</div>
        )}

        {/* List of events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {safetyEvents.map((evt: SafetyEvent) => {
            const isCritical = evt.severity === 'critical' || evt.severity === 'violation';
            const isWarning = evt.severity === 'warning';
            const color = isCritical ? 'var(--safety-red)' : isWarning ? 'var(--safety-amber)' : 'var(--safety-green)';

            return (
              <div
                key={evt.id}
                style={{
                  background: isCritical
                    ? 'rgba(239, 68, 68, 0.12)'
                    : isWarning
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${color}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      background: color,
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
                  <span className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {evt.timestamp}
                  </span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                  {evt.title}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {evt.reason}{evt.resolved ? ' · cleared by backend' : ''}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <span className="mono-num" style={{ fontSize: '11px', color: color, fontWeight: 700 }}>
                    {evt.triggerValue}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {evt.requiresIncidentReport && (
                      <button
                        onClick={() => openIncidentReportForEvent(evt)}
                        className="cockpit-btn"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          minHeight: '32px',
                          background: 'rgba(14, 165, 233, 0.2)',
                          color: 'var(--electric-blue-light)',
                          border: '1px solid var(--electric-blue)',
                        }}
                      >
                        <FileSpreadsheet size={12} />
                        Docket
                      </button>
                    )}

                    {!evt.acknowledged && (
                      <button
                        onClick={() => acknowledgeEvent(evt.id)}
                        className="cockpit-btn"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          minHeight: '32px',
                          background: color,
                          color: isCritical ? '#ffffff' : '#0d1117',
                        }}
                      >
                        Ack
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Backend incident history (GET /api/incidents) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>Incident History</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{incidents.length} on record</span>
        </div>
        {incidentsError && <div style={{ fontSize: '11px', color: 'var(--safety-amber)' }}>Could not load incidents: {incidentsError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {incidents.slice(0, 12).map((inc) => (
            <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--cockpit-glass-border)' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>{inc.incident_type.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{inc.cause} · {inc.source.replace(/_/g, ' ')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: inc.severity === 'critical' || inc.severity === 'high' ? 'var(--safety-red)' : inc.severity === 'warning' ? 'var(--safety-amber)' : 'var(--text-secondary)' }}>{inc.severity}</div>
                <div className="mono-num" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{inc.timestamp.slice(0, 16).replace('T', ' ')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident Capture Drawer (Slide-Over from Right) */}
      {isIncidentDrawerOpen && activeIncident && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '420px',
            background: 'rgba(11, 15, 23, 0.98)',
            backdropFilter: 'blur(24px)',
            borderLeft: '2px solid var(--safety-red)',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    padding: '6px',
                    borderRadius: '6px',
                    color: 'var(--safety-red)',
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    INCIDENT CAPTURE DOCKET
                  </h3>
                  <div className="mono-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {activeIncident.id} • {activeIncident.timestamp}
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleIncidentDrawer(false)}
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

            {/* Event Title */}
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '11px', color: 'var(--safety-red)', fontWeight: 800 }}>TRIGGER EVENT:</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                {activeIncident.eventTitle}
              </div>
            </div>

            {/* 30-Second Synchronized Telemetry Snapshot */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Machine Telemetry When Docket Opened:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ENGINE RPM</div>
                  <div className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                    {activeIncident.telemetrySnapshot.engineRpm} RPM
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>HYDRAULIC PRESSURE</div>
                  <div className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                    {activeIncident.telemetrySnapshot.hydraulicPressurePsi} PSI
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CLOSEST DISTANCE</div>
                  <div className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--safety-red)' }}>
                    {activeIncident.telemetrySnapshot.closestObjectDistM ?? '—'} m
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '8px 12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CHASSIS PITCH</div>
                  <div className="mono-num" style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                    {activeIncident.telemetrySnapshot.pitchDeg}°
                  </div>
                </div>
              </div>
            </div>

            {/* Voice-Note Simulation Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Operator Audio Voice Memo:
              </div>
              <button
                type="button"
                onClick={toggleVoiceMemo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: activeIncident.hasVoiceMemo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${activeIncident.hasVoiceMemo ? 'var(--safety-green)' : 'var(--cockpit-glass-border)'}`,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mic size={16} style={{ color: activeIncident.hasVoiceMemo ? 'var(--safety-green)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>
                    {activeIncident.hasVoiceMemo ? 'Voice Note Attached (0:12)' : 'Record Operator Voice Memo'}
                  </span>
                </div>
                {activeIncident.hasVoiceMemo ? (
                  <Volume2 size={16} style={{ color: 'var(--safety-green)' }} />
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TAP TO RECORD</span>
                )}
              </button>
            </div>

            {/* Photo / Camera Evidence Simulation Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                360° Camera Snapshot Evidence:
              </div>
              <button
                type="button"
                onClick={togglePhotoProof}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: activeIncident.hasPhotoProof ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${activeIncident.hasPhotoProof ? 'var(--electric-blue)' : 'var(--cockpit-glass-border)'}`,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Camera size={16} style={{ color: activeIncident.hasPhotoProof ? 'var(--electric-blue)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>
                    {activeIncident.hasPhotoProof ? 'Camera frame attached' : 'Capture Camera Frame'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{activeIncident.hasPhotoProof ? 'ATTACHED' : 'TAP TO ATTACH'}</span>
              </button>
            </div>

            {/* Field Operator Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Field Resolution Notes:
              </div>
              <textarea
                value={incidentNotes || activeIncident.notes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--cockpit-glass-border)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>
          </div>

          {activeIncident.submitError && (
            <div style={{ fontSize: '11px', color: 'var(--safety-red)' }}>Report failed: {activeIncident.submitError}</div>
          )}
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '16px' }}>
            <button
              onClick={() => toggleIncidentDrawer(false)}
              className="cockpit-btn cockpit-btn-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              onClick={() => { void resolveActiveIncident(incidentNotes); }}
              className="cockpit-btn"
              style={{
                flex: 1.4,
                background: 'var(--safety-green)',
                color: '#ffffff',
                fontWeight: 800,
              }}
            >
              <CheckCircle size={16} />
              Report to Backend &amp; Resolve
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
