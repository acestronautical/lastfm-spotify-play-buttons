// Content-script bridge between the extension surface and the unmodified
// userscript source. Runs first via the manifest's content_scripts order.
//
//   1. Provides window.GM_openInTab so the injector's Tampermonkey API
//      call resolves to a chrome.runtime.sendMessage that the background
//      service worker turns into a chrome.tabs.create. Harmless on the
//      Spotify side (the puppeteer never calls it).
//
//   2. Hydrates window.__LFS_CONFIG from chrome.storage so both
//      userscripts can consult user preferences via a small getConfig()
//      helper. Under Tampermonkey window.__LFS_CONFIG is undefined and
//      getConfig() returns hardcoded defaults, preserving stand-alone
//      behavior.
//
//   3. Listens for chrome.storage changes and mutates window.__LFS_CONFIG
//      in place so runtime toggles (like autoClose or menuDelay) take
//      effect without needing a page reload.

const DEFAULTS = {
    foreground:       false,
    autoClose:        true,
    defaultAction:    "play",
    menuDelay:        280,
    entityBadges:     false,
    queueLimit:       10,
};


// Seed synchronously with defaults so anything that runs before the async
// storage read completes still sees a valid object.
window.__LFS_CONFIG = { ...DEFAULTS };


window.GM_openInTab = function (url, opts) {
    chrome.runtime.sendMessage({
        type: "openTab",
        url:  url,
        opts: opts || {},
    });
};


chrome.storage.local.get(DEFAULTS).then(cfg => {

    // Compute a "changes"-shaped object comparing the just-loaded
    // values against the synchronously-seeded defaults so the injector
    // sees the same shape it gets on storage.onChanged. Needed because
    // the initial hydration is async — if it resolves AFTER the
    // injector's first replaceButtons() call, icons render with
    // defaults and won't re-render without a change signal.

    const changes = {};

    for (const key of Object.keys(cfg)) {
        const oldValue = window.__LFS_CONFIG[key];
        const newValue = cfg[key];
        window.__LFS_CONFIG[key] = newValue;
        if (oldValue !== newValue) {
            changes[key] = { oldValue, newValue };
        }
    }

    if (Object.keys(changes).length > 0) {
        window.dispatchEvent(new CustomEvent("__lfs-config-changed", {
            detail: changes,
        }));
    }

});


chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of Object.keys(changes)) {
        window.__LFS_CONFIG[key] = changes[key].newValue;
    }
    window.dispatchEvent(new CustomEvent("__lfs-config-changed", {
        detail: changes,
    }));
});
