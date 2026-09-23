import React, { useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import type { QuizOption } from '../types/cockpit';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Calendar,
  UserCheck,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const TrainingView: React.FC = () => {
  const {
    activeLesson,
    submitQuizAnswer,
    resetLesson,
    completedLessonsCount,
    setDestination,
  } = useOperatorStore();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isInstructorModalOpen, setIsInstructorModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const quiz = activeLesson.quiz;

  const handleSelectOption = (idx: number) => {
    if (activeLesson.completed || hasSubmitted) return;
    setSelectedOption(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;
    setHasSubmitted(true);
    submitQuizAnswer(selectedOption);
  };

  const handleRetake = () => {
    setSelectedOption(null);
    setHasSubmitted(false);
    resetLesson();
  };

  const currentOption = selectedOption !== null ? quiz.options[selectedOption] : null;

  return (
    <div
      className="responsive-stack"
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        width: '100%',
        padding: '20px 24px',
        gap: '20px',
        overflowY: 'auto',
      }}
    >
      {/* Main Micro-Lesson & 2D Scenario Card */}
      <div
        className="glass-panel"
        style={{
          flex: '1.3 1 0px',
          minWidth: 0,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Lesson Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'var(--electric-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px var(--electric-blue-glow)',
              }}
            >
              <GraduationCap size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: 'rgba(14, 165, 233, 0.2)',
                    color: 'var(--electric-blue-light)',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {activeLesson.badge}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Estimated Duration: {activeLesson.estimatedMinutes} min
                </span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {activeLesson.title}
              </h2>
            </div>
          </div>

          {activeLesson.completed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--safety-green)',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontWeight: 800,
                fontSize: '12px',
              }}
            >
              <ShieldCheck size={16} />
              <span>PASSED &amp; APPLIED TO READINESS</span>
            </div>
          )}
        </div>

        {/* Triggering Anomaly & Evidence Summary */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderLeft: '4px solid var(--electric-blue)',
            borderRadius: '6px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--electric-blue-light)', textTransform: 'uppercase' }}>
            Anomaly Origin &amp; Real-Time Shift Evidence:
          </div>
          <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.45 }}>
            {activeLesson.anomalySummary}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <strong>Guidance:</strong> {activeLesson.recommendation}
          </div>
        </div>

        {/* 2D Scenario Quiz Box */}
        <div
          style={{
            background: 'rgba(18, 26, 40, 0.65)',
            border: '1px solid var(--cockpit-glass-border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} style={{ color: 'var(--cat-yellow)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              Scenario Competency Check
            </span>
          </div>

          {/* Scenario Diagram Text */}
          {quiz.scenarioDiagramText && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
                padding: '10px 16px',
                borderRadius: '8px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--cat-yellow)',
              }}
            >
              {quiz.scenarioDiagramText}
            </div>
          )}

          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>
            {quiz.question}
          </div>

          {/* 3 Touch-Friendly Options (>= 48px height) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quiz.options.map((opt: QuizOption, idx: number) => {
              const isSelected = selectedOption === idx;
              let btnBorder = 'var(--cockpit-glass-border)';
              let btnBg = 'rgba(255, 255, 255, 0.03)';
              let btnColor = 'var(--text-primary)';

              if (hasSubmitted || activeLesson.completed) {
                if (opt.isCorrect) {
                  btnBorder = 'var(--safety-green)';
                  btnBg = 'rgba(16, 185, 129, 0.15)';
                  btnColor = '#ffffff';
                } else if (isSelected && !opt.isCorrect) {
                  btnBorder = 'var(--safety-red)';
                  btnBg = 'rgba(239, 68, 68, 0.15)';
                  btnColor = '#ffffff';
                }
              } else if (isSelected) {
                btnBorder = 'var(--electric-blue)';
                btnBg = 'rgba(14, 165, 233, 0.15)';
                btnColor = '#ffffff';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={hasSubmitted || activeLesson.completed}
                  style={{
                    minHeight: '52px',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    border: `1.5px solid ${btnBorder}`,
                    background: btnBg,
                    color: btnColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: hasSubmitted || activeLesson.completed ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.35 }}>
                      {opt.text}
                    </span>
                  </div>

                  {(hasSubmitted || activeLesson.completed) && opt.isCorrect && (
                    <CheckCircle2 size={18} style={{ color: 'var(--safety-green)', flexShrink: 0 }} />
                  )}
                  {(hasSubmitted || activeLesson.completed) && isSelected && !opt.isCorrect && (
                    <XCircle size={18} style={{ color: 'var(--safety-red)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate Explanation Feedback */}
          {(hasSubmitted || activeLesson.completed) && currentOption && (
            <div
              style={{
                background: currentOption.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${currentOption.isCorrect ? 'var(--safety-green)' : 'var(--safety-red)'}`,
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: currentOption.isCorrect ? 'var(--safety-green)' : 'var(--safety-red)',
                  textTransform: 'uppercase',
                }}
              >
                {currentOption.isCorrect ? 'Correct Protocol Verified' : 'Safety Deviation Flagged'}
              </div>
              <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.4 }}>
                {currentOption.feedback}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
            <button
              onClick={handleRetake}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} />
              <span>Reset Quiz</span>
            </button>

            {!hasSubmitted && !activeLesson.completed ? (
              <button
                onClick={handleConfirmAnswer}
                disabled={selectedOption === null}
                className="cockpit-btn cockpit-btn-blue"
                style={{
                  opacity: selectedOption !== null ? 1 : 0.5,
                  padding: '10px 24px',
                }}
              >
                Confirm Protocol Answer
              </button>
            ) : (
              <button
                onClick={() => setDestination('today')}
                className="cockpit-btn cockpit-btn-primary"
                style={{ padding: '10px 24px' }}
              >
                <span>Return to Cockpit</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Training Record & Instructor Escalation */}
      <div
        style={{
          flex: '0.7 1 0px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Readiness Loop Connection Card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: 'var(--safety-green)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              Connected Readiness Feedback
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Passing this scenario directly updates the behavioral &amp; conditions factors inside the central Readiness Instrument, unlocking operational incentives and closing the safety loop.
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MICRO-LESSONS COMPLETED THIS SHIFT</div>
              <div className="mono-num" style={{ fontSize: '20px', fontWeight: 900, color: 'var(--electric-blue-light)' }}>
                {completedLessonsCount} Certified
              </div>
            </div>
            <GraduationCap size={24} style={{ color: 'var(--electric-blue)' }} />
          </div>
        </div>

        {/* Escalation Card: Repeated Unsafe Pattern Instructor Booking */}
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--cat-yellow)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              Field Instructor Coaching
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            If proximity or slope anomalies repeat across multiple shifts, operators can request a 1-on-1 certified Caterpillar field coach directly from the cab.
          </p>

          <button
            onClick={() => setIsInstructorModalOpen(true)}
            className="cockpit-btn cockpit-btn-ghost"
            style={{
              width: '100%',
              borderColor: 'var(--cat-yellow)',
              color: 'var(--cat-yellow)',
              fontWeight: 700,
            }}
          >
            <UserCheck size={16} />
            <span>Book Certified Field Coach</span>
          </button>
        </div>
      </div>

      {/* Instructor Booking Modal */}
      {isInstructorModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 12, 16, 0.85)',
            backdropFilter: 'blur(16px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid var(--cat-yellow)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={22} style={{ color: 'var(--cat-yellow)' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                  BOOK ON-SITE OPERATOR COACH
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Site Staging Trailer 02 • Certified Master Instructor
                </div>
              </div>
            </div>

            {!bookingSuccess ? (
              <>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Select an available slot during scheduled lunch or shift turnaround. Instructor Dave Kowalski will review your recent telemetry logs and conduct in-cab coaching.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['12:30 PM (Mid-Shift Break)', '03:45 PM (Shift Turnaround)', 'Tomorrow 07:15 AM (Pre-Shift)'].map((slot, sidx) => (
                    <button
                      key={sidx}
                      onClick={() => setBookingSuccess(true)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--cockpit-glass-border)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={() => setIsInstructorModalOpen(false)}
                    className="cockpit-btn cockpit-btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
                <CheckCircle2 size={44} style={{ color: 'var(--safety-green)' }} />
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                  Coaching Session Confirmed!
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Instructor notified. Radio channel 4 set for session rendezvous.
                </div>
                <button
                  onClick={() => {
                    setIsInstructorModalOpen(false);
                    setBookingSuccess(false);
                  }}
                  className="cockpit-btn cockpit-btn-primary"
                  style={{ marginTop: '10px' }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
