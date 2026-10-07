    // ---------- scrobble-set filter ----------

    // Bounded snapshot of the user's scrobble history used to filter
    // rec-source results down to "new to me" tracks. Fetches page-1..3
    // of their all-time-top library and their recent scrobble history
    // — first is where duplicates are most likely (top-scrobbled),
    // second catches recently-listened but not necessarily top ones.
    // Long-tail one-off scrobbles from years ago will slip through;
    // that's an accepted trade-off for keeping this cheap.

    const SCROBBLE_SET_TTL_MS = 600000;
    const SCROBBLE_SET_PAGES  = 3;

    let scrobbleSetCache = null;

    // Shared in-flight promise so a prefetch (menu open) and the actual
    // action don't both kick off the full fetch storm — the second call
    // rides the first.
    let scrobbleSetInflight = null;


    async function getScrobbleSet(username){


        if(scrobbleSetCache &&
           scrobbleSetCache.username === username &&
           Date.now() - scrobbleSetCache.at < SCROBBLE_SET_TTL_MS){

            return scrobbleSetCache.set;

        }


        if(scrobbleSetInflight &&
           scrobbleSetInflight.username === username){

            return scrobbleSetInflight.promise;

        }


        const promise = (async () => {

            const set = new Set();

            const bases = [
                `/user/${encodeURIComponent(username)}/library/tracks`,
                `/user/${encodeURIComponent(username)}/library`,
            ];


            // Fetch every page across both bases in parallel — these are
            // independent reads, and serializing them made "Loading your
            // history" take ~2x longer (≈6.7s → ≈3.5s on a large library).
            const urls = [];

            for(const base of bases)
                for(let page = 1; page <= SCROBBLE_SET_PAGES; page++)
                    urls.push(page === 1 ? base : `${base}?page=${page}`);


            const docs = await Promise.all(urls.map(u => fetchDoc(u)));

            for(const doc of docs){

                if(!doc) continue;

                for(const t of extractChartlistTracks(doc))
                    set.add(t.q.toLowerCase());

            }


            scrobbleSetCache = { username, set, at:Date.now() };

            return set;

        })();


        scrobbleSetInflight = { username, promise };

        try {
            return await promise;
        } finally {
            scrobbleSetInflight = null;
        }

    }


    // Fire-and-forget warm, safe to call on menu open so the history is
    // ready (cached) by the time the user picks an action.
    function warmScrobbleSet(){
        const me = getCurrentUsername();
        if(me) getScrobbleSet(me).catch(()=>{});
    }


    function filterUnscrobbled(tracks, scrobbleSet){
        return tracks.filter(t => !scrobbleSet.has(t.q.toLowerCase()));
    }


