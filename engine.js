/* =====================================================================
   engine.js — a small software raycaster.
   Textured walls + floor/ceiling casting, depth-sorted sprites, fog.
   Draws into a low-res ImageData that CSS scales up to the window.
   ===================================================================== */
'use strict';

const FOV_PLANE = 0.84;          // half-width of the camera plane (≈80° FOV)
const SHADE_LEVELS = 32;

const R = {
  W: 640, H: 360, canvas: null, ctx: null, img: null, buf: null, zbuf: null, rowOff: null,
  wallT: {}, floorT: null, ceilT: null, fog: [0, 0, 0], fogDist: 15, proj: []
};

function initRenderer(canvas) { R.canvas = canvas; setResolution(854, 480); }

function setResolution(w, h) {
  R.W = w; R.H = h;
  R.canvas.width = w; R.canvas.height = h;
  R.ctx = R.canvas.getContext('2d');
  R.img = R.ctx.createImageData(w, h);
  R.buf = new Uint32Array(R.img.data.buffer);
  R.zbuf = new Float32Array(w);
  R.rowOff = new Int32Array(h + 2);
}

// Pre-shade every texture at SHADE_LEVELS fog levels so the inner loops are a single lookup.
function buildShading(level) {
  const [fr, fg, fb] = level.fog;
  R.fog = level.fog; R.fogDist = level.fogDist;
  const make = (px, emissive) => {
    const out = new Uint32Array(SHADE_LEVELS * 4096);
    for (let l = 0; l < SHADE_LEVELS; l++) {
      const t = (l / (SHADE_LEVELS - 1)) * (emissive ? 0.25 : 1);
      const m = Math.pow(1 - t, 1.35);
      for (let i = 0; i < 4096; i++) {
        const c = px[i];
        const r = fr + ((c & 255) - fr) * m, g = fg + (((c >> 8) & 255) - fg) * m, b = fb + (((c >> 16) & 255) - fb) * m;
        out[(l << 12) + i] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }
    return out;
  };
  R.wallT = {};
  for (const id in TEX.walls) R.wallT[id] = make(TEX.walls[id], id === '9');
  R.floorT = make(TEX.floors[level.floor], false);
  R.ceilT = make(TEX.ceils[level.ceil], false);
}

function makeCamera(x, y, ang, pitchPx, bob) {
  const dirX = Math.cos(ang), dirY = Math.sin(ang);
  return { x, y, ang, dirX, dirY, planeX: -dirY * FOV_PLANE, planeY: dirX * FOV_PLANE, hz: R.H / 2 + pitchPx + bob };
}

function drawFloorCeil(cam) {
  const { W, H, buf } = R, hz = cam.hz;
  const rx0 = cam.dirX - cam.planeX, ry0 = cam.dirY - cam.planeY, rx1 = cam.dirX + cam.planeX, ry1 = cam.dirY + cam.planeY;
  const fogD = R.fogDist;
  for (let y = 0; y < H; y++) {
    let p = y + 0.5 - hz;
    const isFloor = p > 0;
    if (p > -0.75 && p < 0.75) p = isFloor ? 0.75 : -0.75;
    const rowDist = (0.5 * H) / Math.abs(p);
    const tbl = isFloor ? R.floorT : R.ceilT;
    let lvl = ((rowDist / fogD) * (SHADE_LEVELS - 1)) | 0; if (lvl > SHADE_LEVELS - 1) lvl = SHADE_LEVELS - 1;
    const base = lvl << 12;
    const sx = (rowDist * (rx1 - rx0)) / W, sy = (rowDist * (ry1 - ry0)) / W;
    let fx = cam.x + rowDist * rx0, fy = cam.y + rowDist * ry0, o = y * W;
    for (let x = 0; x < W; x++) {
      buf[o++] = tbl[base + (((fy * 64) & 63) << 6) + ((fx * 64) & 63)];
      fx += sx; fy += sy;
    }
  }
}

function drawWalls(cam, grid, mw) {
  const { W, H, buf, zbuf } = R, hz = cam.hz, fogD = R.fogDist;
  for (let x = 0; x < W; x++) {
    const camX = (2 * x) / W - 1;
    const rdx = cam.dirX + cam.planeX * camX, rdy = cam.dirY + cam.planeY * camX;
    let mx = cam.x | 0, my = cam.y | 0;
    const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    let stepX, stepY, sdx, sdy;
    if (rdx < 0) { stepX = -1; sdx = (cam.x - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - cam.x) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (cam.y - my) * ddy; } else { stepY = 1; sdy = (my + 1 - cam.y) * ddy; }
    let side = 0, id = 0;
    while (!id) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      id = grid[my * mw + mx];
    }
    const perp = side === 0 ? sdx - ddx : sdy - ddy;
    zbuf[x] = perp;
    let wallX = side === 0 ? cam.y + perp * rdy : cam.x + perp * rdx;
    wallX -= Math.floor(wallX);
    let texX = (wallX * 64) | 0;
    if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = 63 - texX;
    const lineH = H / perp;
    const top = hz - lineH / 2;
    let y0 = Math.max(0, Math.floor(top)), y1 = Math.min(H - 1, Math.floor(top + lineH));
    const step = 64 / lineH;
    let texPos = (y0 - top) * step;
    let lvl = ((perp / fogD) * (SHADE_LEVELS - 1) + (side ? 3 : 0)) | 0; if (lvl > SHADE_LEVELS - 1) lvl = SHADE_LEVELS - 1;
    const tbl = R.wallT[id], base = lvl << 12;
    for (let y = y0, o = y0 * W + x; y <= y1; y++, o += W) {
      buf[o] = tbl[base + (((texPos | 0) & 63) << 6) + texX];
      texPos += step;
    }
  }
}

