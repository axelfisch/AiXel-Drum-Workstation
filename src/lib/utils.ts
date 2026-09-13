import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function dbToGain(db: number) {
  return Math.pow(10, db / 20);
}

export function gainToDb(g: number) {
  return 20 * Math.log10(Math.max(1e-8, g));
}

export function midiToHz(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function semitoneRatio(semi: number) {
  return Math.pow(2, semi / 12);
}

export function patternLetter(i: number) {
  return String.fromCharCode(65 + (i % 16));
}
