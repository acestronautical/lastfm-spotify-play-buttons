// ==UserScript==
// @name         Spotify Search Auto Play First Track
// @namespace    https://github.com/
// @version      0.4
// @description  Clicks the first Spotify search result play button automatically and closes helper tab
// @match        https://open.spotify.com/search/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("Spotify auto-play active");


    let tries = 0;
    const maxTries = 40;


    function closeHelperTab() {

        console.log("Closing Spotify helper tab");

        setTimeout(() => {
            window.close();
        }, 3000);

    }



    function tryPlay() {

        tries++;


        const rows =
            document.querySelectorAll('[role="row"]');


        for (const row of rows) {


            const title =
                row.querySelector('[data-testid="title"]');


            const play =
                row.querySelector(
                    'button[data-testid="play-button"]'
                );


            if (title && play) {


                console.log(
                    "Found track:",
                    title.innerText
                );


                const event =
                    new MouseEvent(
                        "click",
                        {
                            bubbles:true,
                            cancelable:true,
                            view:window
                        }
                    );


                play.dispatchEvent(event);


                console.log(
                    "Clicked play"
                );


                closeHelperTab();


                return;

            }

        }


        if (tries < maxTries) {

            setTimeout(
                tryPlay,
                1000
            );

        } else {

            console.log(
                "No playable track found"
            );

        }

    }



    setTimeout(
        tryPlay,
        3000
    );


})();