/* Sprite = { x, y, z (lift above floor, in wall units), h (height in wall units), img, flash, full, alpha, vs, ref } */
function drawSprites(cam, list) {
  const { W, H, buf, zbuf } = R, hz = cam.hz;
  const [fr, fg, fb] = R.fog;
  const inv = 1 / (cam.planeX * cam.dirY - cam.dirX * cam.planeY);
  const vis = [];
  for (const s of list) {
    const dx = s.x - cam.x, dy = s.y - cam.y;
    const tx = inv * (cam.dirY * dx - cam.dirX * dy), ty = inv * (-cam.planeY * dx + cam.planeX * dy);
    if (ty < 0.12) continue;
    s.tx = tx; s.ty = ty; vis.push(s);
  }
  vis.sort((a, b) => b.ty - a.ty);
  R.proj.length = 0;
  for (const s of vis) {
    const { tx, ty, img } = s;
    const unit = H / ty;
    const fullH = unit * s.h, sw = fullH * (img.w / img.h), sh = fullH * (s.vs || 1);
    const sx = (W / 2) * (1 + tx / ty);
    const bot = hz + unit * (0.5 - (s.z || 0)), top = bot - sh;
    const x0 = Math.floor(sx - sw / 2), x1 = Math.floor(sx + sw / 2), y0 = Math.floor(top), y1 = Math.floor(bot);
    if (x1 <= 0 || x0 >= W || y1 <= 0 || y0 >= H || x1 <= x0 || y1 <= y0) continue;
    R.proj.push({ s, x0: sx - sw / 2, x1: sx + sw / 2, top, bot, depth: ty });
    const cx0 = Math.max(0, x0), cx1 = Math.min(W, x1), cy0 = Math.max(0, y0), cy1 = Math.min(H, y1);
    const stepX = img.w / (x1 - x0), stepY = img.h / (y1 - y0), iw = img.w, ipx = img.px;
    for (let y = cy0; y < cy1; y++) { let t = ((y - y0) * stepY) | 0; if (t >= img.h) t = img.h - 1; R.rowOff[y - cy0] = t * iw; }
    let m = 256;
    if (!s.full) { let t = ty / R.fogDist; if (t > 1) t = 1; m = (Math.pow(1 - t, 1.35) * 256) | 0; }
    const fl = s.flash > 0 ? Math.min(256, (s.flash * 256) | 0) : 0, galpha = s.alpha == null ? 1 : s.alpha;
    for (let x = cx0; x < cx1; x++) {
      if (ty >= zbuf[x]) continue;
      let tcol = ((x - x0) * stepX) | 0; if (tcol >= iw) tcol = iw - 1;
      for (let y = cy0, o = cy0 * W + x; y < cy1; y++, o += W) {
        const c = ipx[R.rowOff[y - cy0] + tcol];
        let a = c >>> 24;
        if (!a) continue;
        let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
        if (m < 256) { r = fr + (((r - fr) * m) >> 8); g = fg + (((g - fg) * m) >> 8); b = fb + (((b - fb) * m) >> 8); }
        if (fl) { r += ((255 - r) * fl) >> 8; g += ((255 - g) * fl) >> 8; b += ((255 - b) * fl) >> 8; }
        if (galpha < 1) a = (a * galpha) | 0;
        if (a < 255) {
          const d = buf[o], dr = d & 255, dg = (d >> 8) & 255, db = (d >> 16) & 255;
          r = dr + (((r - dr) * a) >> 8); g = dg + (((g - dg) * a) >> 8); b = db + (((b - db) * a) >> 8);
        }
        buf[o] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }
  }
}

function renderScene(cam, grid, mw, sprites) {
  drawFloorCeil(cam);
  drawWalls(cam, grid, mw);
  drawSprites(cam, sprites);
  R.ctx.putImageData(R.img, 0, 0);
}
