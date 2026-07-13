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



