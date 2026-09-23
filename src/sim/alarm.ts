// Cab alert sounds (spec section 10): warning = single chime, high = repeating tone until
// acknowledged, critical = alarm until the condition clears. WebAudio only, no asset files.

let ctx: AudioContext | null = null;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let loopKind: AlarmKind = 'none';

export type AlarmKind = 'none' | 'high' | 'critical';

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, gain = 0.08, type: OscillatorType = 'sine') {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function chime() {
  tone(880, 0, 0.25);
  tone(1320, 0.14, 0.35);
}

export function setAlarm(kind: AlarmKind) {
  if (kind === loopKind) return;
  loopKind = kind;
  if (loopTimer) clearInterval(loopTimer);
  loopTimer = null;
  if (kind === 'high') {
    const beep = () => { tone(740, 0, 0.18, 0.09, 'triangle'); tone(740, 0.26, 0.18, 0.09, 'triangle'); };
    beep();
    loopTimer = setInterval(beep, 1400);
  } else if (kind === 'critical') {
    const siren = () => { tone(960, 0, 0.2, 0.12, 'square'); tone(640, 0.24, 0.2, 0.12, 'square'); };
    siren();
    loopTimer = setInterval(siren, 520);
  }
}

/** Reads an alert aloud with the browser's text-to-speech (alert.voice_text from the backend). */
export function speak(text: string, lang: 'en' | 'hi') {
  const synth = window.speechSynthesis;
  if (!synth || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang === 'hi' ? 'hi' : 'en'));
  if (voice) utterance.voice = voice;
  utterance.rate = 1.05;
  synth.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
