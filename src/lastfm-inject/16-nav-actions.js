    // ---------- action: Queue recommended tracks ----------

    async function onMenuQueueRecs(e){

        e.preventDefault();
        e.stopPropagation();


        const item = e.currentTarget;

        if(item.getAttribute("aria-disabled") === "true") return;

        setMenuItemBusy(item, true);
        setMenuStatus("queue-recs", "Loading your history…");


        const me = getCurrentUsername();


        let tracks = [];

        try {

            const scrobbleSet =
                me ? await getScrobbleSet(me) : new Set();

            setMenuStatus("queue-recs", "Loading recommendations…");

            tracks = await collectMergedRecs(queueBatchCap(), scrobbleSet);

        } catch (err) {

            log("Queue recs failed:", err);

        }


        if(!tracks.length){
            setMenuStatus("queue-recs", "No new tracks found");
            setTimeout(()=> setMenuStatus("queue-recs", null), 2500);
            setMenuItemBusy(item, false);
            return;
        }


        const url = makeSpotifyBatchUrl(tracks, "queue");

        setMenuStatus(
            "queue-recs",
            `Queuing ${tracks.length} track${tracks.length === 1 ? "" : "s"}…`
        );

        log(`Queuing ${tracks.length} recommended track(s) to Spotify`);

        openSpotify(url);


        setTimeout(()=>{
            setMenuStatus("queue-recs", null);
            setMenuItemBusy(item, false);
            setNavMenuOpen(false);
        }, 1800);

    }


    // ---------- action: Queue similar to your top tracks ----------

    async function onMenuQueueSimilar(e){

        e.preventDefault();
        e.stopPropagation();


        const item = e.currentTarget;

        if(item.getAttribute("aria-disabled") === "true") return;


        const me = getCurrentUsername();

        if(!me){
            setMenuItemBusy(item, true);
            setMenuStatus("queue-similar", "Couldn't determine your username");
            setTimeout(()=>{
                setMenuStatus("queue-similar", null);
                setMenuItemBusy(item, false);
            }, 2500);
            return;
        }


        setMenuItemBusy(item, true);
        setMenuStatus("queue-similar", "Loading your history…");


        let tracks = [];

        try {

            const scrobbleSet = await getScrobbleSet(me);

            setMenuStatus(
                "queue-similar",
                "Finding tracks similar to your top…"
            );

            tracks = await collectSimilarToTopTracks(
                queueBatchCap(), scrobbleSet, me
            );

        } catch (err) {

            log("Queue similar failed:", err);

        }


        if(!tracks.length){
            setMenuStatus("queue-similar", "No similar tracks found");
            setTimeout(()=> setMenuStatus("queue-similar", null), 2500);
            setMenuItemBusy(item, false);
            return;
        }


        const url = makeSpotifyBatchUrl(tracks, "queue");

        setMenuStatus(
            "queue-similar",
            `Queuing ${tracks.length} track${tracks.length === 1 ? "" : "s"}…`
        );

        log(`Queuing ${tracks.length} similar track(s) to Spotify`);

        openSpotify(url);


        setTimeout(()=>{
            setMenuStatus("queue-similar", null);
            setMenuItemBusy(item, false);
            setNavMenuOpen(false);
        }, 1800);

    }


    // ---------- action: Queue random neighbour tracks (mix) ----------

    async function onMenuQueueNeighbourMix(e){

        e.preventDefault();
        e.stopPropagation();


        const item = e.currentTarget;

        if(item.getAttribute("aria-disabled") === "true") return;


        const me = getCurrentUsername();

        if(!me){
            setMenuItemBusy(item, true);
            setMenuStatus(
                "queue-neighbour-mix",
                "Couldn't determine your username"
            );
            setTimeout(()=>{
                setMenuStatus("queue-neighbour-mix", null);
                setMenuItemBusy(item, false);
            }, 2500);
            return;
        }


        setMenuItemBusy(item, true);
        setMenuStatus("queue-neighbour-mix", "Loading your history…");


        let tracks = [];
        let neighbours = [];

        try {

            const scrobbleSet = await getScrobbleSet(me);

            setMenuStatus(
                "queue-neighbour-mix",
                "Loading neighbours' tracks…"
            );

            const result = await collectNeighbourMix(
                queueBatchCap(), scrobbleSet, me
            );

            tracks     = result.tracks;
            neighbours = result.neighbours;

        } catch (err) {

            log("Queue neighbour mix failed:", err);

        }


        if(!tracks.length){
            setMenuStatus(
                "queue-neighbour-mix",
                neighbours.length
                    ? "No new tracks from your neighbours"
                    : "No neighbours found"
            );
            setTimeout(
                ()=> setMenuStatus("queue-neighbour-mix", null),
                2500
            );
            setMenuItemBusy(item, false);
            return;
        }


        const url = makeSpotifyBatchUrl(tracks, "queue");

        const namesJoined = neighbours.slice(0, 3).join(", ");

        setMenuStatus(
            "queue-neighbour-mix",
            `Queuing ${tracks.length} from ${namesJoined}…`
        );

        log(
            `Queuing ${tracks.length} neighbour-mix track(s) from ${namesJoined}`
        );

        openSpotify(url);


        setTimeout(()=>{
            setMenuStatus("queue-neighbour-mix", null);
            setMenuItemBusy(item, false);
            setNavMenuOpen(false);
        }, 2000);

    }


    // ---------- action: Go to a random neighbour ----------

    async function onMenuGoToNeighbour(e){

        e.preventDefault();
        e.stopPropagation();


        const item = e.currentTarget;

        if(item.getAttribute("aria-disabled") === "true") return;

        setMenuItemBusy(item, true);
        setMenuStatus("go-neighbour", "Finding a neighbour…");


        const me = getCurrentUsername();

        if(!me){
            setMenuStatus("go-neighbour", "Couldn't determine your username");
            setTimeout(()=> setMenuStatus("go-neighbour", null), 2500);
            setMenuItemBusy(item, false);
            return;
        }


        let neighbour;

        try {

            const neighboursDoc =
                await fetchDoc(`/user/${encodeURIComponent(me)}/neighbours`);

            if(!neighboursDoc)
                throw new Error("neighbours page unreachable");


            const neighbours =
                extractNeighbourUsernames(neighboursDoc, me);

            if(!neighbours.length)
                throw new Error("no neighbours found");


            neighbour = neighbours[
                Math.floor(Math.random() * neighbours.length)
            ];


        } catch (err) {

            log("Go to neighbour failed:", err);

        }


        if(!neighbour){
            setMenuStatus("go-neighbour", "No neighbours found");
            setTimeout(()=> setMenuStatus("go-neighbour", null), 2500);
            setMenuItemBusy(item, false);
            return;
        }


        setMenuStatus("go-neighbour", `Going to ${neighbour}…`);

        log(`Navigating to neighbour "${neighbour}"`);

        // Same-tab navigation into the neighbour's profile. From there
        // the injected "Queue top tracks" / "Queue recent tracks"
        // pills on the profile header do the actual queueing.
        window.location.href = `/user/${encodeURIComponent(neighbour)}`;

    }



