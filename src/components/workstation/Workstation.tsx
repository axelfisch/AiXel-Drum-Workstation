import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { KIT_BY_ID, SOUND_BY_ID } from "@/lib/drum/library";
import { GENRE_LABELS, GROOVE_LABELS, PAD_KEYS, STEP_MODE_LABELS } from "@/lib/drum/defaults";
import { gainToDb, patternLetter } from "@/lib/utils";
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
    const inputs: MIDIInput[] = [];
    const hook = (ev: MIDIMessageEvent) => {
      const d = ev.data;
      if (!d || d.length < 3) return;
      const cmd = d[0]! & 0xf0;
      if (cmd === 0x90 && d[2]! > 0) {
        const note = d[1]!;
        const vel = d[2]!;
        const st = useWorkstation.getState();
        if (st.midiLearn) {
          assignMidi(note);
          return;
        }
        const idx = st.project.midiMap.findIndex((n) => n === note);
        if (idx >= 0) st.triggerPad(idx, vel / 127);
      }
    };
    navigator
      .requestMIDIAccess?.()
      .then((midi) => {
        midi.inputs.forEach((input) => {
          input.addEventListener("midimessage", hook as EventListener);
          inputs.push(input);
        });
      })
      .catch(() => undefined);
    return () => {
      for (const input of inputs) input.removeEventListener("midimessage", hook as EventListener);
    };
  }, [assignMidi]);

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
  const [focusMode, setFocusMode] = useState<null | "sequencer" | "mixer">(null);
  const focused = focusMode != null;

  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused]);

  useEffect(() => {
    if (focusMode === "sequencer" && page !== "sequencer") setFocusMode(null);
    if (focusMode === "mixer" && page !== "mixer") setFocusMode(null);
  }, [page, focusMode]);

  return (
    <div className={`flex h-dvh flex-col overflow-hidden bg-bg text-fg ${focused ? "seq-focus-root" : ""}`}>
      {!focused && (
        <TopBar
          name={project.name}
          kitName={kit?.name ?? project.kitId}
          tempo={project.tempo}
          swing={project.swing}
          humanize={project.humanize}
          playing={playing}
          onTempo={setTempo}
          onSwing={setSwing}
          onHumanize={setHumanize}
          onPlay={togglePlay}
          onStop={stop}
        />
      )}
      {focused && (
        <FocusTransport
          tempo={project.tempo}
          playing={playing}
          patternIndex={project.patternIndex}
          onTempo={setTempo}
          onPlay={togglePlay}
          onStop={stop}
          onExit={() => setFocusMode(null)}
          label={focusMode === "mixer" ? "Focus Mixer" : "Focus Sequencer"}
        />
      )}
      {!focused && (
        <PerformanceBar
          timeScale={timeScale}
          songMode={songMode}
          groove={project.groove}
          stepCount={project.stepCount}
          poly={project.polyMode}
          patternIndex={project.patternIndex}
          onGroove={setGroove}
          onSteps={setStepCount}
          onPoly={setPoly}
          onPattern={setPattern}
          onUndo={undo}
          onRedo={redo}
        />
      )}
      {!focused && (
        <nav className="flex shrink-0 items-center gap-1 px-5 py-2">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(p.id)}
              className={`font-display px-3 py-1.5 text-[11px] tracking-[0.22em] uppercase ${
                page === p.id ? "border-b border-led text-fg" : "text-subtle"
              }`}
            >
              {p.label}
            </button>
          ))}
        </nav>
      )}
      {page === "sequencer" && (
        <div className={`flex min-h-0 flex-1 ${focused ? "flex-col" : "flex-col lg:flex-row"}`}>
          <div className={`flex min-h-0 min-w-0 flex-1 flex-col p-3 ${focused ? "pt-2" : "pt-0"}`}>
            <SequencerGrid focus={focusMode === "sequencer"} onToggleFocus={() => setFocusMode((m) => (m === "sequencer" ? null : "sequencer"))} />
            {!focused && <StepEditor mode={stepMode} />}
          </div>
          {!focused && <Inspector />}
        </div>
      )}
      {page === "sound" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SoundPage />
        </div>
      )}
      {page === "mixer" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MixerPage
            focus={focusMode === "mixer"}
            onToggleFocus={() => setFocusMode((m) => (m === "mixer" ? null : "mixer"))}
          />
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
      {!focused && <PadRow />}
    </div>
  );
}


