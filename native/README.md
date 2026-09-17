# Native VST3 / Audio Unit port

The playable product today is the **web edition** (Web Audio + WebMIDI).

Cubase, Logic, Ableton, etc. load a **compiled native plugin** (`.vst3` / `.component`), not a website.
That port is a separate engineering track.

## Target architecture (mirrors `src/`)

```
KIT → SEQUENCER → SOUND → MIXER → FX → SONG
```

| Web module | Native responsibility |
|---|---|
| `src/engine/synth.ts` | Sample / synthesis DSP (JUCE `Synthesiser` / custom voices) |
| `src/engine/sequencer.ts` | Host-synced clock + pattern playback |
| `src/engine/audio-engine.ts` | Graph: buses, sends, master |
| `src/engine/midi.ts` | MIDI in/out + file export |
| `src/engine/groove.ts` | Timing / humanize / fills |
| `src/store/workstation.ts` | Project model (serialize to plugin state) |
| `src/components/workstation/*` | Plugin editor UI (JUCE or webview UI later) |

## Planned deliverables

1. **VST3** — Cubase, Live, Studio One, Reaper, etc.
2. **Audio Unit** — Logic Pro
3. **Standalone** macOS app
4. Apple Silicon first; Windows after Mac is solid

## Install folders (once binaries exist)

- macOS VST3: `~/Library/Audio/Plug-Ins/VST3/`
- macOS AU: `~/Library/Audio/Plug-Ins/Components/`
- Windows VST3: `C:\Program Files\Common Files\VST3\`

## Cubase / Logic **today** (without a VST)

1. Export MIDI from the workstation → drop on a drum track in the DAW, **or**
2. macOS IAC Driver: Cubase MIDI out → web app WebMIDI in; return audio with BlackHole if needed.

## Next engineering step

Create a JUCE 8 project that:

- embeds the same pattern/kit JSON schema as the web store
- implements voice rendering equivalent to `synth.ts`
- exposes a stereo out + MIDI in
- ships a minimal editor (transport, 16 pads, pattern grid)

Until that binary is signed and released, there is **nothing** to install in Cubase as a VST.
