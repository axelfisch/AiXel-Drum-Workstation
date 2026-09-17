import { CHANNEL_COUNT, clonePattern, emptyStep, hitStep, type GenreId, type Pattern, type Step } from "@/lib/drum/types";

function rand() {
  return Math.random();
}

function chance(p: number) {
  return rand() < p;
}

function cloneLane(lane: Step[]) {
  return lane.map((s) => ({ ...s }));
}

export function generateGenrePattern(genre: GenreId, length: number): Pattern {
  const lanes: Step[][] = Array.from({ length: CHANNEL_COUNT }, () =>
    Array.from({ length: 64 }, () => emptyStep()),
  );
  const on = (ch: number, i: number, vel = 0.85, extra: Partial<Step> = {}) => {
    if (i >= 0 && i < 64) lanes[ch]![i] = hitStep(vel, extra);
  };

  if (genre === "house" || genre === "techno") {
    for (let i = 0; i < length; i += 4) on(0, i, 0.92);
    for (let i = 4; i < length; i += 8) on(3, i, 0.75);
    for (let i = 0; i < length; i++) on(5, i, i % 2 === 0 ? 0.55 : 0.32);
    for (let i = 2; i < length; i += 4) on(6, i, 0.58);
    if (genre === "techno") for (let i = 0; i < length; i++) if (lanes[5]![i]!.on) lanes[5]![i]!.velocity = 0.5;
  } else if (genre === "trap") {
    on(0, 0, 0.95);
    on(0, 14, 0.7);
    on(0, 16, 0.9);
    on(0, 24, 0.6);
    on(1, 0, 0.7);
    on(1, 16, 0.65);
    on(2, 8, 0.9);
    on(2, 24, 0.88);
    for (let i = 0; i < length; i++) {
      on(5, i, i % 4 === 0 ? 0.65 : i % 2 === 0 ? 0.45 : 0.26, {
        ratchet: i % 16 === 14 ? 8 : i % 8 === 7 ? 4 : 1,
      });
    }
    on(6, 15, 0.7);
    on(6, 31, 0.65);
  } else if (genre === "funk") {
    [0, 6, 10, 16, 22, 26].forEach((i) => on(0, i, 0.88));
    [4, 12, 20, 28].forEach((i) => on(2, i, 0.9));
    [3, 7, 11, 15, 19, 27].forEach((i) => on(2, i, 0.28));
    for (let i = 0; i < length; i++) on(5, i, i % 4 === 0 ? 0.7 : 0.4);
  } else if (genre === "pop") {
    [0, 8, 16, 24].forEach((i) => on(0, i, 0.9));
    [4, 12, 20, 28].forEach((i) => on(2, i, 0.88));
    [4, 12, 20, 28].forEach((i) => on(3, i, 0.5));
    for (let i = 0; i < length; i += 2) on(5, i, 0.5);
    on(8, 0, 0.7);
  } else if (genre === "latin") {
    [0, 8, 16, 24].forEach((i) => on(0, i, 0.8));
    [0, 6, 10, 16, 22, 26].forEach((i) => on(15, i, 0.7));
    [0, 6, 10, 16, 22, 26].forEach((i) => on(12, i, 0.65));
    [4, 12, 20, 28].forEach((i) => on(13, i, 0.55));
    for (let i = 0; i < length; i += 2) on(5, i, 0.35);
  } else if (genre === "brazilian") {
    [0, 8, 16, 24].forEach((i) => on(0, i, 0.85));
    [4, 12, 20, 28].forEach((i) => on(4, i, 0.5));
    [3, 6, 11, 14, 19, 22, 27, 30].forEach((i) => on(14, i, 0.45));
    [0, 7, 10, 16, 23, 26].forEach((i) => on(12, i, 0.6));
  } else if (genre === "experimental") {
    for (let c = 0; c < 16; c++) {
      for (let i = 0; i < length; i++) {
        if (chance(0.18 + (c === 0 ? 0.08 : 0))) on(c, i, 0.3 + rand() * 0.6, { ratchet: chance(0.1) ? 4 : 1 });
      }
    }
  } else {
    on(0, 0, 0.92);
    on(0, 10, 0.8);
    on(0, 16, 0.9);
    on(0, 26, 0.75);
    on(2, 4, 0.9);
    on(2, 12, 0.88);
    on(2, 20, 0.9);
    on(2, 28, 0.86);
    on(2, 14, 0.32);
    for (let i = 0; i < length; i += 2) on(5, i, i % 4 === 0 ? 0.62 : 0.4);
    on(6, 6, 0.5);
    on(6, 22, 0.48);
  }

  return { name: genre, steps: lanes };
}

