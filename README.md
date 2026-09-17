# AiXel Drum Workstation

Professional drum instrument — sequencer, kits, mixer, groove, song mode.

**Web edition** (playable) · **Native VST3 / Audio Unit** (port planned — see [`native/README.md`](native/README.md))

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
native/                     VST3/AU port notes & architecture map
```

Architecture (same split the native plugin will follow):

`KIT → SEQUENCER → SOUND → MIXER → FX → SONG`

---

## Web edition — run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173), click **Arm Engine**.

```bash
npm run build    # output in dist/
npm run preview  # smoke-test the production build
```

### Deploy on Netlify

- **Auto (recommended):** connect this GitHub repo in Netlify (build `npm run build`, publish `dist`). `netlify.toml` is included.
- **Manual zip:** `npm run build` then zip the contents of `dist/` and drag-drop in Netlify Deploys.

---

## Cubase / Logic today (without a VST)

This web app is **not** a Cubase/Logic plugin. Cubase loads a compiled `.vst3`.

Until the native port ships:

1. Export MIDI from the workstation and drop it on a Cubase drum track, **or**
2. Route Cubase MIDI → IAC Driver → the web app (WebMIDI). Bring audio back with BlackHole if you need it on a Cubase audio track.

Details and native roadmap: [`native/README.md`](native/README.md).

---

## Licence

Private. © 2026 Axel Fisch / AiXel Studio. All rights reserved.
