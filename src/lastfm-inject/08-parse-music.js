    // ---------- Last.fm targets ----------

    // Extract {entity, artist, name} from a Last.fm element using
    // layered strategies. Each strategy is tried until one returns a
    // complete tuple; if we fall past the primary path we log so we can
    // pre-empt breakage before Last.fm removes an old attribute.

    function tryStrategies(label, strategies, el){


        for(const { name, run } of strategies){


            let result;

            try {
                result = run(el);
            } catch (e) {
                log(`${label} strategy "${name}" threw:`, e);
                continue;
            }


            if(result){

                if(name !== strategies[0].name)
                    log(`${label} matched via fallback "${name}"`);

                return result;

            }

        }


        return null;

    }


    // Percent- and plus-decoded string, safe against malformed URIs.
    function decodeSeg(s){

        try {
            return decodeURIComponent(s).replace(/\+/g," ");
        } catch {
            return s.replace(/\+/g," ");
        }

    }


    // Parse the /music/{artist}[/{album|_}/{track}] path segments used
    // throughout Last.fm's URL scheme (both /music/... links and
    // /player/station/music/... station URLs).
    //
    // Last.fm reserves "+"-prefixed segments (+similar, +bookmarks,
    // +tags, +wiki, +events, +listeners, +albums, +tracks, …) for
    // meta sub-pages. They look like real path segments but have no
    // coherent Spotify equivalent, so we reject them at the parser.

    function parseMusicPath(pathish){


        const m =
            pathish.match(
                /\/music\/([^/?#]+)(?:\/([^/?#]+))?(?:\/([^/?#]+))?/
            );


        if(!m) return null;


        // Reject on raw (still-encoded) segments — Last.fm encodes
        // real spaces as "+", so we must check for the literal "+"
        // prefix before decodeSeg would turn it into " ".

        if(m[2] && m[2].startsWith("+")) return null;
        if(m[3] && m[3].startsWith("+")) return null;


        return {
            artist: decodeSeg(m[1]),
            second: m[2] ? decodeSeg(m[2]) : null,
            third:  m[3] ? decodeSeg(m[3]) : null
        };

    }



    // ----- track-style buttons (a.js-playlink) -----

