import { KIT_LIBRARY, SOUND_LIBRARY, SOUND_BY_ID } from "@/lib/drum/library";
import { FACTORY_PATTERNS } from "@/lib/drum/patterns";
import { CHANNEL_LAYOUT, GENRE_LABELS, GROOVE_LABELS } from "@/lib/drum/defaults";
import { patternLetter } from "@/lib/utils";
import { useWorkstation } from "@/store/workstation";
import { Knob } from "./Knob";
import type { DrumFamily } from "@/lib/drum/types";

export function SoundPage() {
  const project = useWorkstation((s) => s.project);
  const selected = useWorkstation((s) => s.selected);
  const updateChannel = useWorkstation((s) => s.updateChannel);
  const nextSample = useWorkstation((s) => s.nextSample);
  const loadUserSample = useWorkstation((s) => s.loadUserSample);
  const ch = project.channels[selected]!;
  const sound = SOUND_BY_ID[ch.soundId];

  return (
    <div className="scroll-thin grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[1.1fr_1fr]">
      <section className="hw-panel hw-panel--screws rounded-xl p-4">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-display text-xs tracking-[0.2em] text-muted uppercase">{ch.name}</p>
            <h2 className="font-display text-2xl font-semibold tracking-wide">{sound?.name ?? ch.soundId}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted" onClick={() => nextSample(-1)}>
              Prev
            </button>
            <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted" onClick={() => nextSample(1)}>
              Next
            </button>
          </div>
        </header>
        <Waveform family={ch.family} reverse={ch.reverse} start={ch.sampleStart} end={ch.sampleEnd} />
        <div className="mt-4 grid grid-cols-4 gap-3">
          <Knob label="Start" value={ch.sampleStart} onChange={(v) => updateChannel(selected, { sampleStart: v })} />
          <Knob label="End" value={ch.sampleEnd} min={0.05} max={1} defaultValue={1} onChange={(v) => updateChannel(selected, { sampleEnd: v })} />
          <Knob label="Fade In" value={ch.fadeIn} onChange={(v) => updateChannel(selected, { fadeIn: v })} />
          <Knob label="Fade Out" value={ch.fadeOut} onChange={(v) => updateChannel(selected, { fadeOut: v })} />
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={ch.reverse}
            onChange={(e) => updateChannel(selected, { reverse: e.target.checked })}
          />
          Reverse
        </label>
        <label className="mt-4 flex flex-col gap-1 text-xs text-muted">
          Drop WAV / AIFF
          <input
            type="file"
            accept="audio/wav,audio/aiff,audio/x-aiff,audio/*"
            className="text-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadUserSample(f);
            }}
          />
        </label>
      </section>
      <section className="hw-panel hw-panel--screws rounded-xl p-4">
        <h3 className="font-display mb-3 text-sm tracking-[0.18em] text-muted uppercase">Voice</h3>
        <div className="grid grid-cols-4 gap-3">
          <Knob label="Pitch" value={ch.pitch} min={-12} max={12} step={0.5} format={(n) => `${n > 0 ? "+" : ""}${n}`} onChange={(v) => updateChannel(selected, { pitch: v })} />
          <Knob label="Fine" value={ch.fine} min={-100} max={100} step={1} onChange={(v) => updateChannel(selected, { fine: v })} />
          <Knob label="Attack" value={ch.attack} max={0.2} step={0.001} onChange={(v) => updateChannel(selected, { attack: v })} />
          <Knob label="Hold" value={ch.hold} max={0.4} onChange={(v) => updateChannel(selected, { hold: v })} />
          <Knob label="Decay" value={ch.decay} onChange={(v) => updateChannel(selected, { decay: v })} />
          <Knob label="Release" value={ch.release} onChange={(v) => updateChannel(selected, { release: v })} />
          <Knob label="Cutoff" value={ch.cutoff} onChange={(v) => updateChannel(selected, { cutoff: v })} />
          <Knob label="Reso" value={ch.resonance} onChange={(v) => updateChannel(selected, { resonance: v })} />
          <Knob label="Drive" value={ch.drive} onChange={(v) => updateChannel(selected, { drive: v })} />
          <Knob label="Punch" value={ch.punch} onChange={(v) => updateChannel(selected, { punch: v })} />
          <Knob label="Body" value={ch.body} onChange={(v) => updateChannel(selected, { body: v })} />
          <Knob label="Snap" value={ch.snap} onChange={(v) => updateChannel(selected, { snap: v })} />
          <Knob label="Tone" value={ch.tone} onChange={(v) => updateChannel(selected, { tone: v })} />
          <Knob label="Lo-Fi" value={ch.lofi} onChange={(v) => updateChannel(selected, { lofi: v })} />
          <Knob label="Width" value={ch.width} onChange={(v) => updateChannel(selected, { width: v })} />
          <Knob label="Pan" value={ch.pan} min={-1} max={1} onChange={(v) => updateChannel(selected, { pan: v })} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["off", "lp", "hp", "bp"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => updateChannel(selected, { filterType: f })}
              className={`rounded-md px-3 py-1.5 font-display text-xs tracking-widest uppercase ${ch.filterType === f ? "bg-led text-bg" : "border border-border text-muted"}`}
            >
              {f}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            Choke
            <input
              type="number"
              min={0}
              max={8}
              value={ch.chokeGroup}
              className="w-12 rounded-md border border-border bg-surface-2 px-2 py-1"
              onChange={(e) => updateChannel(selected, { chokeGroup: Number(e.target.value) })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function Waveform({ family, reverse, start, end }: { family: DrumFamily; reverse: boolean; start: number; end: number }) {
  return (
    <div className="relative h-28 overflow-hidden rounded-lg bg-bg">
      <svg viewBox="0 0 400 100" className="h-full w-full" preserveAspectRatio="none">
        <path
          d={fakeWave(family, reverse)}
          fill="none"
          stroke="var(--color-led)"
          strokeWidth="1.4"
          opacity="0.85"
        />
      </svg>
      <div className="absolute inset-y-0 bg-fg/10" style={{ left: `${start * 100}%`, width: `${(end - start) * 100}%` }} />
    </div>
  );
}

function fakeWave(family: DrumFamily, reverse: boolean) {
  const n = 80;
  let d = `M 0 50`;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const env =
      family === "kick"
        ? Math.exp(-t * 5) * Math.sin(t * 18 + 0.4)
        : family === "snare"
          ? Math.exp(-t * 8) * (Math.sin(t * 40) * 0.4 + (i % 3 === 0 ? 0.5 : 0.15))
          : family === "hat"
            ? Math.exp(-t * 18) * ((i % 2) * 0.7)
            : Math.exp(-t * 6) * Math.sin(t * 22);
    const x = (reverse ? 1 - t : t) * 400;
    d += ` L ${x.toFixed(1)} ${(50 - env * 42).toFixed(1)}`;
  }
  return d;
}

