import { create } from "zustand";
import { CHANNEL_COUNT, clonePattern, makeEmptyPattern, type DrumChannel, type GenreId, type GrooveId, type PageId, type Project, type Step, type StepCount, type StepMode } from "@/lib/drum/types";
import { defaultChannel, defaultProject } from "@/lib/drum/defaults";
import { KIT_BY_ID, KIT_LIBRARY, SOUND_BY_ID, nextSoundId } from "@/lib/drum/library";
import { FACTORY_PATTERNS } from "@/lib/drum/patterns";
import { generateGenrePattern, makeFill, mixPatterns, mutatePattern, randomizeTiming, randomizeVelocity } from "@/engine/groove";
import { applyProjectRouting, audioEngine } from "@/engine/audio-engine";
import { SequencerEngine } from "@/engine/sequencer";

const STORAGE_KEY = "aixel-drum-project-v1";

function ensureMixer(m: Project["mixer"]): Project["mixer"] {
  return {
    ...m,
    reverb: { ...m.reverb },
    delay: { ...m.delay },
    master: {
      ...m.master,
      mute: m.master.mute ?? false,
      solo: m.master.solo ?? false,
    },
  };
}

const PRESETS_KEY = "aixel-drum-presets-v1";

export type SavedPreset = { id: string; name: string; kind: "project" | "kit" | "pattern"; at: number; data: unknown };

type Hist = Project;

interface WS {
  project: Project;
  page: PageId;
  selected: number;
  stepMode: StepMode;
  armed: boolean;
  playing: boolean;
  currentStep: number;
  stepFloat: number;
  songMode: boolean;
  timeScale: number;
  randomAmount: number;
  mutateAmount: number;
  fillAmount: number;
  fillComplexity: number;
  fillLength: 4 | 8 | 16;
  genre: GenreId;
  browserQuery: string;
  browserGenre: string;
  browserFamily: string;
  clipboard: Step[][] | null;
  history: Hist[];
  future: Hist[];
  presets: SavedPreset[];
  meter: number[];
  masterPeak: number;
  midiLearn: boolean;
  recording: boolean;
}

