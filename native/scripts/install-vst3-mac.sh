#!/bin/bash
set -euo pipefail
NATIVE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${1:-${BUILD_DIR:-$NATIVE_DIR/build-mac}/AiXelDrumWorkstation_artefacts/Release/VST3/AiXel Drum Workstation.vst3}"
DEST_DIR="${VST3_INSTALL_DIR:-$HOME/Library/Audio/Plug-Ins/VST3}"
[[ -d "$SOURCE/Contents/MacOS" ]] || { echo "Missing VST3 bundle: $SOURCE" >&2; exit 1; }
/usr/bin/codesign --verify --deep --strict "$SOURCE"
/usr/bin/lipo "$SOURCE/Contents/MacOS/AiXel Drum Workstation" -verify_arch arm64
mkdir -p "$DEST_DIR"
DEST="$DEST_DIR/AiXel Drum Workstation.vst3"
if [[ -e "$DEST" ]]; then
 mkdir -p "$DEST_DIR/AiXel-backups"
 mv "$DEST" "$DEST_DIR/AiXel-backups/AiXel Drum Workstation-$(date +%Y%m%d-%H%M%S).vst3.backup"
fi
/usr/bin/ditto "$SOURCE" "$DEST"
/usr/bin/codesign --verify --deep --strict "$DEST"
echo "Installed: $DEST"
