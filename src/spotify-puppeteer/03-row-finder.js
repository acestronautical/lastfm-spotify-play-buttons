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



