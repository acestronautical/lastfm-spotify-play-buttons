// Bridges Tampermonkey's GM_openInTab API to chrome.runtime so the same
// userscript source can run as an extension content script unmodified.
//
// Content scripts loaded on the same page share the isolated-world global
// object, so this assignment is visible to lastfm-inject.js (loaded after
// this file per the manifest's content_scripts order).

window.GM_openInTab = function (url, opts) {
    chrome.runtime.sendMessage({
        type: "openTab",
        url: url,
        opts: opts || {},
    });
};
