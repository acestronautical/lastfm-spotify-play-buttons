    // ---------- config bridge ----------

    // When running as the Chrome extension, content/bridge.js populates
    // window.__LFS_CONFIG from chrome.storage and keeps it in sync. Under
    // Tampermonkey there is no bridge, so getConfig() falls back to the
    // defaults below and behaviour matches the stand-alone userscript.

    const CONFIG_DEFAULTS = {
        defaultAction:    "play",
        menuDelay:        280,
        entityBadges:     false,
        queueLimit:       10,
    };

    function getConfig(){
        const bridged =
            (typeof window !== "undefined" && window.__LFS_CONFIG) || null;
        return bridged
            ? Object.assign({}, CONFIG_DEFAULTS, bridged)
            : CONFIG_DEFAULTS;
    }



