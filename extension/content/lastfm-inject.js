// ==UserScript==
// @name         Last.fm Inject Spotify Buttons
// @namespace    https://github.com/
// @version      3.3
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
        skipArtistPages:  false,
        skipAlbumPages:   false,
        skipLibraryPages: false,
    };

    function getConfig(){
        const bridged =
            (typeof window !== "undefined" && window.__LFS_CONFIG) || null;
        return bridged
            ? Object.assign({}, CONFIG_DEFAULTS, bridged)
            : CONFIG_DEFAULTS;
    }



    // ---------- styles ----------

    const style = document.createElement("style");

    style.textContent = `

.spotify-custom-button {
    display:flex !important;
    align-items:center !important;
    justify-content:center !important;
    width:32px !important;
    height:32px !important;
    transition:transform .12s ease;
}

.spotify-custom-button svg {
    display:block !important;
    width:32px !important;
    height:32px !important;
}

.recs-feed-playlink .spotify-custom-button,
.recs-feed-playlink .spotify-custom-button svg {
    width:44px !important;
    height:44px !important;
}


.spotify-menu {
    position:fixed;
    display:none;

    min-width:132px;

    padding:4px;

    background:rgba(24,24,24,.92);
    backdrop-filter:blur(14px) saturate(140%);
    -webkit-backdrop-filter:blur(14px) saturate(140%);

    border:1px solid rgba(255,255,255,.08);
    border-radius:8px;

    box-shadow:
        0 10px 30px rgba(0,0,0,.55),
        0 2px 6px rgba(0,0,0,.4);

    z-index:2147483647 !important;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;

    font-size:13px;
    font-weight:500;
    letter-spacing:.1px;

    color:#eee;

    pointer-events:auto;

    opacity:0;
    transform:translateX(-4px);
    transition:
        opacity .12s ease,
        transform .12s ease;
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

    transition:
        background .1s ease,
        color .1s ease;
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


a[data-spotify-replaced]::before,
a[data-spotify-replaced]::after,
button[data-spotify-replaced]::before,
button[data-spotify-replaced]::after {
    display:none !important;
}


/* Center the injected icon inside whatever container Last.fm gave us.
   Some hosts (e.g. .image-overlay-playlink-link on video previews)
   are much bigger than our 32px icon and would otherwise pin the
   icon to the top-left corner. */

a[data-spotify-replaced],
button[data-spotify-replaced] {
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
}


/* Artist-page header "Play artist" button. Keep Last.fm's native
   pill layout and text, just swap the inline play triangle for the
   Spotify green circle at a smaller size. */

.header-new-playlink .spotify-custom-button,
.header-new-playlink .spotify-custom-button svg {
    width:20px !important;
    height:20px !important;
}

.header-new-playlink .spotify-custom-button {
    margin-right:6px;
}

.header-new-playlink[data-spotify-replaced] {
    display:inline-flex !important;
    align-items:center !important;
}


/* Similar-artist cards (both the artist-page grid and the sidebar)
   have no native play button. We inject one that overlays the avatar
   in the bottom-right corner. */

.catalogue-overview-similar-artists-item-image,
.artist-similar-artists-sidebar-item-image {
    position:relative !important;
}

.spotify-similar-artist-button {
    position:absolute !important;
    bottom:6px !important;
    right:6px !important;
    z-index:3 !important;
    background:transparent !important;
    border:0 !important;
    padding:0 !important;
    cursor:pointer !important;
    filter:drop-shadow(0 2px 6px rgba(0,0,0,.55));
}

.catalogue-overview-similar-artists-item-image .spotify-similar-artist-button .spotify-custom-button,
.catalogue-overview-similar-artists-item-image .spotify-similar-artist-button .spotify-custom-button svg {
    width:44px !important;
    height:44px !important;
}

.artist-similar-artists-sidebar-item-image .spotify-similar-artist-button .spotify-custom-button,
.artist-similar-artists-sidebar-item-image .spotify-similar-artist-button .spotify-custom-button svg {
    width:28px !important;
    height:28px !important;
}

`;

    document.head.appendChild(style);



    // ---------- icon ----------

    const SPOTIFY_ICON = `
<svg viewBox="0 0 32 32"
     xmlns="http://www.w3.org/2000/svg"
     aria-hidden="true">

<circle
    cx="16"
    cy="16"
    r="16"
    fill="#1DB954"/>

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
    stroke-linecap="round"/>

<path
    d="M13 9L13 23L23 16Z"
    fill="#fff"/>

</svg>`;



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


        showTimer = setTimeout(()=>{

            showTimer = null;

            showMenu(button);

        }, getConfig().menuDelay);

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
        // data-* attributes.

        button.classList.remove(
            "js-playlink",
            "js-playlink-station"
        );

        delete button.dataset.stationUrl;
        delete button.dataset.trackName;
        delete button.dataset.trackUrl;
        delete button.dataset.artistName;
        delete button.dataset.artistUrl;
        delete button.dataset.youtubeId;
        delete button.dataset.youtubeUrl;
        delete button.dataset.playlinkAffiliate;
        delete button.dataset.analyticsAction;
        delete button.dataset.analyticsLabel;


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

        button.innerHTML = `
<span class="spotify-custom-button" title="Play on Spotify">
${SPOTIFY_ICON}
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


                return stationPartsToInfo(parts);

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


                return stationPartsToInfo(parts);

            }
        }

    ];


    function stationPartsToInfo(parts){


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



    function replaceSimilarArtistCards(){

        // Last.fm doesn't render play buttons on similar-artist cards
        // (neither in the artist-page grid nor in the sidebar), so we
        // create one from scratch and overlay it on the avatar.

        const cards =
            document.querySelectorAll(
                ".catalogue-overview-similar-artists-item-wrap:not([data-spotify-replaced])," +
                ".artist-similar-artists-sidebar-item-wrap:not([data-spotify-replaced])"
            );


        cards.forEach(card => {

            card.dataset.spotifyReplaced = "true";


            const nameLink =
                card.querySelector(".link-block-target");

            if(!nameLink) return;


            let pathname;
            try {
                pathname =
                    new URL(
                        nameLink.getAttribute("href") || nameLink.href,
                        location.origin
                    ).pathname;
            } catch (_){
                return;
            }


            const parts = parseMusicPath(pathname);

            // Artist-only link (no album/track segment).
            if(!parts || parts.second || parts.third) return;


            const avatar =
                card.querySelector(
                    ".catalogue-overview-similar-artists-item-image," +
                    ".artist-similar-artists-sidebar-item-image"
                );

            if(!avatar) return;


            const button = document.createElement("button");
            button.type = "button";
            button.className = "spotify-similar-artist-button";
            button.setAttribute("aria-label", `Play ${parts.artist} on Spotify`);

            avatar.appendChild(button);


            attachSpotifyBehavior(
                button,
                "artist",
                parts.artist,
                null,
                "play"
            );

        });

    }



    function shouldSkipCurrentPage(){

        const cfg  = getConfig();
        const path = location.pathname;

        if (/^\/user\/[^/]+\/library/.test(path)) {
            return cfg.skipLibraryPages ? "library" : null;
        }

        const parts = parseMusicPath(path);
        if (parts) {
            if (!parts.second) return cfg.skipArtistPages ? "artist" : null;
            if (!parts.third)  return cfg.skipAlbumPages  ? "album"  : null;
        }

        return null;

    }



    function replaceButtons(){

        const skipReason = shouldSkipCurrentPage();
        if (skipReason) {
            log(`skipping injection (${skipReason} pages disabled in settings)`);
            return;
        }

        replaceTrackButtons();
        replaceStationButtons();
        replaceSimilarArtistCards();

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
