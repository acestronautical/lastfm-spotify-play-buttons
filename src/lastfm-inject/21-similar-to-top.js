    // ---------- similar to top tracks ----------

    // Grab the user's top ~10 tracks, then in parallel fetch each
    // track's page and extract its "Similar Tracks" section (embedded
    // on the track page under .track-similar-tracks-item-wrap). Filters
    // out both the seeds themselves and anything already in the
    // scrobble set.

    const SIMILAR_SEEDS = 10;


    // Extract tracks from the "Similar Tracks" grid embedded on a
    // track page. Same conceptual shape as the /music/+recommended
    // and /home/tracks extractors — different item class.

    function collectTrackSimilarItemsFromDoc(doc, seen){


        const results = [];


        for(const item of doc.querySelectorAll(".track-similar-tracks-item-wrap")){


            const nameLink =
                item.querySelector(".track-similar-tracks-item-name a[href*='/music/']");

            if(!nameLink) continue;


            let pathname;

            try {
                pathname =
                    new URL(
                        nameLink.getAttribute("href"),
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


            results.push({ q, entity:"track", artist:info.artist, name:info.name });

        }


        return results;

    }


    async function collectSimilarToTopTracks(cap, scrobbleSet, username){


        const seedDoc =
            await fetchDoc(`/user/${encodeURIComponent(username)}/library/tracks`);

        if(!seedDoc) return [];


        const seeds =
            extractChartlistTracks(seedDoc).slice(0, SIMILAR_SEEDS);

        if(!seeds.length) return [];


        // Seed q-strings so similar-results that just re-surface a
        // seed are excluded.
        const seen = new Set(seeds.map(s => s.q));


        // Parallel fetch — 10 hops in serial would be ~5s, in parallel
        // ~500ms. Same-origin so no CORS. The track page itself hosts
        // the "Similar Tracks" section (typically 6 items).
        const similarDocs =
            await Promise.all(
                seeds.map(s =>
                    fetchDoc(
                        `/music/${encodeSeg(s.artist)}/_/${encodeSeg(s.name)}`
                    )
                )
            );


        const collected = [];


        for(const doc of similarDocs){

            if(collected.length >= cap) break;
            if(!doc) continue;

            const rows = collectTrackSimilarItemsFromDoc(doc, seen);

            for(const t of rows){
                if(collected.length >= cap) break;
                if(scrobbleSet.has(t.q.toLowerCase())) continue;
                collected.push({ q:t.q, entity:t.entity });
            }

        }


        return collected;

    }


