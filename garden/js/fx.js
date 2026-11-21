/* fx.js
   Two full-screen canvases:
     fx-bg  (behind the flowers)  floating hearts, glowing motes, drifting petals, fireflies at dusk
     fx-fg  (in front)            butterflies and every bloom / collect / finale effect
   Everything is sprite based (pre-drawn once, then stamped) so it stays smooth on a phone. */
const FX = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const easeOut = u => 1 - Math.pow(1 - u, 3);
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  let cb, cf, xb, xf, W = 0, H = 0, dpr = 1, dusk = 0, running = false, last = 0;
  const parts = [], fxs = [], ambient = { motes: [], hearts: [], petals: [], flies: [] }, flies = [];
  let rain = null;

  /* ---------- sprites ---------- */
  const SP = {};
  const sprite = (key, w, h, draw) => {
    if (SP[key]) return SP[key];
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const x = c.getContext('2d');
    x.scale(2, 2);
    draw(x, w, h);
    return (SP[key] = { c, w, h });
  };
  const glowSp = col => sprite('glow' + col, 64, 64, x => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(col, 1)); g.addColorStop(.35, rgba(col, .5)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  });
  const heartSp = (c1, c2) => sprite('heart' + c1 + c2, 64, 64, x => {
    x.translate(32, 31);
    const p = new Path2D(Art.heart(26));
    const g = x.createLinearGradient(-22, -24, 22, 26);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.fillStyle = g; x.fill(p);
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.2; x.stroke(p);
    x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(-10, -14, 5.5, 3, -.7, 0, TAU); x.fill();
  });
  const petalSp = (c1, c2) => sprite('petal' + c1 + c2, 30, 42, x => {
    x.translate(15, 21); x.scale(13, 19);
    const g = x.createLinearGradient(0, -1, 0, 1);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -1); x.bezierCurveTo(.95, -.55, .85, .65, 0, 1); x.bezierCurveTo(-.85, .65, -.95, -.55, 0, -1); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = .06; x.beginPath(); x.moveTo(0, -.7); x.lineTo(0, .7); x.stroke();
  });
  const sparkSp = col => sprite('spark' + col, 48, 48, x => {
    x.translate(24, 24);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 24);
    g.addColorStop(0, rgba(col, .55)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.fillRect(-24, -24, 48, 48);
    x.fillStyle = '#fff'; x.strokeStyle = col; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(0, -20); x.quadraticCurveTo(2.6, -2.6, 20, 0); x.quadraticCurveTo(2.6, 2.6, 0, 20); x.quadraticCurveTo(-2.6, 2.6, -20, 0); x.quadraticCurveTo(-2.6, -2.6, 0, -20);
    x.fill(); x.stroke();
  });
  const wingsSp = (a, b, c) => sprite('wing' + a + b + c, 120, 100, x => {
    x.translate(60, 50);
    for (const m of [1, -1]) {
      x.save(); x.scale(m, 1);
      let g = x.createLinearGradient(0, 0, 50, -30); g.addColorStop(0, b); g.addColorStop(1, a);
      x.fillStyle = g; x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(2, -2); x.bezierCurveTo(14, -40, 52, -46, 56, -20); x.bezierCurveTo(58, 2, 28, 10, 2, -2); x.fill(); x.stroke();
      g = x.createLinearGradient(0, 0, 30, 40); g.addColorStop(0, b); g.addColorStop(1, c);
      x.fillStyle = g;
      x.beginPath(); x.moveTo(2, 2); x.bezierCurveTo(26, 4, 42, 24, 32, 38); x.bezierCurveTo(22, 48, 6, 28, 2, 2); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.8)';
      x.beginPath(); x.arc(38, -22, 3.2, 0, TAU); x.arc(26, -12, 2.2, 0, TAU); x.arc(26, 28, 2.6, 0, TAU); x.fill();
      x.restore();
    }
    x.fillStyle = '#6a4a76'; x.beginPath(); x.ellipse(0, 0, 2.4, 14, 0, 0, TAU); x.fill();
  });

  const PINKS = [['#ffc4d8', '#ff6f9f'], ['#ffd8e6', '#ff8fb5'], ['#ffa6c4', '#ff5c93'], ['#e2d3fa', '#a98be0'], ['#ffffff', '#ffc1d6']];
  const PETALS = {
    rose: ['#ef5b86', '#b8244f'], cherry: ['#fff3f8', '#ffa6c4'], peony: ['#ffd6e6', '#ff8fb9'],
    lavender: ['#e0d2f9', '#a183e0'], gold: ['#fff2b0', '#ffb733'], pink: ['#ffc8da', '#ff7aa7']
  };
  const BUTTERFLIES = [['#ffa6cc', '#fff', '#c7aaf3'], ['#c7aaf3', '#fff', '#ffa6cc'], ['#ffc99a', '#fff', '#ffa6cc'], ['#ffffff', '#ffd6e6', '#cbb6f2']];

  /* ---------- particles ---------- */
  function spawn(o) {
    if (parts.length > 900) return;
    parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, s: 1, life: 1, age: 0, delay: 0, a: 1, sway: 0, swf: 2, ph: rnd(0, TAU), flip: 0, sp: null }, o));
  }
  const heartP = (x, y, o) => { const c = pick(PINKS); spawn(Object.assign({ x, y, sp: heartSp(c[0], c[1]) }, o)); };
  const sparkP = (x, y, o, col = '#ffc94d') => spawn(Object.assign({ x, y, sp: sparkSp(col) }, o));
  const petalP = (x, y, kind, o) => { const c = PETALS[kind]; spawn(Object.assign({ x, y, sp: petalSp(c[0], c[1]), flip: rnd(3, 7) }, o)); };
  const glowP = (x, y, col, o) => spawn(Object.assign({ x, y, sp: glowSp(col) }, o));

  function ring(x, y, col, maxR = 120, life = 1, w = 3, delay = 0) {
    fxs.push({ delay, life, age: 0, draw(c, u) {
      c.globalAlpha = (1 - u) * .85; c.strokeStyle = col; c.lineWidth = w * (1 - u * .6);
      c.beginPath(); c.arc(x, y, maxR * easeOut(u), 0, TAU); c.stroke();
    } });
  }
  function flash(x, y, col, maxR, life = 1, delay = 0, peak = .8) {
    fxs.push({ delay, life, age: 0, draw(c, u) {
      const r = maxR * (.35 + .65 * easeOut(u)), g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, peak * (1 - u))); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    } });
  }
  function rays(x, y, col, life = 2.4) {
    fxs.push({ life, age: 0, draw(c, u) {
      const R = Math.hypot(W, H), a = Math.min(1, u * 6) * Math.pow(1 - u, 1.4) * .55;
      c.save(); c.translate(x, y); c.rotate(u * .8);
      const g = c.createRadialGradient(0, 0, 8, 0, 0, R * .85);
      g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      for (let i = 0; i < 14; i++) {
        const ang = i * TAU / 14, w = .085;
        c.beginPath(); c.moveTo(0, 0);
        c.lineTo(Math.cos(ang - w) * R, Math.sin(ang - w) * R); c.lineTo(Math.cos(ang + w) * R, Math.sin(ang + w) * R);
        c.closePath(); c.fill();
      }
      c.restore();
    } });
  }

  /* ---------- one-off effects ---------- */
  const lite = () => (reduce ? .5 : W < 520 ? .75 : 1);
  const effects = {
    /* a spiral of rose petals unfurls, then drifts down */
    rose(x, y) {
      const n = Math.round(24 * lite());
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU * 2.2, sp = 60 + i * 8;
        petalP(x, y, 'rose', { delay: i * .035, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, g: 55, drag: 1.5, rot: rnd(0, TAU), vr: rnd(-3, 3), s: rnd(.42, .75), life: rnd(2.8, 4), sway: 26, swf: rnd(2, 3.4) });
      }
      ring(x, y, '#e8578f', 150, 1, 4); ring(x, y, '#ff9bb8', 100, .9, 2.5, .15);
      flash(x, y, '#ff7fa6', 190, 1.4);
    },
    /* ripples and a column of golden sparkles */
    tulip(x, y) {
      for (let i = 0; i < 3; i++) ring(x, y, '#ff6fa3', 120 + i * 46, 1.3, 3.5, i * .22);
      for (let i = 0; i < Math.round(22 * lite()); i++) sparkP(x, y, { delay: i * .05, vx: rnd(-26, 26), vy: -rnd(60, 150), g: 22, drag: .6, s: rnd(.3, .62), life: rnd(1.4, 2.2), rot: rnd(-.6, .6), vr: rnd(-2, 2) });
      flash(x, y, '#ffb3cf', 170, 1.2);
    },
    /* a storm of cherry petals over the whole garden */
    cherry(x, y) {
      const n = Math.round(54 * lite());
      for (let i = 0; i < n; i++) petalP(rnd(-20, W + 20), rnd(-80, -10), 'cherry', { delay: rnd(0, 3.2), vx: rnd(10, 50), vy: rnd(70, 130), drag: 0, rot: rnd(0, TAU), vr: rnd(-2.5, 2.5), s: rnd(.5, .95), life: rnd(5.5, 8), sway: rnd(30, 60), swf: rnd(1.4, 2.6) });
      for (let i = 0; i < 14; i++) petalP(x, y, 'cherry', { vx: rnd(-90, 90), vy: -rnd(40, 130), g: 70, drag: 1, rot: rnd(0, TAU), vr: rnd(-4, 4), s: rnd(.5, .8), life: rnd(2.2, 3.4), sway: 20 });
      ring(x, y, '#ffa6c4', 130, 1.1, 3); flash(x, y, '#ffd0e1', 200, 1.3);
    },
    /* rays of sunshine fan out across the sky */
    sunflower(x, y) {
      rays(x, y, '#ffd24a', 2.8);
      flash(x, y, '#fff0a0', Math.max(W, H) * .6, 1.6, 0, .55);
      for (let i = 0; i < Math.round(32 * lite()); i++) { const a = rnd(0, TAU), sp = rnd(90, 330); sparkP(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.4, s: rnd(.3, .6), life: rnd(1.2, 2), rot: rnd(0, 3), vr: rnd(-3, 3) }, '#ffb300'); }
      ring(x, y, '#ffb300', 170, 1.2, 4);
    },
    /* violet fireflies rise in a calm wave */
    lavender(x, y) {
      for (let i = 0; i < Math.round(26 * lite()); i++) glowP(x + rnd(-70, 70), y + rnd(-20, 120), '#b79cf2', { delay: i * .07, vx: rnd(-10, 10), vy: -rnd(30, 80), drag: .1, s: rnd(.4, .85), life: rnd(2.6, 4.2), sway: rnd(14, 34), swf: rnd(1.5, 3), a: .95 });
      for (let i = 0; i < 12; i++) sparkP(x + rnd(-60, 60), y + rnd(-10, 100), { delay: i * .1, vy: -rnd(20, 50), s: rnd(.25, .45), life: rnd(1.8, 2.6), vr: 1 }, '#a183e0');
      ring(x, y + 40, '#a183e0', 160, 1.8, 3); ring(x, y + 40, '#cdb8f0', 220, 2, 2, .3);
      flash(x, y + 40, '#cdb8f0', 230, 1.8);
    },
    /* a burst of little hearts */
    hibiscus(x, y) {
      for (let i = 0; i < Math.round(24 * lite()); i++) { const a = i / 24 * TAU + rnd(-.1, .1), sp = rnd(120, 280); heartP(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: -20, drag: 1.7, s: rnd(.28, .6), life: rnd(1.6, 2.6), rot: rnd(-.5, .5), vr: rnd(-1.5, 1.5) }); }
      ring(x, y, '#ff6fa3', 140, 1, 4); flash(x, y, '#ff8fb9', 190, 1.2);
    },
    /* a confetti pop */
    peony(x, y) {
      const kinds = ['peony', 'cherry', 'rose'];
      for (let i = 0; i < Math.round(46 * lite()); i++) {
        const a = rnd(0, TAU), sp = rnd(120, 380), r = Math.random();
        const o = { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 260, drag: 1.2, s: rnd(.4, .8), life: rnd(1.8, 3), rot: rnd(0, TAU), vr: rnd(-6, 6) };
        if (r < .5) petalP(x, y, pick(kinds), o); else if (r < .8) heartP(x, y, o); else sparkP(x, y, o);
      }
      ring(x, y, '#ff8fb9', 150, 1, 4); ring(x, y, '#ffc6dc', 220, 1.2, 2.5, .12);
      flash(x, y, '#ffb6d2', 260, 1.2);
    },
    /* the heart flower: a fountain of hearts */
    heart(x, y) {
      for (let i = 0; i < Math.round(40 * lite()); i++) heartP(x, y, { delay: i * .04, vx: rnd(-120, 120), vy: -rnd(180, 420), g: 280, drag: .5, s: rnd(.3, .72), life: rnd(2, 3), rot: rnd(-.4, .4), vr: rnd(-1.5, 1.5) });
      for (let i = 0; i < 18; i++) sparkP(x, y, { vx: rnd(-200, 200), vy: rnd(-250, 60), g: 60, s: rnd(.3, .6), life: rnd(1.4, 2.2), vr: rnd(-3, 3) });
      ring(x, y, '#ff3f84', 190, 1.4, 5); ring(x, y, '#ffb2cd', 280, 1.6, 3, .2);
      flash(x, y, '#ff9fc0', 320, 1.6);
    }
  };

  /* ---------- helpers for the game ---------- */
  const api = {
    bloom(id, x, y) { (effects[id] || effects.peony)(x, y); },
    /* little hearts and sparkles wherever she taps */
    tap(x, y) {
      for (let i = 0; i < 4; i++) heartP(x, y, { vx: rnd(-50, 50), vy: -rnd(40, 110), g: -10, drag: .8, s: rnd(.2, .42), life: rnd(1, 1.6), rot: rnd(-.5, .5), vr: rnd(-1, 1), delay: i * .04 });
      for (let i = 0; i < 4; i++) sparkP(x, y, { vx: rnd(-70, 70), vy: rnd(-70, 40), drag: 1.2, s: rnd(.2, .4), life: rnd(.7, 1.2), vr: rnd(-3, 3) });
    },
    hearts(x, y, n = 10, spread = 160) {
      for (let i = 0; i < n; i++) heartP(x, y, { vx: rnd(-spread, spread), vy: -rnd(60, 220), g: 120, drag: .8, s: rnd(.25, .55), life: rnd(1.4, 2.4), rot: rnd(-.5, .5), vr: rnd(-1.5, 1.5) });
    },
    sparkles(x, y, n = 10, spread = 140, col = '#ffc94d') {
      for (let i = 0; i < n; i++) sparkP(x, y, { vx: rnd(-spread, spread), vy: rnd(-spread, spread * .5), drag: 1.3, s: rnd(.22, .5), life: rnd(.8, 1.5), vr: rnd(-3, 3) }, col);
    },
    trail(x, y) {
      sparkP(x + rnd(-6, 6), y + rnd(-6, 6), { vx: rnd(-20, 20), vy: rnd(-10, 30), s: rnd(.2, .4), life: rnd(.5, .9), vr: rnd(-3, 3) });
      if (Math.random() < .5) heartP(x, y, { vx: rnd(-30, 30), vy: rnd(-20, 20), s: rnd(.15, .25), life: rnd(.5, .9) });
    },
    ring, flash,
    /* a lazy swirl of orbiting sparkles used by the finale */
    swirl(x, y, n = 20) {
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), sp = rnd(80, 260); sparkP(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.2, s: rnd(.25, .55), life: rnd(1, 1.8), vr: rnd(-3, 3) }); }
    },
    petalRain(kind, seconds, perSec) { rain = { kind, until: performance.now() + seconds * 1000, perSec, acc: 0 }; },
    confetti(x, y) { effects.peony(x, y); },
    /* 0 = bright morning, 1 = dusk with fireflies */
    setDusk(p) { dusk = p; },
    clear() { parts.length = 0; fxs.length = 0; rain = null; }
  };

  /* ---------- ambient layer ---------- */
  function seedAmbient() {
    const small = W < 520, k = reduce ? .5 : 1;
    const mk = (n, f) => Array.from({ length: Math.round(n * k) }, f);
    ambient.motes = mk(small ? 22 : 38, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(3, 9), vy: -rnd(4, 14), ph: rnd(0, TAU), sp: rnd(.5, 1.4), col: pick(['#ffffff', '#ffe9a8', '#ffd0e4', '#e6d8ff']) }));
    ambient.hearts = mk(small ? 7 : 12, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(.22, .55), vy: -rnd(14, 32), ph: rnd(0, TAU), amp: rnd(8, 26), a: rnd(.35, .7), c: pick(PINKS) }));
    ambient.petals = mk(small ? 6 : 10, () => ({ x: rnd(0, W), y: rnd(0, H), vx: rnd(8, 22), vy: rnd(14, 30), rot: rnd(0, TAU), vr: rnd(-1, 1), flip: rnd(1.5, 3), ph: rnd(0, TAU), k: pick(['cherry', 'pink', 'cherry']) }));
    ambient.flies = Array.from({ length: small ? 12 : 20 }, () => ({ x: rnd(0, W), y: rnd(H * .35, H * .95), ph: rnd(0, TAU), sp: rnd(.4, 1), r: rnd(8, 16) }));
    flies.length = 0;
    for (let i = 0; i < (small ? 3 : 4); i++) {
      const c = BUTTERFLIES[i % BUTTERFLIES.length];
      flies.push({ x: rnd(0, W), y: rnd(H * .2, H * .7), vx: 0, vy: 0, tx: rnd(0, W), ty: rnd(H * .15, H * .75), ph: rnd(0, TAU), sp: rnd(70, 105), sz: rnd(.34, .5), sp2: wingsSp(c[0], c[1], c[2]) });
    }
  }

  function drawAmbient(dt, t) {
    const c = xb;
    for (const m of ambient.motes) {
      m.y += m.vy * dt; m.x += Math.sin(t * m.sp + m.ph) * 8 * dt;
      if (m.y < -20) { m.y = H + 20; m.x = rnd(0, W); }
      c.globalAlpha = (.35 + .35 * Math.sin(t * m.sp * 1.6 + m.ph)) * (1 - dusk * .15);
      const sp = glowSp(m.col), s = m.r * 4;
      c.drawImage(sp.c, m.x - s / 2, m.y - s / 2, s, s);
    }
    for (const h of ambient.hearts) {
      h.y += h.vy * dt;
      if (h.y < -40) { h.y = H + 40; h.x = rnd(0, W); }
      const x = h.x + Math.sin(t * .8 + h.ph) * h.amp, sp = heartSp(h.c[0], h.c[1]), s = 44 * h.s * (W < 520 ? 1.15 : 1);
      c.globalAlpha = h.a * Math.min(1, (H - h.y) / 80, h.y / 80 + .2);
      c.save(); c.translate(x, h.y); c.rotate(Math.sin(t + h.ph) * .3);
      c.drawImage(sp.c, -s / 2, -s / 2, s, s); c.restore();
    }
    for (const p of ambient.petals) {
      p.x += (p.vx + Math.sin(t + p.ph) * 14) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > H + 30 || p.x > W + 30) { p.y = -30; p.x = rnd(-60, W); }
      const sp = petalSp(PETALS[p.k][0], PETALS[p.k][1]);
      c.globalAlpha = .75;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, .45 + .55 * Math.abs(Math.cos(t * p.flip + p.ph)));
      c.drawImage(sp.c, -9, -12.5, 18, 25); c.restore();
    }
    if (dusk > .02) {
      const n = Math.round(ambient.flies.length * dusk);
      for (let i = 0; i < n; i++) {
        const f = ambient.flies[i];
        f.x += Math.sin(t * f.sp + f.ph) * 14 * dt; f.y += Math.cos(t * f.sp * 1.3 + f.ph) * 10 * dt;
        const a = .5 + .5 * Math.sin(t * f.sp * 2.2 + f.ph * 2), s = f.r * 4;
        c.globalAlpha = a * Math.min(1, dusk * 1.4);
        const sp = glowSp('#ffe08a'); c.drawImage(sp.c, f.x - s / 2, f.y - s / 2, s, s);
        c.globalAlpha = a; c.fillStyle = '#fffbe0'; c.beginPath(); c.arc(f.x, f.y, 1.6, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  function drawButterflies(dt, t) {
    const c = xf;
    for (const b of flies) {
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
      if (d < 50) { b.tx = rnd(W * .04, W * .96); b.ty = rnd(H * .12, H * .78); }
      const wob = Math.sin(t * 2.2 + b.ph) * 55;
      b.vx += ((dx / (d || 1)) * b.sp - b.vx + Math.cos(t * 1.7 + b.ph) * wob) * dt * 1.4;
      b.vy += ((dy / (d || 1)) * b.sp - b.vy + Math.sin(t * 2.3 + b.ph) * wob) * dt * 1.4;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const ang = Math.atan2(b.vy, b.vx) + Math.PI / 2, flap = .22 + .78 * Math.abs(Math.cos(t * 9 + b.ph));
      c.save(); c.translate(b.x, b.y); c.rotate(ang); c.scale(b.sz, b.sz); c.globalAlpha = .95;
      c.save(); c.scale(flap, 1); c.drawImage(b.sp2.c, -60, -50, 120, 100); c.restore();
      c.restore();
    }
    c.globalAlpha = 1;
  }

  function drawParticles(dt) {
    const c = xf;
    if (rain) {
      if (performance.now() > rain.until) rain = null;
      else {
        rain.acc += dt * rain.perSec * lite();
        while (rain.acc >= 1) { rain.acc--; petalP(rnd(-20, W + 20), -30, rain.kind, { vx: rnd(10, 50), vy: rnd(80, 140), rot: rnd(0, TAU), vr: rnd(-2.5, 2.5), s: rnd(.5, .95), life: rnd(5, 8), sway: rnd(30, 60), swf: rnd(1.4, 2.6) }); }
      }
    }
    for (let i = fxs.length - 1; i >= 0; i--) {
      const e = fxs[i];
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.age += dt;
      if (e.age >= e.life) { fxs.splice(i, 1); continue; }
      c.save(); e.draw(c, e.age / e.life); c.restore();
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      const u = p.age / p.life, k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.g * dt;
      p.x += (p.vx + (p.sway ? Math.cos(p.age * p.swf + p.ph) * p.sway : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      c.globalAlpha = p.a * Math.min(1, u / .08) * Math.min(1, (1 - u) / .3);
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      if (p.flip) c.scale(1, .35 + .65 * Math.abs(Math.cos(p.age * p.flip + p.ph)));
      const w = p.sp.w * p.s, h = p.sp.h * p.s;
      c.drawImage(p.sp.c, -w / 2, -h / 2, w, h); c.restore();
    }
    c.globalAlpha = 1;
  }

  /* ---------- loop ---------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
    if (document.hidden) return;
    xb.clearRect(0, 0, W, H); xf.clearRect(0, 0, W, H);
    drawAmbient(dt, ts / 1000); drawButterflies(dt, ts / 1000); drawParticles(dt);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    for (const [cv, x] of [[cb, xb], [cf, xf]]) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  api.init = (bgCanvas, fgCanvas) => {
    cb = bgCanvas; cf = fgCanvas; xb = cb.getContext('2d'); xf = cf.getContext('2d');
    resize(); seedAmbient();
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { resize(); seedAmbient(); }, 150); });
    if (!running) { running = true; requestAnimationFrame(frame); }
  };
  api.size = () => ({ W, H });

  return api;
})();
