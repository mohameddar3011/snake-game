// A small canvas particle engine (no React in here).
//
//   burst()      sparkles flying out of a point (a star was found)
//   comets()     golden light streaming from many points toward the moon
//   setAmbient() pink + gold glitter drifting off the moon's edge
//   setHearts()  hundreds of tiny hearts floating up the screen
//   setDust()    slow golden dust over the whole screen
//
// Glows and hearts are pre-rendered into small sprites once, so even several
// hundred particles stay smooth on a phone. The animation loop only runs while
// something is alive.

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const GOLD = ['#ffe9a8', '#ffd36b', '#ffc94d', '#fff6d8'];
export const PINK = ['#ff8cc6', '#ff5fae', '#ffb3d9', '#e58cff'];
export const SOFT = ['#ff5fae', '#e58cff', '#ffb347', '#ff8cc6', '#c58cff', '#ffd36b', '#ff7ac0'];
export const HEARTS = ['#ff6fb5', '#ff8cc6', '#ffb3d9', '#ff4f9a', '#c58cff', '#e58cff', '#ffe9a8', '#ffd36b'];

function heartPath(ctx, x, y, w, h) {
  const top = h * 0.3;
  ctx.beginPath();
  ctx.moveTo(x, y + top);
  ctx.bezierCurveTo(x, y, x - w / 2, y, x - w / 2, y + top);
  ctx.bezierCurveTo(x - w / 2, y + (h + top) / 2, x, y + (h + top) / 2, x, y + h);
  ctx.bezierCurveTo(x, y + (h + top) / 2, x + w / 2, y + (h + top) / 2, x + w / 2, y + top);
  ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + top);
  ctx.closePath();
}

