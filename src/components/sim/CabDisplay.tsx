import { useEffect, useRef, useState } from 'react';
import { useLinkStore } from '../../sim/link';
import { chime, setAlarm, speak, stopSpeaking } from '../../sim/alarm';
import { SEVERITY_RANK, type Alert, type Assessment, type Severity } from '../../sim/protocol';
import { useSim } from '../../sim/useSim';

// Cab UI driven purely by backend `assessment` messages (spec section 10).

const ZONE_COLOR: Record<string, string> = { red: '#ff4545', amber: '#f0b534', green: '#38d39f' };
const SEVERITY_COLOR: Record<Severity, string> = { info: '#66b9d1', warning: '#f0b534', high: '#ff5a4a', critical: '#ff2d2d' };

function readinessColor(score: number) {
  return score >= 80 ? '#38d39f' : score >= 55 ? '#f0b534' : '#ff4545';
}

// ------------------------------------------------------------------ alerts + sound

export function CabAlertLayer() {
  const assessment = useLinkStore((s) => s.assessment);
  const muted = useLinkStore((s) => s.muted);
  const voice = useLinkStore((s) => s.voice);
  const cabStatus = useLinkStore((s) => s.cabStatus);
  const telStatus = useLinkStore((s) => s.telStatus);
  // While either socket is down, the backend can't hear the fix or send the all-clear.
  const linkDown = cabStatus !== 'open' || telStatus !== 'open';
  const alertLog = useLinkStore((s) => s.alertLog);
  const acknowledgeAlert = useLinkStore((s) => s.acknowledgeAlert);
  const chimed = useRef(new Set<string>());
  const spoken = useRef(new Set<string>());

  const alerts = assessment?.alerts ?? [];
  const critical = alerts.filter((a) => a.severity === 'critical');
  // Acknowledgement is shared with the dashboard's Safety view through the session alert log.
  const isAcked = (a: Alert) => alertLog.some((e) => e.alert.alert_id === a.alert_id && e.acknowledged);
  const banners = alerts.filter((a) => a.severity !== 'critical').sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  useEffect(() => {
    const list = assessment?.alerts ?? [];
    if (muted) {
      setAlarm('none');
      stopSpeaking();
      return;
    }
    // Speak each new alert (or escalation) once. Info alerts stay silent (spec section 10).
    list.forEach((a) => {
      const key = `${a.alert_id}:${a.severity}`;
      if (!voice || a.severity === 'info' || spoken.current.has(key)) return;
      spoken.current.add(key);
      speak(a.voice_text || a.message, assessment?.lang === 'hi' ? 'hi' : 'en');
    });
    list.forEach((a) => {
      const key = `${a.alert_id}:${a.severity}`;
      if (a.severity === 'warning' && !chimed.current.has(key)) {
        chimed.current.add(key);
        chime();
      }
    });
    const highUnacked = list.some((a) => a.severity === 'high' && !alertLog.some((e) => e.alert.alert_id === a.alert_id && e.acknowledged));
    setAlarm(list.some((a) => a.severity === 'critical') ? 'critical' : highUnacked ? 'high' : 'none');
  }, [assessment, alertLog, muted, voice]);

  useEffect(() => () => { setAlarm('none'); stopSpeaking(); }, []);

  // A critical alert needs the operator's attention: give the mouse back if mouse-look has it
  // locked, otherwise clicks keep going to the 3D view and the page feels frozen.
  const hasCritical = critical.length > 0;
  useEffect(() => {
    if (hasCritical && document.pointerLockElement) document.exitPointerLock();
  }, [hasCritical]);

  return (
    <>
      {critical.length > 0 && (
        <div className="cab-critical-overlay" role="alert">
          <div className="cab-critical-card">
            <div className="cab-critical-kicker">CRITICAL · {critical[0].alert_type.replace(/_/g, ' ')}</div>
            <div className="cab-critical-message">{critical[0].message}</div>
            {critical[0].recommended_action && <div className="cab-critical-action">{critical[0].recommended_action}</div>}
            {critical[0].adjusted_threshold_note && <div className="cab-critical-note">{critical[0].adjusted_threshold_note}</div>}
            {critical.length > 1 && <div className="cab-critical-note">+{critical.length - 1} more critical alert{critical.length > 2 ? 's' : ''}</div>}
            <div className="cab-critical-id">{critical.map((a) => a.alert_id).join(' · ')}</div>
            {linkDown && <div className="cab-critical-stale">Backend connection lost · reconnecting · this alert may be out of date</div>}
            <div className="cab-critical-hint">Clears automatically once the condition is resolved · use the Director panel to resolve it in the sim</div>
          </div>
        </div>
      )}
      {banners.length > 0 && (
        <div className={`cab-banner-stack${hasCritical ? ' cab-banner-stack-below' : ''}`}>
          {banners.map((a) => (
            <div key={a.alert_id} className={`cab-banner cab-banner-${a.severity}${isAcked(a) ? ' cab-banner-acked' : ''}`}>
              <div className="cab-banner-body">
                <strong>{a.severity.toUpperCase()}</strong>
                <span>{a.message}</span>
                {a.recommended_action && <em>{a.recommended_action}</em>}
              </div>
              {a.severity === 'high' && !isAcked(a) && (
                <button type="button" onClick={() => acknowledgeAlert(a.alert_id)}>Acknowledge</button>
              )}
              <small>{a.alert_id}</small>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ proximity ring

function ProximityRing({ assessment }: { assessment: Assessment | null }) {
  const size = 196;
  const c = size / 2;
  const danger = assessment?.zones.danger_radius_m ?? 5;
  const caution = assessment?.zones.caution_radius_m ?? 12;
  const range = Math.max(20, caution * 1.5);
  const scale = (c - 8) / range;
  const polar = (dist: number, bearing: number) => {
    const r = Math.min(dist, range) * scale;
    const a = (bearing * Math.PI) / 180;
    return [c + Math.sin(a) * r, c - Math.cos(a) * r];
  };
  const blind = (from: number, to: number, r: number) => {
    const [x1, y1] = polar(r / scale, from);
    const [x2, y2] = polar(r / scale, to);
    return `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };
  return (
    <svg className="cab-ring" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={c} cy={c} r={range * scale} fill="rgba(56,211,159,0.04)" stroke="rgba(143,170,168,0.25)" />
      <path d={blind(135, 225, range * scale)} fill="rgba(255,69,69,0.07)" />
      <circle cx={c} cy={c} r={caution * scale} fill="rgba(240,181,52,0.07)" stroke="#f0b534" strokeDasharray="4 3" />
      <circle cx={c} cy={c} r={danger * scale} fill="rgba(255,69,69,0.12)" stroke="#ff4545" />
      <line x1={c} y1={8} x2={c} y2={size - 8} stroke="rgba(143,170,168,0.15)" />
      <line x1={8} y1={c} x2={size - 8} y2={c} stroke="rgba(143,170,168,0.15)" />
      <text x={c} y={14} textAnchor="middle" className="cab-ring-label">FRONT</text>
      <text x={c} y={size - 6} textAnchor="middle" className="cab-ring-label">REAR</text>
      <rect x={c - 7} y={c - 10} width={14} height={20} rx={2} fill="#f2b01e" />
      <polygon points={`${c - 5},${c - 10} ${c + 5},${c - 10} ${c},${c - 17}`} fill="#f2b01e" />
      {(assessment?.proximity_view ?? []).map((o) => {
        const [x, y] = polar(o.distance_m, o.bearing_deg);
        const color = ZONE_COLOR[o.zone] ?? '#9fb3ad';
        const tag = `${o.object_id} ${o.distance_m.toFixed(1)}m`;
        // Flip the tag to the left of the blip only when it would run past the ring's edge.
        const flip = x + 8 + tag.length * 6.5 > size - 4;
        return (
          <g key={o.object_id}>
            {o.zone === 'red' && <circle cx={x} cy={y} r={10} fill="none" stroke={color} className="cab-ring-pulse" />}
            {o.object_type === 'person'
              ? <circle cx={x} cy={y} r={5} fill={color} stroke={o.in_blind_spot ? '#fff' : 'none'} strokeWidth={1.5} />
              : <rect x={x - 6} y={y - 4} width={12} height={8} fill={color} stroke={o.in_blind_spot ? '#fff' : 'none'} />}
            <text x={flip ? x - 8 : x + 8} y={y < 22 ? y + 16 : y - 6} textAnchor={flip ? 'end' : 'start'} className="cab-ring-tag" fill={color}>{tag}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ------------------------------------------------------------------ side panel

export function CabPanel() {
  const assessment = useLinkStore((s) => s.assessment);
  const assessmentAt = useLinkStore((s) => s.assessmentAt);
  const cabStatus = useLinkStore((s) => s.cabStatus);
  const snap = useSim();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const e = snap.exc;
  // Glanceable-only while the machine is moving or working (spec section 10).
  const operating = Math.abs(e.speedMs) > 0.01 || (e.workMode !== 'idle' && e.workMode !== 'break');
  const score = assessment?.readiness_score ?? null;
  const age = assessment ? Math.max(0, Math.round((now - assessmentAt) / 1000)) : null;
  const prediction = assessment?.task_prediction;

  return (
    <div className="simulation-hud cab-panel">
      <div className="cab-panel-head">
        <strong>CAB · EXC001</strong>
        <span className={`cab-dot cab-dot-${cabStatus}`} />
        <small>{age === null ? 'NO ASSESSMENT YET' : `UPDATED ${age}s AGO`}</small>
      </div>

      <div className="cab-readiness">
        <div className="cab-readiness-score" style={{ color: score === null ? '#66808a' : readinessColor(score) }}>{score ?? '--'}</div>
        <div className="cab-readiness-bars">
          {Object.entries(assessment?.readiness_breakdown ?? { seatbelt: 0, proximity: 0, behaviour: 0, fatigue: 0, conditions: 0 }).map(([k, v]) => (
            <div key={k} className="cab-bar-row">
              <span>{k}</span>
              <div className="cab-bar"><div style={{ width: `${assessment ? v : 0}%`, background: readinessColor(v) }} /></div>
              <b>{assessment ? v : '--'}</b>
            </div>
          ))}
        </div>
      </div>

      <ProximityRing assessment={assessment} />
      <div className="cab-zone-note">
        DANGER {assessment?.zones.danger_radius_m ?? 5} m · CAUTION {assessment?.zones.caution_radius_m ?? 12} m
        {assessment?.zones.reason ? <em> · {assessment.zones.reason}</em> : null}
      </div>

      <div className="cab-section-title">Active alerts</div>
      {(assessment?.alerts ?? []).length === 0 ? (
        <div className="cab-empty">No active alerts</div>
      ) : (
        assessment!.alerts.map((a) => (
          <div key={a.alert_id} className="cab-alert-row" style={{ borderLeftColor: SEVERITY_COLOR[a.severity] }}>
            <b style={{ color: SEVERITY_COLOR[a.severity] }}>{a.severity}</b> {a.message}
          </div>
        ))
      )}

      {operating ? (
        <div className="cab-locked">Machine operating · glanceable view only. Insights unlock when idle or parked.</div>
      ) : (
        <>
          {prediction && (
            <>
              <div className="cab-section-title">Task {prediction.task_id} prediction</div>
              <div className="cab-kv"><span>Planned</span><b>{prediction.planned_min} min</b></div>
              <div className="cab-kv"><span>P10 / P50 / P90</span><b>{prediction.p10_min} / {prediction.p50_min} / {prediction.p90_min} min</b></div>
              <div className="cab-kv"><span>Remaining</span><b>{prediction.remaining_min} min</b></div>
              {prediction.factors.map((f) => (
                <div key={f.factor} className="cab-kv cab-kv-dim"><span>{f.factor.replace(/_/g, ' ')}</span><b>{f.effect_pct > 0 ? '+' : ''}{f.effect_pct}%</b></div>
              ))}
            </>
          )}
          {(assessment?.anomalies ?? []).length > 0 && (
            <>
              <div className="cab-section-title">Anomalies</div>
              {assessment!.anomalies.map((a) => (
                <div key={a.anomaly_type} className="cab-anomaly">
                  <b>{a.anomaly_type.replace(/_/g, ' ')}</b> <span>{a.score.toFixed(2)}</span>
                  {a.explanation.map((line, i) => <div key={i}>· {line}</div>)}
                </div>
              ))}
            </>
          )}
          {(assessment?.training_recommendations ?? []).length > 0 && (
            <>
              <div className="cab-section-title">Training</div>
              {assessment!.training_recommendations.map((t) => (
                <div key={t.module_id} className="cab-kv"><span>{t.title}</span><b>{t.module_id}</b></div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
