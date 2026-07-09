#!/usr/bin/env bash
# Copies the canonical userscripts into the extension's content-script folder.
# Chromium silently skips symlinks in unpacked extensions, so we keep real
# file copies and re-sync them here whenever the userscripts change.

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

cp "$repo_root/lastfm-inject-spotify-buttons.user.js" \
   "$repo_root/extension/content/lastfm-inject.js"

cp "$repo_root/spotify-lastfm-puppeteer.user.js" \
   "$repo_root/extension/content/spotify-puppeteer.js"

echo "Synced userscripts → extension/content/"
