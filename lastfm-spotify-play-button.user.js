// ==UserScript==
// @name         Last.fm Spotify Play Button
// @namespace    https://github.com/
// @version      2.9
// @description  Replace Last.fm track and album play buttons with Spotify-style buttons and actions
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
}

.spotify-custom-button svg {
    display:block !important;
    width:32px !important;
    height:32px !important;
}


.recs-feed-playlink .spotify-custom-button {
    width:44px !important;
    height:44px !important;
}

.recs-feed-playlink .spotify-custom-button svg {
    width:44px !important;
    height:44px !important;
}


.spotify-menu-anchor {
    position:absolute !important;
    z-index:2147483647 !important;
}


.spotify-menu {
    display:none;
    position:absolute;

    left:0;
    top:100%;

    width:88px;

    background:rgba(25,25,25,.72);
    backdrop-filter:blur(8px);

    border-radius:5px;
    padding:4px 0;

    z-index:2147483647 !important;

    box-shadow:
        0 4px 16px rgba(0,0,0,.55);

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;

    font-size:12px;
}


.spotify-menu-item {
    padding:6px 10px;
    color:#ddd;
    cursor:pointer;
    white-space:nowrap;
}


.spotify-menu-item:hover {
    background:#1DB954;
    color:#000;
}


a[data-spotify-replaced]::before,
a[data-spotify-replaced]::after,
button[data-spotify-replaced]::before,
button[data-spotify-replaced]::after {
    display:none !important;
}

`;

    document.head.appendChild(style);



    function spotifyIcon(){

        return `
<svg viewBox="0 0 32 32"
     xmlns="http://www.w3.org/2000/svg">

<circle
    cx="16"
    cy="16"
    r="16"
    fill="#1DB954"/>

<path
    d="M8 12.5C14 10.5 21 11 25 13"
    fill="none"
    stroke="#000"
    stroke-width="2"
    stroke-linecap="round"/>

<path
    d="M9 16C14 14.5 20 15 23.5 17"
    fill="none"
    stroke="#000"
    stroke-width="2"
    stroke-linecap="round"/>

<path
    d="M10.5 19.5C14 18.5 18 19 21 20.5"
    fill="none"
    stroke="#000"
    stroke-width="2"
    stroke-linecap="round"/>

<path
    d="M13 9L13 23L23 16Z"
    fill="#fff"/>

</svg>`;
    }



    function openSpotify(url){

        GM_openInTab(
            url,
            {
                active:false,
                insert:true,
                setParent:true
            }
        );

    }



    function makeSpotifyUrl(type,artist,name,action){

        return (
            "https://open.spotify.com/search/" +
            encodeURIComponent(
                `${artist} ${name} ${type}`
            ) +
            "?lastfm=true&action=" +
            action
        );

    }



    function addMenu(button,artist,name,type){

        const anchor =
            document.createElement("span");

        anchor.className =
            "spotify-menu-anchor";


        const menu =
            document.createElement("div");

        menu.className =
            "spotify-menu";


        [
            ["Play","play"],
            ["Queue","queue"],
            ["Like","like"]

        ].forEach(action=>{


            const item =
                document.createElement("div");

            item.className =
                "spotify-menu-item";

            item.textContent =
                action[0];


            item.onclick=e=>{

                e.preventDefault();
                e.stopPropagation();


                openSpotify(
                    makeSpotifyUrl(
                        type,
                        artist,
                        name,
                        action[1]
                    )
                );

            };


            menu.appendChild(item);

        });


        anchor.appendChild(menu);


        const parent =
            button.parentElement;


        parent.style.position =
            "relative";


        parent.appendChild(anchor);



        const updatePosition = ()=>{

            const r =
                button.getBoundingClientRect();

            const pr =
                parent.getBoundingClientRect();


            anchor.style.left =
                (r.left - pr.left) + "px";


            anchor.style.top =
                (r.top - pr.top + r.height) + "px";

        };


        updatePosition();


        button.addEventListener(
            "mouseenter",
            ()=>{

                updatePosition();

                menu.style.display="block";

            }
        );


        button.addEventListener(
            "mouseleave",
            ()=>{

                setTimeout(()=>{

                    if(!menu.matches(":hover"))
                        menu.style.display="none";

                },150);

            }
        );


        menu.addEventListener(
            "mouseleave",
            ()=>{

                menu.style.display="none";

            }
        );

    }



    function styleButton(button){

        button.addEventListener(
            "mouseenter",
            ()=>{
                button.style.transform="scale(1.12)";
            }
        );


        button.addEventListener(
            "mouseleave",
            ()=>{
                button.style.transform="scale(1)";
            }
        );

    }



    function replaceTrackButtons(){

        document.querySelectorAll(
            'a.js-playlink[data-track-name][data-artist-name]'
        ).forEach(button=>{


            if(button.dataset.spotifyReplaced)
                return;


            const track =
                button.dataset.trackName;


            const artist =
                button.dataset.artistName;


            if(!track || !artist)
                return;


            button.dataset.spotifyReplaced =
                "true";


            button.removeAttribute("href");
            button.removeAttribute("target");


            button.innerHTML =
                `
<span class="spotify-custom-button">
${spotifyIcon()}
</span>`;


            button.onclick=e=>{

                e.preventDefault();
                e.stopPropagation();


                openSpotify(
                    makeSpotifyUrl(
                        "track",
                        artist,
                        track,
                        "play"
                    )
                );

            };


            addMenu(
                button,
                artist,
                track,
                "track"
            );


            styleButton(button);

        });

    }



    function replaceAlbumButtons(){

        document.querySelectorAll(
            'button.js-playlink-station[data-station-url]'
        ).forEach(button=>{


            if(button.dataset.spotifyReplaced)
                return;


            const match =
                button.dataset.stationUrl.match(
                    /\/player\/station\/music\/([^/]+)\/(.+)/
                );


            if(!match)
                return;


            const artist =
                decodeURIComponent(match[1])
                .replace(/\+/g," ");


            const album =
                decodeURIComponent(match[2])
                .replace(/\+/g," ");



            button.dataset.spotifyReplaced =
                "true";


            button.innerHTML =
                `
<span class="spotify-custom-button">
${spotifyIcon()}
</span>`;


            button.onclick=e=>{

                e.preventDefault();
                e.stopPropagation();


                openSpotify(
                    makeSpotifyUrl(
                        "album",
                        artist,
                        album,
                        "play"
                    )
                );

            };


            addMenu(
                button,
                artist,
                album,
                "album"
            );


            styleButton(button);

        });

    }



    function replaceButtons(){

        replaceTrackButtons();
        replaceAlbumButtons();

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