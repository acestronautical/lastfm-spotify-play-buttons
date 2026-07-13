    function replaceButtons(){

        replaceTrackButtons();
        replaceStationButtons();
        replaceMusicCards();
        injectNavMenu();
        injectUserPageQueueButtons();

    }



    // ---------- queue all new recommendations ----------

    // Max tracks per batch. User-configurable in the extension popup;
    // Tampermonkey (or extension pre-hydrate) falls back to the config
    // default. Hard-capped at 50 regardless so a runaway config value
    // can't overflow the URL length used to encode the batch payload.

    const QUEUE_BATCH_HARD_CAP = 50;

    function queueBatchCap(){
        const raw = getConfig().queueLimit;
        const n = Number(raw);
