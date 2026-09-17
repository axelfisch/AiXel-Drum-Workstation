#!/bin/bash
set -euo pipefail
NATIVE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$NATIVE_DIR/build-mac}"
CMAKE="${CMAKE:-cmake}"
args=(-S "$NATIVE_DIR/AiXelDrumWorkstation" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64 -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0)
if [[ -n "${JUCE_PATH:-}" ]]; then args+=(-DJUCE_PATH="$JUCE_PATH"); fi
"$CMAKE" "${args[@]}"
"$CMAKE" --build "$BUILD_DIR" --config Release --parallel "${BUILD_JOBS:-4}"
"$CMAKE" --build "$BUILD_DIR" --config Release --target test
for kind in VST3 Standalone; do
 extension=vst3; [[ "$kind" == Standalone ]] && extension=app
 bundle="$BUILD_DIR/AiXelDrumWorkstation_artefacts/Release/$kind/AiXel Drum Workstation.$extension"
 # Finder metadata can be added when launching a locally built app.
 /usr/bin/xattr -dr com.apple.FinderInfo "$bundle" 2>/dev/null || true
 /usr/bin/xattr -dr com.apple.ResourceFork "$bundle" 2>/dev/null || true
 /usr/bin/codesign --force --deep --sign - "$bundle"
 /usr/bin/codesign --verify --deep --strict "$bundle"
done
