    // ---------- button setup ----------

    function attachSpotifyBehavior(
        button,
        entity,
        artist,
        name,
        defaultAction
    ){


        button.dataset.spotifyReplaced = "true";


        button._spotify = {
            entity, artist, name
        };


        // Strip Last.fm's own hook classes so their delegated click
        // listeners (which fire on document.body in the capture phase
        // and would launch Last.fm's own player) no longer match this
        // element. We've already extracted everything we need from the
        // data-* attributes, so nuke them too — anything Last.fm's
        // player module keys off of should be gone by the time we're
        // done.

        button.classList.remove("js-playlink", "js-playlink-station");

        for (const key of Object.keys(button.dataset)) {
            if (key !== "spotifyReplaced") delete button.dataset[key];
        }


        // Last.fm's `components/link-block` module attaches a click
        // listener on every `.js-link-block` container that navigates
        // to the enclosed `link-block-target` href whenever any child
        // is clicked. That hijacks our button click (bubbles up to the
        // container, container routes to the album page).
        //
        // Neuter it on just this card: unhook the container's class
        // and disable pointer events on the invisible cover-link
        // overlay. Other links in the card (title, artist name) still
        // work as normal <a href>'s.

        const linkBlock = button.closest(".js-link-block, .link-block");

        if(linkBlock){

            linkBlock.classList.remove("js-link-block");


            const cover =
                linkBlock.querySelector(
                    ".js-link-block-cover-link, .link-block-cover-link"
                );

            if(cover){
                cover.style.pointerEvents = "none";
            }

        }


        // For the artist-page header button, keep Last.fm's native
        // "PLAY ARTIST" text alongside the Spotify icon. Everywhere
        // else, replace the whole button contents with just the icon.

        const preservedText =
            button.classList.contains("header-new-playlink")
                ? (button.textContent.trim() || "Play Artist")
                : null;

        const currentAction = getConfig().defaultAction || defaultAction;

        button.innerHTML = `
<span class="spotify-custom-button" title="">
${spotifyIcon(currentAction, entity)}
</span>${preservedText ? `<span>${preservedText}</span>` : ""}`;


        // Register the click in the capture phase so we beat any
        // still-attached document-level delegated handlers.

        button.addEventListener(
            "click",
            e => {

                e.preventDefault();
                e.stopImmediatePropagation();

                openSpotify(
                    makeSpotifyUrl(
                        entity,
                        artist,
                        name,
                        getConfig().defaultAction || defaultAction
                    )
                );

            },
            true
        );


        button.addEventListener(
            "mouseenter",
            ()=>{
                button.style.transform = "scale(1.12)";
                scheduleShow(button);
            }
        );


        button.addEventListener(
            "mouseleave",
            ()=>{
                button.style.transform = "scale(1)";
                cancelShow();
                deferHide();
            }
        );

    }