export function createParticles(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let dpr = 1;
  let raf = 0;
  let running = false; // exactly one animation loop may exist at a time
  let last = 0;
  let list = [];
  let comets = [];
  let ambient = null;
  let hearts = null;
  let dust = null;
  const acc = { ambient: 0, hearts: 0, dust: 0 };
  const sprites = new Map();
  const MAX = reduced ? 320 : 1400;

  // ---- sprites -------------------------------------------------------------
  function glow(color) {
    const key = 'g' + color;
    if (sprites.has(key)) return sprites.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d', { willReadFrequently: true });
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.5, color + '66');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    sprites.set(key, c);
    return c;
  }

  function soft(color) {
    const key = 's' + color;
    if (sprites.has(key)) return sprites.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d', { willReadFrequently: true });
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color + 'cc');
    grad.addColorStop(0.7, color + '44');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    sprites.set(key, c);
    return c;
  }

  function heart(color) {
    const key = 'h' + color;
    if (sprites.has(key)) return sprites.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.shadowColor = color;
    g.shadowBlur = 9;
    heartPath(g, 32, 14, 36, 34);
    const grad = g.createLinearGradient(14, 14, 50, 48);
    grad.addColorStop(0, '#ffffffcc');
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, color);
    g.fillStyle = grad;
    g.fill();
    sprites.set(key, c);
    return c;
  }

  // ---- sizing --------------------------------------------------------------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- spawning ------------------------------------------------------------
  function add(p) {
    if (list.length >= MAX) return; // at capacity: skip the newest sparkle (cheap, never visible)
    const q = { age: 0, drag: 0, gravity: 0, alpha: 1, fadeIn: 0.05, fadePow: 1, tw: 0, ph: Math.random() * TAU, vx: 0, vy: 0, kind: 'glow', ...p };
    q.sprite = q.kind === 'heart' ? heart(q.color) : q.kind === 'soft' ? soft(q.color) : glow(q.color);
    list.push(q);
    wake();
  }

  function burst(x, y, o = {}) {
    const n = Math.round((o.count ?? 28) * (reduced ? 0.5 : 1));
    const colors = o.colors || [...GOLD, ...PINK.slice(0, 2)];
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(o.speed?.[0] ?? 40, o.speed?.[1] ?? 220);
      add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(o.life?.[0] ?? 0.7, o.life?.[1] ?? 1.5),
        size: rand(o.size?.[0] ?? 6, o.size?.[1] ?? 16),
        color: pick(colors),
        kind: o.soft ? 'soft' : 'glow',
        drag: 1.6,
        gravity: o.gravity ?? 40,
        fadePow: 1.4,
        tw: rand(8, 18),
      });
    }
  }

  function heartBurst(x, y, count = 40) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(60, 360);
      add({
        kind: 'heart',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60,
        life: rand(1.6, 3.4),
        size: rand(8, 22),
        color: pick(HEARTS),
        drag: 1.4,
        gravity: -26,
        rot: rand(-0.5, 0.5),
        vr: rand(-1, 1),
        fadePow: 1.1,
      });
    }
  }

  /** sources: [{x,y}]. target: {x,y,r}. Light streams from each source into the target disc. */
  function startComets(sources, target, o = {}) {
    const total = sources.length;
    let arrived = 0;
    sources.forEach((s) => {
      const a = rand(0, TAU);
      const rr = Math.sqrt(Math.random()) * (target.r || 0) * 0.55;
      const tx = target.x + Math.cos(a) * rr;
      const ty = target.y + Math.sin(a) * rr;
      const dx = tx - s.x;
      const dy = ty - s.y;
      const k = rand(-0.32, 0.32);
      comets.push({
        sx: s.x,
        sy: s.y,
        tx,
        ty,
        cx: (s.x + tx) / 2 - dy * k,
        cy: (s.y + ty) / 2 + dx * k - Math.hypot(dx, dy) * 0.12,
        delay: rand(o.delay?.[0] ?? 0, o.delay?.[1] ?? 0.9),
        dur: rand(o.dur?.[0] ?? 1.5, o.dur?.[1] ?? 2.2),
        t: 0,
        color: pick(o.colors || [...GOLD, '#ffb3d9']),
        onArrive: () => {
          arrived++;
          o.onArrive?.(arrived, total);
          if (arrived === total) o.onDone?.();
        },
      });
    });
    wake();
  }

  function setAmbient(cfg) {
    ambient = cfg;
    if (cfg) wake();
  }
  function setHearts(cfg) {
    hearts = cfg;
    if (cfg) {
      const n = Math.round((cfg.prefill ?? 0) * (reduced ? 0.4 : 1));
      for (let i = 0; i < n; i++) spawnHeart(true);
      wake();
    }
  }
  function setDust(cfg) {
    dust = cfg;
    if (cfg) wake();
  }

  function spawnHeart(anywhere = false) {
    const vy = -rand(34, 110);
    const size = Math.random() < 0.08 ? rand(20, 28) : rand(7, 17);
    add({
      kind: 'heart',
      x: rand(-10, W + 10),
      y: anywhere ? rand(0, H) : H + 24,
      x0: 0,
      vx: 0,
      vy,
      life: (H + 60) / -vy + 1,
      size,
      color: pick(HEARTS),
      alpha: rand(0.5, 0.95),
      rot: rand(-0.4, 0.4),
      vr: rand(-0.4, 0.4),
      sway: rand(8, 26),
      swayF: rand(0.5, 1.4),
      fadeIn: 0.8,
      fadePow: 0.25,
    });
    const p = list[list.length - 1];
    p.x0 = p.x;
  }

  // ---- loop ----------------------------------------------------------------
  function isActive() {
    return list.length > 0 || comets.length > 0 || !!ambient || !!hearts || !!dust;
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    draw();
    if (isActive()) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false; // nothing left to animate: stop the loop until the next burst
      raf = 0;
    }
  }

  function update(dt) {
    const k = reduced ? 0.5 : 1;
    if (ambient) {
      acc.ambient += ambient.rate * k * dt;
      while (acc.ambient >= 1) {
        acc.ambient -= 1;
        const a = rand(0, TAU);
        const rr = ambient.r * rand(0.9, 1.04);
        const s = rand(6, 34);
        add({
          x: ambient.cx + Math.cos(a) * rr,
          y: ambient.cy + Math.sin(a) * rr,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - rand(4, 16),
          life: rand(2.2, 4.6),
          size: rand(4, 13),
          kind: 'soft',
          color: pick(ambient.colors || SOFT),
          alpha: rand(0.5, 1),
          fadeIn: 0.5,
          fadePow: 0.8,
          tw: rand(2, 6),
        });
      }
    }
    if (dust) {
      acc.dust += dust.rate * k * dt;
      while (acc.dust >= 1) {
        acc.dust -= 1;
        add({
          x: rand(0, W),
          y: rand(0, H),
          vx: rand(-5, 5),
          vy: -rand(5, 22),
          life: rand(3, 6.5),
          size: rand(3, 9),
          color: pick(dust.colors || [...GOLD, '#ffb3d9']),
          alpha: rand(0.35, 0.9),
          fadeIn: 1,
          fadePow: 0.9,
          tw: rand(2, 5),
        });
      }
    }
    if (hearts) {
      acc.hearts += hearts.rate * k * dt;
      while (acc.hearts >= 1) {
        acc.hearts -= 1;
        spawnHeart();
      }
    }

    for (const c of comets) {
      c.delay -= dt;
      if (c.delay > 0) continue;
      c.t += dt / c.dur;
      const t = Math.min(1, c.t);
      const e = t * t * (3 - 2 * t);
      const u = 1 - e;
      c.x = u * u * c.sx + 2 * u * e * c.cx + e * e * c.tx;
      c.y = u * u * c.sy + 2 * u * e * c.cy + e * e * c.ty;
      // sparkly trail: one sparkle every few pixels along the path, so the
      // streak stays continuous even if a phone drops frames
      const px = c.px ?? c.x;
      const py = c.py ?? c.y;
      const dist = Math.hypot(c.x - px, c.y - py);
      const every = reduced ? 16 : 10;
      const n = Math.min(14, Math.max(1, Math.round(dist / every)));
      for (let i = 1; i <= n; i++) {
        const f = i / n;
        add({
          x: px + (c.x - px) * f + rand(-3, 3),
          y: py + (c.y - py) * f + rand(-3, 3),
          vx: rand(-12, 12),
          vy: rand(-12, 12),
          life: rand(0.55, 1.1),
          size: rand(6, 15),
          color: c.color,
          fadePow: 1.3,
        });
      }
      c.px = c.x;
      c.py = c.y;
      if (c.t >= 1) {
        c.done = true;
        burst(c.tx, c.ty, { count: 5, speed: [20, 110], size: [5, 11], life: [0.4, 0.9], gravity: 0 });
        c.onArrive();
      }
    }
    if (comets.some((c) => c.done)) comets = comets.filter((c) => !c.done);

    for (const p of list) {
      p.age += dt;
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.sway) p.x = p.x0 + Math.sin(p.age * p.swayF + p.ph) * p.sway;
      if (p.vr) p.rot += p.vr * dt;
    }
    list = list.filter((p) => p.age < p.life);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // hearts first (normal blending), then glows on top (additive)
    ctx.globalCompositeOperation = 'source-over';
    for (const p of list) {
      if (p.kind !== 'heart') continue;
      const a = alphaOf(p);
      if (a <= 0.01) continue;
      const s = p.size * 1.7;
      ctx.globalAlpha = a;
      if (p.rot) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    for (const p of list) {
      if (p.kind !== 'soft') continue;
      const a = alphaOf(p);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      const s = p.size * 2;
      ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
      if (p.kind !== 'glow') continue;
      const a = alphaOf(p);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      const s = p.size * 2;
      ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
    }
    for (const c of comets) {
      if (c.delay > 0 || c.x === undefined) continue;
      ctx.globalAlpha = 1;
      const s = 52;
      ctx.drawImage(glow(c.color), c.x - s / 2, c.y - s / 2, s, s);
      ctx.drawImage(glow('#ffffff'), c.x - 11, c.y - 11, 22, 22);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function alphaOf(p) {
    const t = p.age / p.life;
    let a = p.alpha * Math.min(1, p.age / p.fadeIn) * Math.pow(Math.max(0, 1 - t), p.fadePow);
    if (p.tw) a *= 0.72 + 0.28 * Math.sin(p.age * p.tw + p.ph);
    return a;
  }

  function clear() {
    list = [];
    comets = [];
    ctx.clearRect(0, 0, W, H);
  }

  function destroy() {
    cancelAnimationFrame(raf);
    raf = 0;
    running = false;
    list = [];
    comets = [];
    ambient = hearts = dust = null;
  }

  resize();
  return { resize, burst, heartBurst, comets: startComets, setAmbient, setHearts, setDust, clear, destroy, get count() { return list.length; } };
}
