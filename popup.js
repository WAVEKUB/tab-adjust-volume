const slider = document.getElementById('volumeSlider');
const volumeLabel = document.getElementById('volumeValue');

// ฟังก์ชันสำหรับอัปเดตตัวเลขหน้าตา UI
function updateUI(vol) {
    slider.value = vol;
    volumeLabel.innerText = Math.round(vol * 100) + '%';
}

// 1. When popup opens, load the saved volume for this site (by hostname)
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let url = tabs[0].url;
    let hostname;
    try { hostname = new URL(url).hostname; } catch (e) { hostname = null; }
    let key = 'site_' + hostname;

    chrome.storage.local.get([key], (result) => {
        // Use saved value, or default to 1 (100%) if none saved yet
        let savedVolume = (hostname && result[key] !== undefined) ? result[key] : 1;
        updateUI(savedVolume);
    });
});

// 2. เมื่อผู้ใช้เลื่อนสไลเดอร์ปรับเสียง
slider.addEventListener('input', async (e) => {
    let volume = parseFloat(e.target.value);
    updateUI(volume);

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Save volume keyed by hostname — persists across browser restarts
    let hostname;
    try { hostname = new URL(tab.url).hostname; } catch (e) { hostname = null; }
    if (hostname) {
        chrome.storage.local.set({ ['site_' + hostname]: volume });
    }

    // สั่งให้ปรับเสียงหน้าเว็บเดี๋ยวนั้นเลย (ไม่ต้องรอโหลดหน้าใหม่)
    if (tab.url.startsWith("http")) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (vol) => {
                window.__extensionVolume = vol;
                document.querySelectorAll('video, audio').forEach(m => m.volume = vol);

                // เผื่อว่า Background ยังไม่ได้ติด Listener ให้ ก็ติดให้เลย
                if (!window.__volumeListenerAdded) {
                    document.addEventListener('play', (e) => {
                        if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
                            e.target.volume = window.__extensionVolume;
                        }
                    }, true);
                    window.__volumeListenerAdded = true;
                }
            },
            args: [volume]
        });
    }
});