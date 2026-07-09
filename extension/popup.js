// Popup settings. Values persist in chrome.storage.local. Content-script
// bridge picks up changes via chrome.storage.onChanged and updates the
// live window.__LFS_CONFIG so most toggles take effect immediately.

const DEFAULTS = {
    foreground:       false,
    autoClose:        true,
    defaultAction:    "play",
    menuDelay:        280,
    skipArtistPages:  false,
    skipAlbumPages:   false,
    skipLibraryPages: false,
};

const CONTROLS = [
    { key: "foreground",       type: "checkbox" },
    { key: "autoClose",        type: "checkbox" },
    { key: "defaultAction",    type: "radio"    },
    { key: "menuDelay",        type: "range"    },
    { key: "skipArtistPages",  type: "checkbox" },
    { key: "skipAlbumPages",   type: "checkbox" },
    { key: "skipLibraryPages", type: "checkbox" },
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


function bindRange(key, value){
    const el = document.getElementById(key);
    const label = document.getElementById(`${key}-value`);
    if(!el) return;
    el.value = value;
    if(label) label.textContent = `${value} ms`;
    el.addEventListener("input", () => {
        const n = Number(el.value);
        if(label) label.textContent = `${n} ms`;
    });
    el.addEventListener("change", () => {
        chrome.storage.local.set({ [key]: Number(el.value) });
    });
}


async function hydrate(){

    const settings = await chrome.storage.local.get(DEFAULTS);

    for (const { key, type } of CONTROLS){
        const value = settings[key];
        switch (type) {
            case "checkbox": bindCheckbox(key, value); break;
            case "radio":    bindRadio(key, value);    break;
            case "range":    bindRange(key, value);    break;
        }
    }

}

hydrate();
