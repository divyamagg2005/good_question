import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import { RankedShift } from '../utils/scoring';
import { Trophy, AlertTriangle, ChevronRight, Activity, Zap, ShieldAlert } from 'lucide-react';

export const LeaderboardWorkspace: React.FC = () => {
  const { getRankedShifts, operatorId } = useOperatorStore();
  const rankedShifts = getRankedShifts();
  
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const selectedShift = rankedShifts.find(s => s.id === selectedShiftId);

  return (
    <div style={{ display: 'flex', gap: '20px', flexDirection: 'column', height: '100%' }}>
      {/* Filters & Header could go here */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} style={{ color: 'var(--cat-yellow)' }} />
          <span style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#ffffff' }}>
            Shift Performance Leaderboard
          </span>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedShift ? 'minmax(0, 1.3fr) minmax(0, 0.7fr)' : '1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* Leaderboard Table Container */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'rgba(11, 15, 23, 0.95)', zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>RANK</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>OPERATOR</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>SAFETY (50%)</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>FUEL (30%)</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>SPEED (20%)</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' }}>OVERALL</th>
                </tr>
              </thead>
              <tbody>
                {rankedShifts.map(shift => {
                  const isInsufficient = shift.scores.isInsufficientData;
                  const isSelected = selectedShiftId === shift.id;
                  const isCurrent = shift.operatorId === operatorId;

                  return (
                    <tr
                      key={shift.id}
                      onClick={() => setSelectedShiftId(shift.id)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(255, 184, 0, 0.1)' : isCurrent ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.2s',
                        opacity: isInsufficient ? 0.6 : 1
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        {isInsufficient ? (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
                        ) : (
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: shift.rank === 1 ? 'var(--cat-yellow)' : shift.rank === 2 ? '#C0C0C0' : shift.rank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.1)',
                            color: shift.rank <= 3 ? '#000' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 800
                          }}>
                            {shift.rank}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {shift.operatorName}
                          {isCurrent && <span style={{ fontSize: '9px', padding: '2px 4px', background: 'var(--cat-yellow)', color: '#000', borderRadius: '4px' }}>YOU</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{shift.operationType} • {shift.equipmentId}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="mono-num" style={{ fontSize: '13px', color: shift.scores.safetyScore >= 90 ? 'var(--safety-green)' : shift.scores.safetyScore >= 70 ? 'var(--safety-amber)' : 'var(--safety-red)' }}>
                          {isInsufficient ? '--' : shift.scores.safetyScore.toFixed(1)}
                        </div>
                        {shift.scores.safetyCapped && <div style={{ fontSize: '9px', color: 'var(--safety-red)' }}>VIOLATION PENALTY</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="mono-num" style={{ fontSize: '13px', color: '#fff' }}>
                          {isInsufficient ? '--' : shift.scores.fuelScore.toFixed(1)}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="mono-num" style={{ fontSize: '13px', color: '#fff' }}>
                          {isInsufficient ? '--' : shift.scores.velocityScore.toFixed(1)}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                         {isInsufficient ? (
                           <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Insufficient Data</span>
                         ) : (
                           <div className="mono-num" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--cat-yellow)' }}>
                             {shift.scores.overallScore.toFixed(1)}
                           </div>
                         )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Shift Detail Drawer/Panel */}
        {selectedShift && (
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{selectedShift.operatorName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedShift.operatorId} • Rank {selectedShift.rank > 0 ? selectedShift.rank : '-'}</div>
              </div>
              <button onClick={() => setSelectedShiftId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                 <ChevronRight size={20} />
              </button>
            </div>

            {selectedShift.scores.isInsufficientData ? (
               <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                 <AlertTriangle size={24} style={{ color: 'var(--safety-amber)', margin: '0 auto 8px auto' }} />
                 <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>Insufficient Data</div>
                 <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Shift must have >1hr duration and >2 cycles completed to rank.</div>
               </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldAlert size={14} color="var(--safety-green)"/> Safety (50%)</span>
                    <span className="mono-num" style={{ color: '#fff' }}>{selectedShift.scores.safetyScore.toFixed(1)} / 100</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Readiness Avg: {selectedShift.readinessAvg}% | Violations: {selectedShift.safetyViolations} | Near Misses: {selectedShift.safetyNearMisses}</div>
                  {selectedShift.scores.safetyCapped && (
                    <div style={{ fontSize: '10px', color: 'var(--safety-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '4px' }}>
                      Velocity score capped at 1.0x due to safety violation penalty. Speed cannot compensate for unsafe operation.
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} color="var(--cat-yellow)"/> Fuel (30%)</span>
                    <span className="mono-num" style={{ color: '#fff' }}>{selectedShift.scores.fuelScore.toFixed(1)} / 100</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Expected: {selectedShift.expectedFuelLiters}L | Actual: {selectedShift.fuelConsumedLiters}L | Idle Ratio: {(selectedShift.idleTimeRatio * 100).toFixed(0)}%</div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} color="var(--electric-blue)"/> Velocity (20%)</span>
                    <span className="mono-num" style={{ color: '#fff' }}>{selectedShift.scores.velocityScore.toFixed(1)} / 100</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target Cycle: {selectedShift.targetCycleTime}m | Actual Avg: {selectedShift.actualCycleTimeAvg}m | Cycles: {selectedShift.completedCycles}</div>
                </div>

                <div style={{ marginTop: '10px', padding: '16px', background: 'var(--cockpit-glass-bg)', border: '1px solid var(--cat-yellow)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--cat-yellow)', fontWeight: 800, textTransform: 'uppercase' }}>Overall Shift Score</div>
                  <div className="mono-num" style={{ fontSize: '32px', fontWeight: 900, color: '#fff', marginTop: '4px' }}>{selectedShift.scores.overallScore.toFixed(1)}</div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
};
