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

            finish(false);

            return;

        }


        let success = false;

        switch(action){


            case "queue":

                success = await doQueue(row);
                break;


            case "like":

                success = doLike(row);
                break;


            case "play":

            default:

                success = doPlay(row);
                break;

        }


        finish(success);

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
