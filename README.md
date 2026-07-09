# Last.fm Spotify Play Buttons

A browser extension that puts a green **Play on Spotify** button on every play control across Last.fm. Click it — Spotify opens in a background tab, finds the song / album / artist, hits play, and closes the tab. Your music keeps playing where it always plays.

![Example screenshot](example-screenshot.png)

Works with tracks, albums, artists, similar-artist cards, and the "Play Artist" button on artist pages. Hover any button for a **Play / Queue / Like** menu.

- No Last.fm or Spotify account setup required beyond being logged into both
- No data leaves your browser — the extension just automates clicks you'd otherwise do by hand
- Works on Chrome, Edge, Brave, Arc, and other Chromium-based browsers. Also Firefox and any browser with Tampermonkey.

## Install (Chrome, Edge, Brave, Arc, Opera, Vivaldi)

Chrome doesn't allow installing extensions from anywhere other than the Chrome Web Store with a single click, so this involves a couple of extra steps. Once done, it's permanent — you won't need to repeat it.

1. **Download the extension.** Go to the [latest release](https://github.com/acestronautical/lastfm-spotify-play-buttons/releases/latest) and download the file named like `lastfm-spotify-play-buttons-extension-vX.Y.Z.zip`.

2. **Unzip it to a folder you'll keep.** Somewhere permanent — a `~/Extensions/` folder, your Documents, wherever. Chrome reads from this folder every time the browser starts, so **don't delete or move it later**.

3. **Open your extensions page.** Paste `chrome://extensions` into the address bar. (Edge users: `edge://extensions`. Brave: `brave://extensions`. Same idea in all Chromium browsers.)

4. **Turn on "Developer mode."** Toggle in the top-right of that page. This just tells the browser you're OK loading an extension that didn't come from the Web Store. It's the same setting web developers use — nothing about your browser changes for other sites.

5. **Click "Load unpacked"** (button appears after enabling Developer mode) and select the **`extension`** folder inside the unzipped download. Not the zip, not the parent folder — the folder named `extension` that contains `manifest.json`.

6. **You're done.** Refresh any Last.fm tab you had open. Play buttons should now be green Spotify circles.

Optional: pin the toolbar icon so you can access settings quickly. Click the puzzle-piece icon in Chrome's toolbar → find "Last.fm → Spotify Play Buttons" → click the pin icon next to it.

## How to use it

1. Browse Last.fm normally — your library, recommendations, artist pages, weekly charts, whatever.
2. Instead of clicking Last.fm's built-in play buttons (which try to play a low-quality preview from YouTube), you'll see green Spotify circles.
3. **Click** = play immediately. **Hover** for a menu with:
   - **Play** — play right now
   - **Queue** — add to your current Spotify queue
   - **Like / Follow** — save the track / follow the artist

A helper Spotify tab opens in the background, does its thing, and closes itself. You should barely notice it.

Click the extension icon in Chrome's toolbar to open the settings popup. You can:
- Change the default click action (Play or Queue)
- Adjust the hover delay before the menu appears
- Skip button injection on specific page types
- Open Spotify tabs in the foreground instead of background
- Disable the auto-close of the helper tab

## Tips and troubleshooting

**First click of the session doesn't actually start audio playing?**
This is a Chrome + Spotify limitation, not the extension. Chrome blocks audio playback on tabs the user hasn't manually interacted with — the extension can only *click* the play button, it can't grant that "user interaction" flag Chrome requires for autoplay.

Once Spotify is playing *anywhere* on your account (any tab, phone, desktop app), everything works fine — the extension's clicks route through [Spotify Connect](https://support.spotify.com/us/article/spotify-connect/) to that active device. The workaround for a fresh session: open Spotify manually and click play on anything once. That "primes" Spotify for the rest of the session.

If you'd rather not deal with that: `chrome://flags/#autoplay-policy` → set to **"No user gesture is required"** disables the restriction globally. That affects all sites, not just Spotify.

**No green buttons on Last.fm?**
- Refresh the tab after installing the extension (content scripts don't retroactively inject into already-open tabs).
- Check `chrome://extensions` — the extension should be enabled with no red "Errors" badge.
- If you also have the Tampermonkey userscript version installed, disable one — both running at once will conflict.

**Play button opens the artist page instead of playing?**
The extension makes the button a play button by short-circuiting Last.fm's normal click behavior. If it stopped working, Last.fm probably changed its page structure — please [open an issue](https://github.com/acestronautical/lastfm-spotify-play-buttons/issues) with the URL of the page you were on.

**Spotify helper tab doesn't close?**
Should be fixed as of v0.1.1. If you're on an older version, download the latest release.

**Wrong song played?**
The extension asks Spotify to search for "artist + track name" and picks the top result. For popular tracks Spotify usually gets it right, but rare mixes or live versions may need a manual pick.

## Alternative install: Tampermonkey userscripts

Prefer userscripts, or on a browser without extension sideloading (Safari, mobile browsers with Tampermonkey, etc.)? The extension is built from two userscripts you can install directly:

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser and enable "allow user scripts" if it prompts you.
2. From the [latest release](https://github.com/acestronautical/lastfm-spotify-play-buttons/releases/latest), install both userscripts:
   - `lastfm-inject-spotify-buttons.user.js`
   - `spotify-lastfm-puppeteer.user.js`
   
   Tampermonkey handles this with one click per file.
3. Refresh Last.fm.

The userscripts and the extension share the same source code, so behavior is identical — the extension is just a nicer wrapper with a settings popup.

## Pairs well with

[**TuneEase**](https://chromewebstore.google.com/detail/tuneease/bhdjjppbnlpjpeicimhemencfgjeldoa) — a Chrome extension that adds global media-key shortcuts and a mini-player for Spotify Web Player. Combined with this extension, you can browse Last.fm, click a Spotify button to queue something up, and control playback from anywhere without ever surfacing the Spotify tab.

## Under the hood

Two pieces:

**Last.fm Inject Spotify Buttons** runs on Last.fm pages. It finds Last.fm's native play buttons, strips their behavior, and takes them over. Click routes to a Spotify search URL like `https://open.spotify.com/search/Artist+Song?lastfm=true&entity=track&action=play`.

**Spotify Last.fm Puppeteer** runs on Spotify search pages. It only activates if `?lastfm=true` is in the URL (so it ignores your normal Spotify searches). It waits for search results to render, finds the first matching row for the requested entity type, clicks the appropriate button (play / more menu → queue / save / follow), and closes the tab.

The two sides never talk directly — they coordinate entirely through the URL search params, which keeps the failure modes simple.


## Disclaimer

This is an unofficial community project. Not affiliated with, endorsed by, or sponsored by Last.fm, Spotify, or any related company.

The extension automates clicks in websites you already use. It does not access Spotify accounts, collect user data, or bypass any service restrictions.

Website interfaces change over time. Updates to Last.fm or Spotify may cause the extension to stop working until the selectors are updated.

You are responsible for complying with the terms of service of the sites you use it on.