function FocusTransport(props: {
  tempo: number;
  playing: boolean;
  patternIndex: number;
  onTempo: (n: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onExit: () => void;
  label?: string;
}) {
  return (
    <div className="hw-panel mx-3 mt-3 flex shrink-0 items-center gap-4 px-4 py-2">
      <p className="font-display text-sm tracking-[0.18em] uppercase text-led">{props.label ?? "Focus"}</p>
      <span className="engraved">Pattern {String.fromCharCode(65 + (props.patternIndex % 16))}</span>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" className="transport-btn" onClick={props.onPlay} aria-label={props.playing ? "Pause" : "Play"}>
          {props.playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
        </button>
        <button type="button" className="transport-btn" onClick={props.onStop} aria-label="Stop">
          <Square className="size-3 fill-current" />
        </button>
        <label className="flex items-center gap-2 engraved">
          BPM
          <input
            type="number"
            min={40}
            max={240}
            step={0.1}
            value={props.tempo}
            onChange={(e) => props.onTempo(Number(e.target.value) || props.tempo)}
            className="lcd w-16 px-2 py-0.5 font-mono text-[11px] tabular-nums"
          />
        </label>
        <button type="button" className="hw-btn on" onClick={props.onExit} title="Esc">
          Exit Focus
        </button>
      </div>
    </div>
  );
}

function TopBar(props: {
  name: string;
  kitName: string;
  tempo: number;
  swing: number;
  humanize: number;
  playing: boolean;
  onTempo: (n: number) => void;
  onSwing: (n: number) => void;
  onHumanize: (n: number) => void;
  onPlay: () => void;
  onStop: () => void;
}) {
  const rename = useWorkstation((s) => s.renameProject);
  const project = useWorkstation((s) => s.project);
  const updateMixer = useWorkstation((s) => s.updateMixer);
  const randomAmount = useWorkstation((s) => s.randomAmount);
  const mutateAmount = useWorkstation((s) => s.mutateAmount);
  const fillAmount = useWorkstation((s) => s.fillAmount);
  const setRandomAmount = useWorkstation((s) => s.setRandomAmount);
  const setMutateAmount = useWorkstation((s) => s.setMutateAmount);
  const setFill = useWorkstation((s) => s.setFill);
  const recording = useWorkstation((s) => s.recording);
  const setRecording = useWorkstation((s) => s.setRecording);
  const page = useWorkstation((s) => s.page);
  const setPage = useWorkstation((s) => s.setPage);
  const midiLearn = useWorkstation((s) => s.midiLearn);
  const [editing, setEditing] = useState(false);
  const pageIndex = Math.max(0, PAGES.findIndex((p) => p.id === page));

  return (
    <header className="hw-panel hw-panel--screws mx-3 mt-3 shrink-0 px-5 pt-4 pb-3">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-end gap-6">
          <div>
            <p className="font-display text-2xl leading-none tracking-[0.02em] text-fg">AiXel</p>
            <p className="engraved mt-1">Drum Workstation</p>
          </div>
          <div className="hidden pb-0.5 sm:block">
            <p className="engraved">Project</p>
            {editing ? (
              <input
                autoFocus
                defaultValue={props.name}
                className="bg-transparent font-display text-lg tracking-wide outline-none"
                onBlur={(e) => {
                  rename(e.target.value || props.name);
                  setEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="font-display text-lg tracking-wide">
                {props.name}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-start gap-5">
          <div className="hidden text-right md:block">
            <p className="engraved">Kit</p>
            <p className="font-display text-lg leading-tight">{props.kitName}</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <span className={`led-dot ${props.playing ? "on" : ""}`} title="Run" />
            <span className={`led-dot ${midiLearn ? "on" : ""}`} title="MIDI" />
          </div>
        </div>
      </div>

      <div className="flex items-end gap-4 overflow-x-auto pb-1">
        <Knob
          label="Master"
          value={project.mixer.master.gain}
          format={(n) => `${gainToDb(0.4 + n * 0.7).toFixed(1)} dB`}
          onChange={(v) => updateMixer({ master: { ...project.mixer.master, gain: v } })}
        />
        <Knob label="Swing" value={props.swing} min={0} max={100} step={1} format={(n) => `${Math.round(n)}`} onChange={props.onSwing} />
        <Knob
          label="Humanize"
          value={props.humanize}
          min={0}
          max={100}
          step={1}
          format={(n) => `${Math.round(n)}`}
          onChange={props.onHumanize}
        />
        <Knob label="Random" value={randomAmount} step={0.01} format={(n) => n.toFixed(2)} onChange={setRandomAmount} />
        <Knob label="Mutate" value={mutateAmount} step={0.01} format={(n) => n.toFixed(2)} onChange={setMutateAmount} />
        <Knob label="Fill" value={fillAmount} step={0.01} format={(n) => n.toFixed(2)} onChange={(v) => setFill({ fillAmount: v })} />

        <div className="ml-auto flex shrink-0 items-end gap-4">
          <div className="flex flex-col items-center gap-1">
            <p className="engraved">Transport</p>
            <div className="flex items-center gap-1">
              <button type="button" className="transport-btn" onClick={props.onPlay} aria-label={props.playing ? "Pause" : "Play"}>
                {props.playing ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
              </button>
              <button type="button" className="transport-btn" onClick={props.onStop} aria-label="Stop">
                <Square className="size-3 fill-current" />
              </button>
              <button
                type="button"
                className={`transport-btn rec ${recording ? "on" : ""}`}
                onClick={() => setRecording(!recording)}
                aria-pressed={recording}
              >
                REC
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="engraved">Tempo</p>
            <Knob
              label=""
              value={props.tempo}
              min={40}
              max={220}
              step={0.5}
              format={() => ""}
              onChange={props.onTempo}
            />
            <div className="lcd px-2 py-0.5 font-mono text-[11px] tabular-nums">{props.tempo.toFixed(1)}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="engraved">Screen / Menu</p>
            <Knob
              label="Page"
              value={pageIndex}
              min={0}
              max={PAGES.length - 1}
              step={1}
              format={() => ""}
              onChange={(v) => setPage(PAGES[Math.round(v)]!.id)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function PerformanceBar({
  timeScale,
  songMode,
  groove,
  stepCount,
  poly,
  patternIndex,
  onGroove,
  onSteps,
  onPoly,
  onPattern,
  onUndo,
  onRedo,
}: {
  timeScale: number;
  songMode: boolean;
  groove: GrooveId;
  stepCount: StepCount;
  poly: boolean;
  patternIndex: number;
  onGroove: (g: GrooveId) => void;
  onSteps: (n: StepCount) => void;
  onPoly: (on: boolean) => void;
  onPattern: (i: number) => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const mutate = useWorkstation((s) => s.mutate);
  const fillNow = useWorkstation((s) => s.fillNow);
  const setTimeScale = useWorkstation((s) => s.setTimeScale);
  const setSongMode = useWorkstation((s) => s.setSongMode);
  const randomize = useWorkstation((s) => s.randomize);
  const copyPattern = useWorkstation((s) => s.copyPattern);
  const pastePattern = useWorkstation((s) => s.pastePattern);
  const clearPattern = useWorkstation((s) => s.clearPattern);
  const duplicatePattern = useWorkstation((s) => s.duplicatePattern);
  const genre = useWorkstation((s) => s.genre);
  const setGenre = useWorkstation((s) => s.setGenre);
  const setMidiLearn = useWorkstation((s) => s.setMidiLearn);
  const midiLearn = useWorkstation((s) => s.midiLearn);
  const project = useWorkstation((s) => s.project);

  return (
    <div className="hw-panel mx-3 mt-3 shrink-0 px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div>
          <p className="engraved mb-1">Pattern</p>
          <div className="grid grid-cols-10 gap-0.5">
            {Array.from({ length: 16 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPattern(i)}
                className={`pat-key ${patternIndex === i ? "on" : ""} ${i >= 10 ? "col-auto" : ""}`}
              >
                {patternLetter(i)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="engraved mb-1">Steps</p>
          <div className="flex flex-wrap gap-1">
            {([16, 24, 32, 64] as StepCount[]).map((n) => (
              <button key={n} type="button" onClick={() => onSteps(n)} className={`hw-btn ${stepCount === n ? "on" : ""}`}>
                {n}
              </button>
            ))}
            <button type="button" onClick={() => onPoly(!poly)} className={`hw-btn ${poly ? "on" : ""}`}>
              Poly
            </button>
          </div>
        </div>

        <div>
          <p className="engraved mb-1">Feel</p>
          <div className="flex gap-1">
            <select value={groove} onChange={(e) => onGroove(e.target.value as GrooveId)} className="hw-select">
              {Object.entries(GROOVE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select value={genre} onChange={(e) => setGenre(e.target.value as GenreId)} className="hw-select">
              {Object.entries(GENRE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="engraved mb-1">Perform</p>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={fillNow} className="hw-btn">
              Fill
            </button>
            <button type="button" onClick={mutate} className="hw-btn">
              Mutate
            </button>
            <button type="button" onClick={() => setTimeScale(timeScale === 0.5 ? 1 : 0.5)} className={`hw-btn ${timeScale === 0.5 ? "on" : ""}`}>
              Half
            </button>
            <button type="button" onClick={() => setTimeScale(timeScale === 2 ? 1 : 2)} className={`hw-btn ${timeScale === 2 ? "on" : ""}`}>
              Double
            </button>
            <button type="button" onClick={() => setSongMode(!songMode)} className={`hw-btn ${songMode ? "on" : ""}`}>
              Song
            </button>
          </div>
        </div>

        <div>
          <p className="engraved mb-1">Randomize</p>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => randomize("pattern")} className="hw-btn">
              Pattern
            </button>
            <button type="button" onClick={() => randomize("track")} className="hw-btn">
              Track
            </button>
            <button type="button" onClick={() => randomize("velocity")} className="hw-btn">
              Velocity
            </button>
            <button type="button" onClick={() => randomize("timing")} className="hw-btn">
              Timing
            </button>
          </div>
        </div>

        <div className="ml-auto">
          <p className="engraved mb-1">Edit</p>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={copyPattern} className="hw-btn">
              Copy
            </button>
            <button type="button" onClick={pastePattern} className="hw-btn">
              Paste
            </button>
            <button type="button" onClick={duplicatePattern} className="hw-btn">
              Dup
            </button>
            <button type="button" onClick={clearPattern} className="hw-btn">
              Clear
            </button>
            <button type="button" onClick={onUndo} className="hw-btn">
              Undo
            </button>
            <button type="button" onClick={onRedo} className="hw-btn">
              Redo
            </button>
            <button type="button" onClick={() => setMidiLearn(!midiLearn)} className={`hw-btn ${midiLearn ? "on" : ""}`}>
              Midi
            </button>
            <button
              type="button"
              className="hw-btn"
              onClick={() => downloadBlob(patternToMidi(project), `${project.name}.mid`)}
            >
              Export
            </button>
          </div>
        </div>
      </div>
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
  const modes = (Object.keys(STEP_MODE_LABELS) as StepMode[]).filter((m) =>
    ["velocity", "probability", "ratchet", "micro", "length", "trigger", "pitch"].includes(m),
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setStepMode(m)}
          className={`hw-btn ${mode === m ? "on" : ""}`}
        >
          {STEP_MODE_LABELS[m]}
        </button>
      ))}
      <span className="ml-auto font-mono text-[10px] text-subtle">
        {project.channels[selected]!.name} · step {String(currentStep + 1).padStart(2, "0")}
        {step.on
          ? ` · vel ${Math.round(step.velocity * 127)} · p ${Math.round(step.probability * 100)}% · ${step.ratchet}x`
          : " · empty"}
      </span>
      {step.on && (
        <div className="hidden gap-1 md:flex">
          <button type="button" className="hw-btn" onClick={() => setStepParam(selected, currentStep, { velocity: 0.32 })}>
            Ghost
          </button>
          <button type="button" className="hw-btn" onClick={() => setStepParam(selected, currentStep, { velocity: 0.72 })}>
            Normal
          </button>
          <button type="button" className="hw-btn" onClick={() => setStepParam(selected, currentStep, { velocity: 0.92 })}>
            Accent
          </button>
          <button type="button" className="hw-btn" onClick={() => setStepParam(selected, currentStep, { velocity: 1 })}>
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
  const ch = project.channels[selected]!;
  const sound = SOUND_BY_ID[ch.soundId];
  const peak = useWorkstation((s) => s.masterPeak);

  return (
    <aside className="hw-panel mx-3 mb-3 hidden w-72 shrink-0 flex-col gap-3 overflow-auto p-4 lg:flex">
      <div>
        <p className="engraved">{ch.name}</p>
        <p className="font-display text-xl leading-tight">{sound?.name ?? "User sample"}</p>
        <div className="mt-2 flex gap-1">
          <button type="button" className="hw-btn" onClick={() => nextSample(-1)}>
            Prev
          </button>
          <button type="button" className="hw-btn" onClick={() => nextSample(1)}>
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
      <label className="engraved block">
        Replace sample · WAV / AIFF
        <input
          type="file"
          accept="audio/*"
          className="mt-1 block w-full text-[10px] text-muted"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadUserSample(f);
          }}
        />
      </label>
      <div>
        <p className="engraved mb-1">Master</p>
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
    <footer className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-3">
      {project.channels.map((ch, i) => (
        <button
          key={ch.id}
          type="button"
          onPointerDown={() => {
            select(i);
            triggerPad(i, 0.95);
          }}
          className={`min-w-[52px] flex-1 rounded-md border px-1 py-2 ${
            selected === i ? "border-led/50 bg-surface-3" : "border-border bg-surface"
          }`}
        >
          <span className="block font-mono text-[9px] text-subtle">{keys[i]}</span>
          <span className="font-display block text-[10px] tracking-wide uppercase">{ch.name.split(" ")[0]}</span>
        </button>
      ))}
    </footer>
  );
}
