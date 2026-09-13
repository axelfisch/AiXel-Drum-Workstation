import { CHANNEL_COUNT, MAX_STEPS, emptyStep, hitStep, type Pattern, type Step } from "./types";

function lane(length: number, hits: Array<number | [number, number] | [number, Partial<Step>]>): Step[] {
  const steps = Array.from({ length }, () => emptyStep());
  for (const h of hits) {
    if (typeof h === "number") {
      if (h >= 0 && h < length) steps[h] = hitStep(0.88);
    } else {
      const [i, extra] = h;
      if (i < 0 || i >= length) continue;
      if (typeof extra === "number") steps[i] = hitStep(extra);
      else steps[i] = hitStep(extra.velocity ?? 0.88, extra);
    }
  }
  return steps;
}

function fillRest(lanes: Step[][]): Step[][] {
  while (lanes.length < CHANNEL_COUNT) lanes.push(Array.from({ length: MAX_STEPS }, () => emptyStep()));
  return lanes.map((l) => {
    const copy = l.slice();
    while (copy.length < MAX_STEPS) copy.push(emptyStep());
    return copy;
  });
}

export function patternFromLanes(name: string, lanes: Step[][]): Pattern {
  return { name, steps: fillRest(lanes) };
}

const N = MAX_STEPS;

