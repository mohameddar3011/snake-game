/* =====================================================================
   viewmodel.js — first-person weapons (tiny box-projection renderer, drawn
   in a 1280x720 design space) and Lara's radio portraits.
   ===================================================================== */
'use strict';

const VM_F = 700; // focal length in the 1280x720 design space

function vmP(x, y, z) { return [640 + (x / z) * VM_F, 360 - (y / z) * VM_F]; }

// A box lit from above-left, seen from behind the camera at the origin.
function vmBox(g, b, col) {
  const [x0, y0, z0, x1, y1, z1] = b;
  const P = vmP;
  const quad = (pts, fill) => { g.beginPath(); pts.forEach(([x, y, z], i) => { const [sx, sy] = P(x, y, z); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2; g.stroke(); };
  const c = typeof col === 'string' ? { top: col, side: col, back: col } : col;
  if (x0 > 0) quad([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], c.side);
  else if (x1 < 0) quad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c.side);
  if (y1 < 0) quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c.top);
  else if (y0 > 0) quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], c.side);
  quad([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], c.back);
}
const METAL = { top: '#4a4f5a', side: '#2c3038', back: '#1b1d22' };
const DARK = { top: '#2b2e35', side: '#1b1d22', back: '#101114' };
const WOOD = { top: '#9a6a3c', side: '#6f4a28', back: '#4a3019' };
const GLOVE = { top: '#3a3d44', side: '#26282d', back: '#18191d' };
const SKIN = { top: '#d9a98a', side: '#b8866a', back: '#a07058' };

function vmShift(b, dx, dy, dz) { return [b[0] + dx, b[1] + dy, b[2] + dz, b[3] + dx, b[4] + dy, b[5] + dz]; }

function vmSleeve(g, pts, c0, c1) {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = vgrad(g, Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1])), c0, c1); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(pts[0][0] + 4, pts[0][1] + 18); g.lineTo(pts[1][0] - 4, pts[1][1] + 18); g.stroke();
}

function vmFlash(g, x, y, k, col) {
  if (k <= 0.02) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, k * 1.2);
  const r = 70 + 50 * k, gr = g.createRadialGradient(x, y, 2, x, y, r);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, col || '#ffd24d'); gr.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.fillStyle = '#fff4b0'; g.beginPath();
  const n = 7, rot = (x * 0.13) % 1;
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n + rot, rad = i % 2 ? 14 : r * 0.75 * (0.7 + 0.3 * ((i * 37) % 7) / 7); g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  g.closePath(); g.fill(); g.restore();
}

