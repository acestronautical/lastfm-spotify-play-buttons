    // ---------- new releases ----------

    // Fetches /music/+releases/out-now/recommended, extracts each
    // release (album/single), then fetches each release's album page
    // in parallel and picks the most-listened track from its
    // tracklist. Result is one representative track per release —
    // effectively a sampler of what's new that Last.fm thinks the
    // user will like.
    //
    // For singles the tracklist has one row, so we get the single
    // itself. For LPs we get the album's most popular track (usually
    // the first cut or the promo single).

    const NEW_RELEASES_PAGE_PATH = "/music/+releases/out-now/recommended";


    // Extract each release card from the /music/+releases page.
    // Returns { artist, album, q } — album is used to fetch the album
    // page, q is the fallback query if album-page fetch fails.

    function collectNewReleasesFromDoc(doc, seen){


        const results = [];


        for(const item of doc.querySelectorAll(".resource-list--release-list-item-wrap")){


            const nameLink =
                item.querySelector(".resource-list--release-list-item-name a[href*='/music/']");

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


            // /music/{artist}/{album} — parts.artist + parts.second.
            // Skip anything that doesn't have both segments.
            if(!parts.second) continue;


            const artist = parts.artist;
            const album  = parts.second;

            const key = `${artist}|${album}`;

            if(seen.has(key)) continue;

            seen.add(key);


            results.push({
                artist,
                album,
                url: `/music/${encodeSeg(artist)}/${encodeSeg(album)}`,
            });

        }


        return results;

    }


    // Given an album page's Document, return the tracklist row with
    // the highest listener count. Falls back to the first row if no
    // listener counts are readable (album is fresh, page shape drift,
    // whatever). Returns { artist, name, q } for the picked track.

    function pickTopTrackFromAlbumDoc(doc){


        let best      = null;
        let bestCount = -1;
        let first     = null;


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


            const entry = {
                artist: info.artist,
                name:   info.name,
                q:      `${info.artist} ${info.name}`,
            };


            if(!first) first = entry;


            // Listener count lives in .chartlist-count-bar-value's
            // text — "25 listeners" style. Grab the leading integer.
            const countEl =
                row.querySelector(".chartlist-count-bar-value");

            let count = 0;

            if(countEl){
                const m = (countEl.textContent || "").match(/[\d,]+/);
                if(m) count = parseInt(m[0].replace(/,/g, ""), 10) || 0;
            }


            if(count > bestCount){
                bestCount = count;
                best = entry;
            }

        }


        return best || first;

    }


    // Full orchestrator: fetch the releases page, extract releases,
    // fan out to album pages in parallel, pick top track per album,
    // filter unscrobbled, cap.

    async function collectNewReleasesTopTracks(cap, scrobbleSet){


        // If we're on the releases page use the live doc, otherwise
        // fetch it once.
        const startDoc =
            document.querySelector(".resource-list--release-list-item-wrap")
                ? document
                : await fetchDoc(NEW_RELEASES_PAGE_PATH);

        if(!startDoc) return [];


        const seenReleases = new Set();

        // Grab up to 2x cap releases so scrobbled-filtering doesn't
        // starve us — some releases will drop out after we compare
        // their top track against the user's library.
        const releases =
            collectNewReleasesFromDoc(startDoc, seenReleases)
                .slice(0, cap * 2);


        if(!releases.length) return [];


        // Parallel fetch album pages.
        const albumDocs =
            await Promise.all(
                releases.map(r => fetchDoc(r.url))
            );


        const seenTracks = new Set();
        const collected  = [];


        for(let i = 0; i < releases.length; i++){

            if(collected.length >= cap) break;


            const doc = albumDocs[i];
            if(!doc) continue;


            const top = pickTopTrackFromAlbumDoc(doc);
            if(!top) continue;


            if(seenTracks.has(top.q)) continue;
            if(scrobbleSet.has(top.q.toLowerCase())) continue;

            seenTracks.add(top.q);


            collected.push({ q:top.q, entity:"track" });

        }


        return collected;

    }
