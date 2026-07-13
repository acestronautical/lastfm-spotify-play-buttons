    const stationStrategies = [

        // Primary: parse data-station-url.
        {
            name: "data-station-url path",
            run: el => {

                const raw = el.dataset.stationUrl || "";

                const parts = parseMusicPath(raw);

                if(!parts) return null;


                return musicPartsToInfo(parts);

            }
        },

        // Fallback: pull the same path out of a nearby link. Some
        // Last.fm pages render station buttons alongside a canonical
        // /music/... link even when data-station-url is missing.
        {
            name: "sibling /music/... anchor",
            run: el => {

                const scope =
                    el.closest(
                        "[data-track-name], [data-artist-name], article, section, li, tr"
                    ) || el.parentElement;


                if(!scope) return null;


                const a =
                    scope.querySelector('a[href*="/music/"]');


                if(!a) return null;


                const parts =
                    parseMusicPath(a.getAttribute("href") || "");


                if(!parts) return null;


                return musicPartsToInfo(parts);

            }
        }

    ];


    function musicPartsToInfo(parts){


        // Artist-only radio.
        if(!parts.second){

            return {
                entity: "artist",
                artist: parts.artist,
                name:   ""
            };

        }


        // Track — two URL shapes both use a third segment:
        //   /music/{artist}/_/{track}       Last.fm's canonical form
        //   /music/{artist}/{album}/{track} album-context (used by
        //                                   chartlist track links)
        if(parts.third){

            return {
                entity: "track",
                artist: parts.artist,
                name:   parts.third
            };

        }


        // Album (two segments).
        return {
            entity: "album",
            artist: parts.artist,
            name:   parts.second
        };

    }


    function replaceStationButtons(){
