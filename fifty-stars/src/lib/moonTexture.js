// Paints a soft, warm, pink-gold full moon onto a canvas: maria, craters, grain
// and limb darkening. Seeded, so it is the same moon every visit.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

export function paintMoon(canvas, size = 900) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const R = size / 2;
  const rnd = mulberry32(2024);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R, 0, TAU);
  ctx.clip();

  // warm base, brighter toward the upper left
  const base = ctx.createRadialGradient(R * 0.74, R * 0.68, R * 0.04, R, R, R * 1.02);
  base.addColorStop(0, '#fffbf1');
  base.addColorStop(0.42, '#fcecd2');
  base.addColorStop(0.78, '#f1d3bd');
  base.addColorStop(1, '#dcaec8');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // maria: broad, soft seas in a warm violet-grey. Several small overlapping
  // gradients per sea give them ragged, natural edges instead of one smooth blob.
  const maria = [
    [0.36, 0.33, 0.15], [0.54, 0.27, 0.11], [0.63, 0.46, 0.16], [0.39, 0.56, 0.13],
    [0.56, 0.69, 0.11], [0.27, 0.46, 0.07], [0.72, 0.3, 0.07], [0.47, 0.45, 0.09],
  ];
  for (const [mx, my, mr] of maria) {
    for (let k = 0; k < 14; k++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * mr * 0.9;
      const ox = (mx + Math.cos(a) * d) * size;
      const oy = (my + Math.sin(a) * d) * size;
      const rr = mr * (0.25 + rnd() * 0.4) * size;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
      g.addColorStop(0, 'rgba(132,100,150,0.15)');
      g.addColorStop(0.55, 'rgba(132,100,150,0.08)');
      g.addColorStop(1, 'rgba(132,100,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
  }

  // craters, lit from the upper left: a shaded far wall, a bright near rim
  const crater = (x, y, r, strength) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = `rgba(104,76,128,${0.15 * strength})`; // shaded floor
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = `rgba(255,247,232,${0.24 * strength})`; // sunlit lower-right wall
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.3, r * 0.92, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(255,250,240,${0.13 * strength})`; // thin bright rim
    ctx.lineWidth = Math.max(0.6, r * 0.09);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
  };
  for (let i = 0; i < 56; i++) {
    const a = rnd() * TAU;
    const d = Math.sqrt(rnd()) * R * 0.94;
    crater(R + Math.cos(a) * d, R + Math.sin(a) * d, Math.pow(rnd(), 2.4) * R * 0.085 + R * 0.014, 1);
  }
  for (let i = 0; i < 420; i++) {
    const a = rnd() * TAU;
    const d = Math.sqrt(rnd()) * R * 0.97;
    crater(R + Math.cos(a) * d, R + Math.sin(a) * d, rnd() * R * 0.016 + R * 0.004, 0.9);
  }

  // a few bright ray craters with soft streaks
  for (let i = 0; i < 3; i++) {
    const x = R * (0.5 + (rnd() - 0.5) * 1.0);
    const y = R * (0.55 + (rnd() - 0.5) * 0.9);
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.14);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (let k = 0; k < 9; k++) {
      const ang = rnd() * TAU;
      const len = R * (0.1 + rnd() * 0.22);
      const lg = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      lg.addColorStop(0, 'rgba(255,255,255,0.22)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.4 + rnd() * 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  // fine grain
  const img = ctx.getImageData(0, 0, size, size);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const n = (rnd() - 0.5) * 13;
    px[i] += n;
    px[i + 1] += n;
    px[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // limb darkening and a rosy rim
  const limb = ctx.createRadialGradient(R, R, R * 0.55, R, R, R);
  limb.addColorStop(0, 'rgba(90,40,120,0)');
  limb.addColorStop(0.8, 'rgba(120,60,140,0.14)');
  limb.addColorStop(1, 'rgba(100,40,130,0.42)');
  ctx.fillStyle = limb;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}

/**
 * Draws the moon at a given phase onto `ctx`: 0 = a fat crescent, 1 = full.
 * The unlit part is erased with a soft-edged circle that slides off to the right,
 * so the terminator sweeps across the moon as `t` goes 0 -> 1. `base` is the
 * pre-painted full moon. A handful of cheap canvas draws: no big masks.
 */
export function drawPhase(ctx, base, size, t) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(base, 0, 0, size, size);
  if (t >= 0.999) return;
  const cx = size * (0.86 + (2.0 - 0.86) * t); // the erasing circle's centre (moon-widths from the left)
  const R = size * 0.5;
  const soft = size * 0.018;
  const g = ctx.createRadialGradient(cx, size / 2, Math.max(0, R - soft), cx, size / 2, R + soft);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
}
