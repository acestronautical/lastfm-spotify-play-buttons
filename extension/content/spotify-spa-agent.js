// Main-world SPA agent (manifest world:"MAIN").
//
// The puppeteer content script runs in the isolated world and therefore
// can't read Spotify's React fiber (page-world expando properties like
// __reactFiber$… are invisible across the isolation boundary). This
// agent runs in the page's own world, finds the React Router "navigator"
// (history object), and performs in-app route changes on request so
// batch queueing can hop between searches without full page reloads.
//
// Channel (the only reliable isolated↔main bridge is the shared DOM):
//   - Agent sets <html data-lfs-spa="ready"> once the navigator is found.
//   - Puppeteer sets <html data-lfs-spa-goto="/search/…"> and dispatches
//     a "lfs-spa-nav" event on document; the agent reads the attribute
//     and calls navigator.push(path).
//
// Tampermonkey doesn't load this file — that userscript already runs in
// the main world and walks the fiber directly.

(function () {
    "use strict";

    function findNavigator() {
        try {
            let rootEl = null, fiberKey = null;

            for (const el of document.querySelectorAll("div, main, body")) {
                const k = Object.keys(el).find(k =>
                    k.startsWith("__reactFiber$") ||
                    k.startsWith("__reactContainer$"));
                if (k) { rootEl = el; fiberKey = k; break; }
            }

            if (!rootEl) return null;

            const seen = new Set();
            const stack = [rootEl[fiberKey]];
            let visited = 0;

            while (stack.length && visited < 20000) {
                const f = stack.pop();
                visited++;
                if (!f || seen.has(f)) continue;
                seen.add(f);

                const v = f.memoizedProps && f.memoizedProps.value;
                if (v && typeof v === "object") {
                    if (v.navigator &&
                        typeof v.navigator.push === "function" &&
                        typeof v.navigator.createHref === "function") {
                        return v.navigator;
                    }
                    if (typeof v.push === "function" &&
                        typeof v.createHref === "function" &&
                        typeof v.listen === "function") {
                        return v;
                    }
                }

                if (f.child) stack.push(f.child);
                if (f.sibling) stack.push(f.sibling);
            }
        } catch (_) { /* ignore */ }

        return null;
    }

    let nav = null;

    function ensureNav() {
        if (!nav) nav = findNavigator();
        if (nav) document.documentElement.setAttribute("data-lfs-spa", "ready");
        return nav;
    }

    // The router isn't mounted at document_idle; poll briefly for it.
    let tries = 0;
    const iv = setInterval(() => {
        if (ensureNav() || ++tries > 40) clearInterval(iv);
    }, 300);

    document.addEventListener("lfs-spa-nav", () => {
        const n = ensureNav();
        if (!n) return;
        const path = document.documentElement.getAttribute("data-lfs-spa-goto");
        if (path) { try { n.push(path); } catch (_) { /* ignore */ } }
    });

})();
