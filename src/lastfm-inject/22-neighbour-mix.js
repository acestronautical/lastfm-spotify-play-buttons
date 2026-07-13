    // ---------- neighbour mix ----------

    // Pick a few top neighbours, pull each one's top + recent tracks
    // in parallel, shuffle each list, and round-robin merge into a
    // "mix" that's less dominated by any single neighbour's library.

    const NEIGHBOUR_MIX_COUNT = 3;

    function shuffleInPlace(arr){
        for(let i = arr.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }


    async function collectNeighbourMix(cap, scrobbleSet, username){


        const neighboursDoc =
            await fetchDoc(`/user/${encodeURIComponent(username)}/neighbours`);

        if(!neighboursDoc) return { tracks:[], neighbours:[] };


        const neighbours =
            extractNeighbourUsernames(neighboursDoc, username);

        if(!neighbours.length) return { tracks:[], neighbours:[] };


        const picked = neighbours.slice(0, NEIGHBOUR_MIX_COUNT);


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


        // Round-robin merge for a balanced mix.
        const seen      = new Set();
        const collected = [];


        while(collected.length < cap){

            let advanced = false;

            for(const list of perNeighbour){

                if(collected.length >= cap) break;

                while(list.length){

                    const t = list.shift();

                    if(seen.has(t.q)) continue;
                    if(scrobbleSet.has(t.q.toLowerCase())) continue;

                    seen.add(t.q);
                    collected.push({ q:t.q, entity:t.entity });
                    advanced = true;
                    break;

                }

            }

            if(!advanced) break;

        }


        return { tracks:collected, neighbours:picked };

    }



