import React, { useMemo, useState } from 'react';
import { useOperatorStore } from '../store/useOperatorStore';
import { api, useBackendStore } from '../sim/backendApi';
import type { MicroLesson } from '../types/cockpit';
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
  Target,
} from 'lucide-react';

// Training hub. Which modules appear, their titles, formats and durations come from the backend
// (training recommendations + catalogue, live assessment recommendations, digest suggestions).
// Answers are submitted to POST /api/training/complete, which records (and, on newer backend
// builds, grades) the attempt.

// Next three whole-hour slots from now, as ISO strings without timezone (backend format).
function upcomingSlots() {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  return [1, 3, 24].map((h) => {
    const d = new Date(base.getTime() + h * 3600_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00:00`;
  });
}

function LessonQuiz({ lesson }: { lesson: MicroLesson }) {
  const { submitQuiz, resetLesson, setDestination } = useOperatorStore();
  const [answers, setAnswers] = useState<(number | null)[]>(() => lesson.questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; score: number | null; note: string } | null>(null);
  const submitted = result !== null || lesson.completed;
  const local = lesson.questionSource === 'local';

  const choose = (qi: number, oi: number) => {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
  };

  const submit = async () => {
    if (answers.some((a) => a === null)) return;
    setSubmitting(true);
    const res = await submitQuiz(answers as number[]);
    setResult(res);
    setSubmitting(false);
  };

  const retake = () => {
    setAnswers(lesson.questions.map(() => null));
    setResult(null);
    resetLesson();
  };

  if (lesson.questions.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No questions available for this module yet.</div>;
  }

  return (
    <>
      {lesson.questions.map((q, qi) => (
        <div key={qi} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>
            {lesson.questions.length > 1 ? `${qi + 1}. ` : ''}{q.question}
          </div>
          {q.options.map((opt, oi) => {
            const isSelected = answers[qi] === oi;
            const showKey = submitted && local && q.correctIndex !== undefined;
            const isCorrect = showKey && q.correctIndex === oi;
            const isWrongPick = showKey && isSelected && q.correctIndex !== oi;
            const border = isCorrect ? 'var(--safety-green)' : isWrongPick ? 'var(--safety-red)' : isSelected ? 'var(--electric-blue)' : 'var(--cockpit-glass-border)';
            const bg = isCorrect ? 'rgba(16, 185, 129, 0.15)' : isWrongPick ? 'rgba(239, 68, 68, 0.15)' : isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.03)';
            return (
              <button
                key={oi}
                onClick={() => choose(qi, oi)}
                disabled={submitted}
                style={{
                  minHeight: '52px',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  border: `1.5px solid ${border}`,
                  background: bg,
                  color: isSelected || isCorrect ? '#ffffff' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: submitted ? 'default' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.35 }}>{opt.text}</span>
                </div>
                {isCorrect && <CheckCircle2 size={18} style={{ color: 'var(--safety-green)', flexShrink: 0 }} />}
                {isWrongPick && <XCircle size={18} style={{ color: 'var(--safety-red)', flexShrink: 0 }} />}
              </button>
            );
          })}
          {submitted && local && answers[qi] !== null && q.options[answers[qi]!]?.feedback && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{q.options[answers[qi]!].feedback}</div>
          )}
        </div>
      ))}

      {(result || lesson.resultNote) && (
        <div
          style={{
            background: (result?.passed ?? lesson.completed) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${(result?.passed ?? lesson.completed) ? 'var(--safety-green)' : 'var(--safety-red)'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#ffffff',
          }}
        >
          <strong>{(result?.passed ?? lesson.completed) ? 'Passed' : 'Not passed'}</strong>
          {result?.score !== null && result?.score !== undefined ? ` · score ${result.score}%` : lesson.passedScore !== undefined ? ` · score ${lesson.passedScore}%` : ''}
          {' · '}{result?.note ?? lesson.resultNote}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
        <button onClick={retake} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <RotateCcw size={14} />
          <span>Reset Quiz</span>
        </button>
        {!submitted ? (
          <button
            onClick={() => { void submit(); }}
            disabled={submitting || answers.some((a) => a === null)}
            className="cockpit-btn cockpit-btn-blue"
            style={{ opacity: answers.some((a) => a === null) ? 0.5 : 1, padding: '10px 24px' }}
          >
            {submitting ? 'Submitting…' : 'Submit to Backend'}
          </button>
        ) : (
          <button onClick={() => setDestination('today')} className="cockpit-btn cockpit-btn-primary" style={{ padding: '10px 24px' }}>
            <span>Return to Cockpit</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </>
  );
}

export const TrainingView: React.FC = () => {
  const { lessons, selectLesson, completedLessonsCount, getActiveLesson } = useOperatorStore();
  const profile = useBackendStore((s) => s.profile);
  const trainingError = useBackendStore((s) => s.errors.training);
  const activeLesson = getActiveLesson();
  const slots = useMemo(() => upcomingSlots(), []);

  const [isInstructorModalOpen, setIsInstructorModalOpen] = useState(false);
  const [booking, setBooking] = useState<{ state: 'idle' | 'sending' | 'done' | 'error'; text: string }>({ state: 'idle', text: '' });

  const book = async (slot: string) => {
    if (!activeLesson) return;
    setBooking({ state: 'sending', text: '' });
    try {
      const res = await api.bookTraining(activeLesson.id, slot);
      setBooking({ state: 'done', text: `Booking ${res.booking_id} confirmed for ${String(res.confirmed_slot).replace('T', ' ').slice(0, 16)}.` });
    } catch (err) {
      setBooking({ state: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const recommended = lessons.filter((l) => l.badge.startsWith('Recommended'));
  const catalogue = lessons.filter((l) => !l.badge.startsWith('Recommended'));

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
        // Top-align so each panel grows with its content instead of stretching to the viewport
        // height and letting overflowing content spill past its background.
        alignItems: 'flex-start',
      }}
    >
      {/* Main lesson card */}
      <div className="glass-panel" style={{ flex: '1.3 1 0px', minWidth: 0, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!activeLesson ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {trainingError ? `Could not load training modules: ${trainingError}` : 'Loading training modules from the backend…'}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--electric-blue)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px var(--electric-blue-glow)' }}>
                  <GraduationCap size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(14, 165, 233, 0.2)', color: 'var(--electric-blue-light)', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {activeLesson.badge}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {activeLesson.id} · {activeLesson.estimatedMinutes} min · {activeLesson.format.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>{activeLesson.title}</h2>
                </div>
              </div>
              {activeLesson.completed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--safety-green)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: 800, fontSize: '12px' }}>
                  <ShieldCheck size={16} />
                  <span>PASSED · RECORDED</span>
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderLeft: '4px solid var(--electric-blue)', borderRadius: '6px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--electric-blue-light)', textTransform: 'uppercase' }}>Why this module</div>
              <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.45 }}>{activeLesson.anomalySummary}</div>
              {activeLesson.recommendation && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <strong>Guidance:</strong> {activeLesson.recommendation}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(18, 26, 40, 0.65)', border: '1px solid var(--cockpit-glass-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={18} style={{ color: 'var(--cat-yellow)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Competency Check</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {activeLesson.questionSource === 'backend' ? 'Questions from backend · graded by server' : 'Local question · score sent to backend'}
                </span>
              </div>
              <LessonQuiz key={activeLesson.id} lesson={activeLesson} />
            </div>
          </>
        )}
      </div>

      {/* Right column */}
      <div style={{ flex: '0.7 1 0px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Module list */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Training Modules</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{recommended.length} recommended</span>
          </div>
          {[...recommended, ...catalogue].map((l) => (
            <button
              key={l.id}
              onClick={() => selectLesson(l.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: activeLesson?.id === l.id ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${activeLesson?.id === l.id ? 'var(--electric-blue)' : 'var(--cockpit-glass-border)'}`,
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700 }}>{l.title}</div>
                <div style={{ fontSize: '10px', color: l.badge.startsWith('Recommended') ? 'var(--cat-yellow)' : 'var(--text-muted)' }}>
                  {l.badge} · {l.estimatedMinutes} min
                </div>
              </div>
              {l.completed && <CheckCircle2 size={16} style={{ color: 'var(--safety-green)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        {/* Operator profile from backend */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} style={{ color: 'var(--safety-green)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Operator Profile</span>
          </div>
          {profile ? (
            <>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {profile.level} · skill {profile.skill_score} · trend {profile.trend} · {profile.weeks_of_history} weeks of history
              </div>
              {Object.entries(profile.components).map(([k, v]) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 40px', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</span>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, v)}%`, height: '100%', background: v >= 70 ? 'var(--safety-green)' : v >= 50 ? 'var(--safety-amber)' : 'var(--safety-red)' }} />
                  </div>
                  <span className="mono-num" style={{ textAlign: 'right' }}>{v}</span>
                </div>
              ))}
              {profile.focus_areas.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>Focus areas:</strong> {profile.focus_areas.join(' · ')}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading profile from the backend…</div>
          )}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MODULES PASSED THIS SESSION</div>
              <div className="mono-num" style={{ fontSize: '20px', fontWeight: 900, color: 'var(--electric-blue-light)' }}>{completedLessonsCount}</div>
            </div>
            <GraduationCap size={24} style={{ color: 'var(--electric-blue)' }} />
          </div>
        </div>

        {/* Instructor booking */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--cat-yellow)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>Field Instructor Coaching</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Book a session on {activeLesson ? activeLesson.title : 'the selected module'}. The backend confirms the requested hour or the next free one.
          </p>
          <button
            onClick={() => { setBooking({ state: 'idle', text: '' }); setIsInstructorModalOpen(true); }}
            disabled={!activeLesson}
            className="cockpit-btn cockpit-btn-ghost"
            style={{ width: '100%', borderColor: 'var(--cat-yellow)', color: 'var(--cat-yellow)', fontWeight: 700 }}
          >
            <UserCheck size={16} />
            <span>Book Instructor Session</span>
          </button>
        </div>
      </div>

      {isInstructorModalOpen && activeLesson && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9, 12, 16, 0.85)', backdropFilter: 'blur(16px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--cat-yellow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={22} style={{ color: 'var(--cat-yellow)' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>BOOK INSTRUCTOR SESSION</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{activeLesson.id} · {activeLesson.title}</div>
              </div>
            </div>

            {booking.state === 'done' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
                <CheckCircle2 size={44} style={{ color: 'var(--safety-green)' }} />
                <div style={{ fontSize: '13px', color: '#ffffff', textAlign: 'center' }}>{booking.text}</div>
                <button onClick={() => setIsInstructorModalOpen(false)} className="cockpit-btn cockpit-btn-primary">Done</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      disabled={booking.state === 'sending'}
                      onClick={() => { void book(slot); }}
                      style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--cockpit-glass-border)', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                    >
                      {new Date(slot).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
                {booking.state === 'error' && (
                  <div style={{ fontSize: '12px', color: 'var(--safety-amber)' }}>
                    Booking failed: {booking.text}. (POST /api/training/book needs the latest backend deploy.)
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsInstructorModalOpen(false)} className="cockpit-btn cockpit-btn-ghost">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
