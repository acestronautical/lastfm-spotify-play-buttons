// ==UserScript==
// @name         Spotify Search Last.fm Actions
// @namespace    https://github.com/
// @version      0.5
// @description  Handle Spotify actions launched from Last.fm
// @match        https://open.spotify.com/search/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';


    const params =
        new URLSearchParams(
            window.location.search
        );


    if (!params.has("lastfm")) {

        console.log(
            "Normal Spotify search - ignoring"
        );

        return;
    }


    const action =
        params.get("action") || "play";


    console.log(
        "Last.fm Spotify action:",
        action
    );


    let tries = 0;
    const maxTries = 40;



    function findFirstResult(){

        const rows =
            document.querySelectorAll(
                '[role="row"]'
            );


        for (const row of rows) {

            const title =
                row.querySelector(
                    '[data-testid="title"]'
                );


            if(title){
                return row;
            }
        }


        return null;

    }



    function closeHelper(){

        setTimeout(()=>{

            window.close();

        },1200);

    }



    function doPlay(row){

        const play =
            row.querySelector(
                'button[data-testid="play-button"]'
            );


        if(!play){

            console.log(
                "Play button not found"
            );

            return false;
        }


        console.log(
            "Playing:",
            row.innerText
        );


        play.click();

        closeHelper();

        return true;

    }



    function doLike(row){

        let like =
            row.querySelector(
                '[data-testid="save-button"] button'
            );


        if(!like){

            like =
                row.querySelector(
                    'button[aria-label*="Liked Songs"]'
                );

        }


        if(!like){

            console.log(
                "Like button not found"
            );

            return false;

        }


        console.log(
            "Liking:",
            row.innerText
        );


        like.click();


        closeHelper();

        return true;

    }



    function doQueue(row){

        const menu =
            row.querySelector(
                'button[data-testid="more-button"]'
            );


        if(!menu){

            console.log(
                "More menu not found"
            );

            return false;

        }


        console.log(
            "Opening menu"
        );


        menu.click();


        setTimeout(()=>{


            const items =
                [
                    ...document.querySelectorAll(
                        '[role="menuitem"]'
                    )
                ];


            const queue =
                items.find(
                    item =>
                    item.innerText
                        .toLowerCase()
                        .includes("queue")
                );


            if(queue){

                console.log(
                    "Adding to queue"
                );


                queue.click();


                closeHelper();


            } else {

                console.log(
                    "Queue option not found"
                );

            }


        },800);


        return true;

    }



    function attempt(){

        tries++;


        const row =
            findFirstResult();


        if(!row){

            if(tries < maxTries){

                setTimeout(
                    attempt,
                    1000
                );

            } else {

                console.log(
                    "No Spotify result found"
                );

            }


            return;

        }



        let done=false;


        switch(action){


            case "queue":

                done =
                    doQueue(row);

                break;



            case "like":

                done =
                    doLike(row);

                break;



            case "play":

            default:

                done =
                    doPlay(row);

                break;

        }



        if(!done && tries < maxTries){

            setTimeout(
                attempt,
                1000
            );

        }

    }



    setTimeout(
        attempt,
        3000
    );


})();