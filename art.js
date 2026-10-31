/* =====================================================================
   art.js — wall/floor textures and every sprite, drawn with canvas code.
   No image files: the whole game is code.
   ===================================================================== */
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

const TEX = { walls: {}, floors: {}, ceils: {} };
const SPR = {};

/* ---------- small canvas helpers ---------- */
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; }
function pixelsOf(c) { return new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer); }
function toSprite(c) { return { w: c.width, h: c.height, px: pixelsOf(c) }; }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.42);
  g.bezierCurveTo(cx - s * 0.75, cy - s * 0.02, cx - s * 0.45, cy - s * 0.6, cx, cy - s * 0.22);
  g.bezierCurveTo(cx + s * 0.45, cy - s * 0.6, cx + s * 0.75, cy - s * 0.02, cx, cy + s * 0.42);
  g.closePath();
}
function vgrad(g, y0, y1, c0, c1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
function speckle(g, w, h, amt) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
}
function groundShadow(g, x, y, rx) {
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y, rx, rx * 0.2, 0, 0, TAU); g.fill();
}
function outline(g, w) { g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = w || 1.5; g.stroke(); }

/* =====================================================================
   WALL / FLOOR / CEILING TEXTURES  (64x64)
   ===================================================================== */
function texBrick() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#4a3d38'; g.fillRect(0, 0, 64, 64);
  for (let r = 0; r < 8; r++) {
    const off = (r % 2) * 16;
    for (let b = -1; b < 3; b++) {
      const x = b * 32 + off;
      g.fillStyle = `hsl(${rand(6, 16)},${rand(40, 52)}%,${rand(33, 46)}%)`;
      g.fillRect(x + 1, r * 8 + 1, 30, 6);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 1, r * 8 + 1, 30, 1);
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 1, r * 8 + 6, 30, 1);
    }
  }
  speckle(g, 64, 64, 26); return c;
}
function texConcrete() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#8a8d90'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(0,0,0,${rand(0.03, 0.09)})`; g.fillRect(rand(0, 60), rand(0, 60), rand(6, 24), rand(6, 24)); }
  g.fillStyle = '#52555a';
  g.fillRect(0, 0, 64, 2); g.fillRect(0, 31, 64, 2); g.fillRect(0, 0, 2, 64); g.fillRect(31, 0, 2, 64);
  g.fillStyle = 'rgba(255,255,255,.14)';
  g.fillRect(0, 2, 64, 1); g.fillRect(0, 33, 64, 1); g.fillRect(2, 0, 1, 64); g.fillRect(33, 0, 1, 64);
  g.fillStyle = '#5d6064';
  for (const [x, y] of [[7, 7], [25, 7], [7, 25], [25, 25], [39, 7], [57, 7], [39, 25], [57, 25], [7, 39], [25, 39], [7, 57], [25, 57], [39, 39], [57, 39], [39, 57], [57, 57]]) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
  speckle(g, 64, 64, 30); return c;
}
function texWood() {
  const c = cv(64, 64), g = c.getContext('2d');
  for (let i = 0; i < 4; i++) {
    const x = i * 16;
    g.fillStyle = `hsl(${rand(24, 32)},${rand(38, 48)}%,${rand(28, 38)}%)`; g.fillRect(x, 0, 16, 64);
    for (let k = 0; k < 9; k++) {
      g.strokeStyle = `rgba(0,0,0,${rand(0.08, 0.22)})`; g.lineWidth = rand(0.5, 1.2);
      const gx = x + rand(2, 14);
      g.beginPath(); g.moveTo(gx, 0); g.bezierCurveTo(gx + rand(-3, 3), 20, gx + rand(-3, 3), 44, gx + rand(-2, 2), 64); g.stroke();
    }
    g.fillStyle = '#1e120c'; g.fillRect(x, 0, 1, 64);
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 1, 0, 1, 64);
  }
  speckle(g, 64, 64, 14); return c;
}
function texTile() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#cfe3e4'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? '#2a7f86' : '#2f8d94'; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x * 16 + 1, y * 16 + 1, 14, 2);
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x * 16 + 1, y * 16 + 13, 14, 2);
  }
  speckle(g, 64, 64, 10); return c;
}
function texWallpaper(frames) {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#d98aa6'; g.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 16) { g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x, 0, 8, 64); }
  g.fillStyle = 'rgba(255,238,243,.38)';
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) { heartPath(g, x * 16 + 8 + (y % 2) * 8, 12 + y * 13, 7); g.fill(); }
  g.fillStyle = '#f6e6dc'; g.fillRect(0, 0, 64, 4); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 4, 64, 1);
  g.fillStyle = '#6d3b30'; g.fillRect(0, 50, 64, 14); g.fillStyle = '#9a6050'; g.fillRect(0, 50, 64, 2);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(3.5, 54.5, 25, 7); g.strokeRect(35.5, 54.5, 25, 7);
  if (frames) {
    const frame = (x, y, w, h, inner) => {
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 2, y + 2, w, h);
      g.fillStyle = '#c79a2e'; g.fillRect(x, y, w, h);
      g.fillStyle = '#f3e3b5'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      g.save(); g.beginPath(); g.rect(x + 3, y + 3, w - 6, h - 6); g.clip(); inner(x + 3, y + 3, w - 6, h - 6); g.restore();
    };
    frame(5, 9, 24, 32, (x, y, w, h) => {
      g.fillStyle = vgrad(g, y, y + h, '#ffd7a8', '#f08ca4'); g.fillRect(x, y, w, h);
      g.fillStyle = '#3a2430';
      g.beginPath(); g.arc(x + 7, y + 13, 3.2, 0, TAU); g.fill(); g.fillRect(x + 4, y + 16, 7, 14);
      g.beginPath(); g.arc(x + 15, y + 14, 3, 0, TAU); g.fill(); g.fillRect(x + 12, y + 17, 7, 13);
      g.fillStyle = '#e03a5f'; heartPath(g, x + 11, y + 6, 6); g.fill();
    });
    frame(35, 14, 24, 24, (x, y, w, h) => {
      g.fillStyle = '#fff1f4'; g.fillRect(x, y, w, h);
      g.fillStyle = '#e03a5f'; heartPath(g, x + w / 2, y + 8, 13); g.fill();
      g.fillStyle = '#6d2a3c'; g.font = 'bold 7px sans-serif'; g.textAlign = 'center'; g.fillText('L + B', x + w / 2, y + h - 3);
    });
  }
  speckle(g, 64, 64, 8); return c;
}
function texMetal() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#323843'; g.fillRect(0, 0, 64, 64);
  for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]]) {
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, 32, 2); g.fillRect(x, y, 2, 32);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y + 30, 32, 2); g.fillRect(x + 30, y, 2, 32);
    g.fillStyle = '#5a6270';
    for (const [rx, ry] of [[5, 5], [27, 5], [5, 27], [27, 27]]) { g.beginPath(); g.arc(x + rx, y + ry, 1.5, 0, TAU); g.fill(); }
  }
  g.fillStyle = '#ff3b5c'; g.fillRect(0, 31, 64, 2);
  g.fillStyle = 'rgba(255,59,92,.28)'; g.fillRect(0, 29, 64, 6);
  g.save(); g.beginPath(); g.rect(0, 52, 64, 8); g.clip();
  for (let x = -16; x < 80; x += 16) { g.fillStyle = '#e8c21a'; poly(g, [[x, 60], [x + 8, 60], [x + 16, 52], [x + 8, 52]]); g.fill(); }
  g.restore();
  speckle(g, 64, 64, 18); return c;
}
function texGate() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#1a0a12'; g.fillRect(0, 0, 64, 64);
  g.shadowColor = '#ff2d55'; g.shadowBlur = 8; g.fillStyle = '#ff6b86';
  for (let x = 4; x < 64; x += 8) g.fillRect(x, 0, 2, 64);
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.1)';
  for (let y = 0; y < 64; y += 4) g.fillRect(0, y, 64, 1);
  g.fillStyle = '#ff2d55'; g.fillRect(0, 0, 64, 3); g.fillRect(0, 61, 64, 3);
  return c;
}
function floorWood() {
  const c = cv(64, 64), g = c.getContext('2d');
  for (let r = 0; r < 4; r++) {
    const y = r * 16, off = rand(0, 48);
    g.fillStyle = `hsl(${rand(26, 32)},${rand(40, 50)}%,${rand(30, 40)}%)`; g.fillRect(0, y, 64, 16);
    g.fillStyle = `hsl(${rand(26, 32)},${rand(40, 50)}%,${rand(30, 40)}%)`; g.fillRect(off, y, 64 - off, 16);
    for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); const gy = y + rand(2, 14); g.moveTo(0, gy); g.lineTo(64, gy + rand(-1, 1)); g.stroke(); }
    g.fillStyle = '#1e120c'; g.fillRect(0, y, 64, 1); g.fillRect(off, y, 1, 16);
  }
  speckle(g, 64, 64, 12); return c;
}
function floorCheck() {
  const c = cv(64, 64), g = c.getContext('2d');
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#1b1b1f' : '#e9e2d3'; g.fillRect(x * 32, y * 32, 32, 32); }
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, 64, 6);
  speckle(g, 64, 64, 10); return c;
}
function floorMetal() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#25282e'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#16181c';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) rr(g, x * 8 + 1, y * 8 + (x % 2) * 4 + 1, 6, 3, 1.5), g.fill();
  g.fillStyle = '#e8c21a'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 63, 64, 1);
  speckle(g, 64, 64, 12); return c;
}
function floorCarpet() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#7a1f35'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,.07)';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { poly(g, [[x * 16 + 8, y * 16 + 2], [x * 16 + 14, y * 16 + 8], [x * 16 + 8, y * 16 + 14], [x * 16 + 2, y * 16 + 8]]); g.fill(); }
  g.fillStyle = '#c9a24a'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64);
  speckle(g, 64, 64, 16); return c;
}
function ceilPlaster() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#cdc5ba'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64);
  g.fillStyle = '#fff3cf'; g.fillRect(24, 24, 16, 16); g.fillStyle = 'rgba(255,243,207,.4)'; g.fillRect(21, 21, 22, 22);
  speckle(g, 64, 64, 14); return c;
}
function ceilMetal() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#1c1f25'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, 64, 2);
  g.fillStyle = '#a8d8ff'; g.fillRect(8, 29, 48, 6); g.fillStyle = 'rgba(168,216,255,.3)'; g.fillRect(6, 26, 52, 12);
  speckle(g, 64, 64, 12); return c;
}
function ceilWarm() {
  const c = cv(64, 64), g = c.getContext('2d');
  g.fillStyle = '#3d2233'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64);
  g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(32, 32, 7, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,217,160,.3)'; g.beginPath(); g.arc(32, 32, 13, 0, TAU); g.fill();
  speckle(g, 64, 64, 10); return c;
}

