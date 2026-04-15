# Tab Volume Controller

A Chrome extension that lets you independently control the audio volume of each browser tab — and remembers your preference per website across sessions.

## Features

- 🔊 **Per-tab volume control** — Adjust the volume slider in the popup to set the audio level for the current tab only.
- 💾 **Persistent per-site memory** — Volume settings are saved by hostname, so your preferred volume for YouTube, Spotify, or any other site is automatically restored every time you visit.
- ▶️ **Dynamic media support** — Catches `<video>` and `<audio>` elements that are loaded after the page initializes (e.g., when YouTube changes clips), so the volume stays consistent throughout your session.
- ⚡ **Instant apply** — Volume changes take effect immediately without needing to reload the page.

## How It Works

| Component | Role |
|---|---|
| `popup.html` / `popup.js` | Renders the volume slider UI, reads/writes the saved volume from `chrome.storage.local`, and injects a script to apply the volume immediately. |
| `background.js` | Listens for tab load events and automatically re-applies the saved volume for a site once the page finishes loading. |

Volume is stored using the site's **hostname** as the key (e.g. `site_www.youtube.com`), making it independent per website.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project folder.
5. The **Tab Volume Controller** icon will appear in your toolbar.

## Usage

1. Navigate to any webpage that plays audio or video.
2. Click the **Tab Volume Controller** icon in the Chrome toolbar.
3. Drag the slider to your desired volume level (0% – 100%).
4. The volume applies instantly and will be remembered the next time you visit the same site.

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Read the URL of the current tab to key the volume by hostname. |
| `scripting` | Inject the volume-apply script into the page's content. |
| `storage` | Persist volume settings per site using `chrome.storage.local`. |
| `tabs` | Query the active tab to get its URL and ID. |

## Project Structure

```
tab-adjust-volume/
├── manifest.json   # Extension metadata and permissions (Manifest V3)
├── background.js   # Service worker — restores saved volume on page load
├── popup.html      # Extension popup UI
└── popup.js        # Popup logic — slider events and storage I/O
```

## Version

**1.2** — Manifest V3, per-site persistence, dynamic media listener.
