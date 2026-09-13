import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  FlipHorizontal,
  Pause,
  Play,
  Redo2,
  Square,
  Undo2,
} from "lucide-react";
import { KIT_BY_ID, SOUND_BY_ID } from "@/lib/drum/library";
import { GENRE_LABELS, GROOVE_LABELS, PAD_KEYS, STEP_MODE_LABELS } from "@/lib/drum/defaults";
import { patternLetter } from "@/lib/utils";
import type { GenreId, GrooveId, PageId, StepCount, StepMode } from "@/lib/drum/types";
import { audioEngine } from "@/engine/audio-engine";
import { downloadBlob, patternToMidi } from "@/engine/midi";
import { useWorkstation } from "@/store/workstation";
import { SequencerGrid } from "./SequencerGrid";
import { Knob } from "./Knob";
import { BrowserPage, MixerPage, SongPage, SoundPage } from "./pages";

const PAGES: { id: PageId; label: string }[] = [
  { id: "sequencer", label: "Sequencer" },
  { id: "sound", label: "Sound" },
  { id: "mixer", label: "Mixer" },
  { id: "song", label: "Song" },
  { id: "browser", label: "Browser" },
];

export function Workstation() {
  const project = useWorkstation((s) => s.project);
  const page = useWorkstation((s) => s.page);
  const playing = useWorkstation((s) => s.playing);
  const selected = useWorkstation((s) => s.selected);
  const stepMode = useWorkstation((s) => s.stepMode);
  const timeScale = useWorkstation((s) => s.timeScale);
  const songMode = useWorkstation((s) => s.songMode);

  const initFromStorage = useWorkstation((s) => s.initFromStorage);
  const setPage = useWorkstation((s) => s.setPage);
  const togglePlay = useWorkstation((s) => s.togglePlay);
  const stop = useWorkstation((s) => s.stop);
  const setTempo = useWorkstation((s) => s.setTempo);
  const setSwing = useWorkstation((s) => s.setSwing);
  const setHumanize = useWorkstation((s) => s.setHumanize);
  const setGroove = useWorkstation((s) => s.setGroove);
  const setStepCount = useWorkstation((s) => s.setStepCount);
  const setPoly = useWorkstation((s) => s.setPoly);
  const setPattern = useWorkstation((s) => s.setPattern);
  const undo = useWorkstation((s) => s.undo);
  const redo = useWorkstation((s) => s.redo);
  const triggerPad = useWorkstation((s) => s.triggerPad);
  const assignMidi = useWorkstation((s) => s.assignMidi);
  const midiLearn = useWorkstation((s) => s.midiLearn);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      const pad = PAD_KEYS.indexOf(e.key.toLowerCase());
      if (pad >= 0 && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        triggerPad(pad, 0.92);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, undo, redo, triggerPad]);

  useEffect(() => {
    let access: MIDIAccess | null = null;
    const noteOn = (note: number, vel: number) => {
      if (useWorkstation.getState().midiLearn) {
        assignMidi(note);
        return;
      }
      const map = useWorkstation.getState().project.midiMap;
      const idx = map.findIndex((n) => n === note);
      if (idx >= 0) triggerPad(idx, vel / 127);
    };
    navigator.requestMIDIAccess?.().then((midi) => {
      access = midi;
      const hook = (ev: MIDIMessageEvent) => {
        const d = ev.data;
        if (!d || d.length < 3) return;
        const cmd = d[0]! & 0xf0;
        if (cmd === 0x90 && d[2]! > 0) noteOn(d[1]!, d[2]!);
      };
      midi.inputs.forEach((input) => {
        input.addEventListener("midimessage", hook as EventListener);
      });
    }).catch(() => undefined);
    return () => {
      access = null;
    };
  }, [assignMidi, triggerPad]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const meters = audioEngine.readMeters();
      useWorkstation.setState({ meter: Array.from(meters), masterPeak: audioEngine.masterPeak });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const kit = KIT_BY_ID[project.kitId];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <TopBar
        name={project.name}
        kitName={kit?.name ?? project.kitId}
        tempo={project.tempo}
        swing={project.swing}
        humanize={project.humanize}
        groove={project.groove}
        stepCount={project.stepCount}
        poly={project.polyMode}
        patternIndex={project.patternIndex}
        playing={playing}
        midiLearn={midiLearn}
        onTempo={setTempo}
        onSwing={setSwing}
        onHumanize={setHumanize}
        onGroove={setGroove}
        onSteps={setStepCount}
        onPoly={setPoly}
        onPattern={setPattern}
        onPlay={togglePlay}
        onStop={stop}
        onUndo={undo}
        onRedo={redo}
      />
      <PerformanceBar timeScale={timeScale} songMode={songMode} />
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPage(p.id)}
            className={`font-display rounded-md px-3 py-1.5 text-xs tracking-[0.18em] uppercase ${page === p.id ? "bg-surface-3 text-fg" : "text-muted"}`}
          >
            {p.label}
          </button>
        ))}
      </nav>
      {page === "sequencer" && (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
            <SequencerGrid />
            <StepEditor mode={stepMode} />
          </div>
          <Inspector />
        </div>
      )}
      {page === "sound" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SoundPage />
        </div>
      )}
      {page === "mixer" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MixerPage />
        </div>
      )}
      {page === "song" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SongPage />
        </div>
      )}
      {page === "browser" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BrowserPage />
        </div>
      )}
      <PadRow />
    </div>
  );
}

