/** Tiny Web Audio sound effects, synthesized in code (no audio files). */
let ctx: AudioContext | null = null;
let enabled = (() => { try { return window.localStorage.getItem('twist-sound') !== 'off'; } catch { return true; } })();
export const soundEnabled = () => enabled;
export function setSoundEnabled(on: boolean) {
  enabled = on;
  try { window.localStorage.setItem('twist-sound', on ? 'on' : 'off'); } catch { /* storage unavailable */ }
}
function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}
function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator(); const g = ac.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}
function speakPt(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    window.speechSynthesis?.speak(u);
  } catch { /* speech unavailable */ }
}
/** One-shot voice cues broadcast for everyone (easter eggs), with a speech fallback. */
export function playVoiceCue(name: 'gabs' | 'salvei') {
  if (!enabled) return;
  const file = name === 'gabs' ? 'nao_pode_ser_verde.wav' : 'salvei.wav';
  const text = name === 'gabs' ? 'Não pode ser verde!' : 'Salvei!';
  try {
    const a = new Audio(`${import.meta.env.BASE_URL || '/'}sounds/${file}`);
    a.onerror = () => speakPt(text);
    const p = a.play();
    if (p) p.catch(() => speakPt(text));
  } catch { speakPt(text); }
}
export const sfx = {
  play() { tone(420, 0, 0.09, 'triangle', 0.14); tone(660, 0.05, 0.08, 'triangle', 0.08); },
  draw() { tone(240, 0, 0.08, 'sine', 0.1); },
  turn() { tone(740, 0, 0.1, 'sine', 0.1); tone(990, 0.09, 0.12, 'sine', 0.09); },
  error() { tone(150, 0, 0.16, 'sawtooth', 0.07); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.16, 'triangle', 0.11)); },
  click() { tone(520, 0, 0.05, 'sine', 0.06); }
};
