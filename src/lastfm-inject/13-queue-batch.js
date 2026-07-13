        if(!isFinite(n) || n < 1) return CONFIG_DEFAULTS.queueLimit || 10;
        return Math.min(Math.max(1, Math.floor(n)), QUEUE_BATCH_HARD_CAP);
    }


    // Scan a Document (either the live one or an off-screen parsed
    // page-N HTML) and return every recs-feed-item--track the user
    // hasn't already scrobbled. Last.fm renders "You have scrobbled
    // this track N times" inside the card's .context block for tracks
    // with any scrobble history; unscrobbled tracks get "Similar to
    // X, Y and Z" instead. DOM text as the filter — no API/OAuth work.
    //
    // `seen` is a shared Set the caller passes when merging across
    // pages so duplicates across page N and N+1 fold together.

    function collectRecsTracksFromDoc(doc, seen){


        const results = [];


        for(const item of doc.querySelectorAll(".recs-feed-item--track")){


            const ctx = item.querySelector(".context");

            if(ctx && /scrobbled this track/i.test(ctx.textContent || ""))
                continue;


            const titleLink =
                item.querySelector(".recs-feed-title a[href]");

            if(!titleLink) continue;


            let pathname;

            try {
                pathname =
                    new URL(
                        titleLink.getAttribute("href"),
                        location.origin
                    ).pathname;
            } catch (_) {
                continue;
            }


            const parts = parseMusicPath(pathname);
            if(!parts) continue;


            const info = musicPartsToInfo(parts);
            if(info.entity !== "track") continue;


            const q = `${info.artist} ${info.name}`;

            if(seen.has(q)) continue;

            seen.add(q);


            results.push({ q, entity:"track" });

        }


        return results;

    }


    // Locate Last.fm's classic paginator's "Next" href, if any. Present
    // on /music/+recommended/{tracks,albums,artists}?page=N; absent on
    // the masonry-layout /home and /home/{tracks,albums,artists} pages
    // where all items ship in the initial render.

    function findNextPageHref(doc){


        const link =
            doc.querySelector(
                "li.pagination-next a[href], " +
                ".pagination-next a[href], " +
                "[data-pagination-next-link] a[href]"
            );


        return link ? link.getAttribute("href") : null;

    }


    // Inject / mount the global hamburger menu next to .masthead-logo.
    // Runs on every Last.fm page. Menu items work from anywhere —
    // recommendations fetch /home/tracks when we're off a recs page,
    // neighbour queue fetches /user/{me}/neighbours first.

