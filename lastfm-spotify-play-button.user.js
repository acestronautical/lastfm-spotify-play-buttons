// ==UserScript==
// @name         Last.fm Spotify Play Button
// @namespace    https://github.com/
// @version      2.3
// @description  Replace Last.fm track play buttons with Spotify-style buttons
// @match        https://www.last.fm/*
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    console.log("Last.fm Spotify button loaded");


    const style = document.createElement("style");

    style.textContent = `

        .spotify-custom-button {
            display:flex !important;
            align-items:center !important;
            justify-content:center !important;
            width:32px !important;
            height:32px !important;
            pointer-events:none !important;
        }

        .spotify-custom-button svg {
            display:block !important;
            width:32px !important;
            height:32px !important;
        }


        /* Larger icon for Last.fm home recommendation cards */
        .recs-feed-playlink .spotify-custom-button {
            width:44px !important;
            height:44px !important;
        }

        .recs-feed-playlink .spotify-custom-button svg {
            width:44px !important;
            height:44px !important;
        }


        /* Remove Last.fm play overlay styling */
        a[data-spotify-replaced]::before,
        a[data-spotify-replaced]::after {
            display:none !important;
        }

    `;

    document.head.appendChild(style);



    function spotifyIcon() {

        return `
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
                    fill="#fff"/>

            </svg>

        </span>`;
    }



    function replaceButtons() {


        const buttons = document.querySelectorAll(
            'a.js-playlink[data-track-name][data-artist-name]'
        );


        buttons.forEach(button => {


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
                encodeURIComponent(
                    `${artist} ${track}`
                );



            button.dataset.spotifyReplaced = "true";



            // Remove YouTube behavior
            button.removeAttribute("href");
            button.removeAttribute("target");
            button.removeAttribute("data-youtube-id");
            button.removeAttribute("data-youtube-url");



            button.innerHTML = spotifyIcon();



            button.title =
                `Play on Spotify: ${artist} - ${track}`;



            button.addEventListener(
                "mouseenter",
                () => {
                    button.style.transform = "scale(1.12)";
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
                function(e) {

                    e.preventDefault();
                    e.stopPropagation();


                    console.log(
                        "Spotify:",
                        artist,
                        "-",
                        track
                    );


                    GM_openInTab(
                        spotifyUrl,
                        {
                            active:false,
                            insert:true,
                            setParent:true
                        }
                    );

                },
                true
            );


            console.log(
                "Replaced:",
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