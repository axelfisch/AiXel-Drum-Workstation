export const CHANNEL_COUNT = 16;
export const MAX_STEPS = 64;
export const PATTERN_COUNT = 16;
export const DEFAULT_STEPS = 32;

export type DrumFamily = "kick" | "snare" | "hat" | "tom" | "perc" | "fx";
export type FilterType = "off" | "lp" | "hp" | "bp";
export type StepMode =
  | "trigger"
  | "velocity"
  | "probability"
  | "pitch"
  | "micro"
  | "ratchet"
  | "filter"
  | "reverb"
  | "length";

export type PageId = "sequencer" | "sound" | "mixer" | "song" | "browser";
export type StepCount = 16 | 24 | 32 | 64;
export type Ratchet = 1 | 2 | 3 | 4 | 6 | 8;
export type GrooveId =
  | "straight"
  | "mpc"
  | "loose-hiphop"
  | "shuffle"
  | "funk"
  | "house"
  | "broken"
  | "brazilian"
  | "human"
  | "neo-soul";
export type GenreId =
  | "hiphop"
  | "funk"
  | "pop"
  | "house"
  | "techno"
  | "trap"
  | "latin"
  | "brazilian"
  | "experimental";

export type LayerKind = "sine" | "tri" | "square" | "noise" | "metallic" | "click" | "fm";

export interface SynthLayer {
  kind: LayerKind;
  gain: number;
  startHz?: number;
  endHz?: number;
  pitchDecay?: number;
  ampDecay: number;
  attack?: number;
  hp?: number;
  lp?: number;
  bp?: number;
  q?: number;
  drive?: number;
  delayMs?: number;
  noiseColor?: number;
  fmRatio?: number;
  fmIndex?: number;
  duration?: number;
}

export interface SoundDef {
  id: string;
  name: string;
  family: DrumFamily;
  genres: string[];
  character: string[];
  acoustic: boolean;
  duration: number;
  layers: SynthLayer[];
}

export interface Step {
  on: boolean;
  velocity: number;
  probability: number;
  pitch: number;
  pan: number;
  micro: number;
  ratchet: Ratchet;
  length: number;
  filter: number;
  reverb: number;
  delay: number;
}

export interface DrumChannel {
  id: string;
  name: string;
  family: DrumFamily;
  soundId: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  pitch: number;
  fine: number;
  attack: number;
  hold: number;
  decay: number;
  release: number;
  filterType: FilterType;
  cutoff: number;
  resonance: number;
  drive: number;
  transientAttack: number;
  transientSustain: number;
  tone: number;
  lofi: number;
  width: number;
  reverbSend: number;
  delaySend: number;
  chokeGroup: number;
  laneLength: number;
  lockSound: boolean;
  lockPattern: boolean;
  lockMixer: boolean;
  sampleStart: number;
  sampleEnd: number;
  reverse: boolean;
  fadeIn: number;
  fadeOut: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  comp: number;
  sat: number;
  punch: number;
  body: number;
  snap: number;
  userSample?: boolean;
}

export interface Pattern {
  name: string;
  steps: Step[][];
}

export interface SongClip {
  patternIndex: number;
  repeats: number;
  label: string;
}

export interface KitDef {
  id: string;
  name: string;
  category: string;
  genre: string;
  character: string;
  acoustic: boolean;
  slots: Array<{
    soundId: string;
    volume?: number;
    pan?: number;
    decay?: number;
    pitch?: number;
    reverbSend?: number;
    delaySend?: number;
    cutoff?: number;
    drive?: number;
    chokeGroup?: number;
    tone?: number;
    punch?: number;
    snap?: number;
    body?: number;
  }>;
}

export interface MixerBus {
  reverb: {
    size: number;
    decay: number;
    preDelay: number;
    damping: number;
    tone: number;
    width: number;
    return: number;
  };
  delay: {
    time: number;
    sync: boolean;
    feedback: number;
    filter: number;
    width: number;
    return: number;
  };
  master: {
    eqLow: number;
    eqMid: number;
    eqHigh: number;
    punch: number;
    tape: number;
    clip: number;
    limiter: number;
    gain: number;
    mute: boolean;
    solo: boolean;
  };
}

export interface Project {
  name: string;
  kitId: string;
  tempo: number;
  swing: number;
  humanize: number;
  groove: GrooveId;
  stepCount: StepCount;
  polyMode: boolean;
  channels: DrumChannel[];
  patterns: Pattern[];
  patternIndex: number;
  song: SongClip[];
  mixer: MixerBus;
  midiMap: number[];
}

export const FAMILY_ORDER: DrumFamily[] = ["kick", "snare", "hat", "tom", "perc", "fx"];

export function emptyStep(): Step {
  return {
    on: false,
    velocity: 0.8,
    probability: 1,
    pitch: 0,
    pan: 0,
    micro: 0,
    ratchet: 1,
    length: 1,
    filter: 0.5,
    reverb: 0,
    delay: 0,
  };
}

export function hitStep(velocity = 0.85, extras: Partial<Step> = {}): Step {
  return { ...emptyStep(), on: true, velocity, ...extras };
}

export function makeEmptyPattern(name = "Pattern", channels = CHANNEL_COUNT, steps = MAX_STEPS): Pattern {
  return {
    name,
    steps: Array.from({ length: channels }, () => Array.from({ length: steps }, () => emptyStep())),
  };
}

export function cloneStep(s: Step): Step {
  return { ...s };
}

export function clonePattern(p: Pattern): Pattern {
  return {
    name: p.name,
    steps: p.steps.map((lane) => lane.map(cloneStep)),
  };
}
