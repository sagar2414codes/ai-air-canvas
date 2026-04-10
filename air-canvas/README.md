# ✦ AI Air Canvas

> Draw in the air with your hand — powered by MediaPipe Hands

A real-time hand-tracking drawing application that runs entirely in the browser. No backend required. Uses Google's MediaPipe Hands to detect your finger position via webcam and translate it into digital art.

---

## 🎮 Gestures

| Gesture | Action |
|---|---|
| ☝ Index finger up | **Draw** on canvas |
| ✌ Index + middle up | **Lift** pen (stop drawing) |
| 🤙 Thumb + index pinch | Pause (color pick reserved) |
| ✋ All five fingers up | **Clear** canvas |

---

## 🚀 Getting Started

### Option 1 — Open directly (simplest)
```bash
# Just open index.html in Chrome / Edge / Firefox
open index.html
```

> **Note:** Some browsers block camera access for `file://` URLs.  
> Use Option 2 if that happens.

---

### Option 2 — Local dev server (recommended)

**Using Python:**
```bash
cd air-canvas
python3 -m http.server 8080
# Open http://localhost:8080
```

**Using Node.js / npx:**
```bash
cd air-canvas
npx serve .
# Open the printed URL
```

**Using VS Code:**  
Install the *Live Server* extension, right-click `index.html` → *Open with Live Server*.

---

## 🎨 Features

- **Real-time hand tracking** via MediaPipe Hands (runs in-browser, no server)
- **Smooth stroke drawing** with exponential smoothing
- **12-color palette** + custom color picker
- **Adjustable brush size & opacity**
- **Blend modes** (Normal, Multiply, Screen, Overlay, Dodge, Difference)
- **Three stroke caps** (Round, Square, Butt)
- **Erase mode**
- **Save artwork** as PNG
- **Mouse / touch fallback** when no camera is available
- **Animated landmark overlay** showing hand skeleton in real-time

---

## 🗂 Project Structure

```
air-canvas/
├── index.html          # App shell & layout
├── css/
│   └── style.css       # Dark-neon UI theme
├── js/
│   └── app.js          # MediaPipe integration & drawing logic
└── README.md
```

---

## 🛠 Tech Stack

| Library | Purpose |
|---|---|
| [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) | Hand landmark detection |
| MediaPipe Camera Utils | Webcam capture loop |
| HTML5 Canvas API | Drawing surface |
| Vanilla JS (ES2020) | App logic — zero frameworks |

All dependencies are loaded via CDN — no `npm install` needed.

---

## 🔒 Privacy

- No video is ever uploaded or stored
- All ML inference runs **locally in your browser** via WebAssembly
- Camera stream never leaves your device

---

## 💡 Tips

- **Good lighting** on your hand improves tracking accuracy
- Keep your hand **30–60 cm** from the camera
- Use a **plain background** behind your hand for best results
- The **semi-transparent video overlay** helps you see where your finger is

---

## 📄 License

MIT — free to use, modify, and distribute.
