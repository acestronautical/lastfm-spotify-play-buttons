    // ---------- merged recs (both surfaces) ----------

    // Union of /home/tracks (masonry, has in-DOM scrobble text) and
    // /music/+recommended/tracks (paginated, no scrobble metadata).
    // Both go through the shared scrobble-set filter so overlap and
    // long-tail scrobbles are stripped.

    // Overfetch factor: gather this many × the batch size as a candidate
    // pool before shuffling down to the batch, for discovery variety.
    const REC_POOL_FACTOR = 3;


    async function collectMergedRecs(cap, scrobbleSet, topArtists){


        // Collect a pool several times larger than the batch, then
        // shuffle and slice — so repeat runs surface different tracks
        // instead of always the same top-N in Last.fm's page order.
        const poolTarget = cap * REC_POOL_FACTOR;

        const seen      = new Set();
        const collected = [];


        // Source A: /home/tracks (or live doc if we're on it)
        const startDoc =
            document.querySelector(".recs-feed-item--track")
                ? document
                : await fetchDoc(RECS_TRACKS_PAGE_PATH);

        // scrobbleSet may be a promise so the history fetch overlaps
        // the recs fetch above; resolve it now that we need to filter.
        scrobbleSet = await scrobbleSet;

        if(startDoc){
            const items = filterUnscrobbled(
                collectRecsTracksFromDoc(startDoc, seen),
                scrobbleSet
            );
            collected.push(...items);
        }


        // Source B: /music/+recommended/tracks, walk pagination until
        // the pool is big enough to shuffle over.
        let path = "/music/+recommended/tracks";

        while(path && collected.length < poolTarget){

            const doc = await fetchDoc(path);
            if(!doc) break;

            const items = filterUnscrobbled(
                collectRecommendedItemsFromDoc(doc, seen),
                scrobbleSet
            );
            collected.push(...items);

            path = findNextPageHref(doc);

        }


        // Rank the pool by taste affinity (own/seed artists the user
        // loves) with a per-artist cap, keeping randomness for variety.
        return rankAndSelect(collected, cap, await topArtists);

    }


