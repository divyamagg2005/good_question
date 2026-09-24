import type { QuizQuestion } from '../types/cockpit';

// Local fallback lesson content, keyed by the backend's training module_id. Which module to
// show, its title, format and duration always come from the backend; this only supplies the
// guidance text and a check question while GET /api/training/modules/{id} is unavailable.

interface LocalLesson {
  recommendation: string;
  question: QuizQuestion;
}

export const LESSON_BANK: Record<string, LocalLesson> = {
  'TRN-PROX-01': {
    recommendation: 'Stop swinging, ground the bucket and sound the horn before anyone enters the swing radius. Confirm eye contact or radio clearance before moving again.',
    question: {
      question: 'A worker appears in your rear camera, inside the danger zone, while you are swinging. What do you do first?',
      options: [
        { text: 'Keep swinging slowly and sound the horn twice.', feedback: 'The horn alone does not remove the pinch point; stop the swing first.' },
        { text: 'Stop the swing, ground the bucket and wait for clearance.', feedback: 'Correct: remove the hazard first, then communicate.' },
        { text: 'Swing faster to finish the cycle before they get close.', feedback: 'Speed increases counterweight strike energy and reaction distance.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-BELT-01': {
    recommendation: 'Keep the seatbelt fastened whenever the engine is running and the controls are live — even for short repositioning moves.',
    question: {
      question: 'You need to travel 10 m to reposition. When is it acceptable to unbuckle?',
      options: [
        { text: 'For short moves under 5 km/h.', feedback: 'Rollovers and sudden stops happen at low speed too.' },
        { text: 'Only with the engine off and hydraulics locked out.', feedback: 'Correct: the belt stays on whenever the machine can move.' },
        { text: 'When a spotter is guiding you.', feedback: 'A spotter does not protect you in a tip or collision.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-CAB-01': {
    recommendation: 'Before leaving the seat: ground the attachment, engage the hydraulic lockout, set the parking brake and shut the engine down. Refuel only with the engine off.',
    question: {
      question: 'What must you do before stepping out of the cab?',
      options: [
        { text: 'Leave it idling so it stays warm.', feedback: 'An unattended running machine can be moved by anyone or anything.' },
        { text: 'Ground the bucket, lock out hydraulics, brake on, engine off.', feedback: 'Correct: make the machine safe before leaving it.' },
        { text: 'Just raise the lockout lever.', feedback: 'Lockout alone leaves the engine running and the bucket raised.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-SWING-01': {
    recommendation: 'Feather the swing lever at the start and end of each swing. Aim for smooth, consistent cycles rather than peak swing speed.',
    question: {
      question: 'Your swing rate keeps spiking above the site limit. What reduces it without losing productivity?',
      options: [
        { text: 'Full lever until the target, then hard counter-swing.', feedback: 'Hard reversals cause the spikes and stress the swing motor.' },
        { text: 'Ramp the lever in and out and plan the dump point before swinging.', feedback: 'Correct: smooth ramps keep cycle time with lower peak rate.' },
        { text: 'Swing with the bucket raised as high as possible.', feedback: 'A high bucket raises inertia and makes stopping harder.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-TRAVEL-01': {
    recommendation: 'Travel with the bucket low and close to the tracks, within site speed limits, with the travel alarm working.',
    question: {
      question: 'How should the bucket be carried while travelling on site?',
      options: [
        { text: 'High, for better forward visibility.', feedback: 'A high bucket raises the centre of gravity and tip risk.' },
        { text: 'Low and close to the tracks.', feedback: 'Correct: keeps the machine stable and the bucket ready as a brace.' },
        { text: 'Fully extended in front.', feedback: 'An extended arm shifts weight forward and blocks the view.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-SLOPE-01': {
    recommendation: 'Travel straight up and down slopes, not across. Keep the bucket low and uphill, and stop if pitch or roll approaches the tilt limit.',
    question: {
      question: 'Pitch is climbing toward the tilt limit on a ramp. What is the safest response?',
      options: [
        { text: 'Turn across the slope to level out.', feedback: 'Turning across a slope converts pitch into roll — the tip-over direction.' },
        { text: 'Stop, lower the bucket uphill and reverse straight back down.', feedback: 'Correct: keep the machine square to the slope and the weight uphill.' },
        { text: 'Speed up to get over the crest quickly.', feedback: 'Speed makes the crest transition more violent.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-IDLE-01': {
    recommendation: 'If you are waiting more than a few minutes (for a truck, a spotter, a break), drop to low idle or shut down. Call dispatch when a truck is late.',
    question: {
      question: 'The haul truck is late and you have been idling for 20 minutes. What should you do?',
      options: [
        { text: 'Keep idling at working RPM so you are ready.', feedback: 'Idle burns fuel and engine hours for no output.' },
        { text: 'Shut down or use low idle and call dispatch about the truck.', feedback: 'Correct: cut waste and fix the cause of the wait.' },
        { text: 'Keep digging and dump on the ground.', feedback: 'Double handling costs more time than the wait.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-ENGINE-01': {
    recommendation: 'Keep RPM in the working band, watch coolant and hydraulic oil temperatures, and stop to investigate before temperatures reach the high limit.',
    question: {
      question: 'Coolant temperature is climbing past normal. What do you do?',
      options: [
        { text: 'Keep working and check it at the end of the shift.', feedback: 'Overheating can seize the engine within minutes.' },
        { text: 'Reduce load, let it cool at idle, report the fault code.', feedback: 'Correct: protect the engine and get it inspected.' },
        { text: 'Shut down immediately while under full load.', feedback: 'Idling briefly first lets coolant circulate; a hot shutdown can cause heat soak.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-FATIGUE-01': {
    recommendation: 'Take scheduled breaks — at least every few hours of continuous operation — and report when you feel drowsy.',
    question: {
      question: 'You have operated for 4 hours without a break. What is the right call?',
      options: [
        { text: 'Push on to finish the task first.', feedback: 'Fatigue slows reactions well before you notice it.' },
        { text: 'Make the machine safe and take a break now.', feedback: 'Correct: a short break restores attention.' },
        { text: 'Drink an energy drink and continue.', feedback: 'Stimulants mask fatigue but do not remove it.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-LOAD-01': {
    recommendation: 'Fill the bucket consistently without overloading. Match the load to the truck and the machine’s rated capacity.',
    question: {
      question: 'Your bucket payload is regularly over the rated limit. What is the risk?',
      options: [
        { text: 'None — heavier loads mean fewer cycles.', feedback: 'Overloads stress hydraulics and reduce stability.' },
        { text: 'Reduced stability, hydraulic stress and spillage.', feedback: 'Correct: stay within rated payload.' },
        { text: 'Only faster fuel burn.', feedback: 'Fuel is the least of it; stability and wear matter more.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-SEC-01': {
    recommendation: 'Shut down and secure the machine at the end of the shift. Report unexpected fuel loss or use outside your hours.',
    question: {
      question: 'Fuel level dropped overnight while the engine was off. What should you do?',
      options: [
        { text: 'Refuel and say nothing.', feedback: 'Unreported loss hides theft or leaks.' },
        { text: 'Report it with the times and levels observed.', feedback: 'Correct: the data helps security and maintenance.' },
        { text: 'Assume the gauge is faulty.', feedback: 'Check first — the telemetry shows the drop.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-WX-01': {
    recommendation: 'In rain, fog or dust, slow down, widen your clearance to people and vehicles, and stop work if lightning is close.',
    question: {
      question: 'Lightning is reported 6 km away. What do you do?',
      options: [
        { text: 'Keep working until it is overhead.', feedback: 'Lightning can strike well ahead of the storm.' },
        { text: 'Stop work, lower the boom and shelter as instructed.', feedback: 'Correct: a raised boom is a strike risk.' },
        { text: 'Raise the boom to keep it out of the mud.', feedback: 'A raised boom makes the machine the tallest object on site.' },
      ],
      correctIndex: 1,
    },
  },
  'TRN-INSTR-01': {
    recommendation: 'Repeated unsafe patterns were flagged. Book a session with a field instructor to review them on the machine.',
    question: {
      question: 'The same unsafe pattern has been flagged across several shifts. What is the best next step?',
      options: [
        { text: 'Ignore it if nobody was hurt.', feedback: 'Repeated near misses predict future incidents.' },
        { text: 'Book time with an instructor to correct the habit.', feedback: 'Correct: coaching on the machine fixes habits fastest.' },
        { text: 'Only watch the videos again.', feedback: 'Useful, but hands-on coaching works better for habits.' },
      ],
      correctIndex: 1,
    },
  },
};
