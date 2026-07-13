    const trackStrategies = [

        // Primary: data attributes injected by Last.fm's player JS.
        {
            name: "data-track-name + data-artist-name",
            run: el => {
                const track  = el.dataset.trackName;
                const artist = el.dataset.artistName;
                if(!track || !artist) return null;
                return { entity:"track", artist, name:track };
            }
        },

        // Fallback: parse the anchor's own href.
        // Last.fm play links usually have the pattern
        //   /music/{artist}/_/{track}
        // even when the data-* attributes are absent.
        {
            name: "href /music/{artist}/_/{track}",
            run: el => {

                const href = el.getAttribute("href") || "";
                const parts = parseMusicPath(href);


                if(!parts) return null;
                if(parts.second !== "_" || !parts.third) return null;


                return {
                    entity: "track",
                    artist: parts.artist,
                    name:   parts.third
                };

            }
        },

        // Last-ditch: aria-label or title of the form "Play {track} by {artist}".
        {
            name: "aria-label ~ 'Play X by Y'",
            run: el => {

                const label =
                    el.getAttribute("aria-label") ||
                    el.getAttribute("title") ||
                    "";


                const m = label.match(/^Play\s+(.+?)\s+by\s+(.+)$/i);

                if(!m) return null;


                return {
                    entity: "track",
                    artist: m[2].trim(),
                    name:   m[1].trim()
                };

            }
        }

    ];


    function replaceTrackButtons(){


        const buttons =
            document.querySelectorAll(
                'a.js-playlink:not([data-spotify-replaced])'
            );


        buttons.forEach(button=>{


            const info =
                tryStrategies(
                    "track button",
                    trackStrategies,
                    button
                );


            if(!info) return;


            button.removeAttribute("href");
            button.removeAttribute("target");


            attachSpotifyBehavior(
                button,
                info.entity,
                info.artist,
                info.name,
                "play"
            );

        });

    }



    // ----- station-style buttons (button.js-playlink-station) -----

    // Station URLs follow:
    //   /player/station/music/{artist}                (artist radio)
    //   /player/station/music/{artist}/{album}        (album radio)
    //   /player/station/music/{artist}/_/{track}      (track radio)
    // Additional segments may appear in the future; we only inspect the
    // first three after "/music/".

