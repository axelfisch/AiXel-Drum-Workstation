import type { Project, Step } from "@/lib/drum/types";
import { audioEngine } from "./audio-engine";

export type TransportListener = (state: {
  playing: boolean;
  step: number;
  stepFloat: number;
  patternIndex: number;
}) => void;

const GROOVE_SWING: Record<string, number> = {
  straight: 0,
  mpc: 58,
  "loose-hiphop": 64,
  shuffle: 72,
  funk: 52,
  house: 8,
  broken: 40,
  brazilian: 46,
  human: 28,
};

export class SequencerEngine {
  playing = false;
  step = 0;
  stepFloat = 0;
  songMode = false;
  songClip = 0;
  songRepeatLeft = 0;
  fillArmed = false;
  fillSteps: Step[][] | null = null;
  timeScale = 1;
  private timer: number | null = null;
  private nextNoteTime = 0;
  private startTime = 0;
  private listeners = new Set<TransportListener>();
  private getProject: () => Project;
  private onPatternPlay: (index: number) => void;
  private lookahead = 25;
  private scheduleAhead = 0.12;

  constructor(getProject: () => Project, onPatternPlay: (index: number) => void) {
    this.getProject = getProject;
    this.onPatternPlay = onPatternPlay;
  }

  subscribe(fn: TransportListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const p = this.getProject();
    for (const fn of this.listeners) {
      fn({
        playing: this.playing,
        step: this.step,
        stepFloat: this.stepFloat,
        patternIndex: p.patternIndex,
      });
    }
  }

  async play() {
    await audioEngine.init();
    await audioEngine.resume();
    if (this.playing) return;
    const ctx = audioEngine.ctx!;
    this.playing = true;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.startTime = this.nextNoteTime;
    if (this.songMode) {
      const clip = this.getProject().song[this.songClip];
      this.songRepeatLeft = clip?.repeats ?? 1;
    }
    this.timer = window.setInterval(() => this.schedule(), this.lookahead);
    this.emit();
  }

  stop() {
    this.playing = false;
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.step = 0;
    this.stepFloat = 0;
    this.emit();
  }

  toggle() {
    if (this.playing) this.stop();
    else void this.play();
  }

  private secondsPerStep(project: Project) {
    const tempo = project.tempo;
    const beat = 60 / tempo;
    const stepsPerBar = project.stepCount === 24 ? 24 : 16;
    return (beat * 4) / stepsPerBar / this.timeScale;
  }

  private swingFor(project: Project, step: number, dur: number) {
    const groove = GROOVE_SWING[project.groove] ?? 0;
    const swing = clamp01((project.swing + groove * 0.35) / 100);
    if (step % 2 === 1) return dur * swing * 0.66;
    return 0;
  }

  private schedule() {
    const ctx = audioEngine.ctx;
    if (!ctx || !this.playing) return;
    const project = this.getProject();
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAhead) {
      this.scheduleStep(project, this.step, this.nextNoteTime);
      const dur = this.secondsPerStep(project);
      this.nextNoteTime += dur + this.swingFor(project, this.step, dur);
      this.advance(project);
    }
    const dur = this.secondsPerStep(project);
    const elapsed = ctx.currentTime - (this.nextNoteTime - dur);
    this.stepFloat = this.step + clamp01(elapsed / dur);
    this.emit();
  }

  private scheduleStep(project: Project, step: number, when: number) {
    const pattern = project.patterns[project.patternIndex]!;
    const len = project.stepCount;
    const useFill = this.fillArmed && this.fillSteps && step >= len - this.fillLength(project);
    for (let c = 0; c < project.channels.length; c++) {
      const ch = project.channels[c]!;
      const laneLen = project.polyMode ? Math.max(1, ch.laneLength) : len;
      const idx = step % laneLen;
      const lane = useFill ? this.fillSteps![c] : pattern.steps[c];
      const st = lane?.[idx];
      if (!st) continue;
      audioEngine.triggerStep(c, ch, st, when, project.humanize, this.secondsPerStep(project));
    }
  }

  private fillLength(project: Project) {
    return Math.min(project.stepCount, 8);
  }

  private advance(project: Project) {
    const len = project.stepCount;
    this.step += 1;
    if (this.step >= len) {
      this.step = 0;
      if (this.fillArmed) {
        this.fillArmed = false;
        this.fillSteps = null;
      }
      if (this.songMode) {
        this.songRepeatLeft -= 1;
        if (this.songRepeatLeft <= 0) {
          this.songClip = (this.songClip + 1) % Math.max(1, project.song.length);
          const clip = project.song[this.songClip];
          this.songRepeatLeft = clip?.repeats ?? 1;
          if (clip) this.onPatternPlay(clip.patternIndex);
        }
      }
    }
  }

  armFill(steps: Step[][]) {
    this.fillArmed = true;
    this.fillSteps = steps;
  }
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function stepDuration(project: Project, timeScale = 1) {
  const beat = 60 / project.tempo;
  const stepsPerBar = project.stepCount === 24 ? 24 : 16;
  return (beat * 4) / stepsPerBar / timeScale;
}
