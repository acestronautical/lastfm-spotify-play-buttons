    // ---------- icon ----------

    // Every icon shares the green Spotify disc. Play and like also
    // overlay the three wave lines from the Spotify wordmark; queue
    // drops them because horizontal wave strokes would clash visually
    // with the horizontal queue-list bars.

    const SPOTIFY_DISC = `
<circle
    cx="16"
    cy="16"
    r="16"
    fill="#1DB954"/>`;

    const SPOTIFY_WAVES = `
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
    stroke-linecap="round"/>`;

    const SPOTIFY_GLYPHS = {

        play: `${SPOTIFY_WAVES}
<path
    d="M13 9L13 23L23 16Z"
    fill="#fff"/>`,

        queue: `
<g transform="translate(4 4) scale(0.75)">
<path
    d="M9 11.5h14M9 16h14M9 20.5h9"
    fill="none"
    stroke="#fff"
    stroke-width="2.4"
    stroke-linecap="round"/>
</g>`,

        like: `${SPOTIFY_WAVES}
<g transform="translate(4 4) scale(0.75)">
<path
    d="M16 24c-6.2-4.5-9.5-7.4-9.5-11.6 0-2.7 2-4.8 4.7-4.8 1.8 0 3.5 1 4.8 2.7 1.3-1.7 3-2.7 4.8-2.7 2.7 0 4.7 2.1 4.7 4.8 0 4.2-3.3 7.1-9.5 11.6z"
    fill="#fff"/>
</g>`,

    };

    // Optional entity badge in the bottom-right of the disc. Rendered
    // only when the popup's "Show entity badges" toggle is on. Each
    // badge is a small white circle background with a dark icon inside
    // (person / record / musical note) sized to sit at (24, 24) with
    // radius 5 in the 32x32 viewBox.

    const SPOTIFY_ENTITY_BADGES = {

        artist: `
<circle cx="24" cy="24" r="5" fill="#fff"/>
<circle cx="24" cy="22.3" r="1.3" fill="#111"/>
<path d="M20.6 27c0-1.8 1.6-2.9 3.4-2.9s3.4 1.1 3.4 2.9z" fill="#111"/>`,

        album: `
<circle cx="24" cy="24" r="5" fill="#fff"/>
<circle cx="24" cy="24" r="3" fill="#111"/>
<circle cx="24" cy="24" r="0.7" fill="#fff"/>`,

        track: `
<circle cx="24" cy="24" r="5" fill="#fff"/>
<ellipse cx="22.8" cy="26" rx="1.3" ry="1" fill="#111"/>
<path d="M23.9 26v-4.6" stroke="#111" stroke-width="0.7" stroke-linecap="round"/>
<path d="M23.9 21.4c1.5.3 1.9 1.6 1.1 2.5" stroke="#111" stroke-width="0.7" fill="none" stroke-linecap="round"/>`,

    };

    function spotifyIcon(action, entity){

        const glyph = SPOTIFY_GLYPHS[action] || SPOTIFY_GLYPHS.play;

        const badge = (getConfig().entityBadges && entity)
            ? (SPOTIFY_ENTITY_BADGES[entity] || "")
            : "";

        // Badge sits at (24, 24) in the raw glyph coordinates; wrap it
        // in a translate(3 3) so it renders at (27, 27) — half over the
        // green disc, half poking out into the bottom-right corner for
        // a clearer "attached" look.
        const badgeMarkup = badge
            ? `<g transform="translate(3 3)">${badge}</g>`
            : "";

        return `
<svg viewBox="0 0 32 32"
     xmlns="http://www.w3.org/2000/svg"
     aria-hidden="true">${SPOTIFY_DISC}${glyph}${badgeMarkup}
</svg>`;

    }