interface Actions {
  initFromStorage: () => void;
  setPage: (p: PageId) => void;
  select: (i: number) => void;
  setStepMode: (m: StepMode) => void;
  setTempo: (n: number) => void;
  setSwing: (n: number) => void;
  setHumanize: (n: number) => void;
  setGroove: (g: GrooveId) => void;
  setStepCount: (n: StepCount) => void;
  setPoly: (on: boolean) => void;
  toggleStep: (ch: number, step: number) => void;
  paintStep: (ch: number, step: number, on: boolean) => void;
  persistPaint: () => void;
  setStepParam: (ch: number, step: number, patch: Partial<Step>) => void;
  updateChannel: (i: number, patch: Partial<DrumChannel>) => void;
  loadKit: (kitId: string, keepPattern?: boolean) => void;
  nextSample: (dir: 1 | -1) => void;
  triggerPad: (i: number, vel?: number) => void;
  setPattern: (i: number) => void;
  copyPattern: () => void;
  pastePattern: () => void;
  clearPattern: () => void;
  duplicatePattern: () => void;
  randomize: (scope: "pattern" | "track" | "velocity" | "timing" | "sound" | "kit") => void;
  mutate: () => void;
  fillNow: () => void;
  lock: (i: number, key: "lockPattern" | "lockSound" | "lockMixer") => void;
  setPlayingUI: (p: boolean, step: number, stepFloat: number) => void;
  togglePlay: () => void;
  pause: () => void;
  stop: () => void;
  setRecording: (on: boolean) => void;
  setSongMode: (on: boolean) => void;
  setTimeScale: (n: number) => void;
  setRandomAmount: (n: number) => void;
  setMutateAmount: (n: number) => void;
  setFill: (patch: Partial<Pick<WS, "fillAmount" | "fillComplexity" | "fillLength">>) => void;
  setGenre: (g: GenreId) => void;
  setBrowser: (patch: Partial<Pick<WS, "browserQuery" | "browserGenre" | "browserFamily">>) => void;
  applyFactoryPattern: (name: string) => void;
  updateSong: (song: Project["song"]) => void;
  updateMixer: (patch: Partial<Project["mixer"]> | ((m: Project["mixer"]) => Project["mixer"])) => void;
  renameProject: (name: string) => void;
  savePreset: (kind: SavedPreset["kind"], name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  undo: () => void;
  redo: () => void;
  setMidiLearn: (on: boolean) => void;
  assignMidi: (note: number) => void;
  loadUserSample: (file: File) => Promise<void>;
  persist: () => void;
}

export let sequencer: SequencerEngine;

function snapshot(p: Project): Project {
  return JSON.parse(JSON.stringify(p)) as Project;
}

function bootProject(): Project {
  const kit = KIT_LIBRARY.find((k) => k.id === "boom-bap") ?? KIT_LIBRARY[0]!;
  const sounds = kit.slots.map((s) => s.soundId);
  const project = defaultProject(kit.id, sounds);
  applyKitToProject(project, kit.id);
  const pat = FACTORY_PATTERNS[0]!;
  project.patterns[0] = clonePattern(pat);
  project.patterns[0]!.name = "A";
  project.name = "Untitled Groove";
  return project;
}

function applyKitToProject(project: Project, kitId: string) {
  const kit = KIT_BY_ID[kitId];
  if (!kit) return;
  project.kitId = kitId;
  kit.slots.forEach((slot, i) => {
    const base = defaultChannel(i, slot.soundId);
    const cur = project.channels[i];
    if (cur?.lockSound || cur?.lockMixer) {
      if (!cur.lockSound) project.channels[i]!.soundId = slot.soundId;
      return;
    }
    project.channels[i] = {
      ...base,
      ...slot,
      soundId: slot.soundId,
      name: base.name,
      family: base.family,
      id: base.id,
      lockPattern: cur?.lockPattern ?? false,
      lockSound: false,
      lockMixer: false,
    };
  });
}

export const useWorkstation = create<WS & Actions>((set, get) => {
  const push = () => {
    const { project, history } = get();
    const next = [...history.slice(-39), snapshot(project)];
    set({ history: next, future: [] });
  };

  const route = () => {
    applyProjectRouting(get().project);
    get().persist();
  };

  return {
    project: bootProject(),
    page: "sequencer",
    selected: 0,
    stepMode: "velocity",
    armed: false,
    playing: false,
    currentStep: 0,
    stepFloat: 0,
    songMode: false,
    timeScale: 1,
    randomAmount: 0.35,
    mutateAmount: 0.5,
    fillAmount: 0.65,
    fillComplexity: 0.55,
    fillLength: 8,
    genre: "hiphop",
    browserQuery: "",
    browserGenre: "",
    browserFamily: "",
    clipboard: null,
    history: [],
    future: [],
    presets: [],
    meter: Array(16).fill(0),
    masterPeak: 0,
    midiLearn: false,
    recording: false,

    initFromStorage: () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Project;
          if (parsed?.channels?.length === CHANNEL_COUNT) set({ project: parsed });
        }
        const presets = localStorage.getItem(PRESETS_KEY);
        if (presets) set({ presets: JSON.parse(presets) as SavedPreset[] });
      } catch {
        /* ignore */
      }
      route();
    },
    persist: () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(get().project));
      } catch {
        /* quota */
      }
    },
    setPage: (page) => set({ page }),
    select: (selected) => set({ selected }),
    setStepMode: (stepMode) => set({ stepMode }),
    setTempo: (n) => {
      set({ project: { ...get().project, tempo: Math.round(Math.min(220, Math.max(40, n))) } });
      route();
    },
    setSwing: (n) => {
      set({ project: { ...get().project, swing: Math.min(100, Math.max(0, n)) } });
      get().persist();
    },
    setHumanize: (n) => {
      set({ project: { ...get().project, humanize: Math.min(100, Math.max(0, n)) } });
      get().persist();
    },
    setGroove: (groove) => {
      set({ project: { ...get().project, groove } });
      get().persist();
    },
    setStepCount: (stepCount) => {
      set({ project: { ...get().project, stepCount } });
      get().persist();
    },
    setPoly: (polyMode) => {
      set({ project: { ...get().project, polyMode } });
      get().persist();
    },
    toggleStep: (ch, step) => {
      push();
      const project = snapshot(get().project);
      const s = project.patterns[project.patternIndex]!.steps[ch]![step]!;
      s.on = !s.on;
      if (s.on && s.velocity < 0.05) s.velocity = 0.85;
      set({ project });
      get().persist();
    },
    paintStep: (ch, step, on) => {
      const project = snapshot(get().project);
      const s = project.patterns[project.patternIndex]!.steps[ch]![step]!;
      if (s.on === on) return;
      s.on = on;
      if (on && s.velocity < 0.05) s.velocity = 0.85;
      set({ project });
    },
    persistPaint: () => {
      get().persist();
    },
    setStepParam: (ch, step, patch) => {
      const project = snapshot(get().project);
      Object.assign(project.patterns[project.patternIndex]!.steps[ch]![step]!, patch);
      set({ project });
      get().persist();
    },
    updateChannel: (i, patch) => {
      const project = snapshot(get().project);
      Object.assign(project.channels[i]!, patch);
      set({ project });
      route();
    },
    loadKit: (kitId, keepPattern = true) => {
      push();
      const project = snapshot(get().project);
      applyKitToProject(project, kitId);
      if (!keepPattern) {
        const g = generateGenrePattern(get().genre, project.stepCount);
        project.patterns[project.patternIndex] = g;
      }
      set({ project });
      route();
    },
    nextSample: (dir) => {
      const { project, selected } = get();
      const ch = project.channels[selected]!;
      if (ch.lockSound) return;
      const id = nextSoundId(ch.soundId, dir, ch.family);
      get().updateChannel(selected, { soundId: id, userSample: false });
      const def = SOUND_BY_ID[id];
      if (def)
        void audioEngine.init().then(() =>
          audioEngine.trigger(selected, { ...ch, soundId: id, userSample: false }, {
            velocity: 0.9,
            pitch: 0,
            pan: 0,
            when: audioEngine.ctx?.currentTime ?? 0,
          }),
        );
    },
    triggerPad: (i, vel = 0.9) => {
      const state = get();
      const ch = state.project.channels[i]!;
      void audioEngine.init().then(() => {
        audioEngine.trigger(i, ch, {
          velocity: vel,
          pitch: 0,
          pan: 0,
          when: audioEngine.ctx!.currentTime,
        });
      });
      if (state.recording) {
        const project = snapshot(state.project);
        const step = Math.min(project.stepCount - 1, Math.max(0, Math.floor(state.stepFloat) % project.stepCount));
        const s = project.patterns[project.patternIndex]!.steps[i]![step]!;
        s.on = true;
        s.velocity = vel;
        set({ project, selected: i });
        get().persist();
      } else {
        set({ selected: i });
      }
    },
    setPattern: (patternIndex) => {
      set({ project: { ...get().project, patternIndex } });
      get().persist();
    },
    copyPattern: () => {
      const p = get().project;
      set({ clipboard: clonePattern(p.patterns[p.patternIndex]!).steps });
    },
    pastePattern: () => {
      const clip = get().clipboard;
      if (!clip) return;
      push();
      const project = snapshot(get().project);
      project.patterns[project.patternIndex]!.steps = clip.map((lane) => lane.map((s) => ({ ...s })));
      set({ project });
      get().persist();
    },
    clearPattern: () => {
      push();
      const project = snapshot(get().project);
      const idx = project.patternIndex;
      const locked = project.channels.map((c) => c.lockPattern);
      const empty = makeEmptyPattern(project.patterns[idx]!.name);
      empty.steps = empty.steps.map((lane, c) => (locked[c] ? project.patterns[idx]!.steps[c]! : lane));
      project.patterns[idx] = empty;
      set({ project });
      get().persist();
    },
    duplicatePattern: () => {
      push();
      const project = snapshot(get().project);
      const src = clonePattern(project.patterns[project.patternIndex]!);
      const dest = (project.patternIndex + 1) % 16;
      src.name = String.fromCharCode(65 + dest);
      project.patterns[dest] = src;
      project.patternIndex = dest;
      set({ project });
      get().persist();
    },
    randomize: (scope) => {
      push();
      const { project, randomAmount, genre, selected } = get();
      const locked = project.channels.map((c) => c.lockPattern);
      const amt = randomAmount;
      const next = snapshot(project);
      const cur = next.patterns[next.patternIndex]!;
      if (scope === "pattern") {
        next.patterns[next.patternIndex] = mixPatterns(cur, generateGenrePattern(genre, next.stepCount), amt, locked);
      } else if (scope === "track") {
        const g = generateGenrePattern(genre, next.stepCount);
        const lock = locked.map((v, i) => i !== selected || v);
        next.patterns[next.patternIndex] = mixPatterns(cur, g, amt, lock);
      } else if (scope === "velocity") {
        next.patterns[next.patternIndex] = randomizeVelocity(cur, amt, locked);
      } else if (scope === "timing") {
        next.patterns[next.patternIndex] = randomizeTiming(cur, amt, locked);
      } else if (scope === "sound") {
        next.channels = next.channels.map((ch, i) => {
          if (ch.lockSound) return ch;
          if (i !== selected && amt < 0.8) return ch;
          return { ...ch, soundId: nextSoundId(ch.soundId, Math.random() > 0.5 ? 1 : -1, ch.family) };
        });
      } else if (scope === "kit") {
        const kits = KIT_LIBRARY;
        const kit = kits[Math.floor(Math.random() * kits.length)]!;
        applyKitToProject(next, kit.id);
      }
      set({ project: next });
      route();
    },
    mutate: () => {
      push();
      const { project, mutateAmount } = get();
      const locked = project.channels.map((c) => c.lockPattern);
      const next = snapshot(project);
      next.patterns[next.patternIndex] = mutatePattern(next.patterns[next.patternIndex]!, mutateAmount, locked);
      set({ project: next });
      get().persist();
    },
    fillNow: () => {
      const { project, fillAmount, fillComplexity, fillLength } = get();
      const steps = makeFill(project.patterns[project.patternIndex]!, fillLength, fillComplexity, fillAmount, project.stepCount);
      sequencer.armFill(steps, fillLength);
    },
    lock: (i, key) => {
      const project = snapshot(get().project);
      project.channels[i]![key] = !project.channels[i]![key];
      set({ project });
      get().persist();
    },
    setPlayingUI: (playing, currentStep, stepFloat) => set({ playing, currentStep, stepFloat }),
    togglePlay: () => sequencer.toggle(),
    pause: () => sequencer.pause(),
    stop: () => sequencer.stop(),
    setRecording: (recording) => set({ recording }),
    setSongMode: (songMode) => {
      sequencer.songMode = songMode;
      set({ songMode });
    },
    setTimeScale: (timeScale) => {
      sequencer.timeScale = timeScale;
      set({ timeScale });
    },
    setRandomAmount: (randomAmount) => set({ randomAmount }),
    setMutateAmount: (mutateAmount) => set({ mutateAmount }),
    setFill: (patch) => set(patch),
    setGenre: (genre) => set({ genre }),
    setBrowser: (patch) => set(patch),
    applyFactoryPattern: (name) => {
      const found = FACTORY_PATTERNS.find((p) => p.name === name);
      if (!found) return;
      push();
      const project = snapshot(get().project);
      const locked = project.channels.map((c) => c.lockPattern);
      const mixed = clonePattern(found);
      mixed.name = project.patterns[project.patternIndex]!.name;
      mixed.steps = mixed.steps.map((lane, c) => (locked[c] ? project.patterns[project.patternIndex]!.steps[c]! : lane));
      project.patterns[project.patternIndex] = mixed;
      set({ project });
      get().persist();
    },
    updateSong: (song) => {
      set({ project: { ...get().project, song } });
      get().persist();
    },
    updateMixer: (patch) => {
      const project = snapshot(get().project);
      const next = typeof patch === "function" ? patch(project.mixer) : { ...project.mixer, ...patch };
      project.mixer = ensureMixer({
        ...next,
        reverb: { ...project.mixer.reverb, ...(next.reverb || {}) },
        delay: { ...project.mixer.delay, ...(next.delay || {}) },
        master: { ...project.mixer.master, ...(next.master || {}) },
      });
      set({ project });
      route();
    },
    renameProject: (name) => {
      set({ project: { ...get().project, name } });
      get().persist();
    },
    savePreset: (kind, name) => {
      const { project, presets } = get();
      const item: SavedPreset = {
        id: `${Date.now()}`,
        name,
        kind,
        at: Date.now(),
        data:
          kind === "project"
            ? snapshot(project)
            : kind === "kit"
              ? { kitId: project.kitId, channels: snapshot(project).channels }
              : clonePattern(project.patterns[project.patternIndex]!),
      };
      const next = [item, ...presets].slice(0, 60);
      set({ presets: next });
      try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    loadPreset: (id) => {
      const item = get().presets.find((p) => p.id === id);
      if (!item) return;
      push();
      if (item.kind === "project") set({ project: item.data as Project });
      else if (item.kind === "pattern") {
        const project = snapshot(get().project);
        project.patterns[project.patternIndex] = item.data as Project["patterns"][number];
        set({ project });
      } else {
        const project = snapshot(get().project);
        const data = item.data as { kitId: string; channels: DrumChannel[] };
        project.kitId = data.kitId;
        project.channels = data.channels;
        set({ project });
      }
      route();
    },
    deletePreset: (id) => {
      const next = get().presets.filter((p) => p.id !== id);
      set({ presets: next });
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    },
    undo: () => {
      const { history, project, future } = get();
      const prev = history[history.length - 1];
      if (!prev) return;
      set({
        project: prev,
        history: history.slice(0, -1),
        future: [snapshot(project), ...future].slice(0, 40),
      });
      route();
    },
    redo: () => {
      const { future, project, history } = get();
      const next = future[0];
      if (!next) return;
      set({
        project: next,
        future: future.slice(1),
        history: [...history, snapshot(project)],
      });
      route();
    },
    setMidiLearn: (midiLearn) => set({ midiLearn }),
    assignMidi: (note) => {
      const project = snapshot(get().project);
      project.midiMap[get().selected] = note;
      set({ project, midiLearn: false });
      get().persist();
    },
    loadUserSample: async (file) => {
      const i = get().selected;
      await audioEngine.loadUserSample(i, file);
      get().updateChannel(i, { userSample: true, name: file.name.replace(/\.[^.]+$/, "").slice(0, 18) });
    },
  };
});

if (typeof window !== "undefined") {
  sequencer = new SequencerEngine(
    () => useWorkstation.getState().project,
    (index) => useWorkstation.getState().setPattern(index),
  );
  sequencer.subscribe((s) => {
    useWorkstation.getState().setPlayingUI(s.playing, s.step, s.stepFloat);
  });
}
