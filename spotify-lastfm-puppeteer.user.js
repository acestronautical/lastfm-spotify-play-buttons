// ==UserScript==
// @name         Spotify Last.fm Puppeteer
// @namespace    https://github.com/
// @version      1.3
// @description  Puppeteer Spotify's search UI to perform actions launched from Last.fm
// @match        https://open.spotify.com/search/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';


    const LOG_PREFIX = "[lastfm→spotify]";

    const log = (...args)=>
        console.log(LOG_PREFIX, ...args);


    const params =
        new URLSearchParams(
            window.location.search
        );


    if (!params.has("lastfm")) {

        log("Normal Spotify search - ignoring");

        return;
    }


    const action =
        params.get("action") || "play";


    const entity =
        params.get("entity") || "track";


    log("action:", action, "entity:", entity);


    const TIMEOUT_MS   = 30000;
    const CLOSE_MS     = 1000;
    const MENU_WAIT_MS = 2500;



    // ---------- utils ----------

    // Resolve when `check()` returns a truthy value, using a MutationObserver
    // over document.body. Rejects after `timeoutMs` if nothing matches.

    function waitFor(check, timeoutMs){

        return new Promise((resolve, reject)=>{


            const immediate = check();

            if(immediate){
                resolve(immediate);
                return;
            }


            const observer =
                new MutationObserver(()=>{

                    const v = check();

                    if(v){
                        observer.disconnect();
                        clearTimeout(timer);
                        resolve(v);
                    }

                });


            observer.observe(
                document.body,
                {
                    childList:true,
                    subtree:true,
                    attributes:true
                }
            );


            const timer =
                setTimeout(()=>{

                    observer.disconnect();

                    reject(
                        new Error("timeout")
                    );

                }, timeoutMs);

        });

    }



    function closeHelper(){

        setTimeout(()=>{

            window.close();

        }, CLOSE_MS);

    }



    // Try each strategy in order until one returns a truthy value.
    // Only logs when we fall past the primary strategy — that's the
    // signal that Spotify has changed something and the top selector
    // may need updating.

    function resolveWith(label, strategies, ...args){


        for(let i = 0; i < strategies.length; i++){

            const { name, run } = strategies[i];


            let result;

            try {
                result = run(...args);
            } catch (e) {
                log(`${label} strategy "${name}" threw:`, e);
                continue;
            }


            if(result){

                if(i > 0)
                    log(`${label} matched via fallback "${name}"`);

                return result;

            }

        }


        log(`${label}: no strategy matched`);

        return null;

    }



    // ---------- result finding ----------

    // The Last.fm side always sends us to /search/{q}. We disambiguate
    // by the requested entity's URL fragment (/track/, /album/, /artist/)
    // since Spotify's URL scheme is far more stable than any data-testid
    // or CSS class.

    function entityHrefFragment(){

        return (
            entity === "album"  ? "/album/"  :
            entity === "artist" ? "/artist/" :
            "/track/"
        );

    }


    function mainRoot(){

        return document.querySelector("main") || document.body;

    }


    const rowStrategies = [

        // Primary: list-row shape used on /search/{q}.
        {
            name: "role=row + data-testid=title link",
            run: ()=>{

                const frag = entityHrefFragment();

                for(const row of document.querySelectorAll('[role="row"]')){

                    if(row.querySelector(
                        `[data-testid="title"] a[href*="${frag}"]`
                    ))
                        return row;

                }

                return null;

            }
        },


        // Defensive: tracklist-row shape used on /search/{q}/tracks.
        {
            name: "data-testid=tracklist-row + track link",
            run: ()=>{

                if(entity !== "track")
                    return null;


                for(const row of document.querySelectorAll(
                    '[data-testid="tracklist-row"]'
                )){

                    if(row.querySelector('a[href*="/track/"]'))
                        return row;

                }

                return null;

            }
        },


        // Structural: first entity link inside <main>, walked up to the
        // nearest container that also has an actionable button. Survives
        // arbitrary role/testid renames as long as Spotify still uses
        // /track/, /album/, /artist/ URLs and puts a play/more/save
        // button beside the title.
        {
            name: "structural walk from first main-content entity link",
            run: ()=>{

                const frag = entityHrefFragment();
                const root = mainRoot();


                const link =
                    root.querySelector(`a[href*="${frag}"]`);


                if(!link) return null;


                let el = link;


                while(el && el !== root){

                    if(el.getAttribute("role") === "row")
                        return el;


                    if(el.querySelector(
                        'button[data-testid="play-button"], ' +
                        'button[data-testid="more-button"], ' +
                        'button[aria-haspopup="menu"], ' +
                        'button[aria-label^="Play "]'
                    ))
                        return el;


                    el = el.parentElement;

                }


                return link.closest(
                    '[role="row"], article, [role="group"]'
                ) || link.parentElement;

            }
        }

    ];


    function findRow(){

        return resolveWith("findRow", rowStrategies);

    }



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

        closeHelper();

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

            closeHelper();

            return true;

        }


        log("Liking:", row.innerText.split("\n")[0]);


        like.click();

        closeHelper();

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

            closeHelper();

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



    // ---------- main ----------

    async function run(){


        let row;


        try {

            row =
                await waitFor(
                    findRow,
                    TIMEOUT_MS
                );


        } catch (e) {

            log(
                "No Spotify result found within",
                TIMEOUT_MS, "ms"
            );

            return;

        }


        switch(action){


            case "queue":

                await doQueue(row);
                break;


            case "like":

                doLike(row);
                break;


            case "play":

            default:

                doPlay(row);
                break;

        }

    }



    // Kick off after DOM has had a chance to settle.

    if(document.readyState === "loading"){

        document.addEventListener(
            "DOMContentLoaded",
            run,
            { once:true }
        );


    } else {

        run();

    }


})();
