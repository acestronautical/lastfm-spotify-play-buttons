    const NAV_MENU_HAMBURGER_SVG = `
<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
<path d="M2 5h16"  stroke="#D51007" stroke-width="2.6" stroke-linecap="round"/>
<path d="M2 10h16" stroke="#fff"    stroke-width="2.6" stroke-linecap="round"/>
<path d="M2 15h16" stroke="#1DB954" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

    const NAV_MENU_ITEM_ICONS = {

        queueRecs: `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<path d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75zm0 4A.75.75 0 0 1 2.75 7h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.75zm.75 3.25a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5zM12 11v-1.5h1.5V11H15v1.5h-1.5V14H12v-1.5h-1.5V11z"/>
</svg>`,

        // Sparkle / four-pointed star — "similar to what I love".
        queueSimilar: `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<path d="M8 1.2l1.6 4.2 4.2 1.6-4.2 1.6L8 12.8 6.4 8.6 2.2 7l4.2-1.6z" fill="currentColor"/>
<path d="M13 11l.5 1.5L15 13l-1.5.5L13 15l-.5-1.5L11 13l1.5-.5z" fill="currentColor" opacity=".6"/>
</svg>`,

        queueNeighbour: `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<circle cx="5.5" cy="5" r="2.4" fill="currentColor"/>
<path d="M1.5 13c0-2 1.8-3.4 4-3.4s4 1.4 4 3.4z" fill="currentColor"/>
<circle cx="12" cy="4.2" r="1.6" fill="currentColor" opacity=".55"/>
<path d="M9.5 9.6c0-1.3 1.1-2.2 2.5-2.2s2.5.9 2.5 2.2z" fill="currentColor" opacity=".55"/>
</svg>`,

        // Three-person cluster — "mix from multiple neighbours".
        neighbourMix: `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<circle cx="8" cy="4.4" r="2" fill="currentColor"/>
<path d="M4.4 12c0-1.8 1.6-3 3.6-3s3.6 1.2 3.6 3z" fill="currentColor"/>
<circle cx="2.8" cy="6.2" r="1.4" fill="currentColor" opacity=".55"/>
<circle cx="13.2" cy="6.2" r="1.4" fill="currentColor" opacity=".55"/>
<path d="M0.4 12.6c0-1.3 1.1-2.1 2.4-2.1.5 0 1 .1 1.4.3" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>
<path d="M15.6 12.6c0-1.3-1.1-2.1-2.4-2.1-.5 0-1 .1-1.4.3" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>
</svg>`,

    };


    const RECS_TRACKS_PAGE_PATH = "/home/tracks";


    // Cached DOM refs, populated lazily by injectNavMenu.
    let navMenuState = null;


    function injectNavMenu(){


        if(document.getElementById("spotify-nav-menu-wrap")) return;


        const logo = document.querySelector(".masthead-logo");

        if(!logo || !logo.parentElement) return;


        const wrap = document.createElement("div");

        wrap.id        = "spotify-nav-menu-wrap";
        wrap.className = "spotify-nav-menu-wrap";

        wrap.innerHTML = `
<button type="button"
        class="spotify-nav-menu-toggle"
        aria-label="Spotify tools"
        aria-haspopup="menu"
        aria-expanded="false">
${NAV_MENU_HAMBURGER_SVG}
</button>
<div class="spotify-nav-menu" role="menu" data-open="false">
<button type="button" role="menuitem" class="spotify-nav-menu-item" data-action="queue-recs">
<span class="spotify-nav-menu-icon">${NAV_MENU_ITEM_ICONS.queueRecs}</span>
<span class="spotify-nav-menu-label">Queue recommended tracks</span>
</button>
<div class="spotify-nav-menu-status" data-status-for="queue-recs" hidden></div>
<button type="button" role="menuitem" class="spotify-nav-menu-item" data-action="queue-similar">
<span class="spotify-nav-menu-icon">${NAV_MENU_ITEM_ICONS.queueSimilar}</span>
<span class="spotify-nav-menu-label">Queue similar to your top tracks</span>
</button>
<div class="spotify-nav-menu-status" data-status-for="queue-similar" hidden></div>
<button type="button" role="menuitem" class="spotify-nav-menu-item" data-action="queue-neighbour-mix">
<span class="spotify-nav-menu-icon">${NAV_MENU_ITEM_ICONS.neighbourMix}</span>
<span class="spotify-nav-menu-label">Queue random neighbour tracks</span>
</button>
<div class="spotify-nav-menu-status" data-status-for="queue-neighbour-mix" hidden></div>
<button type="button" role="menuitem" class="spotify-nav-menu-item" data-action="go-neighbour">
<span class="spotify-nav-menu-icon">${NAV_MENU_ITEM_ICONS.queueNeighbour}</span>
<span class="spotify-nav-menu-label">Go to a random neighbour</span>
</button>
<div class="spotify-nav-menu-status" data-status-for="go-neighbour" hidden></div>
</div>`;


        // Insert as a sibling immediately after .masthead-logo. The
        // wrap's CSS `margin-right:auto` overrides the parent's
        // `justify-content:space-between` so the nav cluster still
        // gets pushed to the right edge — the wrap just "steals" the
        // space-between gap and holds it, keeping itself glued to
        // the logo without repositioning anything else.
        logo.parentElement.insertBefore(wrap, logo.nextSibling);


        const toggle = wrap.querySelector(".spotify-nav-menu-toggle");
        const menu   = wrap.querySelector(".spotify-nav-menu");


        navMenuState = { wrap, toggle, menu };


        // One-shot attention pulse on first mount — draws the eye to
        // the button on page load. Removed after ~2.5s so hover and
        // expanded states aren't fighting the animation.
        toggle.classList.add("spotify-nav-menu-toggle--pulse");
        setTimeout(
            ()=> toggle.classList.remove("spotify-nav-menu-toggle--pulse"),
            2500
        );


        toggle.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            const open = menu.getAttribute("data-open") === "true";
            setNavMenuOpen(!open);
        });


        // Dismiss on outside click / Escape.
        document.addEventListener("click", e => {
            if(menu.getAttribute("data-open") !== "true") return;
            if(!wrap.contains(e.target)) setNavMenuOpen(false);
        });

        document.addEventListener("keydown", e => {
            if(e.key === "Escape" &&
               menu.getAttribute("data-open") === "true")
                setNavMenuOpen(false);
        });


        // Wire menu-item actions.
        wrap.querySelector('[data-action="queue-recs"]')
            .addEventListener("click", onMenuQueueRecs);

        wrap.querySelector('[data-action="queue-similar"]')
            .addEventListener("click", onMenuQueueSimilar);

        wrap.querySelector('[data-action="queue-neighbour-mix"]')
            .addEventListener("click", onMenuQueueNeighbourMix);

        wrap.querySelector('[data-action="go-neighbour"]')
            .addEventListener("click", onMenuGoToNeighbour);

    }


    function setNavMenuOpen(open){
