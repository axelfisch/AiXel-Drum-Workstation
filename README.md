# AiXel Drum Workstation

Professional drum instrument — sequencer, kits, mixer, groove, song mode.

**Web edition** (playable now) · **Native VST3 / Audio Unit** (port in progress)

Owner: [axelfisch](https://github.com/axelfisch)  
Tagline: *fast enough for a beat in 20 seconds, deep enough for a finished drum production.*

---

## What’s in this repo

```
src/engine/                 Audio, sequencer, synth, MIDI, groove
src/store/workstation.ts    Project state (patterns, mixer, song)
src/components/workstation/ Sequencer, mixer, sound, song, browser UI
src/lib/drum/               Kits, library, types, factory patterns
public/                     Brand assets
```

Architecture (same split the native plugin will follow):

`KIT → SEQUENCER → SOUND → MIXER → FX → SONG`

DSP, sequencer state and GUI stay in separate modules so a JUCE VST3/AU
port can reuse the same model.

---

## Web edition

This is the current playable instrument (Web Audio + WebMIDI).

It is **not** a Cubase/Logic plugin. Cubase loads a compiled `.vst3` binary.
That native build is the next engineering step (JUCE, Xcode, VST3 + AU).

### Cubase today (without a VST)

1. Export MIDI from the workstation and drop it on a Cubase drum track, **or**
2. Route Cubase MIDI → IAC Driver → the web app (WebMIDI is already wired).
   Bring audio back with BlackHole if you need it on a Cubase audio track.

---

## Native plugin (planned)

| Format | Hosts |
|---|---|
| **VST3** | Cubase, Ableton Live, Studio One, Reaper |
| **Audio Unit** | Logic Pro |
| Standalone | macOS app |
| Apple Silicon | required |
| Windows | when the Mac build is solid |

Install folders once the `.vst3` exists:

- macOS: `~/Library/Audio/Plug-Ins/VST3/`
- Windows: `C:\Program Files\Common Files\VST3`

A `.pkg` / installer only copies that binary. There is nothing to install
until the native instrument is compiled and signed.

---

## Licence

Private. © 2026 Axel Fisch / AiXel Studio. All rights reserved.