function TopBar(props: {
  name: string;
  kitName: string;
  tempo: number;
  swing: number;
  humanize: number;
  groove: GrooveId;
  stepCount: StepCount;
  poly: boolean;
  patternIndex: number;
  playing: boolean;
  midiLearn: boolean;
  onTempo: (n: number) => void;
  onSwing: (n: number) => void;
  onHumanize: (n: number) => void;
  onGroove: (g: GrooveId) => void;
  onSteps: (n: StepCount) => void;
  onPoly: (on: boolean) => void;
  onPattern: (i: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const rename = useWorkstation((s) => s.renameProject);
  const setMidiLearn = useWorkstation((s) => s.setMidiLearn);
  const project = useWorkstation((s) => s.project);
  const [editing, setEditing] = useState(false);

  return (
    <header className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto border-b border-border bg-surface px-3 py-2">
      <div className="flex items-center gap-2 pr-3">
        <span className={`led-dot ${props.playing ? "on" : ""}`} />
        <div>
          <p className="font-display text-[10px] tracking-[0.28em] text-muted uppercase">AiXel</p>
          {editing ? (
            <input
              autoFocus
              defaultValue={props.name}
              className="bg-transparent font-display text-sm tracking-wide outline-none"
              onBlur={(e) => {
                rename(e.target.value || props.name);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="font-display whitespace-nowrap text-sm tracking-wide">
              {props.name}
            </button>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 whitespace-nowrap text-xs text-subtle xl:block">{props.kitName}</div>
      <label className="flex items-center gap-2 font-mono text-xs">
        <span className="text-subtle">BPM</span>
        <input
          type="number"
          value={props.tempo}
          min={40}
          max={220}
          onChange={(e) => props.onTempo(Number(e.target.value))}
          className="w-14 rounded-md border border-border bg-surface-2 px-2 py-1 tabular-nums"
        />
      </label>
      <label className="hidden items-center gap-2 text-xs sm:flex">
        <span className="text-subtle">Swing</span>
        <input
          type="range"
          min={0}
          max={100}
          value={props.swing}
          onChange={(e) => props.onSwing(Number(e.target.value))}
          className="w-20 accent-[var(--color-led)]"
        />
        <span className="font-mono w-6 tabular-nums text-muted">{props.swing}</span>
      </label>
      <label className="hidden items-center gap-2 text-xs lg:flex">
        <span className="text-subtle">Human</span>
        <input
          type="range"
          min={0}
          max={100}
          value={props.humanize}
          onChange={(e) => props.onHumanize(Number(e.target.value))}
          className="w-16 accent-[var(--color-led)]"
        />
      </label>
      <select
        value={props.groove}
        onChange={(e) => props.onGroove(e.target.value as GrooveId)}
        className="hidden rounded-md border border-border bg-surface-2 px-2 py-1 text-xs md:block"
      >
        {Object.entries(GROOVE_LABELS).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <div className="flex gap-1">
        {([16, 24, 32, 64] as StepCount[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => props.onSteps(n)}
            className={`rounded-md px-2 py-1 font-mono text-[10px] ${props.stepCount === n ? "bg-surface-3 text-fg" : "text-subtle"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => props.onPoly(!props.poly)}
        className={`rounded-md px-2 py-1 text-[10px] tracking-widest uppercase ${props.poly ? "text-led" : "text-subtle"}`}
      >
        Poly
      </button>
      <div className="flex max-w-[220px] gap-0.5 overflow-x-auto">
        {Array.from({ length: 16 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => props.onPattern(i)}
            className={`h-7 w-7 shrink-0 rounded-md font-display text-xs ${props.patternIndex === i ? "bg-led text-bg" : "bg-surface-2 text-muted"}`}
          >
            {patternLetter(i)}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className="rounded-md p-2 text-muted" onClick={props.onUndo} aria-label="Undo">
          <Undo2 className="size-4" />
        </button>
        <button type="button" className="rounded-md p-2 text-muted" onClick={props.onRedo} aria-label="Redo">
          <Redo2 className="size-4" />
        </button>
        <button
          type="button"
          className={`rounded-md p-2 ${props.midiLearn ? "text-led" : "text-muted"}`}
          onClick={() => setMidiLearn(!props.midiLearn)}
        >
          MIDI
        </button>
        <button
          type="button"
          className="rounded-md p-2 text-muted"
          title="Export MIDI"
          onClick={() => downloadBlob(patternToMidi(project), `${project.name}.mid`)}
        >
          <Download className="size-4" />
        </button>
        <button
          type="button"
          onClick={props.onStop}
          className="rounded-md p-2 text-muted"
          aria-label="Stop"
        >
          <Square className="size-4 fill-current" />
        </button>
        <button
          type="button"
          onClick={props.onPlay}
          className="rounded-md bg-fg p-2 text-bg"
          aria-label={props.playing ? "Pause" : "Play"}
        >
          {props.playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
        </button>
      </div>
    </header>
  );
}

function PerformanceBar({ timeScale, songMode }: { timeScale: number; songMode: boolean }) {
  const mutate = useWorkstation((s) => s.mutate);
  const fillNow = useWorkstation((s) => s.fillNow);
  const setTimeScale = useWorkstation((s) => s.setTimeScale);
  const setSongMode = useWorkstation((s) => s.setSongMode);
  const randomize = useWorkstation((s) => s.randomize);
  const copyPattern = useWorkstation((s) => s.copyPattern);
  const pastePattern = useWorkstation((s) => s.pastePattern);
  const clearPattern = useWorkstation((s) => s.clearPattern);
  const duplicatePattern = useWorkstation((s) => s.duplicatePattern);
  const randomAmount = useWorkstation((s) => s.randomAmount);
  const mutateAmount = useWorkstation((s) => s.mutateAmount);
  const setRandomAmount = useWorkstation((s) => s.setRandomAmount);
  const setMutateAmount = useWorkstation((s) => s.setMutateAmount);
  const genre = useWorkstation((s) => s.genre);
  const setGenre = useWorkstation((s) => s.setGenre);
  const fillAmount = useWorkstation((s) => s.fillAmount);
  const fillComplexity = useWorkstation((s) => s.fillComplexity);
  const fillLength = useWorkstation((s) => s.fillLength);
  const setFill = useWorkstation((s) => s.setFill);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
      <button type="button" onClick={fillNow} className="rounded-md bg-surface-3 px-3 py-1.5 font-display text-[11px] tracking-[0.16em] uppercase">
        Fill
      </button>
      <button type="button" onClick={mutate} className="rounded-md bg-surface-3 px-3 py-1.5 font-display text-[11px] tracking-[0.16em] uppercase">
        Mutate
      </button>
      <button
        type="button"
        onClick={() => setTimeScale(timeScale === 0.5 ? 1 : 0.5)}
        className={`rounded-md px-3 py-1.5 font-display text-[11px] tracking-[0.16em] uppercase ${timeScale === 0.5 ? "text-led" : "text-muted"}`}
      >
        Half
      </button>
      <button
        type="button"
        onClick={() => setTimeScale(timeScale === 2 ? 1 : 2)}
        className={`rounded-md px-3 py-1.5 font-display text-[11px] tracking-[0.16em] uppercase ${timeScale === 2 ? "text-led" : "text-muted"}`}
      >
        Double
      </button>
      <button
        type="button"
        onClick={() => setSongMode(!songMode)}
        className={`rounded-md px-3 py-1.5 font-display text-[11px] tracking-[0.16em] uppercase ${songMode ? "text-led" : "text-muted"}`}
      >
        Song
      </button>
      <span className="mx-1 h-4 w-px bg-border" />
      <select
        value={genre}
        onChange={(e) => setGenre(e.target.value as GenreId)}
        className="rounded-md border border-border bg-bg px-2 py-1 text-xs"
      >
        {Object.entries(GENRE_LABELS).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => randomize("pattern")} className="rounded-md border border-border px-2 py-1 text-[11px] text-muted">
        Randomize
      </button>
      <button type="button" onClick={() => randomize("track")} className="hidden rounded-md border border-border px-2 py-1 text-[11px] text-muted sm:inline">
        Track
      </button>
      <button type="button" onClick={() => randomize("velocity")} className="hidden rounded-md border border-border px-2 py-1 text-[11px] text-muted md:inline">
        Velocity
      </button>
      <button type="button" onClick={() => randomize("timing")} className="hidden rounded-md border border-border px-2 py-1 text-[11px] text-muted md:inline">
        Timing
      </button>
      <label className="hidden items-center gap-1 text-[10px] text-subtle lg:flex">
        Amt
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={randomAmount}
          onChange={(e) => setRandomAmount(Number(e.target.value))}
          className="w-16 accent-[var(--color-led)]"
        />
      </label>
      <label className="hidden items-center gap-1 text-[10px] text-subtle lg:flex">
        Mut
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={mutateAmount}
          onChange={(e) => setMutateAmount(Number(e.target.value))}
          className="w-16 accent-[var(--color-led)]"
        />
      </label>
      <label className="hidden items-center gap-1 text-[10px] text-subtle xl:flex">
        Fill
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={fillAmount}
          onChange={(e) => setFill({ fillAmount: Number(e.target.value) })}
          className="w-12 accent-[var(--color-led)]"
        />
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={fillComplexity}
          onChange={(e) => setFill({ fillComplexity: Number(e.target.value) })}
          className="w-12 accent-[var(--color-led)]"
        />
        <select
          value={fillLength}
          onChange={(e) => setFill({ fillLength: Number(e.target.value) as 4 | 8 | 16 })}
          className="bg-transparent"
        >
          <option value={4}>1 beat</option>
          <option value={8}>2 beats</option>
          <option value={16}>1 bar</option>
        </select>
      </label>
      <span className="mx-1 hidden h-4 w-px bg-border md:block" />
      <button type="button" onClick={copyPattern} className="hidden p-1 text-muted md:inline" aria-label="Copy">
        <Copy className="size-3.5" />
      </button>
      <button type="button" onClick={pastePattern} className="hidden p-1 text-muted md:inline" aria-label="Paste">
        <FlipHorizontal className="size-3.5" />
      </button>
      <button type="button" onClick={duplicatePattern} className="hidden text-[11px] text-muted md:inline">
        Dup
      </button>
      <button type="button" onClick={clearPattern} className="hidden text-[11px] text-subtle md:inline">
        Clear
      </button>
    </div>
  );
}

function StepEditor({ mode }: { mode: StepMode }) {
  const setStepMode = useWorkstation((s) => s.setStepMode);
  const selected = useWorkstation((s) => s.selected);
  const project = useWorkstation((s) => s.project);
  const setStepParam = useWorkstation((s) => s.setStepParam);
  const currentStep = useWorkstation((s) => s.currentStep);
  const step = project.patterns[project.patternIndex]!.steps[selected]![currentStep]!;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      {(Object.keys(STEP_MODE_LABELS) as StepMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setStepMode(m)}
          className={`font-display rounded-md px-2 py-1 text-[10px] tracking-[0.14em] uppercase ${mode === m ? "bg-surface-3 text-fg" : "text-subtle"}`}
        >
          {STEP_MODE_LABELS[m]}
        </button>
      ))}
      <span className="ml-auto font-mono text-[10px] text-subtle">
        {project.channels[selected]!.name} · step {currentStep + 1}
        {step.on
          ? ` · vel ${Math.round(step.velocity * 127)} · p ${Math.round(step.probability * 100)}% · ${step.ratchet}x`
          : " · empty"}
      </span>
      {step.on && (
        <div className="hidden gap-1 md:flex">
          <button type="button" className="text-[10px] text-muted" onClick={() => setStepParam(selected, currentStep, { velocity: 0.32 })}>
            Ghost
          </button>
          <button type="button" className="text-[10px] text-muted" onClick={() => setStepParam(selected, currentStep, { velocity: 0.72 })}>
            Normal
          </button>
          <button type="button" className="text-[10px] text-muted" onClick={() => setStepParam(selected, currentStep, { velocity: 0.92 })}>
            Accent
          </button>
          <button type="button" className="text-[10px] text-muted" onClick={() => setStepParam(selected, currentStep, { velocity: 1 })}>
            Full
          </button>
        </div>
      )}
    </div>
  );
}

function Inspector() {
  const project = useWorkstation((s) => s.project);
  const selected = useWorkstation((s) => s.selected);
  const updateChannel = useWorkstation((s) => s.updateChannel);
  const nextSample = useWorkstation((s) => s.nextSample);
  const loadUserSample = useWorkstation((s) => s.loadUserSample);
  const setPoly = useWorkstation((s) => s.setPoly);
  const ch = project.channels[selected]!;
  const sound = SOUND_BY_ID[ch.soundId];
  const peak = useWorkstation((s) => s.masterPeak);

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-3 overflow-auto border-l border-border bg-surface p-3 lg:flex">
      <div>
        <p className="font-display text-[10px] tracking-[0.22em] text-muted uppercase">{ch.name}</p>
        <p className="font-display text-lg">{sound?.name ?? "User sample"}</p>
        <div className="mt-2 flex gap-1">
          <button type="button" className="rounded-md border border-border px-2 py-1 text-[10px] text-muted" onClick={() => nextSample(-1)}>
            Prev
          </button>
          <button type="button" className="rounded-md border border-border px-2 py-1 text-[10px] text-muted" onClick={() => nextSample(1)}>
            Next
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Knob label="Tune" value={ch.pitch} min={-12} max={12} step={0.5} onChange={(v) => updateChannel(selected, { pitch: v })} />
        <Knob label="Decay" value={ch.decay} onChange={(v) => updateChannel(selected, { decay: v })} />
        <Knob label="Filter" value={ch.cutoff} onChange={(v) => updateChannel(selected, { cutoff: v })} />
        <Knob label="Drive" value={ch.drive} onChange={(v) => updateChannel(selected, { drive: v })} />
        <Knob label="Reverb" value={ch.reverbSend} onChange={(v) => updateChannel(selected, { reverbSend: v })} />
        <Knob label="Delay" value={ch.delaySend} onChange={(v) => updateChannel(selected, { delaySend: v })} />
        <Knob label="Punch" value={ch.punch} onChange={(v) => updateChannel(selected, { punch: v })} />
        <Knob label="Tone" value={ch.tone} onChange={(v) => updateChannel(selected, { tone: v })} />
      </div>
      {project.polyMode && (
        <label className="text-[10px] text-muted">
          Lane length
          <input
            type="number"
            min={1}
            max={64}
            value={ch.laneLength}
            className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2 py-1"
            onChange={(e) => updateChannel(selected, { laneLength: Number(e.target.value) })}
          />
        </label>
      )}
      <button type="button" className="text-left text-[10px] text-subtle" onClick={() => setPoly(!project.polyMode)}>
        {project.polyMode ? "Disable polyrhythm" : "Enable polyrhythm"}
      </button>
      <label className="block text-[10px] text-muted">
        Replace sample
        <input
          type="file"
          accept="audio/*"
          className="mt-1 block w-full text-[10px]"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadUserSample(f);
          }}
        />
      </label>
      <div>
        <p className="mb-1 text-[10px] tracking-widest text-subtle uppercase">Master</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg">
          <div className="h-full bg-led" style={{ width: `${Math.min(100, peak * 140)}%` }} />
        </div>
      </div>
    </aside>
  );
}

function PadRow() {
  const project = useWorkstation((s) => s.project);
  const selected = useWorkstation((s) => s.selected);
  const triggerPad = useWorkstation((s) => s.triggerPad);
  const select = useWorkstation((s) => s.select);
  const keys = useMemo(() => PAD_KEYS, []);
  return (
    <footer className="flex shrink-0 gap-1 overflow-x-auto border-t border-border bg-surface px-3 py-2">
      {project.channels.map((ch, i) => (
        <button
          key={ch.id}
          type="button"
          onPointerDown={() => {
            select(i);
            triggerPad(i, 0.95);
          }}
          className={`min-w-[52px] flex-1 rounded-md border px-1 py-2 ${selected === i ? "border-led/50 bg-surface-3" : "border-border bg-surface-2"}`}
        >
          <span className="block font-mono text-[9px] text-subtle">{keys[i]}</span>
          <span className="font-display block text-[10px] tracking-wide uppercase">{ch.name.split(" ")[0]}</span>
        </button>
      ))}
    </footer>
  );
}
