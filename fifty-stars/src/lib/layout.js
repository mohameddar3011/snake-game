// Places the 50 stars across the whole sky.
//
// Best-candidate sampling spreads them out evenly, then a few rounds of
// relaxation push neighbours apart, so every star keeps a comfortable
// fingertip-sized gap. Stars stay clear of the HUD and the moon. The result is
// deterministic: same screen shape -> same sky.
import { TOTAL_STARS } from '../data/messages.js';
import { mulberry32 } from './rng.js';
import { isPortrait, skyMoon } from './geometry.js';

export function skyBounds(w, h) {
  const portrait = isPortrait(w, h);
  return {
    left: portrait ? 30 : 56,
    right: w - (portrait ? 30 : 56),
    top: portrait ? 118 : 104,
    bottom: h - (portrait ? 108 : 104),
  };
}

export function generateLayout(w, h, { count = TOTAL_STARS, seed = 5021 } = {}) {
  const b = skyBounds(w, h);
  const moon = skyMoon(w, h);
  const keepOut = moon.d / 2 + 30;
  const rnd = mulberry32(seed ^ (Math.round(w) * 73856093) ^ (Math.round(h) * 19349663));

  const dist = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);
  const clearOfMoon = (p) => Math.hypot(p.x - moon.cx, p.y - moon.cy) >= keepOut;
  const pts = [];

  // 1) best-candidate sampling
  while (pts.length < count) {
    let best = null;
    let bestScore = -1;
    for (let k = 0; k < 90; k++) {
      const c = { x: b.left + rnd() * (b.right - b.left), y: b.top + rnd() * (b.bottom - b.top) };
      if (!clearOfMoon(c)) continue;
      let nearest = Infinity;
      for (const p of pts) nearest = Math.min(nearest, dist(c, p));
      if (nearest > bestScore) {
        bestScore = nearest;
        best = c;
      }
    }
    pts.push(best ?? { x: b.left + rnd() * (b.right - b.left), y: b.bottom });
  }

  // 2) relaxation: push crowded neighbours apart, stay in bounds and off the moon
  const area =
    (b.right - b.left) * (b.bottom - b.top) - Math.PI * Math.min(keepOut, 400) * Math.min(keepOut, 400) * 0.8;
  const spacing = Math.sqrt((2 * area) / (Math.sqrt(3) * count));
  const reach = spacing * 0.98;
  for (let iter = 0; iter < 400; iter++) {
    const push = pts.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < reach) {
          const f = ((reach - d) / reach) * 0.5;
          push[i].x += (dx / d) * f * spacing * 0.35;
          push[i].y += (dy / d) * f * spacing * 0.35;
          push[j].x -= (dx / d) * f * spacing * 0.35;
          push[j].y -= (dy / d) * f * spacing * 0.35;
        }
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x = Math.min(b.right, Math.max(b.left, p.x + push[i].x));
      p.y = Math.min(b.bottom, Math.max(b.top, p.y + push[i].y));
      const dx = p.x - moon.cx;
      const dy = p.y - moon.cy;
      const d = Math.hypot(dx, dy) || 0.001;
      if (d < keepOut) {
        p.x = moon.cx + (dx / d) * keepOut;
        p.y = moon.cy + (dy / d) * keepOut;
        p.x = Math.min(b.right, Math.max(b.left, p.x));
        p.y = Math.min(b.bottom, Math.max(b.top, p.y));
      }
    }
  }

  const tints = ['white', 'white', 'rose', 'lilac', 'white', 'rose'];
  const stars = pts.map((p, id) => ({
    id,
    x: p.x / w,
    y: p.y / h,
    size: 0.9 + rnd() * 0.5,
    dur: 2.4 + rnd() * 3.2,
    delay: -rnd() * 5,
    tint: tints[Math.floor(rnd() * tints.length)],
  }));

  return { stars, moon, minDist: minDistance(pts) };
}

export function minDistance(pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) m = Math.min(m, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  }
  return m;
}
