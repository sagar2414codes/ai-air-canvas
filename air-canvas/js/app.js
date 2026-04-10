/**
 * AI Air Canvas — app.js
 * Hand-tracking drawing application using MediaPipe Hands
 */

'use strict';

// ─── PALETTE ────────────────────────────────────────────────
const PALETTE = [
  '#00f0ff', '#0077ff', '#7b2fff', '#ff2fff',
  '#ff6ec7', '#ff2244', '#ff6600', '#ffcc00',
  '#7fff6e', '#00ff88', '#ffffff', '#a0b0c0',
];

// ─── STATE ──────────────────────────────────────────────────
const state = {
  isDrawing:    false,
  mode:         'draw',      // 'draw' | 'erase'
  color:        '#00f0ff',
  brushSize:    8,
  opacity:      1.0,
  lineCap:      'round',
  blendMode:    'source-over',
  lastX:        null,
  lastY:        null,
  prevFingers:  null,
  frameCount:   0,
  smoothX:      null,
  smoothY:      null,
  handDetected: false,
};

// ─── DOM REFS ────────────────────────────────────────────────
const video          = document.getElementById('webcam');
const drawingCanvas  = document.getElementById('drawingCanvas');
const overlayCanvas  = document.getElementById('overlayCanvas');
const cursorGhost    = document.getElementById('cursorGhost');
const canvasStack    = document.querySelector('.canvas-stack');
const permScreen     = document.getElementById('permissionScreen');
const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const brushSizeInput = document.getElementById('brushSize');
const sizeVal        = document.getElementById('sizeVal');
const opacityInput   = document.getElementById('opacitySlider');
const opacityVal     = document.getElementById('opacityVal');
const colorGrid      = document.getElementById('colorGrid');
const customColor    = document.getElementById('customColor');
const customPreview  = document.getElementById('customPreview');
const blendMode      = document.getElementById('blendMode');
const clearBtn       = document.getElementById('clearBtn');
const saveBtn        = document.getElementById('saveBtn');
const toastEl        = document.getElementById('toast');
const strokeList     = document.getElementById('strokeList');

const dCtx  = drawingCanvas.getContext('2d');
const oCtx  = overlayCanvas.getContext('2d');

// ─── CANVAS SIZE ─────────────────────────────────────────────
function resizeCanvases(w, h) {
  canvasStack.style.width  = w + 'px';
  canvasStack.style.height = h + 'px';
  [drawingCanvas, overlayCanvas].forEach(c => {
    c.width  = w;
    c.height = h;
  });
}
resizeCanvases(720, 480);

// ─── COLOUR PALETTE ──────────────────────────────────────────
function buildPalette() {
  PALETTE.forEach(hex => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch';
    sw.style.background = hex;
    sw.title = hex;
    if (hex === state.color) sw.classList.add('active');
    sw.addEventListener('click', () => selectColor(hex, sw));
    colorGrid.appendChild(sw);
  });
  updateCustomPreview();
}

function selectColor(hex, el) {
  state.color = hex;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
}

function updateCustomPreview() {
  customPreview.style.background = customColor.value;
}

customColor.addEventListener('input', () => {
  selectColor(customColor.value, null);
  updateCustomPreview();
});

// ─── TOOLBAR CONTROLS ────────────────────────────────────────
brushSizeInput.addEventListener('input', () => {
  state.brushSize = +brushSizeInput.value;
  sizeVal.textContent = state.brushSize;
});

opacityInput.addEventListener('input', () => {
  state.opacity = opacityInput.value / 100;
  opacityVal.textContent = opacityInput.value + '%';
});

blendMode.addEventListener('change', () => {
  state.blendMode = blendMode.value;
});

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
  });
});

strokeList.querySelectorAll('.stroke-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    strokeList.querySelectorAll('.stroke-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.lineCap = btn.dataset.stroke;
  });
});

clearBtn.addEventListener('click', clearCanvas);
saveBtn.addEventListener('click', saveCanvas);

// ─── CANVAS ACTIONS ──────────────────────────────────────────
function clearCanvas() {
  dCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  showToast('Canvas cleared');
}

function saveCanvas() {
  // Merge background + drawing
  const tmp = document.createElement('canvas');
  tmp.width  = drawingCanvas.width;
  tmp.height = drawingCanvas.height;
  const tCtx = tmp.getContext('2d');
  tCtx.fillStyle = '#0a0e18';
  tCtx.fillRect(0, 0, tmp.width, tmp.height);
  tCtx.drawImage(drawingCanvas, 0, 0);

  const link = document.createElement('a');
  link.download = 'air-canvas-' + Date.now() + '.png';
  link.href = tmp.toDataURL('image/png');
  link.click();
  showToast('Artwork saved!');
}