export function MixerPage({
  focus = false,
  onToggleFocus,
}: {
  focus?: boolean;
  onToggleFocus?: () => void;
}) {
  const project = useWorkstation((s) => s.project);
  const selected = useWorkstation((s) => s.selected);
  const select = useWorkstation((s) => s.select);
  const updateChannel = useWorkstation((s) => s.updateChannel);
  const updateMixer = useWorkstation((s) => s.updateMixer);
  const meter = useWorkstation((s) => s.meter);
  const masterPeak = useWorkstation((s) => s.masterPeak);
  const m = project.mixer;

  const shortName = (name: string) =>
    name
      .replace("Closed Hat", "CHH")
      .replace("Open Hat", "OHH")
      .replace("Rim / Stick", "Rim")
      .replace("FX / User", "FX")
      .replace("Tom High", "Tom Hi")
      .replace("Tom Mid", "Tom Md")
      .replace("Tom Low", "Tom Lo");

  const msBtn = (active: boolean, kind: "mute" | "solo", onClick: () => void, letter: "M" | "S") => (
    <button
      type="button"
      className={`ms-btn ${active ? `on ${kind === "mute" ? "mute-on" : "solo-on"}` : ""}`}
      title={kind === "mute" ? "Mute" : "Solo"}
      aria-pressed={active}
      onClick={onClick}
    >
      {letter}
    </button>
  );

  // Same layout in Focus and normal — only the surrounding window changes.
  const busPanels = (
    <div className="grid shrink-0 gap-3 md:grid-cols-3">
      <section className="hw-panel hw-panel--screws strip-rev rounded-xl p-3">
        <h3 className="font-display mb-2 text-xs tracking-[0.2em] text-family-hat uppercase">Reverb Bus</h3>
        <div className="grid grid-cols-3 gap-2">
          <Knob label="Size" value={m.reverb.size} onChange={(v) => updateMixer({ reverb: { ...m.reverb, size: v } })} />
          <Knob label="Return" value={m.reverb.return} onChange={(v) => updateMixer({ reverb: { ...m.reverb, return: v } })} />
          <Knob label="Decay" value={m.reverb.decay} onChange={(v) => updateMixer({ reverb: { ...m.reverb, decay: v } })} />
          <Knob label="Pre" value={m.reverb.preDelay} onChange={(v) => updateMixer({ reverb: { ...m.reverb, preDelay: v } })} />
          <Knob label="Damp" value={m.reverb.damping} onChange={(v) => updateMixer({ reverb: { ...m.reverb, damping: v } })} />
          <Knob label="Tone" value={m.reverb.tone} onChange={(v) => updateMixer({ reverb: { ...m.reverb, tone: v } })} />
        </div>
      </section>
      <section className="hw-panel hw-panel--screws strip-dly rounded-xl p-3">
        <h3 className="font-display mb-2 text-xs tracking-[0.2em] text-family-perc uppercase">Delay Bus</h3>
        <div className="grid grid-cols-3 gap-2">
          <Knob label="Time" value={m.delay.time} onChange={(v) => updateMixer({ delay: { ...m.delay, time: v } })} />
          <Knob label="Return" value={m.delay.return} onChange={(v) => updateMixer({ delay: { ...m.delay, return: v } })} />
          <Knob label="Fdbk" value={m.delay.feedback} onChange={(v) => updateMixer({ delay: { ...m.delay, feedback: v } })} />
          <Knob label="Filter" value={m.delay.filter} onChange={(v) => updateMixer({ delay: { ...m.delay, filter: v } })} />
          <Knob label="Width" value={m.delay.width} onChange={(v) => updateMixer({ delay: { ...m.delay, width: v } })} />
          <label className="flex items-center justify-center gap-2 text-[10px] text-muted">
            <input
              type="checkbox"
              checked={m.delay.sync}
              onChange={(e) => updateMixer({ delay: { ...m.delay, sync: e.target.checked } })}
            />
            Sync
          </label>
        </div>
      </section>
      <section className="hw-panel hw-panel--screws strip-master rounded-xl p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-xs tracking-[0.2em] text-led uppercase">Master</h3>
          <div className="flex gap-1">
            {msBtn(!!m.master.mute, "mute", () => updateMixer({ master: { ...m.master, mute: !m.master.mute } }), "M")}
            {msBtn(!!m.master.solo, "solo", () => updateMixer({ master: { ...m.master, solo: !m.master.solo } }), "S")}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Knob label="Limit" value={m.master.limiter} onChange={(v) => updateMixer({ master: { ...m.master, limiter: v } })} />
          <Knob label="Gain" value={m.master.gain} onChange={(v) => updateMixer({ master: { ...m.master, gain: v } })} />
          <Knob label="Low" value={m.master.eqLow} min={-0.5} max={0.5} onChange={(v) => updateMixer({ master: { ...m.master, eqLow: v } })} />
          <Knob label="Mid" value={m.master.eqMid} min={-0.5} max={0.5} onChange={(v) => updateMixer({ master: { ...m.master, eqMid: v } })} />
          <Knob label="High" value={m.master.eqHigh} min={-0.5} max={0.5} onChange={(v) => updateMixer({ master: { ...m.master, eqHigh: v } })} />
          <Knob label="Punch" value={m.master.punch} onChange={(v) => updateMixer({ master: { ...m.master, punch: v } })} />
          <Knob label="Tape" value={m.master.tape} onChange={(v) => updateMixer({ master: { ...m.master, tape: v } })} />
        </div>
      </section>
    </div>
  );

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 p-3 scroll-thin overflow-auto ${focus ? "mixer-focus-same" : ""}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 px-1">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="font-display text-lg tracking-[0.12em] uppercase">Mixer</h2>
          <p className="engraved truncate">{project.channels.length} channels · Rev / Dly / Master</p>
        </div>
        {onToggleFocus && !focus && (
          <button type="button" className="hw-btn" title="Focus Mixer" onClick={onToggleFocus}>
            Focus
          </button>
        )}
      </div>

      <div className="flex min-w-max gap-1.5">
        {project.channels.map((ch, i) => (
          <div
            key={ch.id}
            className={`hw-panel flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-lg p-2 ${
              selected === i ? "border-led/40" : ""
            }`}
          >
            <button
              type="button"
              className="font-display w-full truncate text-[10px] tracking-widest text-muted uppercase"
              onClick={() => select(i)}
            >
              {shortName(ch.name)}
            </button>
            <div className="flex w-full justify-center gap-1">
              {msBtn(ch.mute, "mute", () => updateChannel(i, { mute: !ch.mute }), "M")}
              {msBtn(ch.solo, "solo", () => updateChannel(i, { solo: !ch.solo }), "S")}
            </div>
            <div className="meter-bar h-14">
              <i style={{ height: `${Math.min(100, (meter[i] ?? 0) * 100)}%` }} />
            </div>
            <input
              className="fader"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={ch.volume}
              title="Level"
              onChange={(e) => updateChannel(i, { volume: Number(e.target.value) })}
            />
            <div className="mt-1 flex w-full justify-center gap-2">
              <Knob label="Rev" size="sm" value={ch.reverbSend} onChange={(v) => updateChannel(i, { reverbSend: v })} />
              <Knob label="Dly" size="sm" value={ch.delaySend} onChange={(v) => updateChannel(i, { delaySend: v })} />
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={ch.pan}
              className="w-full accent-[var(--color-led)]"
              title="Pan"
              onChange={(e) => updateChannel(i, { pan: Number(e.target.value) })}
            />
          </div>
        ))}

        <div className="hw-panel strip-rev flex w-[78px] shrink-0 flex-col items-center gap-1.5 rounded-lg border border-[color-mix(in_oklab,var(--color-family-hat)_45%,transparent)] p-2">
          <p className="font-display text-[10px] tracking-widest text-family-hat uppercase">Rev</p>
          <div className="meter-bar meter-rev h-14">
            <i style={{ height: `${Math.min(100, m.reverb.return * 70)}%` }} />
          </div>
          <input
            className="fader fader-send-rev"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={m.reverb.return}
            title="Reverb return"
            onChange={(e) => updateMixer({ reverb: { ...m.reverb, return: Number(e.target.value) } })}
          />
          <div className="mt-1 flex w-full justify-center gap-2">
            <Knob label="Size" size="sm" value={m.reverb.size} onChange={(v) => updateMixer({ reverb: { ...m.reverb, size: v } })} />
            <Knob label="Return" size="sm" value={m.reverb.return} onChange={(v) => updateMixer({ reverb: { ...m.reverb, return: v } })} />
          </div>
        </div>

        <div className="hw-panel strip-dly flex w-[78px] shrink-0 flex-col items-center gap-1.5 rounded-lg border border-[color-mix(in_oklab,var(--color-family-perc)_45%,transparent)] p-2">
          <p className="font-display text-[10px] tracking-widest text-family-perc uppercase">Dly</p>
          <div className="meter-bar meter-dly h-14">
            <i style={{ height: `${Math.min(100, m.delay.return * 70)}%` }} />
          </div>
          <input
            className="fader fader-send-dly"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={m.delay.return}
            title="Delay return"
            onChange={(e) => updateMixer({ delay: { ...m.delay, return: Number(e.target.value) } })}
          />
          <div className="mt-1 flex w-full justify-center gap-2">
            <Knob label="Time" size="sm" value={m.delay.time} onChange={(v) => updateMixer({ delay: { ...m.delay, time: v } })} />
            <Knob label="Return" size="sm" value={m.delay.return} onChange={(v) => updateMixer({ delay: { ...m.delay, return: v } })} />
          </div>
        </div>

        <div className="hw-panel strip-master flex w-[86px] shrink-0 flex-col items-center gap-1.5 rounded-lg border border-led/50 p-2">
          <p className="font-display text-[10px] tracking-widest text-led uppercase">Master</p>
          <div className="flex w-full justify-center gap-1">
            {msBtn(!!m.master.mute, "mute", () => updateMixer({ master: { ...m.master, mute: !m.master.mute } }), "M")}
            {msBtn(!!m.master.solo, "solo", () => updateMixer({ master: { ...m.master, solo: !m.master.solo } }), "S")}
          </div>
          <div className="meter-bar meter-master h-14">
            <i style={{ height: `${Math.min(100, masterPeak * 100)}%` }} />
          </div>
          <input
            className="fader fader-master"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={m.master.gain}
            title="Master gain"
            onChange={(e) => updateMixer({ master: { ...m.master, gain: Number(e.target.value) } })}
          />
          <div className="mt-1 flex w-full justify-center gap-2">
            <Knob label="Limit" size="sm" value={m.master.limiter} onChange={(v) => updateMixer({ master: { ...m.master, limiter: v } })} />
            <Knob label="Gain" size="sm" value={m.master.gain} onChange={(v) => updateMixer({ master: { ...m.master, gain: v } })} />
          </div>
        </div>
      </div>

      {busPanels}
    </div>
  );
}

