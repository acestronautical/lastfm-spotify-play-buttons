    // ---------- actions ----------

    const playStrategies = [

        {
            name: "data-testid=play-button",
            run: row => row.querySelector(
                'button[data-testid="play-button"]'
            )
        },

        {
            name: 'aria-label ^= "Play "',
            run: row => row.querySelector(
                'button[aria-label^="Play "], button[aria-label="Play"]'
            )
        },

        // Structural fallback: primary Encore button inside the row that
        // isn't the "more options" menu button.
        {
            name: "first primary/tertiary button that isn't more/save",
            run: row => {

                const buttons =
                    [...row.querySelectorAll("button")];


                return buttons.find(b =>
                    !b.hasAttribute("aria-haspopup") &&
                    !/more|options|save|liked|library/i
                        .test(b.getAttribute("aria-label") || "")
                );

            }
        }

    ];


    function doPlay(row){


        const play = resolveWith(
            "play button",
            playStrategies,
            row
        );


        if(!play) return false;


        log("Playing:", row.innerText.split("\n")[0]);


        play.click();

        return true;

    }



    // Locale-tolerant "already followed" check for artist Follow buttons.
    // English-only to start; falling through to a click in other locales
    // just toggles Follow off, which is the same failure mode as the
    // aria-checked track-like path.

    function isAlreadyFollowing(button){

        return /^following$/i.test(
            (button.textContent || "").trim()
        );

    }


    // Current track rows no longer carry a dedicated heart/save button —
    // the only unambiguous "save to Liked Songs" control is the more-menu
    // item, which is present whether or not playback is active. Match it
    // (and its already-saved "Remove from Liked Songs" counterpart) so we
    // can like via the menu and skip when the track is already liked.

    const LIKE_ADD_PATTERNS = [
        /(save|add) to (your )?liked songs/i,
        /save to your library/i,
        /a .adir a tus canciones que te gustan/i,  // es
    ];

    const LIKE_REMOVE_PATTERNS = [
        /remove from (your )?liked songs/i,
        /remove from your library/i,
    ];


    function findLikeMenuItem(){

        for(const item of document.querySelectorAll('[role="menuitem"]')){

            const label =
                (item.getAttribute("aria-label") ||
                 item.textContent || "").trim();

            if(LIKE_REMOVE_PATTERNS.some(re => re.test(label)))
                return { already: true };

            if(LIKE_ADD_PATTERNS.some(re => re.test(label)))
                return { item };

        }

        return null;

    }


    async function doLike(row){


        // Artist rows/pages expose Follow as a buttonSecondary — click it
        // unless we're already following.
        const follow =
            row.querySelector('button[data-encore-id="buttonSecondary"]');

        if(follow){

            if(isAlreadyFollowing(follow)){
                log("Already following - skipping");
                return true;
            }

            log("Following artist");
            follow.click();
            return true;

        }


        // Direct heart/save button, for any layout that still renders one.
        const heart =
            row.querySelector(
                'button[aria-label*="Liked Songs"], ' +
                'button[aria-label*="Save to Your Library"], ' +
                '[data-testid="save-button"] button'
            );

        if(heart){

            if(heart.getAttribute("aria-checked") === "true" ||
               /remove/i.test(heart.getAttribute("aria-label") || "")){
                log("Already liked - skipping");
                return true;
            }

            log("Liking via row button");
            heart.click();
            return true;

        }


        // Fallback: track rows now only expose the Liked Songs toggle
        // inside the more-menu.
        const more =
            resolveWith("more button", moreStrategies, row);

        if(!more) return false;


        log("Opening more menu for like");

        more.click();


        try {

            const found =
                await waitFor(findLikeMenuItem, MENU_WAIT_MS);


            if(found.already){
                log("Already liked - skipping");
                dismissMenu();
                return true;
            }


            log("Adding to Liked Songs");

            found.item.click();

            return true;


        } catch (e) {

            log("Liked Songs option not found - dismissing menu");

            dismissMenu();

            return false;

        }

    }



    const moreStrategies = [

        {
            name: "data-testid=more-button",
            run: row => row.querySelector(
                'button[data-testid="more-button"]'
            )
        },

        {
            name: 'aria-label ^= "More options"',
            run: row => row.querySelector(
                'button[aria-label^="More options"]'
            )
        },

        {
            name: 'aria-haspopup="menu"',
            run: row => row.querySelector(
                'button[aria-haspopup="menu"]'
            )
        }

    ];



    // Queue action: open the row's more-menu, wait for it to render, then
    // click the "Add to queue" entry. Menu labels are localized, so match
    // on a small set of distinctive substrings — each pattern is either a
    // whole-word Latin match or a long-enough CJK/other-script substring
    // that won't false-match neighbouring menu items (e.g. "file" inside
    // "Exclude from your taste profile").

    const QUEUE_PATTERNS = [
        /\bqueue\b/i,        // en
        /\bcola\b/i,         // es
        /\bcoda\b/i,         // it
        /\bfila\b/i,         // pt
        /warteschlange/i,    // de
        /kolejk\w*/i,        // pl
        /sıraya/i,           // tr
        /file d.attente/i,   // fr
        /wachtrij/i,         // nl
        /очеред/i,           // ru
        /队列/,               // zh
        /キュー/,              // ja
        /대기열/               // ko
    ];


    function labelMatchesQueue(label){

        return QUEUE_PATTERNS.some(
            re => re.test(label)
        );

    }


    // Menu item lookup. One flat query covers both the primary shape
    // ([role=menuitem]) and the fallback (button/link inside a
    // [role=menu] wrapper Spotify occasionally uses for portals).

    function findQueueMenuItem(){


        const items =
            document.querySelectorAll(
                '[role="menuitem"], ' +
                '[role="menu"] button, ' +
                '[role="menu"] a'
            );


        for(const item of items){

            const label =
                item.getAttribute("aria-label") ||
                item.textContent ||
                "";


            if(labelMatchesQueue(label))
                return item;

        }


        return null;

    }


    // Close an open context menu by sending Escape.
    function dismissMenu(){
        document.dispatchEvent(
            new KeyboardEvent(
                "keydown",
                { key:"Escape", bubbles:true }
            )
        );
    }



    async function doQueue(row){


        const more = resolveWith(
            "more button",
            moreStrategies,
            row
        );


        if(!more) return false;


        log("Opening more menu");

        more.click();


        try {

            const queue =
                await waitFor(
                    findQueueMenuItem,
                    MENU_WAIT_MS
                );


            log("Adding to queue");

            queue.click();

            return true;


        } catch (e) {

            // Spotify only lists "Add to queue" when an active playback
            // session exists; with nothing playing the item is absent.
            // Dismiss the menu and fall back to playing this row, which
            // both plays the track and establishes a session so the
            // next batch item finds "Add to queue" available.

            log("No 'Add to queue' (no active session) - playing instead");

            dismissMenu();


            return doPlay(row);

        }

    }



