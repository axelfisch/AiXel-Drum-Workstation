import { useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  format?: (n: number) => string;
  onChange: (v: number) => void;
  size?: "sm" | "md";
};

export function Knob({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  defaultValue = 0,
  format,
  onChange,
  size = "md",
}: Props) {
  const start = useRef({ y: 0, v: 0 });
  const span = max - min;
  const t = span === 0 ? 0 : (value - min) / span;
  const rot = -135 + t * 270;
  const display =
    format?.(value) ??
    (Math.abs(max) > 10 || Math.abs(min) > 10
      ? `${Math.round(value)}`
      : `${Math.round(value * 100) / 100}`);

  return (
    <div className="knob flex flex-col items-center gap-1">
      <div
        className={cn("knob-dial", size === "sm" && "h-7 w-7")}
        style={{ transform: `rotate(${rot}deg)` }}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          start.current = { y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          const fine = e.shiftKey ? 0.15 : 1;
          const dy = (start.current.y - e.clientY) * fine;
          const next = start.current.v + (dy / 90) * span;
          const snapped = Math.round(next / step) * step;
          onChange(Math.min(max, Math.max(min, snapped)));
        }}
        onDoubleClick={() => onChange(defaultValue)}
        onWheel={(e) => {
          e.preventDefault();
          const dir = e.deltaY > 0 ? -1 : 1;
          const fine = e.shiftKey ? 0.2 : 1;
          onChange(Math.min(max, Math.max(min, value + dir * step * 4 * fine)));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(max, value + step));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(min, value - step));
        }}
      />
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="font-mono text-[10px] tabular-nums text-subtle">{display}</span>
    </div>
  );
}
