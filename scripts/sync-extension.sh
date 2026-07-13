#!/usr/bin/env bash
# Builds the modular userscript sources and copies the resulting
# concatenated userscripts into the extension's content-script folder.
#
# Chromium silently skips symlinks in unpacked extensions, so we keep
# real file copies and re-sync them here whenever the sources change.

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

"$repo_root/scripts/build.sh"

cp "$repo_root/tampermonkey/lastfm-inject-spotify-buttons.user.js" \
   "$repo_root/extension/content/lastfm-inject.js"

cp "$repo_root/tampermonkey/spotify-lastfm-puppeteer.user.js" \
   "$repo_root/extension/content/spotify-puppeteer.js"

echo "Synced userscripts → extension/content/"
