import type { SoundDef, SynthLayer } from "@/lib/drum/types";

const METAL_FREQS = [205.3, 304.4, 369.6, 522.7, 715.2, 864.8];

const ctxCache = new Map<number, OfflineAudioContext>();

function ctx(sr = 44100): { createBuffer: OfflineAudioContext["createBuffer"] } {
  const rate = Math.max(8000, Math.min(96000, Math.round(sr) || 44100));
  let cached = ctxCache.get(rate);
  if (!cached && typeof OfflineAudioContext !== "undefined") {
    cached = new OfflineAudioContext(2, 8, rate);
    ctxCache.set(rate, cached);
  }
  if (cached) return cached;
  return {
    createBuffer(ch: number, n: number, sampleRate: number) {
      const channels = Array.from({ length: ch }, () => new Float32Array(n));
      return {
        numberOfChannels: ch,
        length: n,
        sampleRate,
        copyToChannel(src: Float32Array, channel: number) {
          channels[channel] = new Float32Array(src);
        },
        getChannelData(channel: number) {
          return channels[channel] ?? new Float32Array(n);
        },
      } as AudioBuffer;
    },
  };
}

function biquadLP(x: Float32Array, sr: number, freq: number, q = 0.7) {
  const f0 = Math.min(freq, sr * 0.45);
  const w0 = (2 * Math.PI * f0) / sr;
  const alpha = Math.sin(w0) / (2 * q);
  const cos = Math.cos(w0);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i]!;
    const yn = (b0 / a0) * xn + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
    x[i] = yn;
  }
}

function biquadHP(x: Float32Array, sr: number, freq: number, q = 0.7) {
  const f0 = Math.min(Math.max(freq, 20), sr * 0.45);
  const w0 = (2 * Math.PI * f0) / sr;
  const alpha = Math.sin(w0) / (2 * q);
  const cos = Math.cos(w0);
  const b0 = (1 + cos) / 2;
  const b1 = -(1 + cos);
  const b2 = (1 + cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i]!;
    const yn = (b0 / a0) * xn + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
    x[i] = yn;
  }
}

function biquadBP(x: Float32Array, sr: number, freq: number, q = 1) {
  const f0 = Math.min(Math.max(freq, 40), sr * 0.45);
  const w0 = (2 * Math.PI * f0) / sr;
  const alpha = Math.sin(w0) / (2 * q);
  const cos = Math.cos(w0);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i]!;
    const yn = (b0 / a0) * xn + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1;
    x1 = xn;
    y2 = y1;
    y1 = yn;
    x[i] = yn;
  }
}

function pinkFilter() {
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  return (white: number) => {
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.052691;
    return b0 + b1 + b2 + white * 0.1848;
  };
}

function osc(kind: SynthLayer["kind"], phase: number, t: number, layer: SynthLayer) {
  switch (kind) {
    case "sine":
      return Math.sin(phase);
    case "tri":
      return 1 - 4 * Math.abs(Math.round(phase / (2 * Math.PI)) - phase / (2 * Math.PI));
    case "square":
      return Math.sin(phase) > 0 ? 1 : -1;
    case "fm": {
      const ratio = layer.fmRatio ?? 2.2;
      const idx = layer.fmIndex ?? 3;
      return Math.sin(phase + idx * Math.sin(phase * ratio));
    }
    case "click":
      return Math.sin(phase) * Math.exp(-t * 80);
    default:
      return 0;
  }
}

