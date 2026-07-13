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



    const likeStrategies = [

        {
            name: "data-testid=save-button > button",
            run: row => row.querySelector(
                '[data-testid="save-button"] button'
            )
        },

        {
            name: "aria-label matches Liked Songs / Your Library",
            run: row => row.querySelector(
                'button[aria-label*="Liked Songs"], ' +
                'button[aria-label*="Your Library"]'
            )
        },

        // Structural fallback: an aria-checked toggle button in the row
        // that isn't the more-options menu. Spotify's like control has
        // been aria-checked for years even as data-testids have churned.
        {
            name: "aria-checked toggle button",
            run: row => row.querySelector(
                'button[aria-checked][data-encore-id="buttonTertiary"]:not([aria-haspopup])'
            )
        },

        // Artist rows expose Follow as a plain buttonSecondary with
        // "Follow" / "Following" text content and no aria attributes.
        // Only artist rows on the search page carry a buttonSecondary,
        // so scoping by the encore role is enough.
        {
            name: "buttonSecondary (Follow on artist rows)",
            run: row => row.querySelector(
                'button[data-encore-id="buttonSecondary"]'
            )
        }

    ];


    // Locale-tolerant "already followed" check for artist Follow buttons.
    // English-only to start; falling through to a click in other locales
    // just toggles Follow off, which is the same failure mode as the
    // aria-checked track-like path.

    function isAlreadyFollowing(button){

        return /^following$/i.test(
            (button.textContent || "").trim()
        );

    }


    function doLike(row){


        const like = resolveWith(
            "like button",
            likeStrategies,
            row
        );


        if(!like) return false;


        if(like.getAttribute("aria-checked") === "true" ||
           isAlreadyFollowing(like)){

            log("Already liked/followed - skipping");

            return true;

        }


        log("Liking:", row.innerText.split("\n")[0]);


        like.click();

        return true;

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

            log("Queue option not found - dismissing menu");


            // Close the menu we opened so we don't leave the tab
            // in a weird state before it closes.

            document.dispatchEvent(
                new KeyboardEvent(
                    "keydown",
                    { key:"Escape", bubbles:true }
                )
            );


            return false;

        }

    }



