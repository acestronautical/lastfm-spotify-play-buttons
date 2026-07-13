    const LOG_PREFIX = "[lastfm→spotify]";

    const log = (...args)=>
        console.log(LOG_PREFIX, ...args);


    // ---------- config bridge ----------

    // When running as the Chrome extension, content/bridge.js populates
    // window.__LFS_CONFIG. Under Tampermonkey it's absent and getConfig()
    // returns defaults, preserving the original behaviour.

    const CONFIG_DEFAULTS = {
        autoClose: true,
    };

    function getConfig(){
        const bridged =
            (typeof window !== "undefined" && window.__LFS_CONFIG) || null;
        return bridged
            ? Object.assign({}, CONFIG_DEFAULTS, bridged)
            : CONFIG_DEFAULTS;
    }


    const params =
        new URLSearchParams(
            window.location.search
        );


    if (!params.has("lastfm")) {

        log("Normal Spotify search - ignoring");

        return;
    }


    const action =
        params.get("action") || "play";


    const entity =
        params.get("entity") || "track";


    log("action:", action, "entity:", entity);


    const TIMEOUT_MS   = 30000;
    const CLOSE_MS     = 1000;
    const MENU_WAIT_MS = 2500;