/* =====================================================================
   SPRITES
   ===================================================================== */
// "Excuse" — a tired soldier with a speech bubble that only says "but..."
function sprGrunt(f) {
  const c = cv(72, 100), g = c.getContext('2d');
  groundShadow(g, 34, 95, 22);
  const lift = [f === 0 ? 5 : 0, f === 1 ? 5 : 0];
  [[20, 0], [36, 1]].forEach(([x, i]) => {
    const bot = 92 - lift[i];
    g.fillStyle = '#23262c'; rr(g, x, 60, 13, bot - 60, 4); g.fill();
    g.fillStyle = '#0f1013'; rr(g, x - 2, bot - 9, 17, 9, 3); g.fill();
  });
  // torso + vest
  g.fillStyle = vgrad(g, 30, 66, '#3d434e', '#262a31'); rr(g, 15, 30, 38, 36, 7); g.fill(); outline(g, 1);
  g.fillStyle = '#1c1f25'; [[19, 46], [29, 46], [39, 46]].forEach(([x, y]) => { rr(g, x, y, 9, 10, 2); g.fill(); });
  g.fillStyle = '#d33'; g.fillRect(15, 36, 38, 4);
  // arms
  g.fillStyle = '#4b5443'; rr(g, 6, 33, 11, 28, 5); g.fill(); rr(g, 51, 33, 11, 28, 5); g.fill();
  g.fillStyle = '#c99a7a'; g.beginPath(); g.arc(11, 63, 5, 0, TAU); g.fill(); g.beginPath(); g.arc(56, 63, 5, 0, TAU); g.fill();
  // rifle
  g.save(); g.translate(36, 52); g.rotate(f === 2 ? -0.05 : 0.5);
  g.fillStyle = '#15171b'; rr(g, -16, -3, 44, 7, 2); g.fill(); g.fillStyle = '#2a2d33'; g.fillRect(-4, 3, 7, 9);
  g.restore();
  // head + helmet
  g.fillStyle = '#c99a7a'; g.beginPath(); g.arc(34, 21, 10, 0, TAU); g.fill();
  g.fillStyle = vgrad(g, 6, 22, '#5a6650', '#3d4638'); g.beginPath(); g.arc(34, 19, 12, Math.PI, TAU); g.lineTo(46, 22); g.lineTo(22, 22); g.closePath(); g.fill(); outline(g, 1);
  g.shadowColor = '#ff3b30'; g.shadowBlur = 6; g.fillStyle = '#ff4b3e'; g.fillRect(25, 19, 18, 5); g.shadowBlur = 0;
  g.fillStyle = '#20252a'; g.fillRect(29, 29, 10, 2);
  // speech bubble
  g.fillStyle = '#fff'; rr(g, 42, 1, 28, 15, 6); g.fill(); poly(g, [[46, 15], [44, 22], [52, 15]]); g.fill();
  g.fillStyle = '#222'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('but..', 56, 12);
  if (f === 2) {
    const fl = g.createRadialGradient(54, 40, 1, 54, 40, 16); fl.addColorStop(0, '#fff'); fl.addColorStop(0.4, '#ffd34d'); fl.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = fl; g.fillRect(34, 24, 36, 32);
  }
  return toSprite(c);
}

