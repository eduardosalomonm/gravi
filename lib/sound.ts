// Gravi's sounds are synthesised with the Web Audio API: no files, no network.
// Gravi never speaks; these are soft toy-like noises for its movements.

const MUTE_KEY = 'gravi.sound.muted';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
const listeners = new Set<(muted: boolean) => void>();

function readMuted() {
  try {
    return (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(MUTE_KEY) === '1'
    );
  } catch {
    return false;
  }
}

function audio() {
  if (muted || typeof window === 'undefined') return null;
  if (!context) {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Context) return null;
    try {
      context = new Context();
    } catch {
      return null;
    }
    master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Browsers only allow audio after a gesture; call this from pointer/key handlers. */
export function unlockSound() {
  audio();
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Without storage the choice lasts for this visit only.
  }
  if (value && context) void context.suspend();
  if (!value) audio();
  listeners.forEach((listener) => listener(muted));
}

export function onMutedChange(listener: (muted: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function tone(
  ctx: AudioContext,
  {
    type = 'sine' as OscillatorType,
    from,
    to = from,
    start = 0,
    duration,
    volume,
    attack = 0.008,
  }: {
    type?: OscillatorType;
    from: number;
    to?: number;
    start?: number;
    duration: number;
    volume: number;
    attack?: number;
  },
) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(master!);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;
function noise(
  ctx: AudioContext,
  {
    duration,
    volume,
    frequency,
    q = 0.8,
    start = 0,
  }: {
    duration: number;
    volume: number;
    frequency: number;
    q?: number;
    start?: number;
  },
) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + start;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(filter).connect(gain).connect(master!);
  source.start(t);
  source.stop(t + duration + 0.02);
}

function vibrate(pattern: number | number[]) {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration is optional (iPhone browsers ignore it).
  }
}

/** Low gravity sounds higher and floatier; Jupiter sounds short and low. */
function gravityPitch(gravity: number) {
  return (
    1 +
    Math.max(0, 9.81 - Math.min(gravity, 9.81)) / 11 -
    Math.max(0, gravity - 9.81) / 40
  );
}

export const sound = {
  jump(gravity: number) {
    const ctx = audio();
    if (!ctx) return;
    const pitch = gravityPitch(gravity);
    const length = gravity < 3 ? 0.42 : gravity > 15 ? 0.16 : 0.24;
    tone(ctx, {
      type: 'triangle',
      from: 260 * pitch,
      to: 620 * pitch,
      duration: length,
      volume: 0.22,
    });
    tone(ctx, {
      from: 520 * pitch,
      to: 1240 * pitch,
      duration: length * 0.8,
      volume: 0.05,
    });
    vibrate(8);
  },
  land(strength: number, gravity: number) {
    const ctx = audio();
    if (!ctx) return;
    const heavy = gravity > 15;
    noise(ctx, {
      duration: 0.12 + strength * 0.12,
      volume: 0.12 + strength * 0.3,
      frequency: heavy ? 180 : 420,
    });
    tone(ctx, {
      from: heavy ? 110 : 190,
      to: heavy ? 48 : 90,
      duration: 0.14 + strength * 0.16,
      volume: 0.12 + strength * (heavy ? 0.35 : 0.2),
    });
    vibrate(heavy ? 28 : strength > 0.3 ? 14 : 6);
  },
  step(alternate: boolean) {
    const ctx = audio();
    if (!ctx) return;
    noise(ctx, {
      duration: 0.05,
      volume: 0.05,
      frequency: alternate ? 1300 : 1050,
      q: 1.6,
    });
  },
  gravity(value: number) {
    const ctx = audio();
    if (!ctx) return;
    const pitch = gravityPitch(value);
    const rising = value < 9.81;
    tone(ctx, {
      type: 'sine',
      from: rising ? 300 * pitch : 520,
      to: rising ? 700 * pitch : 180,
      duration: 0.34,
      volume: 0.1,
    });
    noise(ctx, { duration: 0.3, volume: 0.05, frequency: rising ? 2400 : 700 });
    vibrate(10);
  },
  progress() {
    const ctx = audio();
    if (!ctx) return;
    // A small bell: fundamental plus an inharmonic partial.
    tone(ctx, { from: 1175, duration: 0.6, volume: 0.1 });
    tone(ctx, { from: 1175 * 2.76, duration: 0.3, volume: 0.025 });
    vibrate(12);
  },
  bloom() {
    const ctx = audio();
    if (!ctx) return;
    // Rising major pentatonic arpeggio over a soft pad.
    [523.25, 587.33, 659.25, 783.99, 880, 1046.5].forEach((note, i) =>
      tone(ctx, {
        type: 'triangle',
        from: note,
        start: i * 0.09,
        duration: 1.1,
        volume: 0.09,
      }),
    );
    [261.63, 329.63, 392].forEach((note) =>
      tone(ctx, { from: note, duration: 2.4, volume: 0.05, attack: 0.4 }),
    );
    noise(ctx, { duration: 1.4, volume: 0.03, frequency: 5200, q: 0.5 });
    vibrate([30, 60, 30, 60, 80]);
  },
};
