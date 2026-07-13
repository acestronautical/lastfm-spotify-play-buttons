

        const buttons =
            document.querySelectorAll(
                'button.js-playlink-station:not([data-spotify-replaced])'
            );


        buttons.forEach(button=>{


            // Skip the "Play all" button in the Similar Artists section
            // header — it just plays the current artist again, so it
            // duplicates the main PLAY ARTIST button. It's also hidden
            // via CSS, but skip here too so we don't attach behavior.
            if (
                button.classList.contains("inline-section-control") &&
                button
                    .closest("section")
                    ?.querySelector("ol.catalogue-overview-similar-artists")
            ) {
                return;
            }


            const info =
                tryStrategies(
                    "station button",
                    stationStrategies,
                    button
                );


            if(!info) return;


            attachSpotifyBehavior(
                button,
                info.entity,
                info.artist,
                info.name,
                "play"
            );

        });

    }



    // ----- music-card overlays -----

    // Last.fm doesn't render play buttons on many cover-art cards
    // (similar-artist grids, chart rows, recs feeds, featured tracks
    // on artist pages, etc.). We inject one per card; each config
    // below describes:
    //   card:    outer selector to enumerate (with :not(replaced) added)
    //   nameSel: link inside the card whose href gives the music path
    //   hostSel: where to append the button (null = card itself)
    //   btnCls:  which of the two overlay classes to use
    // Entity (artist/album/track) is derived from the href pattern via
    // musicPartsToInfo, so the same config works for any card type.

    const MUSIC_CARD_CONFIGS = [
        // Similar-artist grid + sidebar, /music extras, recommended lists.
        { card: ".catalogue-overview-similar-artists-item-wrap",  nameSel: ".link-block-target",                  hostSel: ".catalogue-overview-similar-artists-item-image", btnCls: "spotify-similar-artist-button" },
        { card: ".artist-similar-artists-sidebar-item-wrap",      nameSel: ".link-block-target",                  hostSel: ".artist-similar-artists-sidebar-item-image",     btnCls: "spotify-similar-artist-button" },
        { card: ".music-more-artists-item-wrap",                  nameSel: ".link-block-target",                  hostSel: ".music-more-artists-item-image",                 btnCls: "spotify-similar-artist-button" },
        { card: ".music-recommended-artists-artist",              nameSel: ".link-block-target",                  hostSel: ".music-recommended-artists-artist-avatar",       btnCls: "spotify-similar-artist-button" },

        // Featured track/album cards on an artist page ("Popular this
        // week", "Latest release", etc.). Track/album entity, cover-only
        // host, no native playlink.
        { card: ".artist-featured-items-item-wrap",               nameSel: ".link-block-target",                  hostSel: ".artist-featured-items-item-image",              btnCls: "spotify-similar-artist-button" },

        // /home/{artists|albums|...} + /music/+recommended/{...} recs-feed
        // cards. Artist / album / track variants share the same card
        // shape and injection host; entity is derived from the URL by
        // musicPartsToInfo so this one config covers them all. Skip
        // cards that already have a native .recs-feed-playlink (which
        // replaceTrackButtons or replaceStationButtons already swapped)
        // so we don't double-inject.
        { card: ".recs-feed-item:not(:has(.recs-feed-playlink))",  nameSel: ".link-block-target",                hostSel: ".recs-feed-cover-image-wrap",                    btnCls: "spotify-similar-artist-button" },

        // Chart artist rows. The .js-link-block class lives on the tr
        // only for artist rows, so it disambiguates from track/album.
        { card: "tr.globalchart-item.js-link-block",              nameSel: ".link-block-target",                  hostSel: ".globalchart-image .avatar",                     btnCls: "spotify-similar-artist-button" },
        { card: "tr.weeklychart-item.js-link-block",              nameSel: ".link-block-target",                  hostSel: ".weeklychart-image .avatar",                     btnCls: "spotify-similar-artist-button" },

        // Big featured-artist cards on /music. Button lives on the card
        // itself (top-right corner), not on any inner avatar.
        { card: ".music-featured-item.music-featured-artist",     nameSel: ".music-featured-item-heading-link",   hostSel: null,                                             btnCls: "spotify-featured-artist-button" },

        // New Releases grid on /music. Skip cards that already have
        // a native .music-releases-item-playlink (which
        // replaceStationButtons already swapped) so we don't double-
        // inject.
        { card: ".music-releases-item-wrap:not(:has(.music-releases-item-playlink))", nameSel: ".music-releases-item-name .link-block-target", hostSel: ".music-releases-item-image", btnCls: "spotify-similar-artist-button" },

        // Album-page tracklist rows. Last.fm leaves the .chartlist-play
        // cell empty on album pages; fill each empty cell with a compact
        // per-track Spotify button. requireEmptyHost skips rows that
        // already have a native play button (top-tracks lists elsewhere).
        { card: "tr.chartlist-row",                               nameSel: ".chartlist-name > a",                 hostSel: ".chartlist-play",                                btnCls: "spotify-chartlist-play-button", requireEmptyHost: true },

        // Album-page header pill area. Only inject when Last.fm didn't
        // render its own .header-new-playlink (which we would have
        // already swapped via replaceStationButtons above). On albums
        // that DO have a native play button, our swap already covers it
        // and this rule doesn't match.
        { card: "header.header-new--album:not(:has(.header-new-playlink))", nameSel: "link[itemprop='url']", hostSel: ".header-new-info-desktop .header-new-actions", btnCls: "spotify-album-header-button" },
    ];


    function replaceMusicCards(){

        for(const cfg of MUSIC_CARD_CONFIGS){

            document
                .querySelectorAll(`${cfg.card}:not([data-spotify-replaced])`)
                .forEach(card => injectMusicOverlay(card, cfg));

        }

    }


    function injectMusicOverlay(card, cfg){

        card.dataset.spotifyReplaced = "true";

        const nameLink = card.querySelector(cfg.nameSel);
        if(!nameLink) return;

        let pathname;
        try {
            pathname =
                new URL(
                    nameLink.getAttribute("href") || nameLink.href,
                    location.origin
                ).pathname;
        } catch (_) {
            return;
        }

        const parts = parseMusicPath(pathname);
        if(!parts) return;

        const info = musicPartsToInfo(parts);

        const host = cfg.hostSel ? card.querySelector(cfg.hostSel) : card;
        if(!host) return;

        // Skip if the host already has child elements (used to avoid
        // double-injecting into chartlist play cells that already have
        // a native Last.fm play button).
        if(cfg.requireEmptyHost && host.querySelector("*")) return;

        const label = info.name
            ? `Play ${info.name} by ${info.artist} on Spotify`
            : `Play ${info.artist} on Spotify`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = cfg.btnCls;
        button.setAttribute("aria-label", label);
        host.appendChild(button);

        attachSpotifyBehavior(button, info.entity, info.artist, info.name, "play");

    }



