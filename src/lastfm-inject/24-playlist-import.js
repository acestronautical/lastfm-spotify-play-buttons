    // ---------- import Exportify CSV → new Last.fm playlist ----------
    //
    // Ported from scratch/gen_playlist_snippet.py. Reads a Spotify
    // export CSV (Exportify format — "Track Name" + "Artist Name(s)"
    // columns), creates a new Last.fm playlist, renames it to match
    // the filename, and adds each track via the undocumented
    // web-frontend endpoints Last.fm's own UI hits:
    //
    //   POST /user/{me}/playlists                         → create
    //   POST /user/{me}/playlists/{id}                    → rename
    //   GET  /user/{me}/playlists/{id}/search-catalogue   → canonical
    //   POST /user/{me}/playlists/{id}/entries            → add track
    //
    // Session cookies auth, Django CSRF token scraped from the
    // /playlists/create page HTML. Uses the same conservative pacing
    // and 5xx-retry logic proven in the console snippet.


    const PL_TRACK_DELAY_MS   = 2500;
    const PL_RETRY_BACKOFF_MS = 6000;
    const PL_MAX_RETRIES      = 3;
    const PL_TRACK_CAP        = 500;   // sanity cap; Last.fm playlists
                                       // in practice hold thousands but
                                       // we don't want a runaway loop


    function plSleep(ms){
        return new Promise(r => setTimeout(r, ms));
    }


    // Minimal RFC 4180-ish CSV parser: handles quoted fields, doubled
    // quotes ("") inside quotes, CRLF and LF line endings, and the
    // UTF-8 BOM Spotify's exporter emits. Returns an array of rows,
    // each row an array of field strings.

    function parseCsv(text){


        if(text.charCodeAt(0) === 0xFEFF)
            text = text.slice(1);


        const rows = [];
        let row = [];
        let field = "";
        let inQuotes = false;


        for(let i = 0; i < text.length; i++){

            const c = text[i];

            if(inQuotes){
                if(c === '"'){
                    if(text[i + 1] === '"'){
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += c;
                }
                continue;
            }

            if(c === '"'){ inQuotes = true; continue; }
            if(c === ','){ row.push(field); field = ""; continue; }
            if(c === '\r'){ continue; }
            if(c === '\n'){
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
                continue;
            }
            field += c;

        }


        if(field !== "" || row.length){
            row.push(field);
            rows.push(row);
        }


        return rows;

    }


    function csvRowsToTracks(rows){


        if(!rows.length) return [];


        const headers = rows[0].map(h => h.trim());

        const trackIdx  = headers.indexOf("Track Name");
        const artistIdx = headers.indexOf("Artist Name(s)");

        if(trackIdx < 0 || artistIdx < 0){
            throw new Error(
                'CSV missing required columns "Track Name" and "Artist Name(s)"'
            );
        }


        const tracks = [];


        for(let i = 1; i < rows.length; i++){

            const row = rows[i];
            if(!row || (row.length === 1 && row[0] === "")) continue;

            const raw   = (row[artistIdx] || "").trim();
            const track = (row[trackIdx]  || "").trim();

            // Spotify joins multi-artists with ";" (not ","); the
            // /entries endpoint 500s on multi-artist strings so keep
            // only the primary. Split on both to be defensive.
            const artist = raw.split(/[,;]/)[0].trim();

            if(artist && track)
                tracks.push({ artist, track });

        }


        return tracks;

    }


    function extractPlaylistCsrf(html){

        const m = html.match(
            /name=['"]csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)['"]/
        );

        if(!m) throw new Error("CSRF token not found in Last.fm page");

        return m[1];

    }


    // Fetches the /playlists/create page for the current user and
    // scrapes a fresh CSRF token. Called before every write — the
    // token is per-form and Django rotates them.

    async function fetchPlaylistCsrf(me){

        const r = await fetch(`/user/${me}/playlists/create`, {
            credentials: "include",
        });

        if(!r.ok) throw new Error(`create-page fetch failed: HTTP ${r.status}`);

        return extractPlaylistCsrf(await r.text());

    }


    async function lfCreatePlaylist(me, csrf){

        const body = new URLSearchParams({
            csrfmiddlewaretoken: csrf,
            ajax: "1",
        });

        const r = await fetch(`/user/${me}/playlists`, {
            method:      "POST",
            credentials: "include",
            headers: {
                "Content-Type":     "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Referer":          `${location.origin}/user/${me}/playlists/create`,
            },
            body: body.toString(),
        });

        if(!r.ok) throw new Error(`create failed: HTTP ${r.status}`);


        // Response HTML contains
        //   <div data-modal-redirect-on-close="/user/{me}/playlists/{id}">
        // — that's how we recover the new playlist's ID.
        const html = await r.text();

        const m = html.match(
            /data-modal-redirect-on-close=['"]\/user\/[^\/]+\/playlists\/(\d+)['"]/
        );

        if(!m) throw new Error("could not parse new playlist ID from response");

        return m[1];

    }


    async function lfRenamePlaylist(me, id, title, csrf){

        const body = new URLSearchParams({
            title,
            ajax: "1",
            csrfmiddlewaretoken: csrf,
        });

        const r = await fetch(`/user/${me}/playlists/${id}`, {
            method:      "POST",
            credentials: "include",
            headers: {
                "Content-Type":     "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Referer":          `${location.origin}/user/${me}/playlists/${id}`,
            },
            body: body.toString(),
        });

        if(!r.ok) throw new Error(`rename failed: HTTP ${r.status}`);

        let data;
        try { data = JSON.parse(await r.text()); } catch (_) {}

        if(!data || data.result !== true)
            throw new Error(`rename rejected: ${JSON.stringify(data)}`);

        return true;

    }


    // Match the UI flow: GET /search-catalogue before add. Parses the
    // returned chartlist rows and picks Last.fm's canonical spelling
    // for {artist, track}. Returns { artist, track, csrf } on match —
    // csrf is the per-response token embedded in every result row's
    // <form>, which we then use for the follow-up /entries POST so
    // the whole flow mirrors what the modal-driven UI does. Returns
    // null on any failure — caller falls back to raw strings + the
    // previously-fetched CSRF.

    async function lfPreSearchTrack(me, id, artist, track){


        // Strip characters that confuse the search backend or split
        // the URL — ampersand, question mark, slashes. Lower-case and
        // collapse whitespace. Matches how a human would type into
        // the modal search field ("prince daddy really") rather than
        // pasting the exact "Artist & Co — Track?" string.
        const cleanQ =
            `${artist} ${track}`
                .toLowerCase()
                .replace(/[&?\/\\]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        const q = encodeURIComponent(cleanQ);


        let html;
        try {
            const r = await fetch(
                `/user/${me}/playlists/${id}/search-catalogue?q=${q}&ajax=1`,
                { credentials: "include" }
            );
            if(!r.ok) return null;
            html = await r.text();
        } catch (_) {
            return null;
        }


        // Parse the response with the browser's HTML parser so entities
        // like &amp; get decoded properly. Each result row has a
        // <form data-playlisting-add-form> with the exact hidden
        // <input> values Last.fm expects back in the /entries POST —
        // reading those verbatim beats reconstructing from URL slugs
        // (which left "&amp;" literal and broke ampersand artists).
        let forms;
        try {
            const doc = new DOMParser().parseFromString(html, "text/html");
            forms    = doc.querySelectorAll("form[data-playlisting-add-form]");
        } catch (_) {
            return null;
        }

        if(!forms || !forms.length) return null;


        let csrf = null;
        const results = [];

        for(const form of forms){

            const a = form.querySelector('input[name="artist"]');
            const t = form.querySelector('input[name="track"]');
            const c = form.querySelector('input[name="csrfmiddlewaretoken"]');

            if(!a || !t) continue;

            if(c && !csrf) csrf = c.value;

            results.push({ artist: a.value, track: t.value });

        }

        if(!results.length) return null;


        const norm  = s => s.toLowerCase().trim();
        const wantA = norm(artist);
        const wantT = norm(track);


        // Best-effort match: prefer exact artist+track pair, then
        // exact artist, then partial artist. Fall through to first
        // result if nothing scores.
        const pair = results.find(r =>
            norm(r.artist) === wantA && norm(r.track) === wantT);
        if(pair) return { ...pair, csrf };

        const exact = results.find(r => norm(r.artist) === wantA);
        if(exact) return { ...exact, csrf };

        const substring = results.find(r =>
            norm(r.artist).includes(wantA) || wantA.includes(norm(r.artist)));
        if(substring) return { ...substring, csrf };

        return { ...results[0], csrf };

    }


    async function lfAddTrackOnce(me, id, artist, track, csrf){

        const body = new URLSearchParams({
            csrfmiddlewaretoken: csrf,
            track,
            artist,
            ajax: "1",
        });

        const r = await fetch(`/user/${me}/playlists/${id}/entries`, {
            method:      "POST",
            credentials: "include",
            headers: {
                "Content-Type":     "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Referer":          `${location.origin}/user/${me}/playlists/${id}`,
            },
            body: body.toString(),
        });

        if(!r.ok){
            const err = new Error(`HTTP ${r.status}`);
            err.status = r.status;
            throw err;
        }

        return r.text();

    }


    // Try canonical name first, fall back to raw. Retry each variant
    // on retryable 5xx codes up to PL_MAX_RETRIES with backoff. If
    // the pre-search returned a fresh CSRF from its response's form,
    // prefer that over the caller-supplied one — this mirrors the
    // add-track modal UI and avoids stale-token edge cases.

    async function lfAddTrackWithRetry(me, id, rawArtist, rawTrack, csrf){


        const canon = await lfPreSearchTrack(me, id, rawArtist, rawTrack);

        const useCsrf = (canon && canon.csrf) || csrf;

        const attempts = [];
        if(canon &&
           (canon.artist !== rawArtist || canon.track !== rawTrack))
            attempts.push({ artist: canon.artist, track: canon.track });
        attempts.push({ artist: rawArtist, track: rawTrack });


        let lastErr;

        for(const pair of attempts){
            for(let i = 0; i < PL_MAX_RETRIES; i++){
                try {
                    await lfAddTrackOnce(me, id, pair.artist, pair.track, useCsrf);
                    return { ok: true, used: pair };
                } catch (e) {
                    lastErr = e;
                    const retryable =
                        e.status === 500 ||
                        e.status === 502 ||
                        e.status === 503;
                    if(!retryable) break;
                    if(i === PL_MAX_RETRIES - 1) break;
                    await plSleep(PL_RETRY_BACKOFF_MS);
                }
            }
        }

        return { ok: false, error: lastErr ? lastErr.message : "unknown" };

    }


    // Turn a Spotify-exported filename into a human-readable playlist
    // name. Spotify's exporter (Exportify) slugifies playlist names
    // with underscores for spaces; reverse that but leave other
    // punctuation intact.

    function filenameToPlaylistName(filename){

        return filename
            .replace(/\.csv$/i, "")
            .replace(/_/g, " ")
            .trim();

    }


    // Full orchestrator: parse → create → rename → add loop. Reports
    // progress via onProgress({ phase, ... }) so the UI can render a
    // live status line. Never throws — surface errors through phase
    // "error" instead.

    async function importCsvAsPlaylist({ csvText, playlistName, onProgress }){


        const emit = (p) => { try { onProgress && onProgress(p); } catch (_) {} };


        const me = getCurrentUsername();

        if(!me){
            emit({ phase: "error", message: "Not logged in to Last.fm" });
            return { ok: false };
        }


        emit({ phase: "parsing" });

        let tracks;
        try {
            const rows = parseCsv(csvText);
            tracks = csvRowsToTracks(rows);
        } catch (e) {
            emit({ phase: "error", message: e.message });
            return { ok: false };
        }

        if(!tracks.length){
            emit({ phase: "error", message: "No tracks found in CSV" });
            return { ok: false };
        }

        if(tracks.length > PL_TRACK_CAP){
            emit({
                phase:   "warn",
                message: `Capped at ${PL_TRACK_CAP} of ${tracks.length} tracks`,
            });
        }

        const capped = tracks.slice(0, PL_TRACK_CAP);


        emit({ phase: "creating", total: capped.length });

        let id;
        try {
            const csrf = await fetchPlaylistCsrf(me);
            id = await lfCreatePlaylist(me, csrf);
        } catch (e) {
            emit({ phase: "error", message: `Create failed: ${e.message}` });
            return { ok: false };
        }

        const url = `${location.origin}/user/${me}/playlists/${id}`;


        emit({ phase: "renaming", id, url, name: playlistName });

        try {
            const rcsrf = await fetchPlaylistCsrf(me);
            await lfRenamePlaylist(me, id, playlistName, rcsrf);
        } catch (e) {
            emit({
                phase:   "warn",
                message: `Rename failed (rename by hand): ${e.message}`,
            });
        }


        let addCsrf;
        try {
            addCsrf = await fetchPlaylistCsrf(me);
        } catch (e) {
            emit({ phase: "error", message: `CSRF fetch failed: ${e.message}` });
            return { ok: false, id, url };
        }


        let ok = 0, fail = 0;
        const failures = [];

        for(let i = 0; i < capped.length; i++){

            const t = capped[i];

            emit({
                phase:   "adding",
                done:    i,
                total:   capped.length,
                current: `${t.artist} — ${t.track}`,
            });

            const res = await lfAddTrackWithRetry(me, id, t.artist, t.track, addCsrf);

            if(res.ok){
                ok++;
            } else {
                fail++;
                failures.push({ ...t, error: res.error });
            }

            // Small pause between tracks — the endpoint's tolerant but
            // hammering it produces 500s.
            await plSleep(PL_TRACK_DELAY_MS);

        }


        emit({
            phase: "done",
            id,
            url,
            ok,
            fail,
            total: capped.length,
            failures,
        });

        return { ok: true, id, url, added: ok, failed: fail, failures };

    }


