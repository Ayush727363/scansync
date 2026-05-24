# ScanSync

Transfer photos from your phone to your PC instantly. Scan a QR code → capture → upload → done.

---

## Install & Run

### Step 1 — Backend

```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

### Step 2 — PC Dashboard

```bash
cd pc-app
npm install
npm start
# Opens on http://localhost:3000
```

### Step 3 — Mobile App

```bash
cd mobile-app
npm install
npm start
# Runs on http://localhost:3002
```

### Step 4 — Chrome Extension

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

---

## How to Use

1. Open http://localhost:3000 (or click the Chrome extension)
2. Click **Create Session** — a QR code appears
3. Open your phone camera → scan the QR code
4. The mobile app opens — take photos, reorder, delete if needed
5. Tap **Upload to PC**
6. Back on PC: images appear in the grid
7. Download, make PDF, extract text (OCR), or copy to clipboard

---

## Project Structure

```
scansync/
├── backend/          Node.js + Express + Socket.io
│   ├── src/index.js  Main server
│   ├── .env
│   └── package.json
│
├── pc-app/           React dashboard (port 3000)
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/Dashboard.js
│   │   └── hooks/useSocket.js
│   ├── .env
│   └── package.json
│
├── mobile-app/       React camera app (port 3002)
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/CameraPage.js
│   │   └── hooks/useSocket.js
│   ├── .env
│   └── package.json
│
└── chrome-extension/
    ├── manifest.json
    ├── popup.html
    └── popup.js
```

---

## Troubleshooting

**Backend not starting** — check Node.js is v16+ (`node -v`), run `npm install` again

**Images not appearing on PC** — make sure all 3 terminals are running, check browser DevTools console for errors

**Camera not working on mobile** — Chrome requires HTTPS for camera *except* on localhost; make sure you're opening the mobile URL with `http://localhost:3002` not `127.0.0.1`

**QR code doesn't scan** — manually open `http://localhost:3002?sessionId=YOURCODE` on your phone, replacing YOURCODE with the session ID shown on the PC dashboard

**WebSocket disconnect** — refresh both PC and mobile browser, create a new session
