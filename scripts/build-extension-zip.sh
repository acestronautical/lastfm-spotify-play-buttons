#!/usr/bin/env bash
# Builds a distributable zip of the extension for GitHub releases.
#
# Usage:
#   scripts/build-extension-zip.sh                # uses version from manifest.json
#   scripts/build-extension-zip.sh 1.2.3          # override version
#
# Output: dist/lastfm-spotify-play-buttons-extension-v<VERSION>.zip

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

# Make sure extension/content/ has the current userscript sources.
"$repo_root/scripts/sync-extension.sh"

# Resolve version: CLI arg, else read from manifest.json.
version="${1:-}"
if [[ -z "$version" ]]; then
    version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' \
        "$repo_root/extension/manifest.json" | head -1)
fi

if [[ -z "$version" ]]; then
    echo "Could not determine version." >&2
    exit 1
fi

# Stage into a temp dir so we can rewrite manifest.json without touching the source.
staging_parent="$(mktemp -d)"
staging="$staging_parent/extension"
cp -R "$repo_root/extension" "$staging"

# Rewrite the string "version" (manifest_version stays untouched because it's an int).
sed -i.bak 's/"version": "[^"]*"/"version": "'"$version"'"/' \
    "$staging/manifest.json"
rm "$staging/manifest.json.bak"

mkdir -p "$repo_root/dist"
out="$repo_root/dist/lastfm-spotify-play-buttons-extension-v$version.zip"
rm -f "$out"

(cd "$staging_parent" && zip -qr "$out" extension)

rm -rf "$staging_parent"

echo "Built: $out"
