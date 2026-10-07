    // ---------- shared helpers for menu actions ----------

    // Fisher–Yates shuffle (unbiased). shuffle() returns a new array;
    // shuffleInPlace() mutates. Used to randomise candidate pools so
    // the discovery actions surface different picks on repeat runs.
    function shuffle(arr){
        const a = arr.slice();
        for(let i = a.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function shuffleInPlace(arr){
        for(let i = arr.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Random sample of up to n items without replacement.
    function sampleN(arr, n){
        return shuffle(arr).slice(0, n);
    }


    // ---------- discovery ranking ----------

    // Max tracks from any one artist in a batch, so the queue spans a
    // range of artists rather than being dominated by a single one.
    const MAX_PER_ARTIST = 2;

    // Map the user's "Recommendation style" (0 familiar … 100 adventurous)
    // to scoring weights: familiar → strongly favour loved artists,
    // adventurous → treat everything equally (pure discovery).
    function discoveryWeights(){
        const raw = Number(getConfig().discovery);
        const d = isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;
        const ownW = Math.max(0, Math.min(4, Math.round((100 - d) / 25)));
        return { ownW, seedW: Math.round(ownW / 2) };
    }

    function configMaxPerArtist(){
        const n = Number(getConfig().maxPerArtist);
        return (isFinite(n) && n >= 1) ? Math.floor(n) : MAX_PER_ARTIST;
    }

    // Parse a recs-feed "Similar to X, Y and Z" context into lowercased
    // seed artist names — the user artists that led to this rec.
    function parseSimilarSeeds(contextText){
        if(!contextText) return [];
        const m = contextText.match(/similar to\s+(.+)/i);
        if(!m) return [];
        return m[1]
            .split(/,|\band\b/)
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);
    }

    // Discovery score: higher = better taste match and (for unscrobbled
    // tracks) more likely genuinely new to the user. Weights come from
    // the user's "Recommendation style" setting.
    function scoreCandidate(t, topArtists){
        const { ownW, seedW } = discoveryWeights();
        let s = 1; // base so every candidate keeps a chance
        const artist = (t.artist || "").toLowerCase();
        if(artist && topArtists && topArtists.has(artist)) s += ownW;
        if(t.seeds && topArtists)
            for(const seed of t.seeds)
                if(topArtists.has(seed)) s += seedW;
        if(t.corroboration) s += (t.corroboration - 1);
        return s;
    }

    // Weighted-random selection without replacement, capped per artist.
    // Weighting biases toward taste (score) while the randomness keeps
    // results varied across runs and the cap keeps the batch broad.
    function rankAndSelect(candidates, cap, topArtists, maxPerArtist){

        const limit = maxPerArtist || configMaxPerArtist();

        const pool = candidates.map(c => ({
            c,
            w: scoreCandidate(c, topArtists)
        }));

        const picked    = [];
        const perArtist = new Map();

        while(picked.length < cap && pool.length){

            const total = pool.reduce((a, p) => a + p.w, 0);

            let r = Math.random() * total;
            let idx = 0;
            for(; idx < pool.length - 1; idx++){
                r -= pool[idx].w;
                if(r <= 0) break;
            }

            const [chosen] = pool.splice(idx, 1);

            const artist = (chosen.c.artist || "").toLowerCase();
            if(artist && limit){
                const n = perArtist.get(artist) || 0;
                if(n >= limit) continue; // over the per-artist cap — drop
                perArtist.set(artist, n + 1);
            }

            picked.push(chosen.c);

        }

        return picked;

    }


    async function fetchDoc(pathOrHref){

        try {

            const res = await fetch(
                new URL(pathOrHref, location.origin).toString(),
                { credentials:"same-origin" }
            );

            if(!res.ok) return null;

            const html = await res.text();

            return new DOMParser().parseFromString(html, "text/html");

        } catch (_) {
            return null;
        }

    }


    // Pull neighbour usernames out of /user/{me}/neighbours. Last.fm
    // renders neighbour cards with links to /user/{name}; filter to
    // just that pattern and exclude self.

    function extractNeighbourUsernames(doc, selfUsername){


        const usernames = new Set();


        for(const a of doc.querySelectorAll('a[href*="/user/"]')){


            let name;

            try {
                const path =
                    new URL(a.getAttribute("href"), location.origin).pathname;

                const m = path.match(/^\/user\/([^\/?#]+)\/?$/);

                if(!m) continue;

                name = decodeSeg(m[1]);

            } catch (_) {
                continue;
            }


            if(!name || name === selfUsername) continue;

            // Reject Last.fm meta segments (+bookmarks etc.) — the
            // pattern above already excludes trailing paths, but
            // usernames don't start with "+".
            if(name.startsWith("+")) continue;

            usernames.add(name);

        }


        return [...usernames];

    }


    // Pull artist+track pairs from a chartlist (used on user library
    // pages, album pages, artist top-tracks lists, weekly charts).

    function extractChartlistTracks(doc){


        const results = [];
        const seen    = new Set();


        for(const row of doc.querySelectorAll("tr.chartlist-row, .chartlist-row")){


            const nameLink =
                row.querySelector(".chartlist-name a[href*='/music/']");

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


    function getCurrentUsername(){


        // Multiple hooks — masthead dropdown link is most reliable
        // when logged in, avatar link works on the mobile layout.

        const link =
            document.querySelector(
                '.auth-dropdown-profile[href*="/user/"], ' +
                '.auth-avatar-mobile[href*="/user/"], ' +
                '.masthead-user-menu-toggle[href*="/user/"]'
            );


        if(!link) return null;


        try {

            const path =
                new URL(link.getAttribute("href"), location.origin).pathname;

            const m = path.match(/^\/user\/([^\/?#]+)/);

            return m ? decodeSeg(m[1]) : null;

        } catch (_) {
            return null;
        }

    }


    // Encode a decoded artist/track segment back into Last.fm's URL
    // shape. encodeURIComponent produces "%20" for spaces; Last.fm's
    // canonical URLs use "+" (see any anchor href on the site).

    function encodeSeg(s){
        return encodeURIComponent(s).replace(/%20/g, "+");
    }


    // Pull tracks from a paginated /music/+recommended/tracks page.
    // Different DOM shape from the /home/tracks masonry (this one uses
    // .recommended-tracks-item-wrap) and no scrobble metadata in-DOM,
    // so the scrobble filter has to come from a separate library scan.

    function collectRecommendedItemsFromDoc(doc, seen){


        const results = [];


        for(const item of doc.querySelectorAll(".recommended-tracks-item-wrap")){


            const nameLink =
                item.querySelector(".recommended-tracks-item-name a[href*='/music/']");

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


