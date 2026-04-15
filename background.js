// When a tab finishes loading, apply the saved volume for that site (hostname)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {

        // Key by hostname so the volume is remembered across sessions
        let hostname;
        try { hostname = new URL(tab.url).hostname; } catch (e) { return; }
        let key = 'site_' + hostname;

        chrome.storage.local.get([key], (result) => {
            if (result[key] !== undefined) {
                // Volume found for this site — inject it into the page
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: applyVolumeToPage,
                    args: [result[key]]
                });
            }
        });
    }
});

// ฟังก์ชันนี้จะถูกฉีดไปรันบนหน้าเว็บ
function applyVolumeToPage(vol) {
    // เก็บค่าไว้ในตัวแปร Global ของหน้าเว็บนั้น
    window.__extensionVolume = vol;

    // 1. ปรับเสียงวิดีโอ/เพลง ที่มีอยู่บนหน้าเว็บตอนนี้เลย
    document.querySelectorAll('video, audio').forEach(media => {
        media.volume = window.__extensionVolume;
    });

    // 2. ดักจับวิดีโอ/เสียงที่โหลดขึ้นมาใหม่ภายหลัง (เช่น เปลี่ยนคลิป YouTube)
    if (!window.__volumeListenerAdded) {
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
                e.target.volume = window.__extensionVolume;
            }
        }, true);
        window.__volumeListenerAdded = true;
    }
}