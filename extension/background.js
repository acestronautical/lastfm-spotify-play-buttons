// Background service worker.
//
// Content scripts talk to us with:
//   { type: 'openTab', url, opts }  → chrome.tabs.create for Spotify tabs
//   { type: 'closeTab' }            → chrome.tabs.remove for the sender's tab
//                                     (needed because window.close() is
//                                     blocked on tabs opened via
//                                     chrome.tabs.create — the browser
//                                     only allows close on windows opened
//                                     by window.open() from a script).

const SETTING_DEFAULTS = {
    foreground: false,
};

chrome.runtime.onMessage.addListener((msg, sender) => {

    if (!msg || typeof msg.type !== "string") {
        return;
    }


    if (msg.type === "closeTab") {

        if (sender.tab && typeof sender.tab.id === "number") {
            chrome.tabs.remove(sender.tab.id);
        }

        return;

    }


    if (msg.type !== "openTab" || typeof msg.url !== "string") {
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

        // Preserve the "opened by this tab" relationship so focus returns
        // to the opener when the puppeteer tab closes — mirrors
        // Tampermonkey's { setParent: true }.
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
