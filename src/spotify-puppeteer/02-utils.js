    // ---------- utils ----------

    const delay = ms => new Promise(r => setTimeout(r, ms));


    // SPA navigation fast-path. Spotify's web player is a React-Router
    // app; reloading the whole page per batch item costs ~2.2s each,
    // while an in-app route change updates results in ~0.6s. We reach
    // the router's history object ("navigator") by walking the React
    // fiber tree for the NavigationContext value, then push new search
    // routes without a reload. Everything here is best-effort — any
    // failure falls back to full-reload navigation, so a Spotify
    // internals change degrades to the old (slower) behaviour rather
    // than breaking.

    let cachedNavigator; // undefined = not looked up yet, null = absent

    function findSpotifyNavigator(){

        if(cachedNavigator !== undefined) return cachedNavigator;

        cachedNavigator = null;

        try {

            let rootEl = null, fiberKey = null;

            for(const el of document.querySelectorAll("div, main, body")){
                const k = Object.keys(el).find(k =>
                    k.startsWith("__reactFiber$") ||
                    k.startsWith("__reactContainer$"));
                if(k){ rootEl = el; fiberKey = k; break; }
            }

            if(!rootEl) return null;


            const seen  = new Set();
            const stack = [rootEl[fiberKey]];
            let visited = 0;

            while(stack.length && visited < 20000){

                const f = stack.pop();
                visited++;

                if(!f || seen.has(f)) continue;
                seen.add(f);

                const v = f.memoizedProps && f.memoizedProps.value;

                if(v && typeof v === "object"){
                    if(v.navigator &&
                       typeof v.navigator.push === "function" &&
                       typeof v.navigator.createHref === "function"){
                        cachedNavigator = v.navigator;
                        break;
                    }
                    if(typeof v.push === "function" &&
                       typeof v.createHref === "function" &&
                       typeof v.listen === "function"){
                        cachedNavigator = v;
                        break;
                    }
                }

                if(f.child)   stack.push(f.child);
                if(f.sibling) stack.push(f.sibling);

            }

        } catch (_) {
            cachedNavigator = null;
        }

        return cachedNavigator;

    }


    // Signature of the current top result — used to detect when an
    // in-app search has actually re-rendered after a route push.
    function firstResultHref(){
        const root = mainRoot();
        const a = root.querySelector(
            'a[href*="/track/"], a[href*="/album/"], a[href*="/artist/"]'
        );
        return a ? a.getAttribute("href") : null;
    }


    // In the packaged extension the puppeteer runs in the isolated world
    // and can't read the React fiber, so a main-world agent
    // (spotify-spa-agent.js) does the route push for us. It signals
    // readiness and receives requests through shared-DOM attributes —
    // the only channel that crosses the world boundary. Under
    // Tampermonkey we're already in the main world and use the
    // navigator directly (agent absent).

    function spaAgentReady(){
        return document.documentElement.getAttribute("data-lfs-spa") === "ready";
    }

    function spaRequestViaAgent(path){
        document.documentElement.setAttribute("data-lfs-spa-goto", path);
        document.dispatchEvent(new Event("lfs-spa-nav"));
    }

    // SPA is usable if we can reach the navigator directly (main world)
    // or via the agent (isolated world).
    function spaAvailable(){
        return !!findSpotifyNavigator() || spaAgentReady();
    }

    // Give the main-world agent a moment to locate the router after a
    // fresh load before deciding to fall back to full-reload hops.
    async function waitSpaAvailable(ms){
        const t0 = Date.now();
        while(Date.now() - t0 < ms){
            if(spaAvailable()) return true;
            await delay(150);
        }
        return false;
    }


    // Push a new /search/{q} route (directly or via the agent) and wait
    // for the results to change. Returns false if neither channel is
    // available or results don't update in time, so the caller can fall
    // back to a reload.
    async function spaGotoSearch(item){

        const path   = "/search/" + encodeURIComponent(item.q);
        const before = firstResultHref();

        const direct = findSpotifyNavigator();

        if(direct){
            try { direct.push(path); } catch (_) { return false; }
        } else if(spaAgentReady()){
            spaRequestViaAgent(path);
        } else {
            return false;
        }

        const t0 = Date.now();

        while(Date.now() - t0 < SPA_NAV_TIMEOUT_MS){
            await delay(100);
            const href = firstResultHref();
            if(href && href !== before) return true;
        }

        return false;

    }


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



