# Last.fm Spotify Play Buttons

Tampermonkey userscripts that connect Last.fm music discovery with Spotify playback.

Browse Last.fm charts, libraries, neighbors, recommendations, and artist pages, then launch tracks, albums or artists in Spotify with a single click — without manually copying names into Spotify.

![Example screenshot](example-screenshot.png)

## How it works

Uses two Tampermonkey scripts:

### 1. Last.fm Inject Spotify Buttons

Adds Spotify buttons to Last.fm track, album and artist play controls.

Click = Play. Hover for a Play / Queue / Like menu.

```
Last.fm track / album / artist
              ↓
      Spotify search page
              ↓
     (auto-play on the other side)
```

### 2. Spotify Last.fm Puppeteer

Runs on Spotify search pages opened by the first script.

It:

```
Spotify search page
      ↓
Wait for first matching result (track / album / artist)
      ↓
Perform requested action (play, queue, like)
      ↓
Close the helper tab
```

The scripts communicate through URL params (`?lastfm=true&entity=…&action=…`) so the Spotify side only reacts to tabs launched by the Last.fm side.

## Installation

Two install paths — pick one.

### Option A: Tampermonkey (userscripts)

1. Install Tampermonkey: https://www.tampermonkey.net/ (make sure you enable "allow user scripts").
2. Add both scripts:
   * `lastfm-inject-spotify-buttons.user.js`
   * `spotify-lastfm-puppeteer.user.js`
3. Refresh Last.fm.

### Option B: Chrome extension (sideload)

Works in Chrome, Edge, Brave, and other Chromium browsers.

1. Clone or download this repo.
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** and select the `extension/` folder from this repo.
5. Refresh Last.fm.

The `extension/content/*.js` files are copies of the userscripts at the repo root — both install paths run the same code. If you edit either userscript, run `scripts/sync-extension.sh` to update the extension copies and hit the reload button on the extension card.

## Usage

1. Open any Last.fm page with play buttons:

   * charts
   * user libraries
   * recommendations
   * neighbors
   * artist pages (tracks + album covers)
   * album pages

2. Click the green Spotify button (or hover for **Play / Queue / Like**).

3. Spotify will:

   * open a background search tab
   * pick the first result matching the requested entity type
   * perform the requested action
   * close the helper tab

## Disclaimer

This project is an unofficial community-created tool and is not affiliated with, endorsed by, or sponsored by Last.fm, Spotify, or any related company.

This project uses browser userscripts to automate actions in the websites you already use. It does not provide access to Spotify accounts, collect user data, or bypass any service restrictions.

Use this project at your own discretion. Website interfaces change over time, and updates to Last.fm or Spotify may cause the scripts to stop working.

You are responsible for complying with the terms and policies of the services you use.