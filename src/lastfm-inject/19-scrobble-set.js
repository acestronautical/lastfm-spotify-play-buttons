    // ---------- scrobble-set filter ----------

    // Bounded snapshot of the user's scrobble history used to filter
    // rec-source results down to "new to me" tracks. Fetches page-1..3
    // of their all-time-top library and their recent scrobble history
    // — first is where duplicates are most likely (top-scrobbled),
    // second catches recently-listened but not necessarily top ones.
    // Long-tail one-off scrobbles from years ago will slip through;
    // that's an accepted trade-off for keeping this cheap.

    const SCROBBLE_SET_TTL_MS = 120000;
    const SCROBBLE_SET_PAGES  = 3;

    let scrobbleSetCache = null;


    async function getScrobbleSet(username){


        if(scrobbleSetCache &&
           scrobbleSetCache.username === username &&
           Date.now() - scrobbleSetCache.at < SCROBBLE_SET_TTL_MS){

            return scrobbleSetCache.set;

        }


        const set = new Set();

        const bases = [
            `/user/${encodeURIComponent(username)}/library/tracks`,
            `/user/${encodeURIComponent(username)}/library`,
        ];


        for(const base of bases){

            for(let page = 1; page <= SCROBBLE_SET_PAGES; page++){

                const url = page === 1 ? base : `${base}?page=${page}`;

                const doc = await fetchDoc(url);
                if(!doc) break;

                const tracks = extractChartlistTracks(doc);
                if(!tracks.length) break;

                for(const t of tracks) set.add(t.q.toLowerCase());

            }

        }


        scrobbleSetCache = { username, set, at:Date.now() };

        return set;

    }


    function filterUnscrobbled(tracks, scrobbleSet){
        return tracks.filter(t => !scrobbleSet.has(t.q.toLowerCase()));
    }


