    // ---------- utils ----------

    // Resolve when `check()` returns a truthy value, using a MutationObserver
    // over document.body. Rejects after `timeoutMs` if nothing matches.

    function waitFor(check, timeoutMs){

        return new Promise((resolve, reject)=>{


            const immediate = check();

            if(immediate){
                resolve(immediate);
                return;
            }


            const observer =
                new MutationObserver(()=>{

                    const v = check();

                    if(v){
                        observer.disconnect();
                        clearTimeout(timer);
                        resolve(v);
                    }

                });


            observer.observe(
                document.body,
                {
                    childList:true,
                    subtree:true,
                    attributes:true
                }
            );


            const timer =
                setTimeout(()=>{

                    observer.disconnect();

                    reject(
                        new Error("timeout")
                    );

                }, timeoutMs);

        });

    }



    function closeHelper(){

        if (!getConfig().autoClose) {
            log("autoClose disabled — leaving helper tab open");
            return;
        }

        setTimeout(()=>{

            // Extension path: window.close() is blocked on tabs opened
            // via chrome.tabs.create (the browser only allows close on
            // windows opened by window.open()). Route through the
            // service worker's chrome.tabs.remove instead.
            //
            // Under Tampermonkey chrome.runtime.id is undefined and we
            // fall back to window.close(), which works because
            // GM_openInTab establishes a real opener relationship.

            if (typeof chrome !== "undefined" &&
                chrome.runtime &&
                chrome.runtime.id) {

                chrome.runtime.sendMessage({ type: "closeTab" });
                return;

            }

            window.close();

        }, CLOSE_MS);

    }


    // Batch mode: the Last.fm side can queue multiple items into a
    // single helper tab by encoding a JSON array of {q, entity} pairs
    // in the ?batch= param. After each successful (or failed) action
    // we navigate the same tab to the next item's search URL instead
    // of closing, and only close when the batch is exhausted.

    function parseBatch(){

        const raw = params.get("batch");

        if(!raw) return null;


        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch (_) {
            return null;
        }

    }


    function navigateNext(remaining){

        const next = remaining[0];

        const nextParams = new URLSearchParams();

        nextParams.set("lastfm", "true");
        nextParams.set("action",  action);
        nextParams.set("entity",  next.entity || "track");
        nextParams.set("batch",   JSON.stringify(remaining));


        setTimeout(()=>{

            window.location.href =
                "/search/" +
                encodeURIComponent(next.q) +
                "?" + nextParams.toString();

        }, CLOSE_MS);

    }


    // Called once at the end of run(). In batch mode, advances to the
    // next item (even on failure — one flaky track shouldn't stall the
    // whole batch). In single mode, closes on success and leaves the
    // tab open on failure (visible signal that something went wrong).

    function finish(success){

        const batch = parseBatch();

        if(batch && batch.length > 1){
            navigateNext(batch.slice(1));
            return;
        }

        if(success)
            closeHelper();

    }



    // Try each strategy in order until one returns a truthy value.
    // Only logs when we fall past the primary strategy — that's the
    // signal that Spotify has changed something and the top selector
    // may need updating.

    function resolveWith(label, strategies, ...args){


        for(let i = 0; i < strategies.length; i++){

            const { name, run } = strategies[i];


            let result;

            try {
                result = run(...args);
            } catch (e) {
                log(`${label} strategy "${name}" threw:`, e);
                continue;
            }


            if(result){

                if(i > 0)
                    log(`${label} matched via fallback "${name}"`);

                return result;

            }

        }


        log(`${label}: no strategy matched`);

        return null;

    }



