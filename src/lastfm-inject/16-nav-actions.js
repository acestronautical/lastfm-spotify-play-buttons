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


    // ---------- action: Queue new releases (top track per album) ----------

    async function onMenuQueueNewReleases(e){

        e.preventDefault();
        e.stopPropagation();


        const item = e.currentTarget;

        if(item.getAttribute("aria-disabled") === "true") return;

        setMenuItemBusy(item, true);
        setMenuStatus("queue-new-releases", "Loading your history…");


        const me = getCurrentUsername();


        let tracks = [];

        try {

            const scrobbleSet =
                me ? await getScrobbleSet(me) : new Set();

            setMenuStatus(
                "queue-new-releases",
                "Loading new releases…"
            );

            tracks = await collectNewReleasesTopTracks(
                queueBatchCap(), scrobbleSet
            );

        } catch (err) {

            log("Queue new releases failed:", err);

        }


        if(!tracks.length){
            setMenuStatus(
                "queue-new-releases",
                "No new releases found"
            );
            setTimeout(
                ()=> setMenuStatus("queue-new-releases", null),
                2500
            );
            setMenuItemBusy(item, false);
            return;
        }


        const url = makeSpotifyBatchUrl(tracks, "queue");

        setMenuStatus(
            "queue-new-releases",
            `Queuing ${tracks.length} track${tracks.length === 1 ? "" : "s"}…`
        );

        log(
            `Queuing ${tracks.length} new-release top track(s) to Spotify`
        );

        openSpotify(url);


        setTimeout(()=>{
            setMenuStatus("queue-new-releases", null);
            setMenuItemBusy(item, false);
            setNavMenuOpen(false);
        }, 1800);

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


    // ---------- action: Import playlist from CSV ----------
    //
    // Opens a hidden <input type="file"> file picker, reads the
    // selected Exportify CSV, and drives importCsvAsPlaylist. Reports
    // progress into the menu status line so the user sees each phase
    // and per-track progress live.

    function truncateStatus(s, n){
        return s.length > n ? s.slice(0, n - 1) + "…" : s;
    }


    function onMenuImportPlaylist(e){

        e.preventDefault();
        e.stopPropagation();


        const item = e.currentTarget;

        if(item.getAttribute("aria-disabled") === "true") return;


        // Pin the menu open BEFORE opening the picker. input.click()
        // dispatches a real click that bubbles to <body> — our
        // document-level outside-click handler would otherwise close
        // the menu the instant we open the picker. The busy flag
        // is released again on the picker's "cancel" event (no file
        // chosen) or after the import finishes.
        setNavMenuBusy(true);


        // Hidden file input, one per click. Appended to <body> and
        // removed after the change or cancel event.
        const input = document.createElement("input");
        input.type   = "file";
        input.accept = ".csv,text/csv";
        input.style.display = "none";


        // Fires when the user dismisses the picker without picking a
        // file (well supported: Chrome 113+, Firefox 91+, Safari
        // 16.4+). Older browsers just leave the busy flag set until
        // the next successful action — acceptable degradation.
        input.addEventListener("cancel", () => {
            input.remove();
            setNavMenuBusy(false);
        });


        input.addEventListener("change", async () => {

            const file = input.files && input.files[0];
            input.remove();

            // Picker has returned — release the busy pin so outside
            // clicks can dismiss the menu again if the user wants.
            // Import continues in the background regardless; menu
            // just stops being sticky.
            setNavMenuBusy(false);

            if(!file) return;


            setMenuItemBusy(item, true);
            setMenuStatus("import-playlist", `Reading ${file.name}…`);


            let csvText;
            try {
                csvText = await file.text();
            } catch (err) {
                setMenuStatus("import-playlist", `Read failed: ${err.message}`);
                setTimeout(()=>{
                    setMenuStatus("import-playlist", null);
                    setMenuItemBusy(item, false);
                }, 4000);
                return;
            }


            const playlistName = filenameToPlaylistName(file.name);

            log(`Importing "${playlistName}" from ${file.name}`);


            let result;
            try {
                result = await importCsvAsPlaylist({
                    csvText,
                    playlistName,
                    onProgress: (p) => {
                        switch(p.phase){
                            case "parsing":
                                setMenuStatus("import-playlist", "Parsing CSV…");
                                break;
                            case "creating":
                                setMenuStatus(
                                    "import-playlist",
                                    `Creating playlist (${p.total} tracks)…`
                                );
                                break;
                            case "renaming":
                                setMenuStatus(
                                    "import-playlist",
                                    `Naming “${truncateStatus(p.name, 32)}”…`
                                );
                                break;
                            case "adding":
                                setMenuStatus(
                                    "import-playlist",
                                    `Adding ${p.done + 1}/${p.total}: ` +
                                    truncateStatus(p.current, 40)
                                );
                                break;
                            case "done":
                                setMenuStatus(
                                    "import-playlist",
                                    `Done: ${p.ok}/${p.total} added` +
                                    (p.fail ? ` (${p.fail} failed)` : "")
                                );
                                log(
                                    `Import done → ${p.url}  ` +
                                    `(${p.ok}/${p.total} added, ${p.fail} failed)`
                                );
                                if(p.failures && p.failures.length){
                                    log("Failed tracks (add manually):");
                                    for(const f of p.failures)
                                        log(`  ${f.artist} — ${f.track}  (${f.error})`);
                                }
                                break;
                            case "warn":
                                log(`Import warn: ${p.message}`);
                                break;
                            case "error":
                                setMenuStatus(
                                    "import-playlist",
                                    `Error: ${truncateStatus(p.message, 48)}`
                                );
                                break;
                        }
                    },
                });
            } catch (err) {
                log("Import failed:", err);
                setMenuStatus(
                    "import-playlist",
                    `Failed: ${truncateStatus(err.message, 48)}`
                );
            }


            // Leave the final status visible long enough to read. On
            // success we hold it a bit longer so the user has time
            // to note the URL logged to console.
            const holdMs = (result && result.ok) ? 10000 : 6000;

            setTimeout(()=>{
                setMenuStatus("import-playlist", null);
                setMenuItemBusy(item, false);
            }, holdMs);

        });


        document.body.appendChild(input);
        input.click();

    }



