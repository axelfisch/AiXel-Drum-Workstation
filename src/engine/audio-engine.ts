import { SOUND_LIBRARY } from "@/lib/drum/library";
import { clamp, semitoneRatio } from "@/lib/utils";
import type { DrumChannel, MixerBus, Project, Step } from "@/lib/drum/types";
import { makeImpulse, renderSoundDef, reverseBuffer, sliceBuffer } from "./synth";

export type TriggerOpts = {
  velocity: number;
  pitch: number;
  pan: number;
  when: number;
  filter?: number;
  reverb?: number;
  delay?: number;
  length?: number;
  stepDur?: number;
};

type Voice = {
  stop: (when: number) => void;
  group: number;
  ch: number;
};

const MAX_VOICES = 48;

export class AudioEngine {
  ctx: AudioContext | null = null;
  ready = false;
  buffers = new Map<string, AudioBuffer>();
  userBuffers = new Map<number, AudioBuffer>();
  private channelInput: GainNode[] = [];
  private channelOut: GainNode[] = [];
  private channelPan: StereoPannerNode[] = [];
  private meters = new Float32Array(16);
  private meterDecay = new Float32Array(16);
  private master!: GainNode;
  private masterAnalyser!: AnalyserNode;
  private reverbSend!: GainNode;
  private delaySend!: GainNode;
  private convolver!: ConvolverNode;
  private delayNode!: DelayNode;
  private delayFb!: GainNode;
  private delayFilter!: BiquadFilterNode;
  private punchComp!: DynamicsCompressorNode;
  private tapeShaper!: WaveShaperNode;
  private limiter!: DynamicsCompressorNode;
  private output!: GainNode;
  private voices: Voice[] = [];
  private lastChoke = new Map<number, Voice>();
  private irKey = "";
  masterPeak = 0;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.buildGraph();
    this.renderLibrary();
    this.ready = true;
  }

  private buildGraph() {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.reverbSend = ctx.createGain();
    this.delaySend = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = makeImpulse(ctx.sampleRate, 2.4, 0.5, 0.4, true);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.55;
    this.reverbSend.connect(this.convolver);
    this.convolver.connect(verbOut);

    this.delayNode = ctx.createDelay(2);
    this.delayNode.delayTime.value = 0.375;
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.28;
    this.delayFilter = ctx.createBiquadFilter();
    this.delayFilter.type = "lowpass";
    this.delayFilter.frequency.value = 4500;
    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.35;
    this.delaySend.connect(this.delayNode);
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFb);
    this.delayFb.connect(this.delayNode);
    this.delayFilter.connect(delayOut);

    this.punchComp = ctx.createDynamicsCompressor();
    this.tapeShaper = ctx.createWaveShaper();
    this.tapeShaper.curve = makeDriveCurve(0.3);
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 2;
    this.limiter.ratio.value = 18;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;
    this.output = ctx.createGain();
    this.output.gain.value = 0.85;
    this.masterAnalyser = ctx.createAnalyser();
    this.masterAnalyser.fftSize = 1024;
    this.masterAnalyser.smoothingTimeConstant = 0.5;

    this.master.connect(this.punchComp);
    this.punchComp.connect(this.tapeShaper);
    this.tapeShaper.connect(this.limiter);
    verbOut.connect(this.limiter);
    delayOut.connect(this.limiter);
    this.limiter.connect(this.output);
    this.output.connect(this.masterAnalyser);
    this.masterAnalyser.connect(ctx.destination);

    this.channelInput = [];
    this.channelOut = [];
    this.channelPan = [];
    for (let i = 0; i < 16; i++) {
      const input = ctx.createGain();
      const pan = ctx.createStereoPanner();
      const out = ctx.createGain();
      input.connect(pan);
      pan.connect(out);
      out.connect(this.master);
      this.channelInput.push(input);
      this.channelPan.push(pan);
      this.channelOut.push(out);
    }
  }

  private renderLibrary() {
    for (const def of SOUND_LIBRARY) {
      try {
        this.buffers.set(def.id, renderSoundDef(def, this.ctx!.sampleRate));
      } catch {
        /* skip */
      }
    }
  }

  applyMixer(mixer: MixerBus) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const r = mixer.reverb;
    this.reverbSend.gain.setTargetAtTime(r.return * 0.9, now, 0.03);
    const key = `${r.size.toFixed(2)}:${r.decay.toFixed(2)}:${r.damping.toFixed(2)}`;
    if (key !== this.irKey) {
      this.irKey = key;
      this.convolver.buffer = makeImpulse(
        this.ctx.sampleRate,
        1.2 + r.size * 2.4,
        r.decay,
        r.damping,
        true,
      );
    }
    const d = mixer.delay;
    this.delayFb.gain.setTargetAtTime(d.feedback, now, 0.03);
    this.delayFilter.frequency.setTargetAtTime(800 + d.filter * 9000, now, 0.03);
    this.delaySend.gain.setTargetAtTime(d.return * 0.8, now, 0.03);
    const m = mixer.master;
    this.output.gain.setTargetAtTime(0.4 + m.gain * 0.7, now, 0.03);
    this.punchComp.threshold.setTargetAtTime(-8 - m.punch * 14, now, 0.05);
    this.punchComp.ratio.setTargetAtTime(2 + m.punch * 6, now, 0.05);
    this.punchComp.attack.setTargetAtTime(0.004, now, 0.05);
    this.punchComp.release.setTargetAtTime(0.08 + (1 - m.punch) * 0.15, now, 0.05);
    this.tapeShaper.curve = makeDriveCurve(m.tape * 0.9);
    this.limiter.threshold.setTargetAtTime(-1 - m.limiter * 8, now, 0.05);
  }

  applyChannelStrip(i: number, ch: DrumChannel, anySolo: boolean) {
    if (!this.ctx) return;
    const silent = ch.mute || (anySolo && !ch.solo);
    const g = silent ? 0 : ch.volume * ch.volume;
    this.channelOut[i]?.gain.setTargetAtTime(g, this.ctx.currentTime, 0.015);
    this.channelPan[i]?.pan.setTargetAtTime(clamp(ch.pan, -1, 1), this.ctx.currentTime, 0.015);
  }

  setDelayTime(seconds: number) {
    if (!this.ctx) return;
    this.delayNode.delayTime.setTargetAtTime(clamp(seconds, 0.02, 1.8), this.ctx.currentTime, 0.02);
  }

  async loadUserSample(channel: number, file: File) {
    if (!this.ctx) await this.init();
    const arr = await file.arrayBuffer();
    const buf = await this.ctx!.decodeAudioData(arr.slice(0));
    this.userBuffers.set(channel, buf);
  }

  trigger(chIndex: number, ch: DrumChannel, opts: TriggerOpts) {
    if (!this.ctx || !this.ready) return;
    const ctx = this.ctx;
    const when = Math.max(ctx.currentTime, opts.when);
    let buffer = ch.userSample ? this.userBuffers.get(chIndex) : this.buffers.get(ch.soundId);
    if (!buffer) buffer = this.buffers.get(ch.soundId);
    if (!buffer) return;

    if (ch.reverse) buffer = reverseBuffer(buffer);
    if (ch.sampleStart > 0.001 || ch.sampleEnd < 0.999) {
      buffer = sliceBuffer(buffer, ch.sampleStart, ch.sampleEnd);
    }

    if (ch.chokeGroup > 0) {
      const prev = this.lastChoke.get(ch.chokeGroup);
      if (prev) prev.stop(when);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const rate = semitoneRatio(ch.pitch + opts.pitch + ch.fine / 100);
    src.playbackRate.value = rate;

    const velGain = ctx.createGain();
    const vel = clamp(opts.velocity, 0, 1);
    const punch = 1 + ch.punch * 0.35 * vel;
    velGain.gain.setValueAtTime(0.0001, when);
    const atk = Math.max(0.001, ch.attack);
    const hold = ch.hold;
    const dec = 0.04 + ch.decay * 1.6;
    velGain.gain.exponentialRampToValueAtTime(Math.max(0.001, vel * punch), when + atk);
    velGain.gain.setValueAtTime(Math.max(0.001, vel * punch), when + atk + hold);
    velGain.gain.exponentialRampToValueAtTime(0.0001, when + atk + hold + dec);

    const filter = ctx.createBiquadFilter();
    const fAmt = opts.filter ?? 0.5;
    const cutoffBase = 180 + ch.cutoff * 14000;
    const cutoff = cutoffBase * (0.45 + fAmt * 1.1);
    filter.type =
      ch.filterType === "off"
        ? "allpass"
        : ch.filterType === "hp"
          ? "highpass"
          : ch.filterType === "bp"
            ? "bandpass"
            : "lowpass";
    filter.frequency.setValueAtTime(clamp(cutoff * (0.7 + ch.tone * 0.6), 40, 18000), when);
    filter.Q.value = 0.4 + ch.resonance * 8;

    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDriveCurve(ch.drive + ch.sat * 0.5);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(clamp(ch.pan + opts.pan, -1, 1), when);

    const dry = ctx.createGain();
    dry.gain.value = 1;
    const rSend = ctx.createGain();
    rSend.gain.value = clamp(ch.reverbSend + (opts.reverb ?? 0) * 0.4, 0, 1);
    const dSend = ctx.createGain();
    dSend.gain.value = clamp(ch.delaySend + (opts.delay ?? 0) * 0.4, 0, 1);

    src.connect(velGain);
    velGain.connect(filter);
    filter.connect(shaper);
    shaper.connect(panner);
    panner.connect(dry);
    dry.connect(this.channelInput[chIndex]!);
    panner.connect(rSend);
    panner.connect(dSend);
    rSend.connect(this.reverbSend);
    dSend.connect(this.delaySend);

    src.start(when, 0);
    const dur = (buffer.duration / rate) * (opts.length ?? 1);
    src.stop(when + dur + 0.05);

    const voice: Voice = {
      ch: chIndex,
      group: ch.chokeGroup,
      stop: (t) => {
        try {
          velGain.gain.cancelScheduledValues(t);
          velGain.gain.setTargetAtTime(0.0001, t, 0.008);
          src.stop(t + 0.03);
        } catch {
          /* already stopped */
        }
      },
    };
    this.voices.push(voice);
    if (this.voices.length > MAX_VOICES) {
      const old = this.voices.shift();
      old?.stop(when);
    }
    if (ch.chokeGroup > 0) this.lastChoke.set(ch.chokeGroup, voice);
    src.onended = () => {
      try {
        src.disconnect();
        velGain.disconnect();
        filter.disconnect();
        shaper.disconnect();
        panner.disconnect();
        dry.disconnect();
        rSend.disconnect();
        dSend.disconnect();
      } catch {
        /* graph already torn */
      }
      this.voices = this.voices.filter((v) => v !== voice);
    };

    this.meterDecay[chIndex] = Math.max(this.meterDecay[chIndex]!, vel);
  }

  triggerStep(chIndex: number, ch: DrumChannel, step: Step, when: number, humanize: number, stepDur = 0.12) {
    if (!step.on) return;
    if (Math.random() > step.probability) return;
    const micro = step.micro * 0.05 + (Math.random() * 2 - 1) * (humanize / 100) * 0.012;
    const velJitter = (Math.random() * 2 - 1) * (humanize / 100) * 0.08;
    const n = step.ratchet;
    for (let r = 0; r < n; r++) {
      const t = when + micro + (n > 1 ? (r * stepDur) / n : 0);
      this.trigger(chIndex, ch, {
        velocity: clamp(step.velocity + velJitter, 0.04, 1),
        pitch: step.pitch,
        pan: step.pan,
        when: t,
        filter: step.filter,
        reverb: step.reverb,
        delay: step.delay,
        length: step.length,
      });
    }
  }

  readMeters() {
    for (let i = 0; i < 16; i++) {
      this.meterDecay[i]! *= 0.86;
      this.meters[i] = this.meterDecay[i]!;
    }
    if (this.masterAnalyser) {
      const data = new Float32Array(this.masterAnalyser.fftSize);
      this.masterAnalyser.getFloatTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]!));
      this.masterPeak = peak;
    }
    return this.meters;
  }

  async resume() {
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }
}

function makeDriveCurve(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount * 12;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = k === 0 ? x : ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

export const audioEngine = new AudioEngine();

export function applyProjectRouting(project: Project) {
  const anySolo = project.channels.some((c) => c.solo);
  project.channels.forEach((ch, i) => audioEngine.applyChannelStrip(i, ch, anySolo));
  audioEngine.applyMixer(project.mixer);
  const beat = 60 / project.tempo;
  const t = project.mixer.delay.sync
    ? beat * Math.max(0.125, project.mixer.delay.time * 2)
    : Math.max(0.05, project.mixer.delay.time);
  audioEngine.setDelayTime(t);
}
