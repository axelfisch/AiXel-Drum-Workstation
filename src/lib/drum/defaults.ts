import {
  CHANNEL_COUNT,
  PATTERN_COUNT,
  type DrumChannel,
  type DrumFamily,
  type MixerBus,
  type Project,
  makeEmptyPattern,
} from "./types";

export const CHANNEL_LAYOUT: Array<{
  name: string;
  family: DrumFamily;
  chokeGroup: number;
  gm: number;
}> = [
  { name: "Kick 1", family: "kick", chokeGroup: 0, gm: 36 },
  { name: "Kick 2", family: "kick", chokeGroup: 0, gm: 35 },
  { name: "Snare", family: "snare", chokeGroup: 0, gm: 38 },
  { name: "Clap", family: "snare", chokeGroup: 0, gm: 39 },
  { name: "Rim / Stick", family: "snare", chokeGroup: 0, gm: 37 },
  { name: "Closed Hat", family: "hat", chokeGroup: 1, gm: 42 },
  { name: "Open Hat", family: "hat", chokeGroup: 1, gm: 46 },
  { name: "Ride", family: "hat", chokeGroup: 0, gm: 51 },
  { name: "Crash", family: "hat", chokeGroup: 0, gm: 49 },
  { name: "Tom High", family: "tom", chokeGroup: 2, gm: 50 },
  { name: "Tom Mid", family: "tom", chokeGroup: 2, gm: 47 },
  { name: "Tom Low", family: "tom", chokeGroup: 2, gm: 45 },
  { name: "Perc 1", family: "perc", chokeGroup: 0, gm: 63 },
  { name: "Perc 2", family: "perc", chokeGroup: 0, gm: 62 },
  { name: "Shaker", family: "perc", chokeGroup: 0, gm: 70 },
  { name: "FX / User", family: "fx", chokeGroup: 0, gm: 75 },
];

export const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "q", "w", "e", "r", "t", "y", "u", "i"];

export function defaultChannel(index: number, soundId: string): DrumChannel {
  const layout = CHANNEL_LAYOUT[index]!;
  const isHat = layout.family === "hat";
  const isKick = layout.family === "kick";
  const isSnare = layout.family === "snare";
  return {
    id: `ch-${index}`,
    name: layout.name,
    family: layout.family,
    soundId,
    volume: isKick ? 0.92 : isSnare ? 0.84 : isHat ? 0.62 : 0.74,
    pan: index === 9 ? 0.18 : index === 11 ? -0.22 : index === 5 ? -0.08 : index === 6 ? 0.1 : 0,
    mute: false,
    solo: false,
    pitch: 0,
    fine: 0,
    attack: isKick ? 0.01 : 0.004,
    hold: isKick ? 0.04 : 0.01,
    decay: isKick ? 0.72 : isHat && index === 6 ? 0.55 : isHat ? 0.22 : 0.45,
    release: 0.08,
    filterType: "off",
    cutoff: 0.85,
    resonance: 0.12,
    drive: isKick ? 0.18 : 0.08,
    transientAttack: isKick || isSnare ? 0.45 : 0.25,
    transientSustain: 0.4,
    tone: 0.55,
    lofi: 0,
    width: layout.family === "hat" || layout.family === "perc" ? 0.35 : 0.08,
    reverbSend: isKick ? 0.02 : isSnare ? (index === 3 ? 0.38 : 0.22) : index === 8 ? 0.42 : 0.12,
    delaySend: 0,
    chokeGroup: layout.chokeGroup,
    laneLength: 32,
    lockSound: false,
    lockPattern: false,
    lockMixer: false,
    sampleStart: 0,
    sampleEnd: 1,
    reverse: false,
    fadeIn: 0,
    fadeOut: 0,
    eqLow: isKick ? 0.12 : 0,
    eqMid: 0,
    eqHigh: isHat ? 0.08 : 0,
    comp: isKick || isSnare ? 0.22 : 0.08,
    sat: isKick ? 0.16 : 0.05,
    punch: isKick ? 0.55 : 0.2,
    body: isKick || isSnare ? 0.5 : 0.35,
    snap: isSnare ? 0.55 : 0.3,
  };
}

export function defaultMixer(): MixerBus {
  return {
    reverb: {
      size: 0.42,
      decay: 0.48,
      preDelay: 0.18,
      damping: 0.45,
      tone: 0.55,
      width: 0.85,
      return: 0.55,
    },
    delay: {
      time: 0.375,
      sync: true,
      feedback: 0.28,
      filter: 0.55,
      width: 0.7,
      return: 0.35,
    },
    master: {
      eqLow: 0.06,
      eqMid: 0.02,
      eqHigh: 0.04,
      punch: 0.35,
      tape: 0.22,
      clip: 0.4,
      limiter: 0.7,
      gain: 0.82,
    },
  };
}

export function defaultProject(kitId: string, soundIds: string[]): Project {
  return {
    name: "Untitled Beat",
    kitId,
    tempo: 96,
    swing: 54,
    humanize: 12,
    groove: "mpc",
    stepCount: 32,
    polyMode: false,
    channels: Array.from({ length: CHANNEL_COUNT }, (_, i) =>
      defaultChannel(i, soundIds[i] ?? "studio-kick"),
    ),
    patterns: Array.from({ length: PATTERN_COUNT }, (_, i) =>
      makeEmptyPattern(String.fromCharCode(65 + i)),
    ),
    patternIndex: 0,
    song: [
      { patternIndex: 0, repeats: 4, label: "INTRO" },
      { patternIndex: 1, repeats: 4, label: "A" },
      { patternIndex: 2, repeats: 2, label: "B" },
      { patternIndex: 1, repeats: 4, label: "A" },
    ],
    mixer: defaultMixer(),
    midiMap: CHANNEL_LAYOUT.map((c) => c.gm),
  };
}

export const GROOVE_LABELS: Record<string, string> = {
  straight: "Straight",
  mpc: "MPC-style",
  "loose-hiphop": "Loose Hip-Hop",
  shuffle: "Shuffle",
  funk: "Funk",
  house: "House",
  broken: "Broken Beat",
  brazilian: "Brazilian",
  human: "Human",
  "neo-soul": "Neo Soul",
};

export const GENRE_LABELS: Record<string, string> = {
  hiphop: "Hip-Hop",
  funk: "Funk",
  pop: "Pop",
  house: "House",
  techno: "Techno",
  trap: "Trap",
  latin: "Latin",
  brazilian: "Brazilian",
  experimental: "Experimental",
};

export const STEP_MODE_LABELS = {
  trigger: "Trigger",
  velocity: "Velocity",
  probability: "Probability",
  ratchet: "Ratchet",
  micro: "Micro",
  length: "Length",
  pitch: "Pitch",
  filter: "Filter",
  reverb: "Reverb",
} as const;
