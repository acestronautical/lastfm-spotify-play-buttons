    // ---------- main ----------

    // Find the result row for the current page/route and perform the
    // action. Returns success. Used for both the initial page load and
    // each subsequent SPA hop.
    async function processCurrentItem(){

        let row;

        try {
            row = await waitFor(findRow, TIMEOUT_MS);
        } catch (e) {
            log("No Spotify result found within", TIMEOUT_MS, "ms");
            return false;
        }

        switch(action){
            case "queue": return await doQueue(row);
            case "like":  return await doLike(row);
            case "play":
            default:      return doPlay(row);
        }

    }


    async function run(){


        const firstOk = await processCurrentItem();


        const batch = parseBatch();

        // Single item (or last of a reload chain): close on success.
        if(!batch || batch.length <= 1){
            finish(firstOk);
            return;
        }


        // Items still to process after the one this page loaded for.
        let remaining = batch.slice(1);


        // Try the SPA fast-path. If the router isn't reachable, hand
        // off to the full-reload hop chain (finish → navigateNext).
        const nav = findSpotifyNavigator();

        if(!nav){
            log("SPA navigator not found - using full-reload hops");
            finish(firstOk);
            return;
        }

        log("SPA navigator found - fast in-app hops");


        while(remaining.length){

            const next = remaining[0];

            await delay(SPA_HOP_DELAY_MS);

            const switched = await spaGotoSearch(nav, next);

            if(!switched){
                // SPA hop stalled — hand the rest to the reload chain.
                log("SPA hop stalled - falling back to reload");
                navigateNext(remaining);
                return;
            }

            entity = next.entity || "track";

            await processCurrentItem();

            remaining = remaining.slice(1);

        }


        // Whole batch handled in-page.
        closeHelper();

    }



    // Kick off after DOM has had a chance to settle.

    if(document.readyState === "loading"){

        document.addEventListener(
            "DOMContentLoaded",
            run,
            { once:true }
        );


    } else {

        run();

    }
