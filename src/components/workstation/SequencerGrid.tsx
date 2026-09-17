import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DrumFamily, Step, StepMode } from "@/lib/drum/types";
import { useWorkstation } from "@/store/workstation";

const FAMILY_VAR: Record<DrumFamily, string> = {
  kick: "var(--color-family-kick)",
  snare: "var(--color-family-snare)",
  hat: "var(--color-family-hat)",
  tom: "var(--color-family-tom)",
  perc: "var(--color-family-perc)",
  fx: "var(--color-family-fx)",
};

function cellVisual(step: Step, mode: StepMode) {
  if (mode === "trigger") return step.on ? step.velocity : 0;
  if (!step.on) return 0;
  if (mode === "velocity") return step.velocity;
  if (mode === "probability") return step.probability;
  if (mode === "pitch") return (step.pitch + 12) / 24;
  if (mode === "micro") return (step.micro + 1) / 2;
  if (mode === "ratchet") return step.ratchet / 8;
  if (mode === "filter") return step.filter;
  if (mode === "reverb") return step.reverb;
  if (mode === "length") return step.length;
  return step.velocity;
}

export function SequencerGrid({
  focus = false,
  onToggleFocus,
}: {
  focus?: boolean;
  onToggleFocus?: () => void;
}) {
  const project = useWorkstation((s) => s.project);
  const selected = useWorkstation((s) => s.selected);
  const stepMode = useWorkstation((s) => s.stepMode);
  const playing = useWorkstation((s) => s.playing);
  const stepFloat = useWorkstation((s) => s.stepFloat);
  const select = useWorkstation((s) => s.select);
  const toggleStep = useWorkstation((s) => s.toggleStep);
  const paintStep = useWorkstation((s) => s.paintStep);
  const persistPaint = useWorkstation((s) => s.persistPaint);
  const setStepParam = useWorkstation((s) => s.setStepParam);
  const triggerPad = useWorkstation((s) => s.triggerPad);
  const lock = useWorkstation((s) => s.lock);

  const n = project.stepCount;
  const pattern = project.patterns[project.patternIndex]!;
  const paint = useRef<{ on: boolean; ch: number } | null>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<"a" | "b">("a");
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const mobileHalf = n > 16;
  const split = narrow && mobileHalf;
  const visibleStart = split && page === "b" ? Math.floor(n / 2) : 0;
  const visibleCount = split ? Math.ceil(n / 2) : n;
  const indices = Array.from({ length: visibleCount }, (_, i) => visibleStart + i);

  useEffect(() => {
    const el = playhead.current;
    if (!el) return;
    const local = ((stepFloat % n) + n) % n;
    const inView = local >= visibleStart && local < visibleStart + visibleCount;
    const colW = 100 / visibleCount;
    const x = (local - visibleStart) * colW;
    el.style.left = `calc(${x}%)`;
    el.style.opacity = playing && inView ? "1" : "0";
  }, [stepFloat, playing, n, visibleStart, visibleCount]);

  return (
    <div className={`hw-panel flex min-h-0 flex-1 flex-col gap-2 p-3 ${focus ? "seq-focus-panel" : ""}`}>
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="font-display text-lg tracking-[0.12em] uppercase">Sequencer</h2>
          <p className="engraved truncate">
            {n} steps · 4/4 · {project.polyMode ? "Poly" : "Mono"}
            {focus ? " · Focus" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onToggleFocus && (
            <button
              type="button"
              className={`hw-btn ${focus ? "on" : ""}`}
              title={focus ? "Quitter le mode Focus (Esc)" : "Focus Sequencer — voir les 16 pistes"}
              onClick={onToggleFocus}
            >
              {focus ? "Exit Focus" : "Focus"}
            </button>
          )}
        </div>
      </div>
      {mobileHalf && (
        <div className="flex gap-1 md:hidden">
          <button
            type="button"
            className={cn("hw-btn", page === "a" && "on")}
            onClick={() => setPage("a")}
          >
            1–{Math.ceil(n / 2)}
          </button>
          <button
            type="button"
            className={cn("hw-btn", page === "b" && "on")}
            onClick={() => setPage("b")}
          >
            {Math.ceil(n / 2) + 1}–{n}
          </button>
        </div>
      )}
      <div className={`scroll-thin min-h-0 flex-1 ${focus ? "overflow-hidden" : "overflow-auto"}`}>
        <div className={`relative ${focus ? "h-full min-h-0" : "min-w-[640px]"}`}>
          <div
            className={`grid ${focus ? "h-full" : ""}`}
            style={{
              gridTemplateColumns: `7.5rem repeat(${visibleCount}, minmax(${focus ? "1.6rem" : "0"}, 1fr))`,
              gridTemplateRows: focus
                ? `1.1rem repeat(16, minmax(0, 1fr))`
                : `1.1rem repeat(16, minmax(1.7rem, 1fr))`,
              minWidth: focus ? undefined : 640,
            }}
          >
            <div />
            {indices.map((i) => (
              <div
                key={i}
                className={cn(
                  "text-center font-mono text-[9px] tabular-nums text-subtle",
                  i % 4 === 0 && "text-muted",
                )}
              >
                {i + 1}
              </div>
            ))}
            {project.channels.map((ch, ci) => (
              <Lane
                key={ch.id}
                ci={ci}
                name={ch.name}
                family={ch.family}
                selected={selected === ci}
                mute={ch.mute}
                solo={ch.solo}
                locked={ch.lockPattern}
                indices={indices}
                steps={pattern.steps[ci]!}
                mode={stepMode}
                poly={project.polyMode}
                laneLength={ch.laneLength}
                onSelect={() => {
                  select(ci);
                  triggerPad(ci, 0.85);
                }}
                onLock={() => lock(ci, "lockPattern")}
                onToggle={(si) => toggleStep(ci, si)}
                onPaint={(si, on) => paintStep(ci, si, on)}
                onParam={(si, patch) => setStepParam(ci, si, patch)}
                onPaintEnd={persistPaint}
                paintRef={paint}
              />
            ))}
          </div>
          <div
            className="pointer-events-none absolute top-[1.1rem] right-0 bottom-0 left-[7.5rem]"
            aria-hidden
          >
            <div ref={playhead} className="playhead" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Lane({
  ci,
  name,
  family,
  selected,
  mute,
  solo,
  locked,
  indices,
  steps,
  mode,
  poly,
  laneLength,
  onSelect,
  onLock,
  onToggle,
  onPaint,
  onParam,
  onPaintEnd,
  paintRef,
}: {
  ci: number;
  name: string;
  family: DrumFamily;
  selected: boolean;
  mute: boolean;
  solo: boolean;
  locked: boolean;
  indices: number[];
  steps: Step[];
  mode: StepMode;
  poly: boolean;
  laneLength: number;
  onSelect: () => void;
  onLock: () => void;
  onToggle: (i: number) => void;
  onPaint: (i: number, on: boolean) => void;
  onParam: (i: number, patch: Partial<Step>) => void;
  onPaintEnd: () => void;
  paintRef: React.MutableRefObject<{ on: boolean; ch: number } | null>;
}) {
  const muteCh = useWorkstation((s) => s.updateChannel);
  return (
    <>
      <div className={cn("flex items-center gap-1.5 pr-2", selected && "bg-surface-3/80")}>
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: FAMILY_VAR[family] }} />
          <span className="font-display truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-fg">
            {name}
          </span>
        </button>
        <button
          type="button"
          title="Mute"
          onClick={() => muteCh(ci, { mute: !mute })}
          className={cn("font-display text-[9px] tracking-widest", mute ? "text-danger" : "text-subtle")}
        >
          M
        </button>
        <button
          type="button"
          title="Solo"
          onClick={() => muteCh(ci, { solo: !solo })}
          className={cn("font-display text-[9px] tracking-widest", solo ? "text-led" : "text-subtle")}
        >
          S
        </button>
        <button
          type="button"
          title="Lock pattern"
          onClick={onLock}
          className={cn("font-display text-[9px] tracking-widest", locked ? "text-play" : "text-subtle")}
        >
          L
        </button>
      </div>
      {indices.map((si) => {
        const st = steps[si]!;
        const dim = poly && si >= laneLength;
        const v = cellVisual(st, mode);
        return (
          <button
            key={si}
            type="button"
            aria-label={`${name} step ${si + 1}`}
            className={cn(
              "step-cell",
              si % 4 === 0 && "beat",
              si % 16 === 0 && "bar",
              st.on && "on",
              dim && "opacity-30",
            )}
            style={{ ["--lane" as string]: FAMILY_VAR[family] }}
            onPointerDown={(e) => {
              if (e.button === 2) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              if (mode === "trigger") {
                paintRef.current = { on: !st.on, ch: ci };
                onPaint(si, !st.on);
              } else if (st.on) {
                applyMode(mode, e, st, (patch) => onParam(si, patch));
              } else {
                onToggle(si);
              }
            }}
            onPointerEnter={(e) => {
              if (e.buttons === 0 || !paintRef.current) return;
              if (paintRef.current.ch !== ci && mode === "trigger") return;
              if (mode === "trigger") onPaint(si, paintRef.current.on);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 0 || mode === "trigger") return;
              if (!st.on) return;
              applyMode(mode, e, st, (patch) => onParam(si, patch));
            }}
            onPointerUp={() => {
              paintRef.current = null;
              onPaintEnd();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (st.on) onParam(si, { velocity: st.velocity > 0.7 ? 0.35 : 1 });
            }}
          >
            {st.on && <span className="vel" style={{ height: `${Math.max(12, v * 88)}%` }} />}
          </button>
        );
      })}
    </>
  );
}

function applyMode(
  mode: StepMode,
  e: React.PointerEvent,
  st: Step,
  set: (p: Partial<Step>) => void,
) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const y = 1 - Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
  if (mode === "velocity") set({ velocity: y });
  else if (mode === "probability") set({ probability: y });
  else if (mode === "pitch") set({ pitch: Math.round((y * 24 - 12) * 2) / 2 });
  else if (mode === "micro") set({ micro: y * 2 - 1 });
  else if (mode === "length") set({ length: Math.max(0.1, y) });
  else if (mode === "ratchet") {
    const opts: Step["ratchet"][] = [1, 2, 3, 4, 6, 8];
    set({ ratchet: opts[Math.min(opts.length - 1, Math.floor(y * opts.length))]! });
  } else if (mode === "filter") set({ filter: y });
  else if (mode === "reverb") set({ reverb: y });
}
