    // ---------- run + observe ----------

    replaceButtons();


    // Debounced observer: Last.fm re-renders track lists on route changes
    // and infinite-scroll; without debouncing this would run dozens of
    // times per second.

    let scheduled = false;

    function scheduleReplace(){

        if(scheduled) return;
        scheduled = true;


        requestAnimationFrame(()=>{
            scheduled = false;
            replaceButtons();
        });

    }


    new MutationObserver(scheduleReplace)
        .observe(
            document.body,
            {
                childList:true,
                subtree:true
            }
        );


    // Live-refresh injected icons when the extension popup changes the
    // default click action or the entity-badges toggle. The bridge
    // dispatches this CustomEvent on storage change; under Tampermonkey
    // it never fires and icons reflect the CONFIG_DEFAULTS at page load.

    window.addEventListener("__lfs-config-changed", e => {

        if (!e.detail) return;
        if (!e.detail.defaultAction && !e.detail.entityBadges) return;

        const action = getConfig().defaultAction || "play";

        document
            .querySelectorAll("[data-spotify-replaced] .spotify-custom-button")
            .forEach(span => {
                const button = span.closest("[data-spotify-replaced]");
                const entity = button?._spotify?.entity || null;
                span.innerHTML = spotifyIcon(action, entity);
            });

    });


    // Explicit hook for SPA-style navigations. The observer above
    // already catches most re-renders, but wrapping history.pushState
    // guarantees we rescan the moment the URL changes even if the new
    // DOM commit is small.

    ["pushState","replaceState"].forEach(k=>{

        const orig = history[k];

        history[k] = function(){

            const r = orig.apply(this, arguments);

            scheduleReplace();

            return r;

        };

    });


    window.addEventListener("popstate", scheduleReplace);

