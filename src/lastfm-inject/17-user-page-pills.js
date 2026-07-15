    // ---------- user-page pill: Queue top / recent tracks ----------

    const USER_QUEUE_ICONS = {

        // Ascending bar chart — "top tracks".
        top: `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<rect x="1.5" y="10" width="3" height="4.5" rx="0.6"/>
<rect x="6.5" y="6"  width="3" height="8.5" rx="0.6"/>
<rect x="11.5" y="2" width="3" height="12.5" rx="0.6"/>
</svg>`,

        // Clock — "recent tracks".
        recent: `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none">
<circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4"/>
<path d="M8 4.5v4l2.8 1.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

        // Track list with a play triangle — "queue playlist".
        playlist: `
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor">
<rect x="1.5" y="3"    width="8" height="1.6" rx="0.6"/>
<rect x="1.5" y="6.5"  width="8" height="1.6" rx="0.6"/>
<rect x="1.5" y="10"   width="5" height="1.6" rx="0.6"/>
<path d="M11 5.6l4 2.4-4 2.4z"/>
</svg>`,

    };


    function injectUserPageQueueButtons(){


        // Only meaningful on user pages. The section headers we look
        // for are only rendered under /user/{name}/*.

        if(!/^\/user\/[^\/?#]+/.test(location.pathname)) return;


        // Recent Tracks section — h2 anchor points at /user/{name}/library.
        injectSectionQueuePill({
            headerSel: "#recent-tracks-section h2, section:has(> h2 > a[href*='/library']) > h2",
            iconSvg:   USER_QUEUE_ICONS.recent,
            label:     "Queue recent",
            urlFilter: href => /\/library\/?($|\?|#)/.test(href),
        });


        // Top Tracks section — h2 anchor points at /user/{name}/library/tracks.
        injectSectionQueuePill({
            headerSel: "#top-tracks h2",
            iconSvg:   USER_QUEUE_ICONS.top,
            label:     "Queue top",
            urlFilter: href => /\/library\/tracks/.test(href),
        });


        // Playlist detail page (/user/{name}/playlists/{id}) — inject
        // a "Queue playlist" pill inline with the ADD TRACK button so
        // clicking it queues everything currently rendered on the page
        // (already in the DOM, no extra fetch needed).
        injectPlaylistPageQueueButton();

    }


    function injectPlaylistPageQueueButton(){


        // Only on playlist-detail pages: /user/{name}/playlists/{id}
        // where {id} is a positive integer. The /playlists list page
        // is skipped.
        if(!/^\/user\/[^\/?#]+\/playlists\/\d+/.test(location.pathname))
            return;

        if(document.querySelector(".spotify-playlist-queue-pill")) return;


        // Anchor the pill to Last.fm's ADD TRACK button. Match by
        // visible text (case-insensitive) so we don't tie to a
        // specific class name that could change. Any element whose
        // stripped text is exactly "Add track" or "Add tracks" wins.
        let addTrack = null;

        for(const el of document.querySelectorAll("a, button")){

            const txt = (el.textContent || "").trim().toLowerCase();

            if(txt === "add track" || txt === "add tracks"){
                addTrack = el;
                break;
            }

        }

        if(!addTrack) return;


        const pill = document.createElement("button");

        pill.type      = "button";
        pill.className =
            "spotify-user-queue-button " +
            "spotify-user-queue-pill " +
            "spotify-playlist-queue-pill";

        pill.innerHTML = `
<span class="spotify-user-queue-icon">${USER_QUEUE_ICONS.playlist}</span>
<span>Queue playlist</span>`;

        pill.addEventListener("click", onClickQueuePlaylistPage);

        // Insert right before ADD TRACK so the two buttons sit
        // side-by-side in Last.fm's own action row.
        addTrack.insertAdjacentElement("beforebegin", pill);

    }


    async function onClickQueuePlaylistPage(e){

        e.preventDefault();
        e.stopPropagation();


        const btn = e.currentTarget;

        if(btn.getAttribute("aria-disabled") === "true") return;


        const label = btn.querySelector("span:not(.spotify-user-queue-icon)");
        const originalText = label ? label.textContent : "";


        btn.setAttribute("aria-disabled", "true");


        // Playlist tracks are already rendered in the current DOM —
        // no fetchDoc needed. Extract, cap, batch-queue.
        const tracks =
            extractChartlistTracks(document).slice(0, queueBatchCap());


        if(!tracks.length){
            if(label) label.textContent = "No tracks";
            setTimeout(()=>{
                if(label) label.textContent = originalText;
                btn.removeAttribute("aria-disabled");
            }, 2000);
            return;
        }


        const url = makeSpotifyBatchUrl(tracks, "queue");

        if(label) label.textContent = `Queuing ${tracks.length}…`;

        log(`Queuing ${tracks.length} playlist track(s)`);

        openSpotify(url);


        setTimeout(()=>{
            if(label) label.textContent = originalText;
            btn.removeAttribute("aria-disabled");
        }, 2000);

    }


    // Attach a compact "Queue …" pill to a section's <h2>. The pill's
    // target URL is pulled from the section header's own <a> so the
    // fetch reflects whatever time-range filter Last.fm is currently
    // showing (Top Tracks defaults to LAST_7_DAYS; the anchor href
    // carries that ?date_preset param).

    function injectSectionQueuePill({ headerSel, iconSvg, label, urlFilter }){


        const header = document.querySelector(headerSel);

        if(!header) return;

        if(header.querySelector(".spotify-user-queue-pill")) return;


        const anchor = header.querySelector("a[href]");

        if(!anchor) return;


        let href = anchor.getAttribute("href");

        if(urlFilter && !urlFilter(href)) return;


        const pill = document.createElement("button");

        pill.type      = "button";
        pill.className = "spotify-user-queue-button spotify-user-queue-pill";

        pill.innerHTML = `
<span class="spotify-user-queue-icon">${iconSvg}</span>
<span>${label}</span>`;


        pill.addEventListener(
            "click",
            e => onClickQueueFromSection(e, href)
        );


        header.appendChild(pill);

    }


    async function onClickQueueFromSection(e, href){

        e.preventDefault();
        e.stopPropagation();


        const btn = e.currentTarget;

        if(btn.getAttribute("aria-disabled") === "true") return;


        const label = btn.querySelector("span:not(.spotify-user-queue-icon)");
        const originalText = label ? label.textContent : "";


        btn.setAttribute("aria-disabled", "true");
        if(label) label.textContent = "Loading…";


        let tracks = [];

        try {
            const doc = await fetchDoc(href);
            if(doc)
                tracks = extractChartlistTracks(doc).slice(0, queueBatchCap());
        } catch (err) {
            log("Queue from section failed:", err);
        }


        if(!tracks.length){
            if(label) label.textContent = "No tracks found";
            setTimeout(()=>{
                if(label) label.textContent = originalText;
                btn.removeAttribute("aria-disabled");
            }, 2000);
            return;
        }


        const url = makeSpotifyBatchUrl(tracks, "queue");

        if(label) label.textContent = `Queuing ${tracks.length}…`;

        log(`Queuing ${tracks.length} track(s) from ${href}`);

        openSpotify(url);


        setTimeout(()=>{
            if(label) label.textContent = originalText;
            btn.removeAttribute("aria-disabled");
        }, 2000);

    }



