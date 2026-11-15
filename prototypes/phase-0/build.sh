#!/usr/bin/env bash
# Copies the engine files from an installed @surea11y/core into the probe
# plugin's vendor folder, and bundles the "How to check" helper for the
# browser. Usage: ./build.sh <folder containing node_modules>
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
nm="$1/node_modules"
core="$nm/@surea11y/core"
out="$here/surea11y-probe/vendor"
rm -rf "$out" && mkdir -p "$out/review"
cp "$core/surea11y.browser.js" "$core/surea11y.i18n.es.js" "$out/"
cp "$core/src/i18n/review/en.json" "$core/src/i18n/review/es.json" "$out/review/"
"$nm/.bin/esbuild" "$core/src/how-to-check-core.js" --bundle --minify --format=iife \
  --global-name=surea11yHowToCheck --target=es2020 --outfile="$out/how-to-check.js" --log-level=warning
echo "core $(node -p "require('$core/package.json').version") copied to $out"