// ─── TOAST ───────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ─── STATUS ──────────────────────────────────────────────────
function setStatus(type, msg) {
  statusDot.className = 'status-dot ' + type;
  statusText.textContent = msg;
}

// ─── SMOOTHING ───────────────────────────────────────────────
const SMOOTH = 0.4;
function smooth(prev, next) {
  if (prev === null) return next;
  return prev + (next - prev) * SMOOTH;
}

// ─── DRAWING ─────────────────────────────────────────────────
function drawStroke(x, y) {
  dCtx.globalAlpha      = state.opacity;
  dCtx.globalCompositeOperation = state.mode === 'erase' ? 'destination-out' : state.blendMode;
  dCtx.strokeStyle      = state.color;
  dCtx.lineWidth        = state.mode === 'erase' ? state.brushSize * 3 : state.brushSize;
  dCtx.lineCap          = state.lineCap;
  dCtx.lineJoin         = 'round';

  if (state.lastX === null) {
    dCtx.beginPath();
    dCtx.arc(x, y, state.lineWidth / 2, 0, Math.PI * 2);
    dCtx.fillStyle = state.mode === 'erase' ? 'rgba(0,0,0,1)' : state.color;
    dCtx.fill();
  } else {
    dCtx.beginPath();
    dCtx.moveTo(state.lastX, state.lastY);
    dCtx.lineTo(x, y);
    dCtx.stroke();
  }
  state.lastX = x;
  state.lastY = y;
}

// ─── OVERLAY (landmarks + debug) ─────────────────────────────
function drawOverlay(landmarks) {
  oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (!landmarks) return;

  const W = overlayCanvas.width;
  const H = overlayCanvas.height;

  const connections = [
    [0,1],[1,2],[2,3],[3,4],       // thumb
    [0,5],[5,6],[6,7],[7,8],       // index
    [0,9],[9,10],[10,11],[11,12],  // middle
    [0,13],[13,14],[14,15],[15,16],// ring
    [0,17],[17,18],[18,19],[19,20],// pinky
    [5,9],[9,13],[13,17],          // palm
  ];

  // connections
  oCtx.strokeStyle = '#00f0ff44';
  oCtx.lineWidth   = 1.5;
  connections.forEach(([a, b]) => {
    const lA = landmarks[a], lB = landmarks[b];
    oCtx.beginPath();
    oCtx.moveTo((1 - lA.x) * W, lA.y * H);
    oCtx.lineTo((1 - lB.x) * W, lB.y * H);
    oCtx.stroke();
  });

  // joints
  landmarks.forEach((lm, i) => {
    const px = (1 - lm.x) * W;
    const py = lm.y * H;
    oCtx.beginPath();
    oCtx.arc(px, py, i === 8 ? 6 : 3, 0, Math.PI * 2);
    oCtx.fillStyle = i === 8 ? (state.isDrawing ? '#ff6ec7' : '#00f0ff') : '#ffffff66';
    oCtx.fill();
  });
}

// ─── GESTURE RECOGNITION ─────────────────────────────────────
function getTip(lm, idx) {
  return lm[idx];  // {x,y,z}
}

