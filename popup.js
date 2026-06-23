const slider = document.getElementById('volumeSlider');
const volumeLabel = document.getElementById('volumeValue');
const siteHost = document.getElementById('siteHost');
const siteIcon = document.getElementById('siteIcon');
const statusText = document.getElementById('statusText');
const resetButton = document.getElementById('resetButton');
const presetButtons = Array.from(document.querySelectorAll('.preset-button'));

let activeTab = null;
let hostname = null;
let storageKey = null;
let isSupportedPage = false;
let pendingVolume = null;
let isApplyingVolume = false;

function clampVolume(volume) {
    return Math.min(1, Math.max(0, Number(volume) || 0));
}

function formatVolume(volume) {
    return Math.round(clampVolume(volume) * 100) + '%';
}

function setStatus(message) {
    statusText.innerText = message;
}

// update UI
function updateUI(volume) {
    let normalizedVolume = clampVolume(volume);
    let percent = formatVolume(normalizedVolume);

    slider.value = normalizedVolume;
    slider.style.setProperty('--slider-fill', percent);
    slider.setAttribute('aria-valuetext', percent);
    volumeLabel.innerText = percent;

    presetButtons.forEach((button) => {
        let presetVolume = parseFloat(button.dataset.volume);
        button.classList.toggle('is-active', Math.abs(presetVolume - normalizedVolume) < 0.005);
    });
}

function setControlsDisabled(isDisabled) {
    document.body.classList.toggle('is-disabled', isDisabled);
    slider.disabled = isDisabled;
    resetButton.disabled = isDisabled;
    presetButtons.forEach((button) => {
        button.disabled = isDisabled;
    });
}

function getHostname(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return null;
    }
}

function isWebPage(url) {
    return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')));
}

function getActiveTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs[0] || null);
        });
    });
}

function getStoredVolume(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key]);
        });
    });
}

function saveVolume(key, volume) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: clampVolume(volume) }, resolve);
    });
}

function clearSavedVolume(key) {
    return new Promise((resolve) => {
        chrome.storage.local.remove(key, resolve);
    });
}

function wait(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function requestApplyVolume(volume) {
    if (!isSupportedPage || !activeTab) {
        return;
    }

    pendingVolume = clampVolume(volume);
    updateUI(pendingVolume);
    processVolumeQueue();
}

async function processVolumeQueue() {
    if (isApplyingVolume) {
        return;
    }

    isApplyingVolume = true;

    while (pendingVolume !== null) {
        let volumeToApply = pendingVolume;
        pendingVolume = null;
        await saveVolume(storageKey, volumeToApply);

        try {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: applyVolumeToPage,
                args: [volumeToApply]
            });

            if (pendingVolume === null) {
                setStatus('volume set to ' + formatVolume(volumeToApply));
            }
        } catch (e) {
            setStatus('Chrome is blocking the volume change on this page. Please allow the extension to run on this site.');
            pendingVolume = null;
        }
    }

    isApplyingVolume = false;
}

async function resetVolume() {
    if (!isSupportedPage || !activeTab) {
        return;
    }

    pendingVolume = null;
    updateUI(1);

    while (isApplyingVolume) {
        await wait(20);
    }

    await clearSavedVolume(storageKey);

    try {
        await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: applyVolumeToPage,
            args: [1]
        });
        setStatus('Reset to default 100%');
    } catch (e) {
        setStatus('Volume reset but failed to adjust on this page');
    }
}

async function initializePopup() {
    activeTab = await getActiveTab();
    hostname = activeTab ? getHostname(activeTab.url) : null;
    isSupportedPage = Boolean(activeTab && isWebPage(activeTab.url) && hostname);
    storageKey = hostname ? 'site_' + hostname : null;

    if (!isSupportedPage) {
        siteIcon.innerText = '-';
        siteHost.innerText = 'หน้านี้ไม่รองรับ';
        updateUI(1);
        setControlsDisabled(true);
        setStatus('Use with http and https web pages only');
        return;
    }

    siteHost.innerText = hostname;
    siteIcon.innerText = hostname.charAt(0).toUpperCase();
    setControlsDisabled(false);

    let savedVolume = await getStoredVolume(storageKey);
    updateUI(savedVolume === undefined ? 1 : savedVolume);
    setStatus(savedVolume === undefined ? 'No saved value for this site' : 'Loaded saved value');
}

// This function will be injected and run on the webpage
function applyVolumeToPage(volume) {
    window.__extensionVolume = volume;
    document.querySelectorAll('video, audio').forEach(media => {
        media.volume = window.__extensionVolume;
    });

    if (!window.__volumeListenerAdded) {
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
                e.target.volume = window.__extensionVolume;
            }
        }, true);
        window.__volumeListenerAdded = true;
    }
}

// 1. When popup opens, load the saved volume for this site (by hostname)
initializePopup();

// 2. When user changes the slider or clicks a preset button, save and apply the new volume to the page
slider.addEventListener('input', (e) => {
    requestApplyVolume(parseFloat(e.target.value));
});

presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
        requestApplyVolume(parseFloat(button.dataset.volume));
    });
});

resetButton.addEventListener('click', () => {
    resetVolume();
});