export const FACTORY_PATTERNS: Pattern[] = [
  patternFromLanes("Boom Bap", [
    lane(N, [0, 10, 16, 26, [7, 0.45], [23, 0.4]]),
    lane(N, []),
    lane(N, [4, 12, 20, 28, [14, 0.32], [30, 0.28]]),
    lane(N, [[12, 0.5], [28, 0.45]]),
    lane(N, [[6, 0.55], [22, 0.5]]),
    lane(N, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((i) => [i, i % 4 === 0 ? 0.7 : 0.42])),
    lane(N, [[6, 0.55], [14, 0.6], [22, 0.5], [30, 0.55]]),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, [[3, 0.4], [11, 0.35], [19, 0.4]]),
    lane(N, []),
    lane(N, [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31].map((i) => [i, 0.35])),
    lane(N, []),
  ]),
  patternFromLanes("Half-Time Trap", [
    lane(N, [0, 14, 16, 24]),
    lane(N, [[0, 0.7], [16, 0.65]]),
    lane(N, [8, 24]),
    lane(N, [[8, 0.4], [24, 0.35]]),
    lane(N, []),
    lane(
      N,
      Array.from({ length: 32 }, (_, i) => [
        i,
        {
          velocity: i % 2 === 0 ? 0.62 : 0.28,
          ratchet: (i === 14 || i === 30 ? 4 : 1) as 1 | 4,
        },
      ]),
    ),
    lane(N, [[15, 0.7], [31, 0.65]]),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
  ]),
  patternFromLanes("Four on the Floor", [
    lane(N, [0, 4, 8, 12, 16, 20, 24, 28]),
    lane(N, []),
    lane(N, []),
    lane(N, [4, 12, 20, 28]),
    lane(N, []),
    lane(N, Array.from({ length: 32 }, (_, i) => [i, i % 2 === 0 ? 0.55 : 0.32])),
    lane(N, [2, 6, 10, 14, 18, 22, 26, 30].map((i) => [i, 0.6])),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, Array.from({ length: 16 }, (_, i) => [i * 2 + 1, 0.3])),
    lane(N, []),
  ]),
  patternFromLanes("Funk Ghosts", [
    lane(N, [0, 6, 10, 16, 22, 26]),
    lane(N, []),
    lane(N, [4, 12, 20, 28, [3, 0.28], [7, 0.3], [11, 0.25], [15, 0.32], [19, 0.26], [27, 0.3]]),
    lane(N, []),
    lane(N, [[2, 0.5], [18, 0.45]]),
    lane(N, Array.from({ length: 32 }, (_, i) => [i, i % 4 === 0 ? 0.72 : 0.4])),
    lane(N, [[10, 0.55], [26, 0.5]]),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
  ]),
  patternFromLanes("Pop Chorus", [
    lane(N, [0, 8, 16, 24, [12, 0.55], [28, 0.5]]),
    lane(N, []),
    lane(N, [4, 12, 20, 28]),
    lane(N, [4, 12, 20, 28].map((i) => [i, 0.55])),
    lane(N, []),
    lane(N, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((i) => [i, 0.5])),
    lane(N, [[14, 0.6], [30, 0.55]]),
    lane(N, []),
    lane(N, [[0, 0.7]]),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, [1, 5, 9, 13, 17, 21, 25, 29].map((i) => [i, 0.32])),
    lane(N, []),
  ]),
  patternFromLanes("Techno Drive", [
    lane(N, [0, 4, 8, 12, 16, 20, 24, 28]),
    lane(N, []),
    lane(N, [[4, 0.35], [12, 0.3], [20, 0.35], [28, 0.3]]),
    lane(N, []),
    lane(N, []),
    lane(N, Array.from({ length: 32 }, (_, i) => [i, 0.5])),
    lane(N, [6, 14, 22, 30].map((i) => [i, 0.62])),
    lane(N, [0, 16].map((i) => [i, 0.4])),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
  ]),
  patternFromLanes("Dilla Loose", [
    lane(N, [0, [7, { velocity: 0.8, micro: 0.18 }], 16, [23, { velocity: 0.7, micro: 0.22 }]]),
    lane(N, []),
    lane(N, [
      [4, { velocity: 0.9, micro: 0.25 }],
      [12, { velocity: 0.86, micro: 0.2 }],
      [20, { velocity: 0.88, micro: 0.28 }],
      [28, { velocity: 0.8, micro: 0.18 }],
      [10, 0.3],
      [26, 0.28],
    ]),
    lane(N, []),
    lane(N, [[6, 0.4]]),
    lane(N, [0, 2, 3, 5, 8, 10, 11, 13, 16, 18, 19, 21, 24, 26, 27, 29].map((i) => [i, i % 8 === 0 ? 0.6 : 0.36])),
    lane(N, [[13, 0.5], [29, 0.48]]),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
  ]),
  patternFromLanes("Latin Clave", [
    lane(N, [0, 8, 16, 24, [6, 0.5], [22, 0.45]]),
    lane(N, []),
    lane(N, [[4, 0.4], [12, 0.35], [20, 0.4], [28, 0.35]]),
    lane(N, []),
    lane(N, [2, 5, 8, 11, 14, 18, 21, 24, 27, 30].map((i) => [i, 0.55])),
    lane(N, [0, 4, 8, 12, 16, 20, 24, 28].map((i) => [i, 0.4])),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, [0, 6, 10, 16, 22, 26]),
    lane(N, [4, 12, 20, 28].map((i) => [i, 0.5])),
    lane(N, Array.from({ length: 16 }, (_, i) => [i * 2, 0.28])),
    lane(N, [0, 6, 10, 16, 22, 26]),
  ]),
  patternFromLanes("Broken Beat", [
    lane(N, [0, 5, 11, 16, 19, 27]),
    lane(N, []),
    lane(N, [3, 10, 18, 25, [7, 0.3], [22, 0.28]]),
    lane(N, [[10, 0.4]]),
    lane(N, [[2, 0.45], [20, 0.4]]),
    lane(N, [0, 2, 4, 7, 8, 11, 13, 16, 18, 21, 24, 26, 29].map((i) => [i, 0.45])),
    lane(N, [[14, 0.55], [30, 0.5]]),
    lane(N, []),
    lane(N, []),
    lane(N, [[26, 0.6]]),
    lane(N, [[28, 0.55]]),
    lane(N, [[30, 0.7]]),
    lane(N, [[9, 0.4]]),
    lane(N, []),
    lane(N, [1, 5, 9, 15, 21, 25].map((i) => [i, 0.3])),
    lane(N, []),
  ]),
];

function trapHats(): Pattern {
  const hats: Array<[number, Partial<Step>]> = [];
  for (let i = 0; i < 32; i++) {
    hats.push([
      i,
      {
        velocity: i % 4 === 0 ? 0.7 : i % 2 === 0 ? 0.5 : 0.28,
        ratchet: i === 13 || i === 29 ? 8 : i === 7 || i === 23 ? 4 : 1,
      },
    ]);
  }
  return patternFromLanes("Trap Hats", [
    lane(N, [0, 10, 16, 22]),
    lane(N, [0, 16]),
    lane(N, [8, 24]),
    lane(N, []),
    lane(N, []),
    lane(N, hats),
    lane(N, [[15, 0.75], [31, 0.7]]),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
    lane(N, []),
  ]);
}

FACTORY_PATTERNS.splice(1, 0, trapHats());