function fingerUp(lm, tipIdx, pipIdx) {
  return lm[tipIdx].y < lm[pipIdx].y;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function analyzeGesture(lm) {
  const indexUp  = fingerUp(lm, 8,  6);
  const middleUp = fingerUp(lm, 12, 10);
  const ringUp   = fingerUp(lm, 16, 14);
  const pinkyUp  = fingerUp(lm, 20, 18);
  const thumbUp  = lm[4].x < lm[3].x;  // mirrored

  // All five fingers up → CLEAR
  if (indexUp && middleUp && ringUp && pinkyUp && thumbUp) return 'clear';

  // Index + middle up, rest down → LIFT (stop drawing)
  if (indexUp && middleUp && !ringUp && !pinkyUp) return 'lift';

  // Pinch (thumb + index close) → COLOR PICK (reserved)
  const pinchDist = distance(lm[4], lm[8]);
  if (pinchDist < 0.06 && !middleUp && !ringUp) return 'pinch';

  // Index only → DRAW
  if (indexUp && !middleUp) return 'draw';

  return 'idle';
}

// ─── MEDIAPIPE HANDS CALLBACK ─────────────────────────────────
function onHandResults(results) {
  state.frameCount++;
  const W = drawingCanvas.width;
  const H = drawingCanvas.height;

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    state.handDetected = false;
    state.isDrawing    = false;
    state.lastX = state.lastY = null;
    state.smoothX = state.smoothY = null;
    cursorGhost.classList.remove('visible', 'drawing');
    drawOverlay(null);
    if (state.frameCount > 30) setStatus('ready', 'Tracking · No hand');
    return;
  }

  state.handDetected = true;
  const lm      = results.multiHandLandmarks[0];
  const gesture = analyzeGesture(lm);

  // Index finger tip coordinates (mirrored)
  const rawX = (1 - lm[8].x) * W;
  const rawY = lm[8].y * H;

  state.smoothX = smooth(state.smoothX, rawX);
  state.smoothY = smooth(state.smoothY, rawY);

  const fx = state.smoothX;
  const fy = state.smoothY;

  // Ghost cursor position (relative to canvasStack)
  cursorGhost.style.left = fx + 'px';
  cursorGhost.style.top  = fy + 'px';

  switch (gesture) {
    case 'draw':
      state.isDrawing = true;
      cursorGhost.classList.add('visible', 'drawing');
      drawStroke(fx, fy);
      setStatus('drawing', 'Drawing ✏');
      break;

    case 'lift':
      state.isDrawing = false;
      state.lastX = state.lastY = null;
      cursorGhost.classList.add('visible');
      cursorGhost.classList.remove('drawing');
      setStatus('ready', 'Tracking · Lift ✌');
      break;

    case 'pinch':
      state.isDrawing = false;
      state.lastX = state.lastY = null;
      cursorGhost.classList.add('visible');
      cursorGhost.classList.remove('drawing');
      setStatus('ready', 'Tracking · Pinch 🤙');
      break;

    case 'clear':
      state.isDrawing = false;
      state.lastX = state.lastY = null;
      clearCanvas();
      setStatus('ready', 'Canvas cleared ✋');
      break;

    default:
      if (!state.isDrawing) {
        state.lastX = state.lastY = null;
      }
      cursorGhost.classList.add('visible');
      cursorGhost.classList.remove('drawing');
      setStatus('ready', 'Tracking · Idle');
  }

  if (gesture !== 'draw') state.isDrawing = false;

  drawOverlay(lm);
}

// ─── MOUSE FALLBACK ──────────────────────────────────────────
let mouseDown = false;
drawingCanvas.addEventListener('mousedown', e => {
  if (state.handDetected) return;
  mouseDown = true;
  const r = drawingCanvas.getBoundingClientRect();
  drawStroke(e.clientX - r.left, e.clientY - r.top);
});
drawingCanvas.addEventListener('mousemove', e => {
  if (!mouseDown || state.handDetected) return;
  const r = drawingCanvas.getBoundingClientRect();
  drawStroke(e.clientX - r.left, e.clientY - r.top);
});
['mouseup','mouseleave'].forEach(ev =>
  drawingCanvas.addEventListener(ev, () => {
    mouseDown = false;
    state.lastX = state.lastY = null;
  })
);

// Touch support
drawingCanvas.addEventListener('touchstart', e => {
  if (state.handDetected) return;
  e.preventDefault();
  const r = drawingCanvas.getBoundingClientRect();
  const t = e.touches[0];
  drawStroke(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
drawingCanvas.addEventListener('touchmove', e => {
  if (state.handDetected) return;
  e.preventDefault();
  const r = drawingCanvas.getBoundingClientRect();
  const t = e.touches[0];
  drawStroke(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
drawingCanvas.addEventListener('touchend', () => { state.lastX = state.lastY = null; });

// ─── INIT ─────────────────────────────────────────────────────
async function init() {
  buildPalette();
  setStatus('', 'Waiting for permission…');

  document.getElementById('startBtn').addEventListener('click', async () => {
    permScreen.style.display = 'none';
    setStatus('', 'Starting camera…');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 480, facingMode: 'user' },
        audio: false,
      });
      video.srcObject = stream;

      await new Promise(res => video.addEventListener('loadedmetadata', res, { once: true }));
      resizeCanvases(video.videoWidth || 720, video.videoHeight || 480);

      setStatus('', 'Loading AI model…');

      const hands = new Hands({
        locateFile: file =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands:         1,
        modelComplexity:     1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence:  0.6,
      });

      hands.onResults(onHandResults);

      const camera = new Camera(video, {
        onFrame: async () => { await hands.send({ image: video }); },
        width:  720,
        height: 480,
      });

      await camera.start();
      setStatus('ready', 'Ready · Show your hand!');
      showToast('☝ Raise index finger to draw');

    } catch (err) {
      console.error(err);
      setStatus('error', 'Camera error: ' + err.message);
      showToast('Camera access failed. Using mouse fallback.');
      // Still allow mouse drawing
    }
  });
}

init();
