import React, { useState } from 'react';
import { useOperatorStore } from '../../store/useOperatorStore';
import {
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Tag,
  ClipboardCheck,
  ShieldCheck,
  X,
  FileText,
} from 'lucide-react';

interface ActiveTaskPanelProps {
  onOpenWalkaroundModal?: () => void;
}

export const ActiveTaskPanel: React.FC<ActiveTaskPanelProps> = ({ onOpenWalkaroundModal }) => {
  const {
    activeTask,
    walkaroundCompleted,
    toggleTaskPause,
    completeActiveTask,
    logTaskIssue,
  } = useOperatorStore();

  const [isLogIssueOpen, setIsLogIssueOpen] = useState(false);
  const [issueNote, setIssueNote] = useState('');

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isPaused = activeTask.status === 'paused';

  const handleLogIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueNote.trim()) return;
    logTaskIssue(issueNote.trim());
    setIssueNote('');
    setIsLogIssueOpen(false);
  };

  return (
    <div className="yellow-task-surface" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Walkaround Required Gate Overlay */}
      {!walkaroundCompleted && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255, 184, 0, 0.2)',
              border: '2px solid var(--cat-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cat-yellow)',
            }}
          >
            <ClipboardCheck size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              PRE-SHIFT WALKAROUND GATE ACTIVE
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.5 }}>
              Excavator hydraulics and active operation remain locked until the 6-point walkaround checklist is verified.
            </p>
          </div>
          <button
            onClick={onOpenWalkaroundModal}
            className="cockpit-btn cockpit-btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={18} />
            Complete Pre-Shift Inspection
          </button>
        </div>
      )}

      {/* Top Meta Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              background: '#0d1117',
              color: '#ffb800',
              padding: '4px 10px',
              borderRadius: '4px',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '0.06em',
            }}
          >
            ACTIVE OPERATION • {activeTask.id}
          </span>
          <span
            style={{
              background: 'rgba(0, 0, 0, 0.15)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {activeTask.operationType.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isPaused ? '#dc2626' : '#059669',
              boxShadow: isPaused ? '0 0 8px #dc2626' : '0 0 8px #059669',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
            {isPaused ? 'Operation Paused' : 'Live Tracking'}
          </span>
        </div>
      </div>

      {/* Main Title & Material Info */}
      <div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 900,
            color: 'var(--cat-yellow-text)',
            letterSpacing: '-0.02em',
            marginBottom: '4px',
          }}
        >
          {activeTask.title}
        </h2>
        <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.85 }}>
          Substrate: {activeTask.material} {activeTask.trenchDepthM ? `• Depth: ${activeTask.trenchDepthM}m target` : ''}
        </div>
      </div>

      {/* Live Progress Bar & Stats Row */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.12)',
          padding: '16px',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} />
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
              Cycle Completion
            </span>
          </div>
          <span className="mono-num" style={{ fontSize: '20px', fontWeight: 900 }}>
            {activeTask.progressPct.toFixed(1)}%
          </span>
        </div>

        {/* Progress track */}
        <div
          style={{
            width: '100%',
            height: '12px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${activeTask.progressPct}%`,
              height: '100%',
              background: '#0d1117',
              borderRadius: '6px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Time & Predicted Range Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} style={{ opacity: 0.7 }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>ELAPSED OPERATION TIME</div>
              <div className="mono-num" style={{ fontSize: '16px', fontWeight: 800 }}>
                {formatTime(activeTask.elapsedSeconds)}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>PREDICTED COMPLETION RANGE</div>
            <div className="mono-num" style={{ fontSize: '16px', fontWeight: 800 }}>
              {activeTask.predictedMinMinutes}–{activeTask.predictedMaxMinutes} min{' '}
              <span style={{ fontSize: '12px', opacity: 0.75, fontWeight: 500 }}>
                (Nominal: {activeTask.nominalMinutes}m)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Context Evidence Factors */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', opacity: 0.85 }}>
          Context & Prediction Factors (Live Machine Evidence):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {activeTask.contextTags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#0d1117',
                color: '#ffc425',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <Tag size={12} />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons (Tactile Industrial Feel) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '6px' }}>
        <button
          onClick={toggleTaskPause}
          className="cockpit-btn cockpit-btn-yellow"
          style={{ flex: 1 }}
          title={isPaused ? 'Resume Machine Operation' : 'Pause Task'}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          <span>{isPaused ? 'Resume Operation' : 'Pause Task'}</span>
        </button>

        <button
          onClick={completeActiveTask}
          className="cockpit-btn"
          style={{
            flex: 1.2,
            background: '#0d1117',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          }}
          title="Complete Task and Advance Next in Shift Queue"
        >
          <CheckCircle size={16} />
          <span>Complete & Advance Queue</span>
        </button>

        <button
          onClick={() => setIsLogIssueOpen(true)}
          className="cockpit-btn"
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            color: 'var(--cat-yellow-text)',
            border: '1px solid rgba(0, 0, 0, 0.2)',
          }}
          title="Log Field Obstacle or Site Issue"
        >
          <AlertCircle size={16} />
          <span>Log Issue</span>
        </button>
      </div>

      {/* Log Issue Popover / Modal */}
      {isLogIssueOpen && (
        <div
          style={{
            position: 'absolute',
            inset: '12px',
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid var(--cat-yellow)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 60,
          }}
        >
          <form onSubmit={handleLogIssueSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffb800' }}>
                <FileText size={20} />
                <span style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Log Site Issue / Delay Reason
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsLogIssueOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Recording an obstacle links this entry to the current machine coordinates and updates the shift digest for supervisors.
            </p>

            <textarea
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              placeholder="e.g. Unmarked utility line encountered; waiting for surveyor stakeout..."
              rows={3}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--cockpit-glass-border)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                resize: 'none',
              }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {['Boulder obstruction', 'Waiting on haul trucks', 'Surveyor check required', 'Ground water seepage'].map(
                (quick, qidx) => (
                  <button
                    key={qidx}
                    type="button"
                    onClick={() => setIssueNote(quick)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    {quick}
                  </button>
                )
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setIsLogIssueOpen(false)}
                className="cockpit-btn cockpit-btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="cockpit-btn cockpit-btn-primary">
                Record Site Issue
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
