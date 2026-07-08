// ==UserScript==
// @name         Last.fm Spotify Play Button
// @namespace    https://github.com/
// @version      1.8
// @description  Replace Last.fm play buttons with Spotify-style buttons
// @match        https://www.last.fm/*
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    console.log("Last.fm Spotify button loaded");


    const style = document.createElement("style");

    style.textContent = `
        .chartlist-play-button::before,
        .chartlist-play-button::after {
            display:none !important;
        }

        .spotify-custom-button {
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            width:30px !important;
            height:30px !important;
        }

        .spotify-custom-button svg {
            width:30px !important;
            height:30px !important;
            display:block !important;
        }
    `;

    document.head.appendChild(style);



    function replaceButtons() {

        document.querySelectorAll(
            'a.chartlist-play-button.js-playlink'
        ).forEach(button => {


            if (button.dataset.spotifyReplaced) {
                return;
            }


            const track = button.dataset.trackName;
            const artist = button.dataset.artistName;


            if (!track || !artist) {
                return;
            }


            const spotifyUrl =
                "https://open.spotify.com/search/" +
                encodeURIComponent(`${artist} ${track}`);



            button.dataset.spotifyReplaced = "true";


            // Remove YouTube behavior
            button.removeAttribute("href");
            button.removeAttribute("target");
            button.removeAttribute("data-playlink-affiliate");
            button.removeAttribute("data-youtube-id");
            button.removeAttribute("data-youtube-url");
            button.removeAttribute("data-analytics-label");



            button.innerHTML = `
                <span class="spotify-custom-button">

                    <svg viewBox="0 0 32 32"
                         xmlns="http://www.w3.org/2000/svg">

                        <circle
                            cx="16"
                            cy="16"
                            r="16"
                            fill="#1DB954"/>

                        <path
                            d="M8 12.5 C14 10.5 21 11 25 13"
                            fill="none"
                            stroke="#000"
                            stroke-width="2"
                            stroke-linecap="round"/>

                        <path
                            d="M9 16 C14 14.5 20 15 23.5 17"
                            fill="none"
                            stroke="#000"
                            stroke-width="2"
                            stroke-linecap="round"/>

                        <path
                            d="M10.5 19.5 C14 18.5 18 19 21 20.5"
                            fill="none"
                            stroke="#000"
                            stroke-width="2"
                            stroke-linecap="round"/>

                        <path
                            d="M13 9 L13 23 L23 16 Z"
                            fill="#ffffff"/>

                    </svg>

                </span>
            `;



            button.title =
                `Play on Spotify: ${artist} - ${track}`;



            button.style.cssText = `
                display:inline-flex !important;
                align-items:center !important;
                justify-content:center !important;
                width:32px !important;
                height:32px !important;
                padding:0 !important;
                margin:0 !important;
                background:transparent !important;
                border:none !important;
                cursor:pointer !important;
                opacity:1 !important;
                text-decoration:none !important;
            `;



            button.addEventListener(
                "mouseenter",
                () => {
                    button.style.transform = "scale(1.15)";
                }
            );


            button.addEventListener(
                "mouseleave",
                () => {
                    button.style.transform = "scale(1)";
                }
            );



            button.addEventListener(
                "click",
                (e) => {

                    e.preventDefault();
                    e.stopPropagation();


                    console.log(
                        "Opening Spotify:",
                        artist,
                        "-",
                        track
                    );


                    GM_openInTab(
                        spotifyUrl,
                        {
                            active: false,
                            insert: true,
                            setParent: true
                        }
                    );


                },
                true
            );



            console.log(
                "Spotify button:",
                artist,
                "-",
                track
            );

        });
    }



    replaceButtons();



    new MutationObserver(replaceButtons)
        .observe(
            document.body,
            {
                childList:true,
                subtree:true
            }
        );


})();