// "Left on Read" — a ghost carrying a blue Seen bubble
function sprGhost(f) {
  const c = cv(72, 84), g = c.getContext('2d');
  const glow = g.createRadialGradient(34, 42, 4, 34, 42, 36); glow.addColorStop(0, 'rgba(170,215,255,.5)'); glow.addColorStop(1, 'rgba(170,215,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 72, 84);
  const sw = f ? 4 : -4;
  g.beginPath(); g.moveTo(10, 72); g.lineTo(10, 34); g.bezierCurveTo(10, 4, 58, 4, 58, 34); g.lineTo(58, 72);
  for (let i = 0; i < 4; i++) { const x1 = 58 - i * 12; g.quadraticCurveTo(x1 - 3, 72 + (i % 2 ? -8 : 10) + sw * (i % 2 ? -1 : 1) * 0.5, x1 - 12, 72); }
  g.closePath();
  g.fillStyle = vgrad(g, 8, 80, '#ffffff', '#c3d2ea'); g.fill();
  g.strokeStyle = '#8196bd'; g.lineWidth = 1.5; g.stroke();
  // arms
  g.fillStyle = '#eef4ff';
  g.beginPath(); g.ellipse(8, f ? 42 : 52, 6, 9, f ? -0.7 : 0.3, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(60, f ? 42 : 52, 6, 9, f ? 0.7 : -0.3, 0, TAU); g.fill(); g.stroke();
  // face
  g.fillStyle = f ? '#ff3b3b' : '#1a1d2a';
  g.beginPath(); g.ellipse(25, 32, 5, 7, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(43, 32, 5, 7, 0, 0, TAU); g.fill();
  if (!f) { g.fillStyle = '#fff'; g.fillRect(23, 29, 2, 3); g.fillRect(41, 29, 2, 3); }
  g.fillStyle = '#1a1d2a';
  if (f) { g.beginPath(); g.ellipse(34, 50, 7, 9, 0, 0, TAU); g.fill(); } else { g.beginPath(); g.ellipse(34, 49, 4, 5, 0, 0, TAU); g.fill(); }
  // "Seen" bubble with double check
  g.fillStyle = '#3b82f6'; rr(g, 42, 2, 28, 15, 6); g.fill(); poly(g, [[48, 16], [46, 22], [54, 16]]); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(47, 10); g.lineTo(50, 13); g.lineTo(55, 6); g.moveTo(54, 10); g.lineTo(57, 13); g.lineTo(63, 6); g.stroke();
  return toSprite(c);
}

// "Stubbornness" — armoured, hiding behind a shield that just says NO.
function sprHeavy(f) {
  const c = cv(100, 124), g = c.getContext('2d');
  groundShadow(g, 50, 119, 32);
  const lift = [f === 0 ? 5 : 0, f === 1 ? 5 : 0];
  [[28, 0], [52, 1]].forEach(([x, i]) => {
    const bot = 116 - lift[i];
    g.fillStyle = '#2b2e35'; rr(g, x, 78, 20, bot - 78, 5); g.fill();
    g.fillStyle = '#121316'; rr(g, x - 3, bot - 11, 26, 11, 4); g.fill();
  });
  g.fillStyle = vgrad(g, 36, 86, '#5b6270', '#343942'); rr(g, 20, 38, 60, 46, 10); g.fill(); outline(g, 1.2);
  g.fillStyle = '#e8c21a'; g.fillRect(24, 74, 52, 4);
  // shoulder pads
  g.fillStyle = '#6a7282'; g.beginPath(); g.ellipse(18, 44, 12, 10, 0, 0, TAU); g.fill(); outline(g, 1.2);
  g.beginPath(); g.ellipse(82, 44, 12, 10, 0, 0, TAU); g.fill(); outline(g, 1.2);
  // gun arm
  g.fillStyle = '#3a3f49'; rr(g, 74, 48, 14, 28, 5); g.fill();
  g.fillStyle = '#16181c'; rr(g, 66, 62, 30, 9, 3); g.fill();
  // head
  g.fillStyle = '#c99a7a'; g.beginPath(); g.arc(50, 25, 11, 0, TAU); g.fill();
  g.fillStyle = vgrad(g, 8, 28, '#7a8294', '#4a5060'); g.beginPath(); g.arc(50, 24, 14, Math.PI, TAU); g.lineTo(64, 28); g.lineTo(36, 28); g.closePath(); g.fill(); outline(g, 1.2);
  g.shadowColor = '#ff3b30'; g.shadowBlur = 6; g.fillStyle = '#ff4b3e'; g.fillRect(40, 24, 20, 5); g.shadowBlur = 0;
  // shield
  g.save(); g.translate(8, 46);
  g.fillStyle = vgrad(g, 0, 66, '#a9b8c9', '#6c7b8e'); rr(g, 0, 0, 44, 66, 8); g.fill(); outline(g, 2);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(4, 4, 36, 5);
  g.fillStyle = '#d33'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('NO', 22, 43);
  g.fillStyle = '#4c5a6b'; [[6, 6], [38, 6], [6, 60], [38, 60]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); });
  g.restore();
  if (f === 2) {
    const fl = g.createRadialGradient(94, 66, 1, 94, 66, 14); fl.addColorStop(0, '#fff'); fl.addColorStop(0.4, '#ffb04d'); fl.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = fl; g.fillRect(78, 50, 22, 32);
  }
  return toSprite(c);
}

// "Pride" — the boss. Crown, cape, crossed arms and an EGO plate.
function sprBoss(f) {
  const c = cv(160, 190), g = c.getContext('2d');
  groundShadow(g, 80, 184, 56);
  // cape
  g.fillStyle = vgrad(g, 40, 180, '#7d1630', '#3a0a18');
  g.beginPath(); g.moveTo(34, 52); g.lineTo(126, 52); g.lineTo(146, 176); g.quadraticCurveTo(80, 190, 14, 176); g.closePath(); g.fill(); outline(g, 2);
  // legs
  g.fillStyle = '#23252b'; rr(g, 48, 118, 30, 62, 8); g.fill(); rr(g, 82, 118, 30, 62, 8); g.fill();
  g.fillStyle = '#0e0f12'; rr(g, 44, 166, 38, 18, 6); g.fill(); rr(g, 78, 166, 38, 18, 6); g.fill();
  // torso
  g.fillStyle = vgrad(g, 52, 124, '#4b4f5c', '#272a33'); rr(g, 36, 52, 88, 74, 16); g.fill(); outline(g, 2);
  // EGO plate
  g.fillStyle = vgrad(g, 70, 100, '#f6d56a', '#b8891f'); rr(g, 52, 70, 56, 32, 6); g.fill(); outline(g, 1.5);
  g.fillStyle = '#5a3a05'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center'; g.fillText('EGO', 80, 94);
  // shoulders
  g.fillStyle = vgrad(g, 44, 74, '#f0cf62', '#a67c1a');
  g.beginPath(); g.ellipse(30, 62, 24, 17, -0.2, 0, TAU); g.fill(); outline(g, 2);
  g.beginPath(); g.ellipse(130, 62, 24, 17, 0.2, 0, TAU); g.fill(); outline(g, 2);
  // arms
  g.fillStyle = '#3b3f4a';
  if (f === 1) {
    g.save(); g.translate(30, 70); g.rotate(0.9); rr(g, -9, 0, 18, 56, 8); g.fill(); g.restore();
    g.save(); g.translate(130, 70); g.rotate(-0.9); rr(g, -9, 0, 18, 56, 8); g.fill(); g.restore();
  } else {
    g.save(); g.translate(44, 94); g.rotate(-1.2); rr(g, -9, 0, 18, 70, 8); g.fill(); outline(g, 1.5); g.restore();
    g.save(); g.translate(116, 94); g.rotate(1.2); rr(g, -9, 0, 18, 70, 8); g.fill(); outline(g, 1.5); g.restore();
  }
  // head
  g.fillStyle = vgrad(g, 20, 62, '#575c6b', '#2d3039'); rr(g, 58, 22, 44, 40, 14); g.fill(); outline(g, 2);
  const eye = f === 1 ? '#ff2d55' : '#ffb347';
  g.shadowColor = eye; g.shadowBlur = 10; g.fillStyle = eye;
  poly(g, [[64, 38], [78, 42], [78, 48], [64, 46]]); g.fill(); poly(g, [[96, 38], [82, 42], [82, 48], [96, 46]]); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#12131a'; if (f === 1) { rr(g, 70, 52, 20, 8, 3); g.fill(); } else g.fillRect(70, 54, 20, 2);
  // crown
  g.fillStyle = vgrad(g, 0, 28, '#ffe27a', '#c19a2b');
  poly(g, [[56, 26], [56, 6], [67, 16], [80, 0], [93, 16], [104, 6], [104, 26]]); g.fill(); outline(g, 2);
  g.fillStyle = '#ff2d55'; [[67, 21], [80, 18], [93, 21]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); });
  return toSprite(c);
}

