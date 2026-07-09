# Last.fm Spotify Play Buttons

Replace every play button on Last.fm with a **Play on Spotify** button. Click it — Spotify opens in a background tab, plays the song / album / artist, and closes the tab. Your music keeps playing where it always plays.

![Example screenshot](example-screenshot.png)

Works with tracks, albums, artists, similar-artist cards, the artist-page play pill, chartlists, /music new releases, and home-feed recommendations. Hover any button for a **Play / Queue / Like** menu.

- No account setup beyond being logged into Last.fm and Spotify
- No data leaves your browser — the extension just automates clicks
- Chrome, Edge, Brave, Arc and other Chromium browsers. Firefox and Safari via Tampermonkey.

## Install (Chromium browsers)

Chrome doesn't allow one-click installs outside the Web Store, so this takes a few steps once:

1. Download `lastfm-spotify-play-buttons-extension-vX.Y.Z.zip` from the [latest release](https://github.com/acestronautical/lastfm-spotify-play-buttons/releases/latest).
2. Unzip it somewhere you'll keep — Chrome reads from this folder on every launch, so **don't move or delete it later**.
3. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`, …).
4. Toggle **Developer mode** in the top-right.
5. Click **Load unpacked** and pick the `extension/` folder inside the unzipped download (the one containing `manifest.json`).
6. Refresh any open Last.fm tab.

Optional: pin the toolbar icon (puzzle-piece menu → pin) to reach the settings popup quickly.

## Usage

Just browse Last.fm normally. Green Spotify circles replace the built-in play buttons.

- **Click** — play immediately
- **Hover** — menu with **Play**, **Queue**, and **Like / Follow / Save**

A helper Spotify tab opens in the background, runs the action, and closes itself.

Click the toolbar icon for settings:
- Default click action (Play / Queue / Like)
- Hover-menu delay
- Open Spotify tabs in the foreground
- Disable auto-close of the helper tab
- Show a small entity badge (artist / album / track) on each icon

## Troubleshooting

**First click of the session doesn't start audio?**  Chrome blocks autoplay on tabs the user hasn't interacted with. Once Spotify is playing anywhere on your account, clicks route through [Spotify Connect](https://support.spotify.com/us/article/spotify-connect/) and everything works. Prime it by playing anything in Spotify once per session, or set `chrome://flags/#autoplay-policy` to **No user gesture is required**.

**No green buttons?**  Refresh the tab. Check `chrome://extensions` for errors. If you also have the Tampermonkey userscripts installed, disable one — running both conflicts.

**Wrong song plays?**  Spotify's top search result for `artist + track` is used. Rare mixes and live versions may need a manual pick.

**Play button navigates instead of playing?**  Last.fm probably changed a selector. [Open an issue](https://github.com/acestronautical/lastfm-spotify-play-buttons/issues) with the page URL.

## Alternative install: Tampermonkey

For Firefox, Safari, mobile, or anywhere without extension sideloading:

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. From the [latest release](https://github.com/acestronautical/lastfm-spotify-play-buttons/releases/latest), install both userscripts:
   - `lastfm-inject-spotify-buttons.user.js`
   - `spotify-lastfm-puppeteer.user.js`
3. Refresh Last.fm.

Same source, same behavior — the extension is just a nicer wrapper with a settings popup.

## Pairs well with

[**TuneEase**](https://chromewebstore.google.com/detail/tuneease/bhdjjppbnlpjpeicimhemencfgjeldoa) — global media-key shortcuts and a mini-player for Spotify Web. Browse Last.fm, click a Spotify button, and control playback from anywhere without ever surfacing the Spotify tab.

## Under the hood

Two content scripts coordinating entirely through URL params:

- **Injector** runs on Last.fm. It takes over native play buttons and, where Last.fm ships none, injects overlays on covers. Clicks route to `https://open.spotify.com/search/{query}?lastfm=true&entity={track|album|artist}&action={play|queue|like}`.
- **Puppeteer** runs on Spotify search pages. It only activates when `?lastfm=true` is present (so your normal searches are ignored). It finds the top matching row for the requested entity, clicks the right button, and closes the tab.

## Disclaimer

Unofficial community project. Not affiliated with, endorsed by, or sponsored by Last.fm or Spotify.

The extension only automates clicks in websites you already use. It does not access accounts, collect data, or bypass service restrictions. Site interfaces change; updates may cause it to stop working until selectors are refreshed. You are responsible for complying with the sites' terms of service.
