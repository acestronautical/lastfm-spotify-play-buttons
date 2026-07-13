// Popup settings. Values persist in chrome.storage.local. Content-script
// bridge picks up changes via chrome.storage.onChanged and updates the
// live window.__LFS_CONFIG so most toggles take effect immediately.

const DEFAULTS = {
    foreground:       false,
    autoClose:        true,
    defaultAction:    "play",
    menuDelay:        280,
    entityBadges:     false,
    queueLimit:       10,
};

const CONTROLS = [
    { key: "foreground",       type: "checkbox" },
    { key: "autoClose",        type: "checkbox" },
    { key: "defaultAction",    type: "radio"    },
    { key: "menuDelay",        type: "range"    },
    { key: "entityBadges",     type: "checkbox" },
    { key: "queueLimit",       type: "linearRange" },
];

const REPO_URL =
    "https://github.com/acestronautical/lastfm-spotify-play-buttons";


// Version display
const manifest = chrome.runtime.getManifest();
document.getElementById("version").textContent = "v" + manifest.version;

// Repo link
document.getElementById("repo").href = REPO_URL;

// chrome://extensions can't be opened from a regular anchor in a popup
// (Chrome blocks navigation to chrome:// from popup). Route through
// chrome.tabs.create instead.
document.getElementById("extensions-link").addEventListener(
    "click",
    e => {
        e.preventDefault();
        chrome.tabs.create({ url: "chrome://extensions" });
    }
);


function bindCheckbox(key, value){
    const el = document.getElementById(key);
    if(!el) return;
    el.checked = !!value;
    el.addEventListener(
        "change",
        () => chrome.storage.local.set({ [key]: el.checked })
    );
}


function bindRadio(key, value){
    const inputs = document.querySelectorAll(`input[type="radio"][name="${key}"]`);
    inputs.forEach(input => {
        input.checked = (input.value === value);
        input.addEventListener("change", () => {
            if(input.checked){
                chrome.storage.local.set({ [key]: input.value });
            }
        });
    });
}


// A simple linear range control. Reads/writes the raw slider value.
// The `suffix` is appended to the numeric label (e.g. " tracks").
function bindLinearRange(key, value, suffix){
    const el = document.getElementById(key);
    const label = document.getElementById(`${key}-value`);
    if(!el) return;

    function render(v){
        if(!label) return;
        label.textContent = `${v}${suffix ? " " + suffix : ""}`;
    }

    el.value = value;
    render(Number(el.value));

    el.addEventListener("input", () => render(Number(el.value)));
    el.addEventListener("change", () => {
        chrome.storage.local.set({ [key]: Number(el.value) });
    });
}


function bindRange(key, value){
    const el = document.getElementById(key);
    const label = document.getElementById(`${key}-value`);
    if(!el) return;

    // Squared curve gives finer resolution near zero — a 0-100 slider
    // position maps to 0-MAX_MS. Position 100 is a sentinel for "off":
    // stored as null, injector skips the menu entirely.

    const MAX_MS    = 2000;
    const POSITIONS = Number(el.max);        // 100
    const CURVE     = 2;
    const CURVE_MAX = POSITIONS - 1;         // 99

    function msFromPos(pos){
        if(pos >= POSITIONS) return null;
        return Math.round(Math.pow(pos / CURVE_MAX, CURVE) * MAX_MS);
    }

    function posFromMs(ms){
        if(ms === null || ms === undefined) return POSITIONS;
        if(ms <= 0) return 0;
        const p = Math.round(Math.pow(ms / MAX_MS, 1 / CURVE) * CURVE_MAX);
        return Math.max(0, Math.min(CURVE_MAX, p));
    }

    function renderLabel(ms){
        if(!label) return;
        label.textContent = (ms === null) ? "Off" : `${ms} ms`;
    }

    el.value = posFromMs(value);
    renderLabel(msFromPos(Number(el.value)));

    el.addEventListener("input", () => {
        renderLabel(msFromPos(Number(el.value)));
    });
    el.addEventListener("change", () => {
        chrome.storage.local.set({ [key]: msFromPos(Number(el.value)) });
    });
}


async function hydrate(){

    const settings = await chrome.storage.local.get(DEFAULTS);

    for (const { key, type } of CONTROLS){
        const value = settings[key];
        switch (type) {
            case "checkbox":    bindCheckbox(key, value);              break;
            case "radio":       bindRadio(key, value);                 break;
            case "range":       bindRange(key, value);                 break;
            case "linearRange": bindLinearRange(key, value, "tracks"); break;
        }
    }

}

hydrate();
