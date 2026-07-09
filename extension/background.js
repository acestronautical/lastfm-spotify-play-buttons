// Background service worker.
//
// The injector content script talks to us with { type: 'openTab', url, opts }
// so we can create Spotify puppeteer tabs. Content scripts cannot create
// tabs directly under MV3 — chrome.tabs.create is only available here.

const SETTING_DEFAULTS = {
    foreground: false,
};

chrome.runtime.onMessage.addListener((msg, sender) => {

    if (!msg || msg.type !== "openTab" || typeof msg.url !== "string") {
        return;
    }

    const opts = msg.opts || {};

    // Fire-and-forget async: chrome.tabs.create doesn't need to block
    // the sender, and we don't send a response.
    chrome.storage.local.get(SETTING_DEFAULTS).then(settings => {

        const createProps = {
            url: msg.url,
            active: settings.foreground === true || opts.active === true,
        };

        // Preserve the "opened by this tab" relationship so the puppeteer
        // tab's window.close() succeeds and the browser returns focus to
        // the opener when it closes — mirrors Tampermonkey's
        // { setParent: true }.
        if (sender.tab && typeof sender.tab.id === "number") {
            createProps.openerTabId = sender.tab.id;
        }

        // Mirror Tampermonkey's { insert: true } — place the new tab
        // immediately to the right of the opener rather than at the end
        // of the tab strip.
        if (opts.insert !== false && sender.tab && typeof sender.tab.index === "number") {
            createProps.index = sender.tab.index + 1;
        }

        chrome.tabs.create(createProps);

    });

});