function renderLayer(layer: SynthLayer, sr: number, n: number, out: Float32Array) {
  const delay = Math.floor(((layer.delayMs ?? 0) * sr) / 1000);
  const attack = Math.max(0.0002, layer.attack ?? 0.001);
  const ampDecay = layer.ampDecay;
  const pitchDecay = layer.pitchDecay ?? 12;
  const startHz = layer.startHz ?? 180;
  const endHz = layer.endHz ?? startHz;
  const drive = layer.drive ?? 0;
  const pink = pinkFilter();
  let phase = 0;
  const metalPhase = METAL_FREQS.map(() => 0);

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (i < delay) continue;
    const td = t - delay / sr;
    const envA = td < attack ? td / attack : 1;
    const envD = Math.exp(-td * ampDecay);
    const env = envA * envD * layer.gain;
    if (env < 1e-5 && td > 0.05) continue;

    let s = 0;
    if (layer.kind === "noise") {
      const white = Math.random() * 2 - 1;
      const c = layer.noiseColor ?? 1;
      s = c < 0.8 ? pink(white) * 0.35 : white;
    } else if (layer.kind === "metallic") {
      for (let k = 0; k < METAL_FREQS.length; k++) {
        metalPhase[k]! += (2 * Math.PI * METAL_FREQS[k]!) / sr;
        s += metalPhase[k]! % (2 * Math.PI) < Math.PI ? 1 : -1;
      }
      s /= METAL_FREQS.length;
    } else {
      const freq = endHz + (startHz - endHz) * Math.exp(-td * pitchDecay);
      phase += (2 * Math.PI * freq) / sr;
      s = osc(layer.kind, phase, td, layer);
    }
    if (drive > 0) s = Math.tanh(s * (1 + drive * 3));
    out[i]! += s * env;
  }

  if (layer.hp) biquadHP(out, sr, layer.hp, layer.q ?? 0.7);
  if (layer.lp) biquadLP(out, sr, layer.lp, layer.q ?? 0.7);
  if (layer.bp) biquadBP(out, sr, layer.bp, layer.q ?? 0.8);
}

export function renderSoundDef(def: SoundDef, sr = 44100): AudioBuffer {
  const n = Math.max(64, Math.floor(def.duration * sr));
  const mix = new Float32Array(n);
  for (const layer of def.layers) {
    const buf = new Float32Array(n);
    renderLayer(layer, sr, n, buf);
    for (let i = 0; i < n; i++) mix[i]! += buf[i]!;
  }

  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mix[i]!));
  const norm = peak > 0 ? 0.89 / peak : 1;
  const fade = Math.floor(0.004 * sr);
  for (let i = 0; i < n; i++) {
    let g = norm;
    if (i < fade) g *= i / fade;
    if (i > n - fade) g *= (n - i) / fade;
    mix[i]! *= g;
  }

  const buffer = ctx(sr).createBuffer(1, n, sr);
  buffer.copyToChannel(mix, 0);
  return buffer;
}

export function reverseBuffer(buffer: AudioBuffer): AudioBuffer {
  const sr = buffer.sampleRate;
  const out = ctx(sr).createBuffer(buffer.numberOfChannels, buffer.length, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i]!;
  }
  return out;
}

export function sliceBuffer(buffer: AudioBuffer, start01: number, end01: number): AudioBuffer {
  const a = Math.floor(Math.max(0, start01) * buffer.length);
  const b = Math.floor(Math.min(1, Math.max(start01 + 0.01, end01)) * buffer.length);
  const len = Math.max(8, b - a);
  const sr = buffer.sampleRate;
  const out = ctx(sr).createBuffer(buffer.numberOfChannels, len, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(a, a + len));
  }
  return out;
}

export function makeImpulse(
  sr: number,
  seconds: number,
  decay: number,
  damping: number,
  stereo: boolean,
): AudioBuffer {
  const n = Math.max(32, Math.floor(seconds * sr));
  const ch = stereo ? 2 : 1;
  const buf = ctx(sr).createBuffer(ch, n, sr);
  for (let c = 0; c < ch; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = Math.exp(-t * (1.2 + decay * 6));
      let s = (Math.random() * 2 - 1) * env;
      if (i < sr * 0.08) {
        s += Math.exp(-t * 28) * (Math.random() * 2 - 1) * 0.6;
      }
      data[i] = s;
    }
    if (damping > 0.05) biquadLP(data, sr, 12000 - damping * 9000, 0.7);
  }
  return buf;
}
