    // ---------- merged recs (both surfaces) ----------

    // Union of /home/tracks (masonry, has in-DOM scrobble text) and
    // /music/+recommended/tracks (paginated, no scrobble metadata).
    // Both go through the shared scrobble-set filter so overlap and
    // long-tail scrobbles are stripped.

    async function collectMergedRecs(cap, scrobbleSet){


        const seen      = new Set();
        const collected = [];


        // Source A: /home/tracks (or live doc if we're on it)
        const startDoc =
            document.querySelector(".recs-feed-item--track")
                ? document
                : await fetchDoc(RECS_TRACKS_PAGE_PATH);

        if(startDoc){
            const items = filterUnscrobbled(
                collectRecsTracksFromDoc(startDoc, seen),
                scrobbleSet
            );
            collected.push(...items);
        }

        if(collected.length >= cap)
            return collected.slice(0, cap);


        // Source B: /music/+recommended/tracks, walk pagination.
        let path = "/music/+recommended/tracks";

        while(path && collected.length < cap){

            const doc = await fetchDoc(path);
            if(!doc) break;

            const items = filterUnscrobbled(
                collectRecommendedItemsFromDoc(doc, seen),
                scrobbleSet
            );
            collected.push(...items);

            path = findNextPageHref(doc);

        }


        return collected.slice(0, cap);

    }