export function SongPage() {
  const project = useWorkstation((s) => s.project);
  const updateSong = useWorkstation((s) => s.updateSong);
  const setPattern = useWorkstation((s) => s.setPattern);
  const setSongMode = useWorkstation((s) => s.setSongMode);
  const songMode = useWorkstation((s) => s.songMode);

  return (
    <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSongMode(!songMode)}
          className={`rounded-md px-3 py-2 font-display text-xs tracking-[0.2em] uppercase ${songMode ? "bg-led text-bg" : "border border-border text-muted"}`}
        >
          {songMode ? "Song Playing" : "Arm Song Mode"}
        </button>
        <p className="text-sm text-muted">Chain patterns into an arrangement. Each clip repeats then advances.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {project.song.map((clip, i) => (
          <div key={i} className="hw-panel flex items-center gap-2 rounded-lg px-3 py-2">
            <input
              value={clip.label}
              onChange={(e) => {
                const song = project.song.map((c, j) => (j === i ? { ...c, label: e.target.value } : c));
                updateSong(song);
              }}
              className="w-20 bg-transparent font-display text-sm tracking-widest uppercase outline-none"
            />
            <select
              value={clip.patternIndex}
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
              onChange={(e) => {
                const song = project.song.map((c, j) => (j === i ? { ...c, patternIndex: Number(e.target.value) } : c));
                updateSong(song);
              }}
            >
              {project.patterns.map((p, pi) => (
                <option key={pi} value={pi}>
                  {patternLetter(pi)} {p.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted">
              ×
              <input
                type="number"
                min={1}
                max={16}
                value={clip.repeats}
                className="w-12 rounded-md border border-border bg-surface-2 px-2 py-1"
                onChange={(e) => {
                  const song = project.song.map((c, j) => (j === i ? { ...c, repeats: Number(e.target.value) } : c));
                  updateSong(song);
                }}
              />
            </label>
            <button
              type="button"
              className="text-subtle"
              onClick={() => updateSong(project.song.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted"
          onClick={() => updateSong([...project.song, { patternIndex: 0, repeats: 2, label: "CLIP" }])}
        >
          Add clip
        </button>
      </div>
      <div>
        <h3 className="font-display mb-2 text-xs tracking-[0.2em] text-muted uppercase">Patterns</h3>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          {project.patterns.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPattern(i)}
              className={`hw-panel rounded-lg px-3 py-3 text-left ${project.patternIndex === i ? "border-led/50" : ""}`}
            >
              <span className="font-display text-lg">{patternLetter(i)}</span>
              <p className="truncate text-[10px] text-subtle">{p.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BrowserPage() {
  const project = useWorkstation((s) => s.project);
  const q = useWorkstation((s) => s.browserQuery);
  const g = useWorkstation((s) => s.browserGenre);
  const f = useWorkstation((s) => s.browserFamily);
  const setBrowser = useWorkstation((s) => s.setBrowser);
  const loadKit = useWorkstation((s) => s.loadKit);
  const applyFactoryPattern = useWorkstation((s) => s.applyFactoryPattern);
  const updateChannel = useWorkstation((s) => s.updateChannel);
  const selected = useWorkstation((s) => s.selected);
  const presets = useWorkstation((s) => s.presets);
  const loadPreset = useWorkstation((s) => s.loadPreset);
  const deletePreset = useWorkstation((s) => s.deletePreset);
  const savePreset = useWorkstation((s) => s.savePreset);

  const kits = KIT_LIBRARY.filter((k) => {
    if (q && !`${k.name} ${k.category} ${k.genre}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (g && k.genre !== g) return false;
    return true;
  });
  const sounds = SOUND_LIBRARY.filter((s) => {
    if (f && s.family !== f) return false;
    if (q && !`${s.name} ${s.character.join(" ")}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-auto p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setBrowser({ browserQuery: e.target.value })}
          placeholder="Filter kits, sounds, character…"
          className="min-w-48 flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none"
        />
        <select
          value={g}
          onChange={(e) => setBrowser({ browserGenre: e.target.value })}
          className="rounded-md border border-border bg-surface-2 px-2 py-2 text-sm"
        >
          <option value="">All genres</option>
          {Array.from(new Set(KIT_LIBRARY.map((k) => k.genre))).map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          value={f}
          onChange={(e) => setBrowser({ browserFamily: e.target.value })}
          className="rounded-md border border-border bg-surface-2 px-2 py-2 text-sm"
        >
          <option value="">All families</option>
          {CHANNEL_LAYOUT.map((c) => c.family)
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
        </select>
      </div>
      <h3 className="font-display mb-2 text-xs tracking-[0.2em] text-muted uppercase">Factory Kits</h3>
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {kits.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => loadKit(k.id, true)}
            className={`hw-panel rounded-lg p-3 text-left ${project.kitId === k.id ? "border-led/50" : ""}`}
          >
            <p className="font-display text-sm tracking-wide">{k.name}</p>
            <p className="text-[10px] text-subtle">
              {k.category} · {k.character}
            </p>
          </button>
        ))}
      </div>
      <h3 className="font-display mb-2 text-xs tracking-[0.2em] text-muted uppercase">Sounds for selected lane</h3>
      <div className="mb-6 flex flex-wrap gap-2">
        {sounds.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => updateChannel(selected, { soundId: s.id, userSample: false })}
            className={`rounded-md border px-3 py-1.5 text-xs ${project.channels[selected]!.soundId === s.id ? "border-led text-fg" : "border-border text-muted"}`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <h3 className="font-display mb-2 text-xs tracking-[0.2em] text-muted uppercase">Pattern Library</h3>
      <div className="mb-6 flex flex-wrap gap-2">
        {FACTORY_PATTERNS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyFactoryPattern(p.name)}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted"
          >
            {p.name}
          </button>
        ))}
      </div>
      <h3 className="font-display mb-2 text-xs tracking-[0.2em] text-muted uppercase">User Presets</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-md bg-fg px-3 py-1.5 text-xs text-bg" onClick={() => savePreset("project", project.name)}>
          Save Project
        </button>
        <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs" onClick={() => savePreset("kit", KIT_LIBRARY.find((k) => k.id === project.kitId)?.name ?? "Kit")}>
          Save Kit
        </button>
        <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs" onClick={() => savePreset("pattern", `Pattern ${patternLetter(project.patternIndex)}`)}>
          Save Pattern
        </button>
      </div>
      <ul className="space-y-1">
        {presets.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <button type="button" onClick={() => loadPreset(p.id)} className="text-left">
              {p.name} <span className="text-subtle">· {p.kind}</span>
            </button>
            <button type="button" className="text-subtle" onClick={() => deletePreset(p.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-8 hidden text-xs text-subtle">{Object.keys(GROOVE_LABELS).length + Object.keys(GENRE_LABELS).length}</p>
    </div>
  );
}
