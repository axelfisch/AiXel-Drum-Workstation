# Mapping web ↔ natif v0.1

Source : `src/lib/drum/types.ts`, `defaults.ts`, `library.ts`, `patterns.ts`, `src/store/workstation.ts` et les moteurs synth/sequencer/audio-engine/midi/groove, commit bec8087.

| Web | Phase 1 native | Écart |
|---|---|---|
| CHANNEL_COUNT = 16 | 16 pads et voies logiques | Pas de mixer individuel |
| DrumChannel.name/family | noms et familles du layout par défaut | Kit fixe, timbres natifs simplifiés |
| Project.midiMap | mapping GM par défaut identique | Pas d'apprentissage MIDI |
| SynthLayer | sinus, bruit, FM, enveloppes/pitch | Pas de chargement direct de SoundDef/layers |
| Pattern.steps[channel][step].on | paramètre `step_C_S` booléen | 16 x 16, un pattern |
| Step.velocity | 0.85, hat fermé 0.5 ; vélocité MIDI reçue respectée | Pas d'édition de vélocité par step |
| Project.tempo | `tempo` 40–220, défaut 96 | VST3 utilise BPM hôte ; tempo local Standalone |
| Project.stepCount | 16 | Web défaut 32, maximum 64 ; 24 ternaires absents |
| mixer.master.gain | `master`, linéaire 0–1, défaut 0.82 | Pas de bus/EQ/limiteur web |
| chokeGroup | hats groupe 1, toms groupe 2 | Extinction immédiate simplifiée |
| store.persist / JSON Project | APVTS `AiXelNativeV1`, XML JUCE encapsulé en binaire | État hôte natif, **pas un fichier projet web compatible** |
| sequencer.play/stop | PPQ/BPM/transport hôte ; horloge interne Standalone | Pas de commande de transport global depuis VST3 |
| groove / SONG / FX | différés | Aucun champ silencieusement présenté comme pris en charge |

## Mapping MIDI

| Pad (index C) | Nom | Note MIDI |
|---|---|---|
| 1 (0) | Kick 1 | 36 |
| 2 (1) | Kick 2 | 35 |
| 3 (2) | Snare | 38 |
| 4 (3) | Clap | 39 |
| 5 (4) | Rim / Stick | 37 |
| 6 (5) | Closed Hat | 42 |
| 7 (6) | Open Hat | 46 |
| 8 (7) | Ride | 51 |
| 9 (8) | Crash | 49 |
| 10 (9) | Tom High | 50 |
| 11 (10) | Tom Mid | 47 |
| 12 (11) | Tom Low | 45 |
| 13 (12) | Perc 1 | 63 |
| 14 (13) | Perc 2 | 62 |
| 15 (14) | Shaker | 70 |
| 16 (15) | FX / User | 75 |

« FX / User » conserve le nom web ; pas d'import utilisateur en Phase 1. Les IDs de paramètres sont versionnés (versionHint=1) et doivent rester stables pour préserver les projets hôtes.

Le callback audio ne lit aucun fichier, n'alloue pas de voix et n'attend aucun verrou applicatif. UI → pads : masque atomique ; grille/master/tempo : paramètres APVTS atomiques ; compteurs vers UI : atomiques. Le pool de 48 voix vole la plus ancienne à saturation. La sauvegarde utilise APVTS hors callback. Phase 2 : convertir explicitement un JSON Project validé en modèle natif, avec rapport des champs non pris en charge et migration versionnée.
