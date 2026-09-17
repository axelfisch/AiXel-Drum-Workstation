# Validation — 17 septembre 2026

## Résultats mesurés

- Référence web : main bec80876d110652a5622814e66e87738f52649e0.
- `npm ci` puis `npm run build` : succès TypeScript + Vite ; aucun fichier web modifié.
- Site live : accueil affiché. Interaction « ARM ENGINE » non validée : timeout du navigateur automatisé. Pas d'audit fonctionnel exhaustif web ni de déploiement effectué.
- JUCE 8.0.12, C++17, AppleClang/Xcode, Release, arm64, cible macOS 11.
- Script `build-mac.sh` : terminé avec code 0 ; VST3 + Standalone + tests construits.
- `file` : VST3 Mach-O 64-bit bundle arm64.
- `codesign --verify --deep --strict` : succès sur les deux bundles, signature ad hoc.
- `install-vst3-mac.sh` : terminé avec code 0, bundle installé dans `~/Library/Audio/Plug-Ins/VST3/`.
- Tests processeur : succès. 16 notes MIDI → signal, silence avant offset 64, stéréo finie, déclenchement pad UI, start/stop/seek/loop via hôte simulé, horloge à 60/96/120/220 BPM sur blocs de 64/127/512, restauration d'état et rejet d'état invalide.
- Standalone ouvert : 16 pads et grille 16 x 16 inspectés visuellement. Play montre Peak 0.072, Stop revient à 0.000. Ceci confirme le rendu audio dans le callback, pas une écoute humaine ni une capture de la sortie matérielle.
- Cubase 15 LE, journal arm64 `vstscannermaster.log` : `Scanning: AiXel Drum Workstation OK (864 ms)`.

## Non validé / à terminer

- Insertion du plugin sur une piste Cubase, audio routé vers le master matériel, rappel d'un vrai projet Cubase, changement de tempo dans Cubase. L'accès à l'interface Cubase a échoué avec le timeout Computer Use -10005 ; aucun projet utilisateur n'a été édité.
- Reaper, autres machines, autres fréquences matérielles et validation de distribution.
- Signature Developer ID, notarisation, installateur .pkg : documentés, non réalisés.
- Sources disponibles localement dans ce livrable ; aucun push GitHub ni déploiement Netlify.

## Corrections pendant la vérification

- Correction de l'ordre des arguments `lipo` dans le script d'installation ; nouveau test réussi.
- Nettoyage ciblé des attributs FinderInfo/ResourceFork des bundles construits avant signature, après ouverture du Standalone ; script complet rejoué avec succès.
- Suppression d'une définition de macro Standalone contradictoire sur la cible de tests.
- Horloge initialisée avec état explicite pour éviter une conversion entière hors plage.

## Critères Phase 1

- [x] .vst3 et .app arm64 compilés.
- [x] Installation locale par script.
- [x] Scan Cubase réussi.
- [ ] Chargement dans une piste Cubase et écoute confirmés.
- [x] MIDI vers audio et sync tempo/transport validés sur processeur avec hôte simulé.
- [ ] Sync vérifiée dans une session Cubase réelle.
- [x] Mapping, limitations, build, test et roadmap documentés.
