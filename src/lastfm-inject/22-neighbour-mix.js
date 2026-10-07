    // ---------- neighbour mix ----------

    // Pick a few neighbours at random from the top of the similarity
    // list, pull each one's top + recent tracks in parallel, shuffle
    // each list, and round-robin merge into a "mix" that's less
    // dominated by any single neighbour's library — and varies run to
    // run instead of always the same top neighbours.

    const NEIGHBOUR_MIX_COUNT = 3;
    const NEIGHBOUR_MIX_POOL  = 12;


    async function collectNeighbourMix(cap, scrobbleSet, username){


        const neighboursDoc =
            await fetchDoc(`/user/${encodeURIComponent(username)}/neighbours`);

        if(!neighboursDoc) return { tracks:[], neighbours:[] };


        const neighbours =
            extractNeighbourUsernames(neighboursDoc, username);

        if(!neighbours.length) return { tracks:[], neighbours:[] };


        // Sample from the most-similar slice so picks stay relevant but
        // differ each run.
        const picked =
            sampleN(neighbours.slice(0, NEIGHBOUR_MIX_POOL), NEIGHBOUR_MIX_COUNT);


        // For each picked neighbour, fetch top + recent in parallel.
        const perNeighbour =
            await Promise.all(
                picked.map(async n => {

                    const [topDoc, recentDoc] = await Promise.all([
                        fetchDoc(`/user/${encodeURIComponent(n)}/library/tracks`),
                        fetchDoc(`/user/${encodeURIComponent(n)}/library`),
                    ]);


                    const combined = [];

                    if(topDoc)    combined.push(...extractChartlistTracks(topDoc));
                    if(recentDoc) combined.push(...extractChartlistTracks(recentDoc));


                    return shuffleInPlace(combined);

                })
            );

        // scrobbleSet may be a promise so the history fetch overlaps
        // the neighbour fetches above; resolve it before filtering.
        scrobbleSet = await scrobbleSet;


        // Pool all unscrobbled neighbour tracks, then rank with a
        // per-artist cap only — no top-artist weighting, since this
        // action is about discovering what similar listeners play
        // rather than echoing the user's own favourites.
        const seen = new Set();
        const pool = [];

        for(const list of perNeighbour){
            for(const t of list){
                if(seen.has(t.q)) continue;
                if(scrobbleSet.has(t.q.toLowerCase())) continue;
                seen.add(t.q);
                pool.push({ q:t.q, entity:t.entity, artist:t.artist });
            }
        }


        const collected = rankAndSelect(pool, cap, null);


        return { tracks:collected, neighbours:picked };

    }



