# AiXel Drum Workstation — Phase 1 native

Auteur : Axel Fisch / AiXel Studio.
*fast enough for a beat in 20 seconds, deep enough for a finished drum production.*

Le web demeure la référence fonctionnelle. Ce projet C++17 / JUCE 8.0.12 est une piste séparée : aucune dépendance React, Vite ou Web Audio dans le plugin. Référence étudiée : main `bec80876d110652a5622814e66e87738f52649e0`.

## Architecture

`KIT → SEQUENCER → SOUND → MIXER → FX → SONG`

```
native/
  AiXelDrumWorkstation/
    CMakeLists.txt
    Source/
      DrumEngine.h          # 16 timbres, pool fixe de 48 voix
      PatternSequencer.h    # horloge PPQ en doubles croches
      PluginProcessor.h/.cpp # MIDI, audio, paramètres, état
      PluginEditor.h/.cpp   # pads, grille 16 x 16, transport, master
    Tests/ProcessorTests.cpp
  scripts/build-mac.sh
  scripts/install-vst3-mac.sh
  MAPPING.md
  VALIDATION.md
```

## Construction macOS arm64

Prérequis : Xcode et ses outils de développement, CMake >= 3.22, Git, accès réseau au premier build. Le projet télécharge JUCE au tag 8.0.12 ; on peut fournir `JUCE_PATH=/chemin/JUCE` pour utiliser une copie locale. Vérifier la licence JUCE adaptée à la distribution : AGPLv3 ou licence commerciale (https://github.com/juce-framework/JUCE/blob/8.0.12/LICENSE.md).

Depuis la racine du dépôt :

```sh
./native/scripts/build-mac.sh
./native/scripts/install-vst3-mac.sh
```

`CMAKE`, `BUILD_DIR`, `BUILD_JOBS` et `JUCE_PATH` sont configurables. Le script signe les bundles ad hoc pour les tests locaux ; ce n'est pas une signature Developer ID ni une notarisation.

Équivalent manuel :

```sh
cmake -S native/AiXelDrumWorkstation -B native/build-mac \
  -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0
cmake --build native/build-mac --config Release --parallel 4
ctest --test-dir native/build-mac -C Release --output-on-failure
```

Pour Xcode, utiliser un autre dossier : `cmake -G Xcode -S native/AiXelDrumWorkstation -B native/build-xcode -DCMAKE_OSX_ARCHITECTURES=arm64`. Construire ensuite les cibles VST3 et Standalone en Release.

Sorties : `native/build-mac/AiXelDrumWorkstation_artefacts/Release/VST3/AiXel Drum Workstation.vst3` et `Standalone/AiXel Drum Workstation.app`.

Installation : `~/Library/Audio/Plug-Ins/VST3/AiXel Drum Workstation.vst3`. Le script vérifie la signature et arm64 ; un ancien bundle est déplacé dans `AiXel-backups` avant copie. Le premier argument permet d'installer un autre bundle compilé. Aucun téléchargement web ne remplace cette installation native.

## Utilisation / validation Cubase

1. Ouvrir Cubase en mode natif Apple Silicon. Rescanner dans le gestionnaire de plug-ins VST ou relancer Cubase après installation, sans fermer un projet non sauvegardé.
2. Ajouter une piste instrument « AiXel Drum Workstation ». Vérifier que la sortie stéréo de la piste rejoint le master.
3. Cliquer les 16 pads et envoyer les notes MIDI du tableau MAPPING.md (tous canaux MIDI acceptés). Les pads jouent même lorsque le transport est arrêté.
4. Démarrer Cubase : le pattern d'exemple joue en doubles croches. Changer le tempo de 96 à 120, tester boucle, déplacement de curseur et arrêt. Les queues de sons s'éteignent naturellement après Stop.
5. Désactiver « Pattern enabled » pour utiliser uniquement les notes MIDI. Le bouton transport du VST3 indique « host » : il ne commande pas le transport global Cubase.
6. Modifier plusieurs cases et le gain, sauvegarder le projet, fermer/réouvrir et vérifier le rappel.
7. Standalone : choisir une sortie audio dans Options / Audio settings, cliquer un pad, puis Play / Stop. Le tempo local est actif uniquement dans cette application.

Le VST3 requiert une position PPQ valide de l'hôte pour jouer le pattern. Sans PPQ, le MIDI et les pads restent utilisables. L'horloge suit le tempo communiqué à chaque bloc ; pas de rampe de tempo interne au bloc. Un départ au milieu d'un pas attend la prochaine double croche.

## Limites Phase 1

16 canaux, un pattern de 16 pas et un kit synthétique fixe. Pas d'import WAV, bibliothèque complète, import/export JSON web, MIDI out/export, arrangement SONG, swing/humanize/fills, ratchets, filtres, EQ, Rev/Dly ou sorties séparées. Le master utilise un gain lissé et un soft clip tanh, pas le processeur master web. Le signal est mono dupliqué sur une sortie stéréo. Timbres simplifiés, pas de promesse de parité sonore. Les clics de pad arrivant dans un même bloc sont regroupés par pad. Note Off ne coupe pas les one-shots ; All Notes Off / All Sound Off coupe les voix.

Le nouveau logo fourni est réservé au prochain travail demandé sur l'accueil web ; le site n'est pas redéployé dans cette phase.

## Signature et diffusion

Pour un test local : `codesign --force --deep --sign - "AiXel Drum Workstation.vst3"`, puis `codesign --verify --deep --strict` sur le bundle. Pour diffusion : signer les exécutables et bundles de l'intérieur vers l'extérieur avec un certificat **Developer ID Application**, timestamp et hardened runtime (`--options runtime`). Ne pas utiliser `--deep` comme stratégie de signature de production. Créer un ZIP avec `ditto -c -k --keepParent`, soumettre avec `xcrun notarytool submit ... --keychain-profile PROFILE --wait`, puis agrafer le ticket au bundle avec `xcrun stapler staple`. Préparer un `.pkg` signé **Developer ID Installer**, notariser et vérifier sur une machine propre. Aucun secret ou certificat n'est stocké dans le dépôt. Cette diffusion nécessite aussi le choix de licence JUCE approprié.

## Phase 2

- AU pour Logic, puis VST3 Windows et validation multi-hôtes.
- Mixer par canal, panoramique, Rev/Dly/Master, puis parité DSP mesurée.
- Import/export des projets web avec validation et migrations ; samples externes et bibliothèque.
- 16 patterns, 24/32/64 pas, SONG, groove, probabilités, ratchets.
- UI Focus-like, raccourcis, accessibilité, automation enrichie.
- Signature Developer ID, notarisation, installateur `.pkg` et bouton de téléchargement/installation associé à une vraie release signée.
