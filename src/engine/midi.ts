import type { Project } from "@/lib/drum/types";
import { stepDuration } from "./sequencer";

export function patternToMidi(project: Project, patternIndex = project.patternIndex, lanes?: number[]): Blob {
  const pattern = project.patterns[patternIndex]!;
  const ppq = 480;
  const steps = project.stepCount;
  const dur = stepDuration(project);
  const ticksPerStep = ppq / (project.stepCount === 24 ? 6 : 4);
  const tracks: number[][] = [];
  const use = lanes ?? project.channels.map((_, i) => i);

  const events: Array<{ tick: number, data: number[] }> = [];
  events.push({ tick: 0, data: [0xff, 0x51, 0x03, ...tempoBytes(project.tempo)] });

  for (const c of use) {
    const ch = project.channels[c]!;
    const note = project.midiMap[c] ?? 36 + c;
    const lane = pattern.steps[c]!;
    for (let i = 0; i < steps; i++) {
      const st = lane[i]!;
      if (!st.on) continue;
      const tick = Math.round(i * ticksPerStep + st.micro * (ticksPerStep * 0.45));
      const vel = Math.max(1, Math.min(127, Math.round(st.velocity * 127)));
      const length = Math.max(20, Math.round(ticksPerStep * st.length * 0.8));
      const n = st.ratchet;
      for (let r = 0; r < n; r++) {
        const t = tick + Math.round((r * ticksPerStep) / n);
        events.push({ tick: Math.max(0, t), data: [0x90, note, vel] });
        events.push({ tick: Math.max(0, t + Math.floor(length / n)), data: [0x80, note, 0] });
      }
      void ch;
      void dur;
    }
  }

  events.sort((a, b) => a.tick - b.tick || a.data[0]! - b.data[0]!);
  const track: number[] = [];
  let last = 0;
  for (const ev of events) {
    writeVar(track, ev.tick - last);
    track.push(...ev.data);
    last = ev.tick;
  }
  writeVar(track, 0);
  track.push(0xff, 0x2f, 0x00);
  tracks.push(track);

  const header = [
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1,
    (ppq >> 8) & 0xff, ppq & 0xff,
  ];
  const trk = tracks[0]!;
  const chunk = [
    0x4d, 0x54, 0x72, 0x6b,
    (trk.length >> 24) & 0xff,
    (trk.length >> 16) & 0xff,
    (trk.length >> 8) & 0xff,
    trk.length & 0xff,
    ...trk,
  ];
  return new Blob([new Uint8Array([...header, ...chunk])], { type: "audio/midi" });
}

function tempoBytes(bpm: number) {
  const us = Math.round(60_000_000 / bpm);
  return [(us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff];
}

function writeVar(out: number[], value: number) {
  let v = value >>> 0;
  const bytes = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  out.push(...bytes);
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function encodeWav(buffer: AudioBuffer): Promise<Blob> {
  const n = buffer.length;
  const ch = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const dataLen = n * ch * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const view = new DataView(ab);
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * ch * 2, true);
  view.setUint16(32, ch * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, dataLen, true);
  let off = 44;
  const channels = Array.from({ length: ch }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]![i]!));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
