    // ---------- Spotify tab launch ----------

    function openSpotify(url){

        GM_openInTab(
            url,
            {
                active:false,
                insert:true,
                setParent:true
            }
        );

    }



    function makeSpotifyUrl(entity, artist, name, action){

        const query =
            name
                ? `${artist} ${name}`
                : artist;


        // We deliberately land on the generic /search/{q} page rather
        // than the typed /search/{q}/tracks|albums|artists pages. Typed
        // pages use different DOM shapes (e.g. tracklist-row on /tracks)
        // and Spotify changes them independently. The generic page has
        // one stable list-row layout for all entity types, and the
        // puppeteer disambiguates using the `entity` param below.

        return (
            "https://open.spotify.com/search/" +
            encodeURIComponent(query) +
            "?lastfm=true" +
            "&entity=" + entity +
            "&action=" + action
        );

    }


    // Batch dispatch: build a single URL that carries an array of
    // {q, entity} items in ?batch=. The puppeteer processes them
    // sequentially in the same tab, navigating hop-by-hop instead of
    // opening N tabs. Landing URL uses items[0] as the initial search
    // so the first hop is a normal page load.

    function makeSpotifyBatchUrl(items, action){

        if(!items.length) return null;

        const first = items[0];

        const params = new URLSearchParams();
        params.set("lastfm", "true");
        params.set("action", action);
        params.set("entity", first.entity || "track");
        params.set("batch",  JSON.stringify(items));

        return (
            "https://open.spotify.com/search/" +
            encodeURIComponent(first.q) +
            "?" + params.toString()
        );

    }


