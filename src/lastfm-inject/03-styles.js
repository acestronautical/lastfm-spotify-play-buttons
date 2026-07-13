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
     - .image-overlay-playlink-link (chart thumbnails — native 32px fits)
     - .header-new-playlink      (album header pill — album pages
                                  carry BOTH classes, so exclude it
                                  here or the pill gets flipped into a
                                  60x60 absolute-positioned overlay) */
.desktop-playlink[data-spotify-replaced]:not(.recs-feed-playlink):not(.image-overlay-playlink-link):not(.header-new-playlink) {
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
    white-space:nowrap !important;
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


/* New Releases grid on /music. Many rows ship without Last.fm's own
   .music-releases-item-playlink (rows that instead have .js-link-block
   on their inner div); overlay a centered button on the cover for
   those. Rows that DO have a native playlink are already swapped by
   replaceStationButtons and picked up by the shared .desktop-playlink
   rule higher up, so we don't touch them here.

   Also hide the injected button until the card is hovered, to match
   Last.fm's own show-on-hover behaviour for the native playlink
   variant (otherwise our injected rows look busier than the swapped
   ones in the same grid). */
.music-releases-item-image {
    position:relative !important;
    --lfs-size:56px;
}
.music-releases-item-image .spotify-similar-artist-button {
    top:calc(50% - 28px) !important;
    left:calc(50% - 28px) !important;
    right:auto !important;
    bottom:auto !important;
    opacity:0;
    transition:opacity .12s ease;
}
.music-releases-item-wrap:hover .music-releases-item-image .spotify-similar-artist-button {
    opacity:1;
}


/* Album-page tracklist — the empty .chartlist-play cells get a
   compact inline Spotify button. Setting --lfs-size on the cell
   applies to both our injected button and native
   .chartlist-play-button playlinks that replaceTrackButtons swapped.
   The second rule strips Last.fm's per-element sizing/padding/
   background-image so both variants render as identical
   28x28 transparent hosts around our SVG. */
.chartlist-play {
    --lfs-size:28px;
}
.chartlist-play [data-spotify-replaced] {
    width:var(--lfs-size, 28px) !important;
    height:var(--lfs-size, 28px) !important;
    padding:0 !important;
    margin:0 !important;
    min-width:0 !important;
    line-height:1 !important;
    background:transparent !important;
    background-image:none !important;
    border:0 !important;
    text-decoration:none !important;
    color:inherit !important;
}
.spotify-chartlist-play-button {
    display:inline-flex !important;
    align-items:center !important;
    cursor:pointer !important;
}


/* Album-page header — injected alongside Bookmark/More in the pill
   action row. Sized to sit comfortably next to the native pills. */
.spotify-album-header-button {
    display:inline-flex !important;
    align-items:center !important;
    background:transparent !important;
    border:0 !important;
    padding:0 !important;
    margin-right:8px !important;
    cursor:pointer !important;
    --lfs-size:40px;
    filter:drop-shadow(0 2px 6px rgba(0,0,0,.4));
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


/* Global hamburger menu injected right after .masthead-logo. Present
   on every Last.fm page.

   The parent .masthead-inner-wrap is display:flex with
   justify-content:space-between — two children (logo and nav
   cluster). Dropping a third item in the middle would spread them
   equally, so we use margin-right:auto to break the space-between
   layout: our wrap stays flush against the logo, and everything
   after it gets pushed to the right edge as before. */
.spotify-nav-menu-wrap {
    position:relative !important;
    display:inline-flex !important;
    align-items:center !important;
    margin-left:14px !important;
    margin-right:auto !important;
    vertical-align:middle !important;
}

/* The toggle button — 3-line icon stacked in the extension's
   red / white / green identity colours so it reads as "the Spotify
   ↔ Last.fm bridge" rather than a stock nav hamburger. Transparent
   by default; a subtle red→green gradient wash appears on hover. */
.spotify-nav-menu-toggle {
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    width:48px !important;
    height:48px !important;
    background:transparent !important;
    border:0 !important;
    padding:0 !important;
    margin:0 !important;
    border-radius:10px !important;
    cursor:pointer !important;
    transition:background .15s ease, transform .12s ease;
}
.spotify-nav-menu-toggle:hover,
.spotify-nav-menu-toggle[aria-expanded="true"] {
    background:linear-gradient(
        135deg,
        rgba(213, 16, 7, 0.22) 0%,
        rgba(29, 185, 84, 0.22) 100%
    ) !important;
}
.spotify-nav-menu-toggle:active {
    transform:scale(0.94);
}
.spotify-nav-menu-toggle svg {
    width:36px !important;
    height:36px !important;
    display:block !important;
}

/* One-shot attention pulse when the toggle first mounts on a page,
   so users notice the button exists. Removed by JS after the
   animation completes so hover/expanded states aren't fighting it. */
@keyframes spotify-nav-toggle-pulse {
    0%, 100% {
        background:transparent;
        transform:scale(1);
        box-shadow:0 0 0 0 rgba(29,185,84,0);
    }
    50% {
        background:linear-gradient(
            135deg,
            rgba(213, 16, 7, 0.55) 0%,
            rgba(29, 185, 84, 0.55) 100%
        );
        transform:scale(1.12);
        box-shadow:0 0 0 6px rgba(29,185,84,.15);
    }
}
.spotify-nav-menu-toggle--pulse {
    animation:spotify-nav-toggle-pulse 1.1s ease-in-out 2;
}

/* Dropdown panel. Shares the frosted-dark aesthetic with the
   existing per-button .spotify-menu so both feel like the same
   product surface. */
.spotify-nav-menu {
    position:absolute !important;
    top:calc(100% + 6px) !important;
    left:0 !important;
    min-width:240px !important;
    padding:6px !important;
    background:rgba(30,30,30,.92) !important;
    backdrop-filter:blur(18px) saturate(160%);
    -webkit-backdrop-filter:blur(18px) saturate(160%);
    border:1px solid rgba(255,255,255,.12) !important;
    border-radius:10px !important;
    box-shadow:
        0 12px 32px rgba(0,0,0,.5),
        0 2px 6px rgba(0,0,0,.3);
    z-index:2147483646 !important;
    font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif !important;
    font-size:13px !important;
    color:#eee !important;
    opacity:0;
    transform:translateY(-4px);
    pointer-events:none;
    transition:opacity .12s ease, transform .12s ease;
}
.spotify-nav-menu[data-open="true"] {
    opacity:1;
    transform:translateY(0);
    pointer-events:auto;
}

/* Menu items — buttons and anchors share styling. */
.spotify-nav-menu-item {
    display:flex !important;
    align-items:center !important;
    gap:12px !important;
    width:100% !important;
    padding:9px 12px !important;
    background:transparent !important;
    border:0 !important;
    border-radius:6px !important;
    cursor:pointer !important;
    color:#eee !important;
    font:inherit !important;
    font-weight:500 !important;
    text-align:left !important;
    text-decoration:none !important;
    white-space:nowrap !important;
    transition:background .1s ease, color .1s ease;
}
.spotify-nav-menu-item:hover,
.spotify-nav-menu-item:focus-visible {
    background:rgba(29,185,84,.16) !important;
    color:#1DB954 !important;
    outline:0 !important;
}
.spotify-nav-menu-item[disabled],
.spotify-nav-menu-item[aria-disabled="true"] {
    opacity:.55 !important;
    cursor:default !important;
    background:transparent !important;
    color:#eee !important;
}
.spotify-nav-menu-icon {
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    width:20px !important;
    height:20px !important;
    flex-shrink:0 !important;
    color:currentColor !important;
}
.spotify-nav-menu-icon svg {
    width:20px !important;
    height:20px !important;
    display:block !important;
    fill:currentColor !important;
}
.spotify-nav-menu-divider {
    height:1px !important;
    margin:4px 6px !important;
    background:rgba(255,255,255,.1) !important;
}

/* Inline status line under an item (e.g. "Loading recommendations…"). */
.spotify-nav-menu-status {
    padding:2px 12px 8px 44px !important;
    color:#aaa !important;
    font-size:12px !important;
    font-style:italic !important;
}


/* Small pill buttons injected next to a user profile's section
   headers ("Recent Tracks", "Top Tracks"). Sits inline with the
   <h2>; sized down so it doesn't dominate the header. Fetches
   whatever URL the header's anchor points at, respecting any
   time-range filter Last.fm is currently showing. */
.spotify-user-queue-pill {
    margin-left:12px !important;
    vertical-align:middle !important;
}
.spotify-user-queue-button {
    display:inline-flex !important;
    align-items:center !important;
    gap:6px !important;
    background:#1DB954 !important;
    border:0 !important;
    padding:3px 10px 3px 4px !important;
    margin:0 !important;
    border-radius:999px !important;
    cursor:pointer !important;
    color:#fff !important;
    font-family:inherit !important;
    font-weight:700 !important;
    font-size:10px !important;
    line-height:1 !important;
    letter-spacing:.8px !important;
    text-transform:uppercase !important;
    white-space:nowrap !important;
    transition:background .12s ease, transform .12s ease;
}
.spotify-user-queue-button:hover {
    background:#25e46b !important;
    transform:scale(1.04);
}
.spotify-user-queue-button[aria-disabled="true"],
.spotify-user-queue-button[disabled] {
    opacity:.65 !important;
    cursor:default !important;
    transform:none !important;
}
.spotify-user-queue-icon {
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    width:18px !important;
    height:18px !important;
    background:rgba(0,0,0,.22) !important;
    border-radius:50% !important;
    flex-shrink:0 !important;
}
.spotify-user-queue-icon svg {
    width:12px !important;
    height:12px !important;
    display:block !important;
}

`;

    document.head.appendChild(style);



