/** Sons leves gerados no próprio navegador (sem ficheiros de áudio). */
let ctx: AudioContext | null = null;
const get = () => {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

function tone(freq: number, start: number, dur: number, vol = 0.12, type: OscillatorType = 'sine') {
  const c = get();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let muted = false;
try {
  muted = localStorage.getItem('bilar_mute') === '1';
} catch {
  /* */
}

export const sound = {
  isMuted: () => muted,
  setMuted(v: boolean) {
    muted = v;
    try {
      localStorage.setItem('bilar_mute', v ? '1' : '0');
    } catch {
      /* */
    }
  },
  /** Som de boas-vindas (sininhos) */
  welcome() {
    if (muted) return;
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.11, 0.5, 0.1, 'triangle'));
  },
  /** Mensagem recebida */
  message() {
    if (muted) return;
    tone(880, 0, 0.18, 0.1);
    tone(1320, 0.1, 0.25, 0.09);
  },
  /** Mensagem enviada */
  sent() {
    if (muted) return;
    tone(660, 0, 0.12, 0.06);
  },
  /** Sorteio revelado */
  reveal() {
    if (muted) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.6, 0.09, 'triangle'));
  },
};
