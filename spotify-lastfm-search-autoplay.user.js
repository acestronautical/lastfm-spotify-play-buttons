// ==UserScript==
// @name         Spotify Search Auto Play First Track
// @namespace    https://github.com/
// @version      0.3
// @description  Auto play Spotify searches launched from Last.fm only
// @match        https://open.spotify.com/search/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';


    const params = new URLSearchParams(
        window.location.search
    );


    if (!params.has("lastfm")) {
        console.log(
            "Normal Spotify search - ignoring"
        );
        return;
    }


    console.log(
        "Last.fm Spotify handoff detected"
    );


    let tries = 0;
    const maxTries = 30;


    function tryPlay() {

        tries++;


        const rows =
            document.querySelectorAll(
                '[role="row"]'
            );


        for (const row of rows) {


            const title =
                row.querySelector(
                    '[data-testid="title"]'
                );


            const play =
                row.querySelector(
                    'button[data-testid="play-button"]'
                );


            if (title && play) {


                console.log(
                    "Playing:",
                    title.innerText
                );


                play.click();


                console.log(
                    "Playback started"
                );


                setTimeout(() => {

                    window.close();

                }, 1500);


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