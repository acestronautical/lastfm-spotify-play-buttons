    // ---------- shared helpers for menu actions ----------

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