function sprLara(mood) {
  const skin = CONFIG.skin, hair = CONFIG.hair, dress = CONFIG.dress;
  const c = cv(72, 124), g = c.getContext('2d');
  const warm = mood === 'soft';
  if (warm) { const gl = g.createRadialGradient(36, 60, 6, 36, 60, 35); gl.addColorStop(0, 'rgba(255,170,200,.45)'); gl.addColorStop(1, 'rgba(255,170,200,0)'); g.fillStyle = gl; g.fillRect(0, 0, 72, 124); }
  groundShadow(g, 36, 119, 24);
  // hair (back)
  g.fillStyle = hair; g.beginPath(); g.ellipse(36, 26, 18, 20, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(18, 28); g.quadraticCurveTo(10, 70, 20, 78); g.lineTo(52, 78); g.quadraticCurveTo(62, 70, 54, 28); g.closePath(); g.fill();
  // legs + shoes
  g.fillStyle = skin; rr(g, 26, 100, 7, 17, 3); g.fill(); rr(g, 39, 100, 7, 17, 3); g.fill();
  g.fillStyle = '#2a1a22'; rr(g, 23, 114, 12, 6, 3); g.fill(); rr(g, 37, 114, 12, 6, 3); g.fill();
  // dress
  g.fillStyle = vgrad(g, 44, 108, dress, '#7d1236');
  g.beginPath(); g.moveTo(24, 46); g.lineTo(48, 46); g.lineTo(46, 68); g.quadraticCurveTo(66, 92, 60, 108); g.quadraticCurveTo(36, 114, 12, 108); g.quadraticCurveTo(6, 92, 26, 68); g.closePath(); g.fill(); outline(g, 1.2);
  g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(24, 66, 22, 2);
  // neck + head
  g.fillStyle = skin; g.fillRect(31, 36, 10, 12);
  g.beginPath(); g.ellipse(36, 26, 12, 14, 0, 0, TAU); g.fill();
  // fringe
  g.fillStyle = hair; g.beginPath(); g.ellipse(36, 15, 14, 8, 0, Math.PI, TAU); g.fill();
  g.beginPath(); g.moveTo(22, 16); g.quadraticCurveTo(24, 28, 22, 34); g.lineTo(26, 20); g.fill();
  // face
  g.fillStyle = '#2a1a22';
  g.beginPath(); g.ellipse(31, 27, 1.8, 2.4, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(41, 27, 1.8, 2.4, 0, 0, TAU); g.fill();
  g.strokeStyle = '#3a2420'; g.lineWidth = 1.4; g.lineCap = 'round';
  g.beginPath();
  if (warm) { g.moveTo(29, 22); g.lineTo(33, 21.5); g.moveTo(39, 21.5); g.lineTo(43, 22); } else { g.moveTo(28.5, 21); g.lineTo(33, 23); g.moveTo(39, 23); g.lineTo(43.5, 21); }
  g.stroke();
  g.strokeStyle = '#b03a4a'; g.lineWidth = 1.6; g.beginPath();
  if (warm) { g.arc(36, 32, 4, 0.15 * Math.PI, 0.85 * Math.PI); } else { g.arc(36, 36, 4, 1.15 * Math.PI, 1.85 * Math.PI); }
  g.stroke();
  // arms
  g.strokeStyle = skin; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath();
  if (warm) { g.moveTo(26, 48); g.quadraticCurveTo(20, 66, 30, 76); g.moveTo(46, 48); g.quadraticCurveTo(52, 66, 42, 76); }
  else { g.moveTo(24, 50); g.quadraticCurveTo(32, 68, 48, 60); g.moveTo(48, 50); g.quadraticCurveTo(40, 68, 24, 60); }
  g.stroke();
  if (warm) { g.fillStyle = '#ff4d79'; heartPath(g, 36, 4, 12); g.fill(); }
  return toSprite(c);
}

/* ---- pickups & props ---- */
function sprAmmo() {
  const c = cv(52, 40), g = c.getContext('2d');
  const gl = g.createRadialGradient(26, 22, 2, 26, 22, 18); gl.addColorStop(0, 'rgba(255,220,90,.55)'); gl.addColorStop(1, 'rgba(255,220,90,0)'); g.fillStyle = gl; g.fillRect(0, 0, 52, 40);
  g.fillStyle = vgrad(g, 12, 34, '#6b7a45', '#3f4a28'); rr(g, 8, 12, 36, 22, 3); g.fill(); outline(g, 1.2);
  g.fillStyle = '#e8c21a'; g.fillRect(8, 20, 36, 3);
  g.fillStyle = '#f2e6b0'; for (let i = 0; i < 3; i++) { rr(g, 15 + i * 9, 25, 5, 7, 2); g.fill(); }
  g.fillStyle = '#d9a441'; for (let i = 0; i < 3; i++) g.fillRect(15 + i * 9, 25, 5, 2);
  return toSprite(c);
}
function sprChoc() {
  const c = cv(52, 48), g = c.getContext('2d');
  const gl = g.createRadialGradient(26, 24, 2, 26, 24, 23); gl.addColorStop(0, 'rgba(255,120,170,.6)'); gl.addColorStop(1, 'rgba(255,120,170,0)'); g.fillStyle = gl; g.fillRect(0, 0, 52, 48);
  g.fillStyle = vgrad(g, 10, 40, '#ff5c8a', '#b01e50'); heartPath(g, 26, 26, 38); g.fill(); outline(g, 1.4);
  g.fillStyle = 'rgba(255,255,255,.35)'; heartPath(g, 22, 22, 12); g.fill();
  g.strokeStyle = '#ffd86b'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, 26); g.lineTo(44, 26); g.stroke();
  g.fillStyle = '#ffd86b'; g.beginPath(); g.ellipse(21, 24, 6, 4, -0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(31, 24, 6, 4, 0.5, 0, TAU); g.fill();
  g.beginPath(); g.arc(26, 26, 3, 0, TAU); g.fill();
  return toSprite(c);
}
function sprCrate() {
  const c = cv(96, 66), g = c.getContext('2d');
  groundShadow(g, 48, 63, 44);
  g.fillStyle = vgrad(g, 4, 62, '#9a6b3c', '#6b4524'); rr(g, 4, 4, 88, 58, 3); g.fill(); outline(g, 2);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5;
  for (let y = 19; y < 62; y += 15) { g.beginPath(); g.moveTo(4, y); g.lineTo(92, y); g.stroke(); }
  g.fillStyle = '#3a4048'; g.fillRect(4, 4, 8, 58); g.fillRect(84, 4, 8, 58); g.fillRect(4, 4, 88, 7); g.fillRect(4, 55, 88, 7);
  g.fillStyle = '#6a7380'; [[8, 8], [88, 8], [8, 58], [88, 58]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); });
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, 12); g.lineTo(82, 54); g.stroke();
  speckleSprite(g, 96, 66);
  return toSprite(c);
}
function sprTable() {
  const c = cv(96, 78), g = c.getContext('2d');
  groundShadow(g, 48, 75, 38);
  g.fillStyle = '#6a4a30'; g.fillRect(44, 40, 8, 32); g.fillRect(30, 70, 36, 4);
  g.fillStyle = vgrad(g, 22, 50, '#fffaf0', '#d7cdb8');
  g.beginPath(); g.ellipse(48, 36, 42, 12, 0, 0, TAU); g.fill(); outline(g, 1.5);
  g.fillStyle = '#b3162f'; g.beginPath(); g.moveTo(8, 36); g.quadraticCurveTo(48, 62, 88, 36); g.lineTo(88, 44); g.quadraticCurveTo(48, 70, 8, 44); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(48, 34, 14, 4, 0, 0, TAU); g.fill();
  g.fillStyle = '#f3ecd6'; g.fillRect(46, 12, 5, 20);
  const fl = g.createRadialGradient(48, 8, 1, 48, 8, 10); fl.addColorStop(0, '#fff'); fl.addColorStop(0.4, '#ffd34d'); fl.addColorStop(1, 'rgba(255,140,0,0)'); g.fillStyle = fl; g.fillRect(36, 0, 24, 20);
  g.fillStyle = '#e03a5f'; g.beginPath(); g.arc(70, 28, 4, 0, TAU); g.fill(); g.fillStyle = '#2f7d4f'; g.fillRect(69, 30, 2, 6);
  return toSprite(c);
}
function sprCandle() {
  const c = cv(28, 50), g = c.getContext('2d');
  const gl = g.createRadialGradient(14, 14, 1, 14, 14, 14); gl.addColorStop(0, 'rgba(255,200,100,.65)'); gl.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gl; g.fillRect(0, 0, 28, 30);
  g.fillStyle = '#f7efdc'; rr(g, 9, 22, 10, 24, 2); g.fill(); outline(g, 1);
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.moveTo(14, 7); g.quadraticCurveTo(20, 15, 14, 21); g.quadraticCurveTo(8, 15, 14, 7); g.fill();
  g.fillStyle = '#ff9b2f'; g.beginPath(); g.moveTo(14, 12); g.quadraticCurveTo(17, 17, 14, 21); g.quadraticCurveTo(11, 17, 14, 12); g.fill();
  return toSprite(c);
}
function sprRoses() {
  const c = cv(40, 64), g = c.getContext('2d');
  groundShadow(g, 20, 61, 12);
  g.fillStyle = vgrad(g, 36, 62, '#e9edf5', '#aab4c6'); poly(g, [[11, 38], [29, 38], [25, 60], [15, 60]]); g.fill(); outline(g, 1);
  g.strokeStyle = '#2f7d4f'; g.lineWidth = 2; [[14, 22, 12, 38], [20, 14, 20, 38], [26, 22, 28, 38]].forEach(([x, y, x2, y2]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); });
  [[14, 22], [20, 13], [26, 22]].forEach(([x, y]) => { g.fillStyle = '#d9234c'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.fillStyle = '#ff5b7f'; g.beginPath(); g.arc(x - 1, y - 1, 3, 0, TAU); g.fill(); });
  return toSprite(c);
}
function sprExit() {
  const c = cv(72, 72), g = c.getContext('2d');
  const gl = g.createRadialGradient(36, 36, 4, 36, 36, 36); gl.addColorStop(0, 'rgba(255,90,140,.7)'); gl.addColorStop(1, 'rgba(255,90,140,0)'); g.fillStyle = gl; g.fillRect(0, 0, 72, 72);
  g.shadowColor = '#ff2d6f'; g.shadowBlur = 12; g.fillStyle = vgrad(g, 14, 58, '#ff9ab8', '#ff2d6f'); heartPath(g, 36, 36, 46); g.fill(); g.shadowBlur = 0; outline(g, 1.5);
  g.fillStyle = 'rgba(255,255,255,.5)'; heartPath(g, 29, 29, 14); g.fill();
  return toSprite(c);
}
function sprOrb(col, core) {
  const c = cv(32, 32), g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, core); gr.addColorStop(0.6, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return toSprite(c);
}
function sprSpark(col) {
  const c = cv(28, 28), g = c.getContext('2d');
  const gr = g.createRadialGradient(14, 14, 1, 14, 14, 13); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 28, 28);
  g.strokeStyle = col; g.lineWidth = 1.5; g.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; g.beginPath(); g.moveTo(14 + Math.cos(a) * 5, 14 + Math.sin(a) * 5); g.lineTo(14 + Math.cos(a) * 13, 14 + Math.sin(a) * 13); g.stroke(); }
  return toSprite(c);
}
function speckleSprite(g, w, h) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { const n = (Math.random() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
}

function buildArt() {
  const W = TEX.walls;
  W[1] = pixelsOf(texBrick()); W[2] = pixelsOf(texConcrete()); W[3] = pixelsOf(texWood());
  W[4] = pixelsOf(texTile()); W[5] = pixelsOf(texWallpaper(false)); W[6] = pixelsOf(texWallpaper(true));
  W[7] = pixelsOf(texMetal()); W[9] = pixelsOf(texGate());
  TEX.floors = { wood: pixelsOf(floorWood()), check: pixelsOf(floorCheck()), metal: pixelsOf(floorMetal()), carpet: pixelsOf(floorCarpet()) };
  TEX.ceils = { plaster: pixelsOf(ceilPlaster()), metal: pixelsOf(ceilMetal()), warm: pixelsOf(ceilWarm()) };
  SPR.grunt = [sprGrunt(0), sprGrunt(1), sprGrunt(2)];
  SPR.ghost = [sprGhost(0), sprGhost(1)];
  SPR.heavy = [sprHeavy(0), sprHeavy(1), sprHeavy(2)];
  SPR.boss = [sprBoss(0), sprBoss(1)];
  SPR.lara = { cross: sprLara('cross'), soft: sprLara('soft') };
  SPR.ammo = sprAmmo(); SPR.choc = sprChoc(); SPR.crate = sprCrate(); SPR.table = sprTable();
  SPR.candle = sprCandle(); SPR.roses = sprRoses(); SPR.exit = sprExit();
  SPR.orb = { red: sprOrb('#ff3b3b', '#ffb199'), orange: sprOrb('#ff9f1c', '#ffe08a'), pink: sprOrb('#e64980', '#ffc2d9'), violet: sprOrb('#9c36f5', '#e5b8ff') };
  SPR.spark = { gold: sprSpark('#ffd34d'), pink: sprSpark('#ff6fa0') };
}
