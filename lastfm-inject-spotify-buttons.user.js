// ==UserScript==
// @name         Last.fm Inject Spotify Buttons
// @namespace    https://github.com/
// @version      3.5
// @description  Replace Last.fm track, album and artist play buttons with Spotify-style buttons and actions
// @match        https://www.last.fm/*
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';


    const LOG_PREFIX = "[lastfm→spotify]";

    const log = (...args)=>
        console.log(LOG_PREFIX, ...args);


    log("script loaded");



    // ---------- config bridge ----------

    // When running as the Chrome extension, content/bridge.js populates
    // window.__LFS_CONFIG from chrome.storage and keeps it in sync. Under
    // Tampermonkey there is no bridge, so getConfig() falls back to the
    // defaults below and behaviour matches the stand-alone userscript.

    const CONFIG_DEFAULTS = {
        defaultAction:    "play",
        menuDelay:        280,
    };

    function getConfig(){
        const bridged =
            (typeof window !== "undefined" && window.__LFS_CONFIG) || null;
        return bridged
            ? Object.assign({}, CONFIG_DEFAULTS, bridged)
            : CONFIG_DEFAULTS;
    }



    // ---------- styles ----------

    // Icon and overlay-button sizes are driven by a single --lfs-size
    // CSS custom property. Every per-container rule below just sets
    // that variable (and any custom position); the shared button rules
    // read it via var(--lfs-size, 32px). This means adding a new host
    // is one small block, not four repeated width/height selectors.

    const style = document.createElement("style");

    style.textContent = `

/* Inner icon (SVG wrapper) shared across every button we inject. */
.spotify-custom-button {
    display:flex !important;
    align-items:center !important;
    justify-content:center !important;
    width:var(--lfs-size, 32px) !important;
    height:var(--lfs-size, 32px) !important;
    opacity:.8;
    transition:transform .12s ease, opacity .12s ease;
}
.spotify-custom-button svg {
    display:block !important;
    width:var(--lfs-size, 32px) !important;
    height:var(--lfs-size, 32px) !important;
}
[data-spotify-replaced]:hover .spotify-custom-button { opacity:1; }


/* Neutralize Last.fm's own ::before/::after play-glyph pseudo-elements
   on any playlink we've taken over, and center our icon inside
   whatever container Last.fm gave us. */
a[data-spotify-replaced]::before,
a[data-spotify-replaced]::after,
button[data-spotify-replaced]::before,
button[data-spotify-replaced]::after { display:none !important; }

a[data-spotify-replaced],
button[data-spotify-replaced] {
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
}


/* Album/track cover-art play buttons (.desktop-playlink). Force a
   centered 60x60 overlay on the cover cell and grow the inner icon
   to fill it. Excludes:
     - .recs-feed-playlink       (home recs feed — smaller 44px)
     - .image-overlay-playlink-link (chart thumbnails — native 32px fits) */
.desktop-playlink[data-spotify-replaced]:not(.recs-feed-playlink):not(.image-overlay-playlink-link) {
    position:absolute !important;
    top:50% !important;
    left:50% !important;
    transform:translate(-50%, -50%) !important;
    margin:0 !important;
    width:60px !important;
    height:60px !important;
    --lfs-size:56px;
}
.recs-feed-playlink { --lfs-size:44px; }


/* Artist-page header "Play artist" button — keep native pill layout
   and text, just swap the inline play triangle for a small Spotify
   disc. Last.fm reserves left padding on the pill for its own inline
   triangle background; we override it so our icon isn't pushed to
   the right of the pill's left edge. */
.header-new-playlink[data-spotify-replaced] {
    display:inline-flex !important;
    align-items:center !important;
    padding-left:14px !important;
    --lfs-size:22px;
}
.header-new-playlink .spotify-custom-button { margin-right:8px; }


/* Shared style for buttons we inject from scratch (artist-avatar
   overlays and the featured-artist top-right corner). Individual
   host rules below set position + --lfs-size. */
.spotify-similar-artist-button,
.spotify-featured-artist-button {
    position:absolute !important;
    z-index:3 !important;
    background:transparent !important;
    border:0 !important;
    padding:0 !important;
    cursor:pointer !important;
    filter:drop-shadow(0 2px 6px rgba(0,0,0,.55));
}
.spotify-similar-artist-button { bottom:6px !important; right:6px !important; }


/* Per-host positioning containers + sizes. Each of these:
     - marks the host position:relative so our absolute button anchors
       correctly,
     - sets --lfs-size for the inner icon. */
.catalogue-overview-similar-artists-item-image,
.artist-similar-artists-sidebar-item-image,
.music-more-artists-item-image,
.artist-featured-items-item-image { position:relative !important; }

.catalogue-overview-similar-artists-item-image { --lfs-size:44px; }
.artist-similar-artists-sidebar-item-image     { --lfs-size:28px; }
.music-more-artists-item-image                 { --lfs-size:44px; }
.artist-featured-items-item-image              { --lfs-size:36px; }

/* Small square cover thumbnails inside big featured-artist cards
   ("Latest Release", "Popular this week"). Center the button on the
   cover instead of the default bottom-right corner. */
.artist-featured-items-item-image .spotify-similar-artist-button {
    top:calc(50% - 18px) !important;
    left:calc(50% - 18px) !important;
    right:auto !important;
    bottom:auto !important;
}

.music-recommended-artists-artist-avatar {
    position:relative !important;
    display:block !important;
    --lfs-size:48px;
}


/* Chart Top-Artists rows have small round avatars with no native
   play button. Scope .avatar to the chart image cell so we don't
   grab avatars elsewhere. Center the button (via calc offsets, not
   transform, so it composes with the hover-scale inline transform). */
.globalchart-image .avatar,
.weeklychart-image .avatar {
    position:relative !important;
    display:inline-block !important;
    --lfs-size:26px;
}
.globalchart-image .avatar .spotify-similar-artist-button,
.weeklychart-image .avatar .spotify-similar-artist-button {
    top:calc(50% - 13px) !important;
    left:calc(50% - 13px) !important;
    right:auto !important;
    bottom:auto !important;
}


/* /home/artists (and /music/+recommended/artists) recs-feed cards.
   Anchor at the wrap so we sit above the title/description overlay
   layer; pin top-left with a high z-index so clicks aren't swallowed
   by the overlay. */
.recs-feed-cover-image-wrap {
    position:relative !important;
    --lfs-size:44px;
}
.recs-feed-cover-image-wrap > .spotify-similar-artist-button {
    top:8px !important;
    left:8px !important;
    right:auto !important;
    bottom:auto !important;
    z-index:20 !important;
}


/* Big featured-artist cards on /music ("Artists for you", "Hot right
   now"). No native play button, so overlay one in the top-right. */
.music-featured-item.music-featured-artist {
    position:relative !important;
    --lfs-size:52px;
}
.spotify-featured-artist-button {
    top:14px !important;
    right:14px !important;
    filter:drop-shadow(0 2px 8px rgba(0,0,0,.6));
}


/* Hover menu (single shared element attached to <body>). */
.spotify-menu {
    position:fixed;
    display:none;
    min-width:132px;
    padding:4px;
    background:rgba(40,40,40,.78);
    backdrop-filter:blur(18px) saturate(160%);
    -webkit-backdrop-filter:blur(18px) saturate(160%);
    border:1px solid rgba(255,255,255,.12);
    border-radius:8px;
    box-shadow:
        0 10px 30px rgba(0,0,0,.4),
        0 2px 6px rgba(0,0,0,.25);
    z-index:2147483647 !important;
    font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size:13px;
    font-weight:500;
    letter-spacing:.1px;
    color:#eee;
    pointer-events:auto;
    opacity:0;
    transform:translateX(-4px);
    transition:opacity .12s ease, transform .12s ease;
}
.spotify-menu.spotify-menu--shown {
    opacity:1;
    transform:translateX(0);
}
.spotify-menu-item {
    display:flex;
    align-items:center;
    gap:10px;
    padding:7px 10px;
    border-radius:4px;
    cursor:pointer;
    white-space:nowrap;
    user-select:none;
    transition:background .1s ease, color .1s ease;
}
.spotify-menu-item svg {
    width:14px;
    height:14px;
    flex-shrink:0;
    fill:currentColor;
    opacity:.9;
}
.spotify-menu-item:hover {
    background:rgba(29,185,84,.16);
    color:#1DB954;
}


/* Hide Last.fm's "Play all" button in the Similar Artists section
   header — its station URL is just the current artist, so it
   duplicates the main PLAY ARTIST button. */
section:has(> ol.catalogue-overview-similar-artists) .section-controls .inline-section-control {
    display:none !important;
}

`;

    document.head.appendChild(style);



    // ---------- icon ----------

    // Every icon shares the green Spotify disc. Play and like also
    // overlay the three wave lines from the Spotify wordmark; queue
    // drops them because horizontal wave strokes would clash visually
    // with the horizontal queue-list bars.

    const SPOTIFY_DISC = `
<circle
    cx="16"
    cy="16"
    r="16"
    fill="#1DB954"/>`;

    const SPOTIFY_WAVES = `
<path
    d="M8 12.5C14 10.5 21 11 25 13"
    fill="none"
    stroke="#000"
    stroke-width="2"
    stroke-linecap="round"/>

<path
    d="M9 16C14 14.5 20 15 23.5 17"
    fill="none"
    stroke="#000"
    stroke-width="2"
    stroke-linecap="round"/>

<path
    d="M10.5 19.5C14 18.5 18 19 21 20.5"
    fill="none"
    stroke="#000"
    stroke-width="2"
    stroke-linecap="round"/>`;

    const SPOTIFY_GLYPHS = {

        play: `${SPOTIFY_WAVES}
<path
    d="M13 9L13 23L23 16Z"
    fill="#fff"/>`,

        queue: `
<g transform="translate(4 4) scale(0.75)">
<path
    d="M9 11.5h14M9 16h14M9 20.5h9"
    fill="none"
    stroke="#fff"
    stroke-width="2.4"
    stroke-linecap="round"/>
</g>`,

        like: `${SPOTIFY_WAVES}
<g transform="translate(4 4) scale(0.75)">
<path
    d="M16 24c-6.2-4.5-9.5-7.4-9.5-11.6 0-2.7 2-4.8 4.7-4.8 1.8 0 3.5 1 4.8 2.7 1.3-1.7 3-2.7 4.8-2.7 2.7 0 4.7 2.1 4.7 4.8 0 4.2-3.3 7.1-9.5 11.6z"
    fill="#fff"/>
</g>`,

    };

    function spotifyIcon(action){

        const glyph = SPOTIFY_GLYPHS[action] || SPOTIFY_GLYPHS.play;

        return `
<svg viewBox="0 0 32 32"
     xmlns="http://www.w3.org/2000/svg"
     aria-hidden="true">${SPOTIFY_DISC}${glyph}
</svg>`;

    }



    // ---------- Spotify tab launch ----------

    function openSpotify(url){

        GM_openInTab(
            url,
            {
                active:false,
                insert:true,
                setParent:true
            }
        );

    }



    function makeSpotifyUrl(entity, artist, name, action){

        const query =
            name
                ? `${artist} ${name}`
                : artist;


        // We deliberately land on the generic /search/{q} page rather
        // than the typed /search/{q}/tracks|albums|artists pages. Typed
        // pages use different DOM shapes (e.g. tracklist-row on /tracks)
        // and Spotify changes them independently. The generic page has
        // one stable list-row layout for all entity types, and the
        // puppeteer disambiguates using the `entity` param below.

        return (
            "https://open.spotify.com/search/" +
            encodeURIComponent(query) +
            "?lastfm=true" +
            "&entity=" + entity +
            "&action=" + action
        );

    }



    // ---------- shared: hover menu ----------

    // Single shared menu element attached to <body>. Using position:fixed
    // avoids the recurring problem of the anchor's parent clipping the
    // popup or getting mis-positioned when Last.fm reflows the row.

    const menu = document.createElement("div");

    menu.className = "spotify-menu";

    document.body.appendChild(menu);


    let currentButton = null;

    let showTimer = null;
    let hideTimer = null;


    const HIDE_DELAY_MS = 150;
    const MENU_GAP      = 8;


    // Compact icons used inside menu items.
    const MENU_ICONS = {

        play:
            `<svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 2.5v11a.5.5 0 0 0 .77.42l9-5.5a.5.5 0 0 0 0-.85l-9-5.5A.5.5 0 0 0 4 2.5z"/>
            </svg>`,

        queue:
            `<svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75zm0 4A.75.75 0 0 1 2.75 7h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.75zm.75 3.25a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5zM12 11v-1.5h1.5V11H15v1.5h-1.5V14H12v-1.5h-1.5V11z"/>
            </svg>`,

        like:
            `<svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 14.25 6.83 13.2C2.68 9.61 0 7.28 0 4.5 0 2.42 1.42 1 3.5 1c1.05 0 2.09.49 2.75 1.27C6.91 1.49 7.95 1 9 1 11.08 1 12.5 2.42 12.5 4.5c0 2.78-2.68 5.11-6.83 8.71L8 14.25z"/>
            </svg>`
    };


    function positionMenu(button){

        const r = button.getBoundingClientRect();


        // Menu must already be display:block for offset dimensions to
        // be measurable.

        const mw = menu.offsetWidth;
        const mh = menu.offsetHeight;


        // Preferred: to the right of the button, top-aligned.

        let left = r.right + MENU_GAP;
        let top  = r.top;


        // If the menu would overflow the right edge, flip to the
        // left side of the button.

        if(left + mw > window.innerWidth - 8)
            left = Math.max(8, r.left - mw - MENU_GAP);


        // Keep the menu inside the viewport vertically.

        if(top + mh > window.innerHeight - 8)
            top = Math.max(8, window.innerHeight - mh - 8);


        menu.style.left = left + "px";
        menu.style.top  = top  + "px";

    }


    // Per-entity menu definition. Each item is [label, iconKey, action].
    // Labels match Spotify's own vocabulary for each entity type so
    // users know exactly what the action will do on the other side.

    const MENU_ITEMS = {
        track: [
            ["Play Song",     "play",  "play"],
            ["Queue Song",    "queue", "queue"],
            ["Like Song",     "like",  "like"]
        ],
        album: [
            ["Play Album",    "play",  "play"],
            ["Queue Album",   "queue", "queue"],
            ["Add Album",     "like",  "like"]
        ],
        artist: [
            ["Play Artist",   "play",  "play"],
            ["Queue Artist",  "queue", "queue"],
            ["Follow Artist", "like",  "like"]
        ]
    };


    function showMenu(button){

        if(hideTimer){
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        currentButton = button;

        const { artist, name, entity } = button._spotify;


        menu.innerHTML = "";


        const items = MENU_ITEMS[entity] || MENU_ITEMS.track;


        items.forEach(([label, iconKey, action])=>{


            const item =
                document.createElement("div");

            item.className =
                "spotify-menu-item";

            item.innerHTML =
                MENU_ICONS[iconKey] +
                `<span>${label}</span>`;


            item.onclick=e=>{

                e.preventDefault();
                e.stopPropagation();


                openSpotify(
                    makeSpotifyUrl(
                        entity,
                        artist,
                        name,
                        action
                    )
                );


                hideMenu();

            };


            menu.appendChild(item);

        });


        menu.style.display = "block";

        // Position after making it visible so we can measure the
        // rendered size and flip if needed.

        positionMenu(button);


        // Trigger the fade-in on the next frame so the transition
        // actually runs.

        requestAnimationFrame(()=>{

            menu.classList.add("spotify-menu--shown");

        });

    }


    function scheduleShow(button){


        if(hideTimer){
            clearTimeout(hideTimer);
            hideTimer = null;
        }


        // Already showing (possibly for a different button) — re-anchor
        // immediately, no delay.

        if(menu.style.display === "block"){

            showMenu(button);

            return;

        }


        if(showTimer)
            clearTimeout(showTimer);


        // Popup slider stores `null` when the user drags to the far
        // right ("Off"); treat that as "hover menu disabled".

        const delay = getConfig().menuDelay;
        if(delay === null || delay === undefined || delay < 0) return;


        showTimer = setTimeout(()=>{

            showTimer = null;

            showMenu(button);

        }, delay);

    }


    function cancelShow(){

        if(showTimer){
            clearTimeout(showTimer);
            showTimer = null;
        }

    }


    function hideMenu(){

        menu.classList.remove("spotify-menu--shown");

        menu.style.display = "none";

        currentButton = null;

    }


    function deferHide(){

        if(hideTimer)
            clearTimeout(hideTimer);


        hideTimer = setTimeout(()=>{

            if(!menu.matches(":hover") &&
               !currentButton?.matches(":hover"))
                hideMenu();

        }, HIDE_DELAY_MS);

    }


    menu.addEventListener(
        "mouseenter",
        ()=>{
            if(hideTimer){
                clearTimeout(hideTimer);
                hideTimer = null;
            }
        }
    );

    menu.addEventListener(
        "mouseleave",
        deferHide
    );


    window.addEventListener(
        "scroll",
        ()=>{
            if(currentButton &&
               menu.style.display === "block")
                positionMenu(currentButton);
        },
        true
    );

    window.addEventListener(
        "resize",
        ()=>{
            if(currentButton &&
               menu.style.display === "block")
                positionMenu(currentButton);
        }
    );



    // ---------- button setup ----------

    function attachSpotifyBehavior(
        button,
        entity,
        artist,
        name,
        defaultAction
    ){


        button.dataset.spotifyReplaced = "true";


        button._spotify = {
            entity, artist, name
        };


        // Strip Last.fm's own hook classes so their delegated click
        // listeners (which fire on document.body in the capture phase
        // and would launch Last.fm's own player) no longer match this
        // element. We've already extracted everything we need from the
        // data-* attributes, so nuke them too — anything Last.fm's
        // player module keys off of should be gone by the time we're
        // done.

        button.classList.remove("js-playlink", "js-playlink-station");

        for (const key of Object.keys(button.dataset)) {
            if (key !== "spotifyReplaced") delete button.dataset[key];
        }


        // Last.fm's `components/link-block` module attaches a click
        // listener on every `.js-link-block` container that navigates
        // to the enclosed `link-block-target` href whenever any child
        // is clicked. That hijacks our button click (bubbles up to the
        // container, container routes to the album page).
        //
        // Neuter it on just this card: unhook the container's class
        // and disable pointer events on the invisible cover-link
        // overlay. Other links in the card (title, artist name) still
        // work as normal <a href>'s.

        const linkBlock = button.closest(".js-link-block, .link-block");

        if(linkBlock){

            linkBlock.classList.remove("js-link-block");


            const cover =
                linkBlock.querySelector(
                    ".js-link-block-cover-link, .link-block-cover-link"
                );

            if(cover){
                cover.style.pointerEvents = "none";
            }

        }


        // For the artist-page header button, keep Last.fm's native
        // "PLAY ARTIST" text alongside the Spotify icon. Everywhere
        // else, replace the whole button contents with just the icon.

        const preservedText =
            button.classList.contains("header-new-playlink")
                ? (button.textContent.trim() || "Play Artist")
                : null;

        const currentAction = getConfig().defaultAction || defaultAction;

        button.innerHTML = `
<span class="spotify-custom-button" title="">
${spotifyIcon(currentAction)}
</span>${preservedText ? `<span>${preservedText}</span>` : ""}`;


        // Register the click in the capture phase so we beat any
        // still-attached document-level delegated handlers.

        button.addEventListener(
            "click",
            e => {

                e.preventDefault();
                e.stopImmediatePropagation();

                openSpotify(
                    makeSpotifyUrl(
                        entity,
                        artist,
                        name,
                        getConfig().defaultAction || defaultAction
                    )
                );

            },
            true
        );


        button.addEventListener(
            "mouseenter",
            ()=>{
                button.style.transform = "scale(1.12)";
                scheduleShow(button);
            }
        );


        button.addEventListener(
            "mouseleave",
            ()=>{
                button.style.transform = "scale(1)";
                cancelShow();
                deferHide();
            }
        );

    }



    // ---------- Last.fm targets ----------

    // Extract {entity, artist, name} from a Last.fm element using
    // layered strategies. Each strategy is tried until one returns a
    // complete tuple; if we fall past the primary path we log so we can
    // pre-empt breakage before Last.fm removes an old attribute.

    function tryStrategies(label, strategies, el){


        for(const { name, run } of strategies){


            let result;

            try {
                result = run(el);
            } catch (e) {
                log(`${label} strategy "${name}" threw:`, e);
                continue;
            }


            if(result){

                if(name !== strategies[0].name)
                    log(`${label} matched via fallback "${name}"`);

                return result;

            }

        }


        return null;

    }


    // Percent- and plus-decoded string, safe against malformed URIs.
    function decodeSeg(s){

        try {
            return decodeURIComponent(s).replace(/\+/g," ");
        } catch {
            return s.replace(/\+/g," ");
        }

    }


    // Parse the /music/{artist}[/{album|_}/{track}] path segments used
    // throughout Last.fm's URL scheme (both /music/... links and
    // /player/station/music/... station URLs).
    //
    // Last.fm reserves "+"-prefixed segments (+similar, +bookmarks,
    // +tags, +wiki, +events, +listeners, +albums, +tracks, …) for
    // meta sub-pages. They look like real path segments but have no
    // coherent Spotify equivalent, so we reject them at the parser.

    function parseMusicPath(pathish){


        const m =
            pathish.match(
                /\/music\/([^/?#]+)(?:\/([^/?#]+))?(?:\/([^/?#]+))?/
            );


        if(!m) return null;


        // Reject on raw (still-encoded) segments — Last.fm encodes
        // real spaces as "+", so we must check for the literal "+"
        // prefix before decodeSeg would turn it into " ".

        if(m[2] && m[2].startsWith("+")) return null;
        if(m[3] && m[3].startsWith("+")) return null;


        return {
            artist: decodeSeg(m[1]),
            second: m[2] ? decodeSeg(m[2]) : null,
            third:  m[3] ? decodeSeg(m[3]) : null
        };

    }



    // ----- track-style buttons (a.js-playlink) -----

    const trackStrategies = [

        // Primary: data attributes injected by Last.fm's player JS.
        {
            name: "data-track-name + data-artist-name",
            run: el => {
                const track  = el.dataset.trackName;
                const artist = el.dataset.artistName;
                if(!track || !artist) return null;
                return { entity:"track", artist, name:track };
            }
        },

        // Fallback: parse the anchor's own href.
        // Last.fm play links usually have the pattern
        //   /music/{artist}/_/{track}
        // even when the data-* attributes are absent.
        {
            name: "href /music/{artist}/_/{track}",
            run: el => {

                const href = el.getAttribute("href") || "";
                const parts = parseMusicPath(href);


                if(!parts) return null;
                if(parts.second !== "_" || !parts.third) return null;


                return {
                    entity: "track",
                    artist: parts.artist,
                    name:   parts.third
                };

            }
        },

        // Last-ditch: aria-label or title of the form "Play {track} by {artist}".
        {
            name: "aria-label ~ 'Play X by Y'",
            run: el => {

                const label =
                    el.getAttribute("aria-label") ||
                    el.getAttribute("title") ||
                    "";


                const m = label.match(/^Play\s+(.+?)\s+by\s+(.+)$/i);

                if(!m) return null;


                return {
                    entity: "track",
                    artist: m[2].trim(),
                    name:   m[1].trim()
                };

            }
        }

    ];


    function replaceTrackButtons(){


        const buttons =
            document.querySelectorAll(
                'a.js-playlink:not([data-spotify-replaced])'
            );


        buttons.forEach(button=>{


            const info =
                tryStrategies(
                    "track button",
                    trackStrategies,
                    button
                );


            if(!info) return;


            button.removeAttribute("href");
            button.removeAttribute("target");


            attachSpotifyBehavior(
                button,
                info.entity,
                info.artist,
                info.name,
                "play"
            );

        });

    }



    // ----- station-style buttons (button.js-playlink-station) -----

    // Station URLs follow:
    //   /player/station/music/{artist}                (artist radio)
    //   /player/station/music/{artist}/{album}        (album radio)
    //   /player/station/music/{artist}/_/{track}      (track radio)
    // Additional segments may appear in the future; we only inspect the
    // first three after "/music/".

    const stationStrategies = [

        // Primary: parse data-station-url.
        {
            name: "data-station-url path",
            run: el => {

                const raw = el.dataset.stationUrl || "";

                const parts = parseMusicPath(raw);

                if(!parts) return null;


                return musicPartsToInfo(parts);

            }
        },

        // Fallback: pull the same path out of a nearby link. Some
        // Last.fm pages render station buttons alongside a canonical
        // /music/... link even when data-station-url is missing.
        {
            name: "sibling /music/... anchor",
            run: el => {

                const scope =
                    el.closest(
                        "[data-track-name], [data-artist-name], article, section, li, tr"
                    ) || el.parentElement;


                if(!scope) return null;


                const a =
                    scope.querySelector('a[href*="/music/"]');


                if(!a) return null;


                const parts =
                    parseMusicPath(a.getAttribute("href") || "");


                if(!parts) return null;


                return musicPartsToInfo(parts);

            }
        }

    ];


    function musicPartsToInfo(parts){


        // Artist-only radio.
        if(!parts.second){

            return {
                entity: "artist",
                artist: parts.artist,
                name:   ""
            };

        }


        // Track radio: /_/{track}
        if(parts.second === "_" && parts.third){

            return {
                entity: "track",
                artist: parts.artist,
                name:   parts.third
            };

        }


        // Album radio: /{album}
        return {
            entity: "album",
            artist: parts.artist,
            name:   parts.second
        };

    }


    function replaceStationButtons(){


        const buttons =
            document.querySelectorAll(
                'button.js-playlink-station:not([data-spotify-replaced])'
            );


        buttons.forEach(button=>{


            // Skip the "Play all" button in the Similar Artists section
            // header — it just plays the current artist again, so it
            // duplicates the main PLAY ARTIST button. It's also hidden
            // via CSS, but skip here too so we don't attach behavior.
            if (
                button.classList.contains("inline-section-control") &&
                button
                    .closest("section")
                    ?.querySelector("ol.catalogue-overview-similar-artists")
            ) {
                return;
            }


            const info =
                tryStrategies(
                    "station button",
                    stationStrategies,
                    button
                );


            if(!info) return;


            attachSpotifyBehavior(
                button,
                info.entity,
                info.artist,
                info.name,
                "play"
            );

        });

    }



    // ----- music-card overlays -----

    // Last.fm doesn't render play buttons on many cover-art cards
    // (similar-artist grids, chart rows, recs feeds, featured tracks
    // on artist pages, etc.). We inject one per card; each config
    // below describes:
    //   card:    outer selector to enumerate (with :not(replaced) added)
    //   nameSel: link inside the card whose href gives the music path
    //   hostSel: where to append the button (null = card itself)
    //   btnCls:  which of the two overlay classes to use
    // Entity (artist/album/track) is derived from the href pattern via
    // musicPartsToInfo, so the same config works for any card type.

    const MUSIC_CARD_CONFIGS = [
        // Similar-artist grid + sidebar, /music extras, recommended lists.
        { card: ".catalogue-overview-similar-artists-item-wrap",  nameSel: ".link-block-target",                  hostSel: ".catalogue-overview-similar-artists-item-image", btnCls: "spotify-similar-artist-button" },
        { card: ".artist-similar-artists-sidebar-item-wrap",      nameSel: ".link-block-target",                  hostSel: ".artist-similar-artists-sidebar-item-image",     btnCls: "spotify-similar-artist-button" },
        { card: ".music-more-artists-item-wrap",                  nameSel: ".link-block-target",                  hostSel: ".music-more-artists-item-image",                 btnCls: "spotify-similar-artist-button" },
        { card: ".music-recommended-artists-artist",              nameSel: ".link-block-target",                  hostSel: ".music-recommended-artists-artist-avatar",       btnCls: "spotify-similar-artist-button" },

        // Featured track/album cards on an artist page ("Popular this
        // week", "Latest release", etc.). Track/album entity, cover-only
        // host, no native playlink.
        { card: ".artist-featured-items-item-wrap",               nameSel: ".link-block-target",                  hostSel: ".artist-featured-items-item-image",              btnCls: "spotify-similar-artist-button" },

        // /home/artists + /music/+recommended/artists recs-feed cards.
        { card: ".recs-feed-item--artist",                        nameSel: ".link-block-target",                  hostSel: ".recs-feed-cover-image-wrap",                    btnCls: "spotify-similar-artist-button" },

        // Chart artist rows. The .js-link-block class lives on the tr
        // only for artist rows, so it disambiguates from track/album.
        { card: "tr.globalchart-item.js-link-block",              nameSel: ".link-block-target",                  hostSel: ".globalchart-image .avatar",                     btnCls: "spotify-similar-artist-button" },
        { card: "tr.weeklychart-item.js-link-block",              nameSel: ".link-block-target",                  hostSel: ".weeklychart-image .avatar",                     btnCls: "spotify-similar-artist-button" },

        // Big featured-artist cards on /music. Button lives on the card
        // itself (top-right corner), not on any inner avatar.
        { card: ".music-featured-item.music-featured-artist",     nameSel: ".music-featured-item-heading-link",   hostSel: null,                                             btnCls: "spotify-featured-artist-button" },
    ];


    function replaceMusicCards(){

        for(const cfg of MUSIC_CARD_CONFIGS){

            document
                .querySelectorAll(`${cfg.card}:not([data-spotify-replaced])`)
                .forEach(card => injectMusicOverlay(card, cfg));

        }

    }


    function injectMusicOverlay(card, cfg){

        card.dataset.spotifyReplaced = "true";

        const nameLink = card.querySelector(cfg.nameSel);
        if(!nameLink) return;

        let pathname;
        try {
            pathname =
                new URL(
                    nameLink.getAttribute("href") || nameLink.href,
                    location.origin
                ).pathname;
        } catch (_) {
            return;
        }

        const parts = parseMusicPath(pathname);
        if(!parts) return;

        const info = musicPartsToInfo(parts);

        const host = cfg.hostSel ? card.querySelector(cfg.hostSel) : card;
        if(!host) return;

        const label = info.name
            ? `Play ${info.name} by ${info.artist} on Spotify`
            : `Play ${info.artist} on Spotify`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = cfg.btnCls;
        button.setAttribute("aria-label", label);
        host.appendChild(button);

        attachSpotifyBehavior(button, info.entity, info.artist, info.name, "play");

    }



    function replaceButtons(){

        replaceTrackButtons();
        replaceStationButtons();
        replaceMusicCards();

    }



    // ---------- run + observe ----------

    replaceButtons();


    // Debounced observer: Last.fm re-renders track lists on route changes
    // and infinite-scroll; without debouncing this would run dozens of
    // times per second.

    let scheduled = false;

    function scheduleReplace(){

        if(scheduled) return;
        scheduled = true;


        requestAnimationFrame(()=>{
            scheduled = false;
            replaceButtons();
        });

    }


    new MutationObserver(scheduleReplace)
        .observe(
            document.body,
            {
                childList:true,
                subtree:true
            }
        );


    // Live-refresh injected icons when the extension popup changes the
    // default click action. The bridge dispatches this CustomEvent on
    // storage change; under Tampermonkey it never fires and the icon
    // reflects the CONFIG_DEFAULTS at page load.

    window.addEventListener("__lfs-config-changed", e => {

        if (!e.detail || !e.detail.defaultAction) return;

        const action = getConfig().defaultAction || "play";
        const svg    = spotifyIcon(action);

        document
            .querySelectorAll("[data-spotify-replaced] .spotify-custom-button")
            .forEach(span => { span.innerHTML = svg; });

    });


    // Explicit hook for SPA-style navigations. The observer above
    // already catches most re-renders, but wrapping history.pushState
    // guarantees we rescan the moment the URL changes even if the new
    // DOM commit is small.

    ["pushState","replaceState"].forEach(k=>{

        const orig = history[k];

        history[k] = function(){

            const r = orig.apply(this, arguments);

            scheduleReplace();

            return r;

        };

    });


    window.addEventListener("popstate", scheduleReplace);


})();
