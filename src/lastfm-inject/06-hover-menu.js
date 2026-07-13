    // ---------- shared: hover menu ----------

    // Single shared menu element attached to <body>. Using position:fixed
    // avoids the recurring problem of the anchor's parent clipping the
    // popup or getting mis-positioned when Last.fm reflows the row.

    const menu = document.createElement("div");

    menu.className = "spotify-menu";

    document.body.appendChild(menu);


    let currentButton = null;

    let showTimer = null;
    let hideTimer = null;


    const HIDE_DELAY_MS = 150;
    const MENU_GAP      = 8;


    // Compact icons used inside menu items.
    const MENU_ICONS = {

        play:
            `<svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 2.5v11a.5.5 0 0 0 .77.42l9-5.5a.5.5 0 0 0 0-.85l-9-5.5A.5.5 0 0 0 4 2.5z"/>
            </svg>`,

        queue:
            `<svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75zm0 4A.75.75 0 0 1 2.75 7h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.75zm.75 3.25a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5zM12 11v-1.5h1.5V11H15v1.5h-1.5V14H12v-1.5h-1.5V11z"/>
            </svg>`,

        like:
            `<svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 14.25 6.83 13.2C2.68 9.61 0 7.28 0 4.5 0 2.42 1.42 1 3.5 1c1.05 0 2.09.49 2.75 1.27C6.91 1.49 7.95 1 9 1 11.08 1 12.5 2.42 12.5 4.5c0 2.78-2.68 5.11-6.83 8.71L8 14.25z"/>
            </svg>`
    };


    function positionMenu(button){

        const r = button.getBoundingClientRect();


        // Menu must already be display:block for offset dimensions to
        // be measurable.

        const mw = menu.offsetWidth;
        const mh = menu.offsetHeight;


        // Preferred: to the right of the button, top-aligned.

        let left = r.right + MENU_GAP;
        let top  = r.top;


        // If the menu would overflow the right edge, flip to the
        // left side of the button.

        if(left + mw > window.innerWidth - 8)
            left = Math.max(8, r.left - mw - MENU_GAP);


        // Keep the menu inside the viewport vertically.

        if(top + mh > window.innerHeight - 8)
            top = Math.max(8, window.innerHeight - mh - 8);


        menu.style.left = left + "px";
        menu.style.top  = top  + "px";

    }


    // Per-entity menu definition. Each item is [label, iconKey, action].
    // Labels match Spotify's own vocabulary for each entity type so
    // users know exactly what the action will do on the other side.

    const MENU_ITEMS = {
        track: [
            ["Play Song",     "play",  "play"],
            ["Queue Song",    "queue", "queue"],
            ["Like Song",     "like",  "like"]
        ],
        album: [
            ["Play Album",    "play",  "play"],
            ["Queue Album",   "queue", "queue"],
            ["Add Album",     "like",  "like"]
        ],
        artist: [
            ["Play Artist",   "play",  "play"],
            ["Queue Artist",  "queue", "queue"],
            ["Follow Artist", "like",  "like"]
        ]
    };


    function showMenu(button){

        if(hideTimer){
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        currentButton = button;

        const { artist, name, entity } = button._spotify;


        menu.innerHTML = "";


        const items = MENU_ITEMS[entity] || MENU_ITEMS.track;


        items.forEach(([label, iconKey, action])=>{


            const item =
                document.createElement("div");

            item.className =
                "spotify-menu-item";

            item.innerHTML =
                MENU_ICONS[iconKey] +
                `<span>${label}</span>`;


            item.onclick=e=>{

                e.preventDefault();
                e.stopPropagation();


                openSpotify(
                    makeSpotifyUrl(
                        entity,
                        artist,
                        name,
                        action
                    )
                );


                hideMenu();

            };


            menu.appendChild(item);

        });


        menu.style.display = "block";

        // Position after making it visible so we can measure the
        // rendered size and flip if needed.

        positionMenu(button);


        // Trigger the fade-in on the next frame so the transition
        // actually runs.

        requestAnimationFrame(()=>{

            menu.classList.add("spotify-menu--shown");

        });

    }


    function scheduleShow(button){


        if(hideTimer){
            clearTimeout(hideTimer);
            hideTimer = null;
        }


        // Already showing (possibly for a different button) — re-anchor
        // immediately, no delay.

        if(menu.style.display === "block"){

            showMenu(button);

            return;

        }


        if(showTimer)
            clearTimeout(showTimer);


        // Popup slider stores `null` when the user drags to the far
        // right ("Off"); treat that as "hover menu disabled".

        const delay = getConfig().menuDelay;
        if(delay === null || delay === undefined || delay < 0) return;


        showTimer = setTimeout(()=>{

            showTimer = null;

            showMenu(button);

        }, delay);

    }


    function cancelShow(){

        if(showTimer){
            clearTimeout(showTimer);
            showTimer = null;
        }

    }


    function hideMenu(){

        menu.classList.remove("spotify-menu--shown");

        menu.style.display = "none";

        currentButton = null;

    }


    function deferHide(){

        if(hideTimer)
            clearTimeout(hideTimer);


        hideTimer = setTimeout(()=>{

            if(!menu.matches(":hover") &&
               !currentButton?.matches(":hover"))
                hideMenu();

        }, HIDE_DELAY_MS);

    }


    menu.addEventListener(
        "mouseenter",
        ()=>{
            if(hideTimer){
                clearTimeout(hideTimer);
                hideTimer = null;
            }
        }
    );

    menu.addEventListener(
        "mouseleave",
        deferHide
    );


    window.addEventListener(
        "scroll",
        ()=>{
            if(currentButton &&
               menu.style.display === "block")
                positionMenu(currentButton);
        },
        true
    );

    window.addEventListener(
        "resize",
        ()=>{
            if(currentButton &&
               menu.style.display === "block")
                positionMenu(currentButton);
        }
    );



