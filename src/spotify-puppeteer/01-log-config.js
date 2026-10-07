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


    // Reassigned per batch item in SPA-navigation mode (the batch
    // carries an entity per item); starts from the load-time param.
    let entity =
        params.get("entity") || "track";


    log("action:", action, "entity:", entity);


    const TIMEOUT_MS   = 30000;
    const CLOSE_MS     = 1000;
    const MENU_WAIT_MS = 2500;

    // SPA fast-path tuning: how long to wait for in-app search results
    // to reflect a navigator.push before falling back to a full reload,
    // and a courtesy pause between SPA hops so the previous action's
    // request has fired.
    const SPA_NAV_TIMEOUT_MS = 4000;
    const SPA_HOP_DELAY_MS   = 300;