export function mixPatterns(base: Pattern, generated: Pattern, amount: number, locked: boolean[]): Pattern {
  const out = clonePattern(base);
  for (let c = 0; c < out.steps.length; c++) {
    if (locked[c]) continue;
    const a = out.steps[c]!;
    const b = generated.steps[c]!;
    for (let i = 0; i < a.length; i++) {
      if (rand() < amount) a[i] = { ...b[i]! };
    }
  }
  return out;
}

export function randomizeVelocity(pattern: Pattern, amount: number, locked: boolean[]): Pattern {
  const out = clonePattern(pattern);
  for (let c = 0; c < out.steps.length; c++) {
    if (locked[c]) continue;
    for (const s of out.steps[c]!) {
      if (!s.on) continue;
      s.velocity = Math.min(1, Math.max(0.05, s.velocity + (rand() * 2 - 1) * amount * 0.4));
    }
  }
  return out;
}

export function randomizeTiming(pattern: Pattern, amount: number, locked: boolean[]): Pattern {
  const out = clonePattern(pattern);
  for (let c = 0; c < out.steps.length; c++) {
    if (locked[c]) continue;
    for (const s of out.steps[c]!) {
      if (!s.on) continue;
      s.micro = Math.max(-1, Math.min(1, s.micro + (rand() * 2 - 1) * amount));
    }
  }
  return out;
}

export function mutatePattern(pattern: Pattern, amount: number, locked: boolean[]): Pattern {
  const out = clonePattern(pattern);
  const a = amount;
  for (let c = 0; c < out.steps.length; c++) {
    if (locked[c]) continue;
    const familyKick = c <= 1;
    const familySnare = c >= 2 && c <= 4;
    const familyHat = c === 5 || c === 6;
    for (let i = 0; i < out.steps[c]!.length; i++) {
      const s = out.steps[c]![i]!;
      if (familyKick && a < 0.45) {
        if (s.on) s.velocity = Math.min(1, Math.max(0.4, s.velocity + (rand() * 2 - 1) * a * 0.15));
        continue;
      }
      if (s.on) {
        s.velocity = Math.min(1, Math.max(0.08, s.velocity + (rand() * 2 - 1) * a * 0.25));
        s.micro = Math.max(-1, Math.min(1, s.micro + (rand() * 2 - 1) * a * 0.5));
        if (familyHat && chance(a * 0.35)) s.on = false;
        if (familyHat && chance(a * 0.2)) s.ratchet = ([1, 2, 4, 8] as const)[Math.floor(rand() * 4)]!;
        if (familySnare && chance(a * 0.15)) s.on = false;
      } else {
        if (familyHat && chance(a * 0.22)) out.steps[c]![i] = hitStep(0.3 + rand() * 0.3);
        if (familySnare && chance(a * 0.08)) out.steps[c]![i] = hitStep(0.28);
        if (!familyKick && !familySnare && !familyHat && chance(a * 0.1)) {
          out.steps[c]![i] = hitStep(0.4 + rand() * 0.3);
        }
      }
    }
  }
  return out;
}

export function makeFill(
  pattern: Pattern,
  length: number,
  complexity: number,
  amount: number,
  stepCount = 32,
): Step[][] {
  const out = pattern.steps.map(cloneLane);
  const laneLen = out[0]?.length ?? 64;
  const len = Math.min(Math.max(1, stepCount), laneLen);
  const fillLen = Math.min(Math.max(1, length), len);
  const start = Math.max(0, len - fillLen);
  for (let c = 0; c < out.length; c++) {
    const isKick = c <= 1;
    const isSnare = c >= 2 && c <= 4;
    const isHat = c === 5 || c === 6;
    const isTom = c >= 9 && c <= 11;
    const isPerc = c >= 12 && c <= 14;
    for (let i = start; i < len; i++) {
      if (isKick) continue;
      const dens = complexity * amount;
      if (isSnare && chance(0.25 + dens * 0.5)) out[c]![i] = hitStep(0.55 + rand() * 0.4, { ratchet: chance(dens) ? 4 : 1 });
      if (isTom && chance(0.2 + dens * 0.55)) out[c]![i] = hitStep(0.6 + rand() * 0.3);
      if (isHat && chance(0.4 + dens * 0.5)) {
        out[c]![i] = hitStep(0.4 + rand() * 0.4, { ratchet: chance(0.4) ? 4 : 1 });
      }
      if (isPerc && chance(0.15 + dens * 0.4)) out[c]![i] = hitStep(0.5);
    }
  }
  return out;
}

export function randomizeProbabilities(pattern: Pattern, locked: boolean[]): Pattern {
  const out = clonePattern(pattern);
  for (let c = 0; c < out.steps.length; c++) {
    if (locked[c]) continue;
    for (const s of out.steps[c]!) {
      if (s.on && chance(0.35)) s.probability = 0.4 + rand() * 0.6;
    }
  }
  return out;
}