// st: { x, y, kick (0..1), flash (0..1), reload (0..1, 0 = idle), pump (0..1), swap (0..1 raising) }
function drawRifle(g, st) {
  const kz = -st.kick * 0.09, ky = st.kick * 0.012;
  const rl = st.reload > 0 ? Math.sin(Math.min(1, st.reload) * Math.PI) : 0;
  const dx = st.x / 700 + rl * 0.04, dy = -rl * 0.16 + ky - st.swap * 0.45 + st.y / 700;
  const S = b => vmShift(b, dx, dy, kz);
  // support forearm (comes up from the bottom)
  const hand = vmP(0.2 + dx, -0.24 + dy, 1.05 + kz);
  vmSleeve(g, [[hand[0] - 34, hand[1] + 10], [hand[0] + 34, hand[1] + 6], [hand[0] + 10, 740], [hand[0] - 250, 740]], '#3f4936', '#1d2219');
  // gun, far to near
  vmBox(g, S([0.215, -0.214, 1.3, 0.235, -0.194, 1.6]), METAL);       // barrel
  vmBox(g, S([0.21, -0.222, 1.58, 0.24, -0.188, 1.65]), DARK);         // muzzle brake
  vmBox(g, S([0.221, -0.19, 1.4, 0.229, -0.15, 1.43]), DARK);          // front sight
  vmBox(g, S([0.195, -0.235, 0.95, 0.255, -0.172, 1.3]), METAL);       // handguard
  for (let i = 0; i < 4; i++) vmBox(g, S([0.196, -0.225, 1.0 + i * 0.07, 0.254, -0.21, 1.04 + i * 0.07]), DARK);
  vmBox(g, S([0.205, -0.16, 0.6, 0.245, -0.15, 1.2]), DARK);           // top rail
  // grip + magazine
  vmBox(g, S([0.205, -0.33, 0.6, 0.245, -0.24, 0.67]), DARK);
  const magOut = st.reload > 0.28 && st.reload < 0.62 ? (st.reload - 0.28) * 1.6 : 0;
  if (!(st.reload > 0.4 && st.reload < 0.5)) vmBox(g, vmShift(S([0.205, -0.35, 0.76, 0.245, -0.235, 0.86]), 0, -magOut, 0), DARK);
  vmBox(g, S([0.18, -0.245, 0.55, 0.27, -0.16, 0.95]), METAL);          // receiver
  // optic
  vmBox(g, S([0.2, -0.15, 0.7, 0.25, -0.1, 0.9]), DARK);
  const lens = vmP(0.225 + dx, -0.125 + dy, 0.7 + kz);
  g.fillStyle = 'rgba(80,180,255,.55)'; g.beginPath(); g.ellipse(lens[0], lens[1], 15, 17, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(lens[0], lens[1], 2.5, 0, TAU); g.fill();
  // support hand over the handguard
  vmBox(g, S([0.165, -0.275, 1.0, 0.245, -0.19, 1.16]), GLOVE);
  // right hand + sleeve
  vmSleeve(g, [[vmP(0.2 + dx, -0.3 + dy, 0.5 + kz)[0] - 30, 560 + dy * 700], [vmP(0.27 + dx, -0.3 + dy, 0.5 + kz)[0] + 40, 560 + dy * 700], [1120, 740], [900, 740]], '#3f4936', '#1d2219');
  vmBox(g, S([0.2, -0.33, 0.56, 0.262, -0.245, 0.64]), GLOVE);
  const mz = vmP(0.225 + dx, -0.204 + dy, 1.65 + kz);
  vmFlash(g, mz[0], mz[1], st.flash, '#ffd24d');
}

function drawShotgun(g, st) {
  const kz = -st.kick * 0.12, ky = st.kick * 0.02;
  const rl = st.reload > 0 ? Math.sin(Math.min(1, st.reload) * Math.PI) : 0;
  const dx = st.x / 700 + rl * 0.04, dy = -rl * 0.16 + ky - st.swap * 0.45 + st.y / 700;
  const S = b => vmShift(b, dx, dy, kz);
  const pump = st.pump > 0 ? Math.sin(Math.min(1, st.pump) * Math.PI) * 0.16 : 0;
  const hand = vmP(0.2 + dx, -0.24 + dy, 1.12 + kz - pump);
  vmSleeve(g, [[hand[0] - 34, hand[1] + 10], [hand[0] + 34, hand[1] + 6], [hand[0] + 10, 740], [hand[0] - 250, 740]], '#3f4936', '#1d2219');
  vmBox(g, S([0.205, -0.2, 1.1, 0.245, -0.17, 1.8]), METAL);            // barrel
  vmBox(g, S([0.205, -0.235, 0.9, 0.245, -0.205, 1.55]), METAL);         // magazine tube
  vmBox(g, S([0.221, -0.17, 1.74, 0.229, -0.14, 1.77]), DARK);           // bead
  vmBox(g, vmShift(S([0.188, -0.262, 1.0, 0.262, -0.198, 1.3]), 0, 0, -pump), WOOD);   // pump
  vmBox(g, S([0.205, -0.3, 0.5, 0.25, -0.215, 0.6]), WOOD);              // stock
  vmBox(g, S([0.18, -0.25, 0.55, 0.27, -0.165, 0.95]), METAL);           // receiver
  vmBox(g, S([0.2, -0.165, 0.6, 0.25, -0.155, 0.95]), DARK);             // top
  vmBox(g, vmShift(S([0.165, -0.28, 1.04, 0.245, -0.19, 1.2]), 0, 0, -pump), GLOVE); // support hand
  vmSleeve(g, [[vmP(0.2 + dx, -0.3 + dy, 0.5 + kz)[0] - 30, 560 + dy * 700], [vmP(0.27 + dx, -0.3 + dy, 0.5 + kz)[0] + 40, 560 + dy * 700], [1120, 740], [900, 740]], '#3f4936', '#1d2219');
  vmBox(g, S([0.2, -0.335, 0.52, 0.262, -0.25, 0.6]), GLOVE);
  // a pink bow on the muzzle
  const m = vmP(0.225 + dx, -0.2 + dy, 1.8 + kz);
  g.fillStyle = '#ff5c8a'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(m[0] - 11, m[1] + 6, 11, 6, -0.5, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(m[0] + 11, m[1] + 6, 11, 6, 0.5, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#e03a6a'; g.beginPath(); g.arc(m[0], m[1] + 6, 4, 0, TAU); g.fill(); g.stroke();
  vmFlash(g, m[0], m[1], st.flash, '#ffb0c8');
}

function drawWeapon(g, id, st) {
  g.save();
  if (id === 0) drawRifle(g, st); else drawShotgun(g, st);
  g.restore();
}

/* ---- Lara's radio portrait (96x96), one per mood ---- */
function portraitCanvas(mood) {
  const c = cv(96, 96), g = c.getContext('2d');
  const skin = CONFIG.skin, hair = CONFIG.hair, dress = CONFIG.dress;
  g.fillStyle = vgrad(g, 0, 96, '#26352a', '#10170f'); g.fillRect(0, 0, 96, 96);
  // hair behind
  g.fillStyle = hair; g.beginPath(); g.ellipse(48, 42, 30, 34, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(18, 40); g.quadraticCurveTo(8, 92, 20, 96); g.lineTo(76, 96); g.quadraticCurveTo(88, 92, 78, 40); g.closePath(); g.fill();
  // shoulders / dress
  g.fillStyle = dress; g.beginPath(); g.moveTo(14, 96); g.quadraticCurveTo(48, 70, 82, 96); g.closePath(); g.fill();
  // neck + face
  g.fillStyle = skin; g.fillRect(41, 62, 14, 16);
  g.beginPath(); g.ellipse(48, 44, 21, 25, 0, 0, TAU); g.fill();
  // fringe
  g.fillStyle = hair; g.beginPath(); g.ellipse(48, 26, 23, 12, 0, Math.PI, TAU); g.fill();
  g.beginPath(); g.moveTo(26, 28); g.quadraticCurveTo(30, 44, 25, 54); g.lineTo(31, 30); g.fill();
  g.beginPath(); g.moveTo(70, 28); g.quadraticCurveTo(66, 44, 71, 54); g.lineTo(65, 30); g.fill();
  // brows
  g.strokeStyle = '#2d1a14'; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath();
  const brow = {
    angry: [[34, 36, 43, 40], [62, 36, 53, 40]], cold: [[34, 38, 43, 38], [62, 38, 53, 38]],
    worried: [[34, 40, 43, 36], [62, 40, 53, 36]], soft: [[34, 38, 43, 36.5], [62, 38, 53, 36.5]], smile: [[34, 37, 43, 35.5], [62, 37, 53, 35.5]]
  }[mood] || [[34, 38, 43, 38], [62, 38, 53, 38]];
  brow.forEach(([a, b, c2, d]) => { g.moveTo(a, b); g.lineTo(c2, d); }); g.stroke();
  // eyes
  g.fillStyle = '#fff';
  if (mood === 'smile') {
    g.strokeStyle = '#2a1a22'; g.lineWidth = 2.4; g.beginPath(); g.arc(39, 46, 4.5, 1.15 * Math.PI, 1.85 * Math.PI); g.moveTo(62, 46); g.arc(57, 46, 4.5, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
  } else {
    const lid = mood === 'cold' ? 3 : 0;
    [39, 57].forEach(x => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, 46, 5.5, 4, 0, 0, TAU); g.fill(); g.fillStyle = '#3a2418'; g.beginPath(); g.arc(x, 46.5, 2.8, 0, TAU); g.fill(); if (lid) { g.fillStyle = skin; g.fillRect(x - 6, 41, 12, lid + 1); } });
  }
  // cheeks for soft/smile
  if (mood === 'soft' || mood === 'smile') { g.fillStyle = 'rgba(255,110,140,.3)'; g.beginPath(); g.ellipse(32, 55, 5, 3.2, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(64, 55, 5, 3.2, 0, 0, TAU); g.fill(); }
  // mouth
  g.strokeStyle = '#a82f45'; g.lineWidth = 2.6; g.beginPath();
  if (mood === 'angry') g.arc(48, 70, 7, 1.2 * Math.PI, 1.8 * Math.PI);
  else if (mood === 'cold') { g.moveTo(42, 63); g.lineTo(54, 63); }
  else if (mood === 'worried') g.arc(48, 67, 5, 1.2 * Math.PI, 1.8 * Math.PI);
  else if (mood === 'soft') g.arc(48, 59, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  else { g.arc(48, 57, 9, 0.1 * Math.PI, 0.9 * Math.PI); }
  g.stroke();
  // scanlines for the radio look
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < 96; y += 3) g.fillRect(0, y, 96, 1);
  return c;
}
