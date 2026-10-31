/* =====================================================================
   game.js — state, input, enemies, weapons, HUD and the story flow.
   ===================================================================== */
'use strict';

const $ = id => document.getElementById(id);
const stage = $('stage'), fxC = $('fx'), fxg = fxC.getContext('2d'), miniC = $('minimap'), mg = miniC.getContext('2d');
const confC = $('confetti'), cg = confC.getContext('2d');

/* ---------------------------------------------------------------- data */
const WEAPONS = [
  { name: 'SORRY-4A1', mag: 30, auto: true, rate: 0.085, dmg: 21, pellets: 1, spread: 3, bloom: 0.5, reload: 1.7, reserve: 120, max: 240, kick: 0.5, snd: 'rifle', headMul: 2 },
  { name: 'BOUQUET-12', mag: 6, auto: false, rate: 0.85, dmg: 14, pellets: 9, spread: 40, bloom: 0, reload: 2.3, reserve: 24, max: 60, kick: 1.15, snd: 'shotgun', headMul: 1.5, pump: true }
];

const ETYPES = {
  e: { name: 'EXCUSE', spr: 'grunt', hp: 60, speed: 1.7, r: 0.28, h: 0.82, head: 0.3, score: 100, range: 9, pref: 5, fire: { cd: [1.3, 2.3], dmg: 7, speed: 5.2, count: 1, spread: 0, kind: 'red' } },
  g: { name: 'LEFT ON READ', spr: 'ghost', hp: 44, speed: 2.9, r: 0.26, h: 0.72, z: 0.18, head: 0.45, score: 150, melee: { dmg: 9, cd: 0.9, range: 0.72 } },
  h: { name: 'STUBBORNNESS', spr: 'heavy', hp: 240, speed: 1.05, r: 0.38, h: 0.98, head: 0.26, score: 300, range: 10, pref: 6, fire: { cd: [1.9, 2.8], dmg: 8, speed: 4.4, count: 3, spread: 0.26, kind: 'orange' } },
  B: { name: 'PRIDE', spr: 'boss', hp: 1300, speed: 1.3, r: 0.55, h: 1.45, head: 0.3, score: 2000, boss: true }
};

const S = {
  mode: 'title', diff: 1, lvl: 0, time: 0, hasLock: false, noLock: false, touch: false, streak: 0, score: 0,
  stats: { shots: 0, hits: 0, kills: 0, heads: 0, deaths: 0 }, god: false, forgive: 0, fadeT: 0
};
const P = {
  x: 0, y: 0, ang: 0, pitch: 0, recoil: 0, hp: 100, wi: 0, ws: [], cd: 0, kick: 0, flash: 0, reload: 0, pump: 0, swap: 0, bloom: 0,
  firing: false, fireEdge: false, bob: 0, moveAmt: 0, sprint: false, sway: 0, lastHurt: -99, hurtFlash: 0, shake: 0, hits: [], stepSide: 0,
  heartT: 0, lastShot: -9
};
let LV = null;
const keys = {};
const touchMove = { x: 0, y: 0 };

/* ------------------------------------------------------------- helpers */
function setText(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } }
function hideAll() { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); }
function show(id) { hideAll(); $(id).classList.remove('hidden'); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
function now() { return performance.now() / 1000; }

/* --------------------------------------------------------------- level */
function loadLevel(i, opts = {}) {
  const def = LEVELS[i], rows = MAPS[def.map], mh = rows.length, mw = rows[0].length;
  const L = {
    def, idx: i, mw, mh, grid: new Uint8Array(mw * mh), solid: new Uint8Array(mw * mh), field: new Int16Array(mw * mh),
    enemies: [], items: [], decor: [], projs: [], fxs: [], gates: [], exit: null, lara: null, boss: null, total: 0, kills: 0, alive: 0,
    gateOpen: false, fieldT: 0, lowWarned: false, walkIdx: 0, bossLines: {}, startShots: S.stats.shots, startHits: S.stats.hits, startKills: S.stats.kills, cleared: false
  };
  let start = [1.5, 1.5];
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const ch = rows[y][x], k = y * mw + x, cx = x + 0.5, cy = y + 0.5;
    if (ch >= '1' && ch <= '7') L.grid[k] = +ch;
    else if (ch === 'G') { L.grid[k] = 9; L.gates.push(k); }
    else if (ch === 'P') start = [cx, cy];
    else if (ETYPES[ch]) { const en = makeEnemy(ch, cx, cy, L); L.enemies.push(en); if (en.t.boss) L.boss = en; }
    else if (ch === 'a' || ch === 'c') L.items.push({ x: cx, y: cy, type: ch, taken: false, ph: Math.random() * 6 });
    else if (ch === 'T') { L.solid[k] = 1; L.decor.push({ x: cx, y: cy, img: SPR.crate, h: 0.62, block: true }); }
    else if (ch === 't') { L.solid[k] = 1; L.decor.push({ x: cx, y: cy, img: SPR.table, h: 0.6, block: true }); }
    else if (ch === 'k') L.decor.push({ x: cx, y: cy, img: SPR.candle, h: 0.2, flicker: true });
    else if (ch === 'r') L.decor.push({ x: cx, y: cy, img: SPR.roses, h: 0.3 });
    else if (ch === 'X') L.exit = { x: cx, y: cy };
    else if (ch === 'L') L.lara = { x: cx, y: cy };
  }
  L.total = L.enemies.length; L.alive = L.total;
  L.start = start;
  LV = L; S.lvl = i;
  P.x = start[0]; P.y = start[1]; P.ang = def.ang; P.pitch = 0; P.recoil = 0; P.hp = 100; P.cd = 0; P.reload = 0; P.swap = 0; P.hits = [];
  P.lastHurt = -99; P.hurtFlash = 0; P.shake = 0; S.streak = 0;
  buildShading(def);
  buildMinimapBase();
  updateField();
  $('hud').classList.toggle('calm', !!def.lara);
  if (!opts.attract) {
    Sound.music(def.music);
    radioQ.length = 0; radioT = 0; $('radio').classList.add('hidden');
    showIntro(def, i);
    if (def.radio.start) radio(def.radio.start[0], def.radio.start[1]);
    $('bossbar').classList.add('hidden');
    setText($('callsign'), CONFIG.callsign);
    S.fadeT = 1;
  }
}

function makeEnemy(ch, x, y, L) {
  const T = ETYPES[ch], D = DIFFICULTY[S.diff];
  const hp = T.hp * (T.boss ? 1 : D.hp) * (T.boss ? (0.85 + 0.15 * D.hp) : 1);
  return { kind: 'enemy', ch, t: T, x, y, hp, maxHp: hp, state: 'idle', anim: Math.random() * 5, flash: 0, cd: 0, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(1, 2.5), shootT: 0, attackT: 0, dead: false, deadT: 0, moving: false, phase: 1, orbit: 1, orbitT: 3, ringT: 4, home: [x, y] };
}

function resetPlayerLoadout(full) {
  P.ws = WEAPONS.map(w => ({ ammo: w.mag, res: w.reserve }));
  P.wi = 0;
}

/* ------------------------------------------------------------ collision */
function blockedAt(x, y) {
  const cx = x | 0, cy = y | 0;
  if (x < 0 || y < 0 || cx >= LV.mw || cy >= LV.mh) return true;
  const i = cy * LV.mw + cx;
  return LV.grid[i] !== 0 || LV.solid[i] !== 0;
}
function canStand(x, y, r) { return !(blockedAt(x - r, y - r) || blockedAt(x + r, y - r) || blockedAt(x - r, y + r) || blockedAt(x + r, y + r)); }
function slide(o, dx, dy, r) { if (canStand(o.x + dx, o.y, r)) o.x += dx; if (canStand(o.x, o.y + dy, r)) o.y += dy; }
function hasLOS(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 0.2);
  for (let i = 1; i < n; i++) { const x = x0 + (dx * i) / n, y = y0 + (dy * i) / n; if (LV.grid[(y | 0) * LV.mw + (x | 0)]) return false; }
  return true;
}
function updateField() {
  const { mw, grid, solid, field } = LV;
  field.fill(-1);
  const q = [(P.y | 0) * mw + (P.x | 0)]; field[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % mw, y = (i / mw) | 0, d = field[i];
    for (const j of [i - 1, i + 1, i - mw, i + mw]) {
      if (j < 0 || j >= field.length || field[j] >= 0 || grid[j] || solid[j]) continue;
      if ((j === i - 1 && x === 0) || (j === i + 1 && x === mw - 1)) continue;
      field[j] = d + 1; q.push(j);
    }
  }
}
function pathStep(e) {
  const { mw, grid, solid, field } = LV, cx = e.x | 0, cy = e.y | 0, cur = field[cy * mw + cx];
  if (cur < 0) return null;
  if (cur === 0) return [P.x, P.y];
  let best = cur, bx = cx, by = cy;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = cx + dx, ny = cy + dy, j = ny * mw + nx;
    if (nx < 0 || ny < 0 || nx >= mw || ny >= LV.mh || field[j] < 0) continue;
    if (dx && dy && (grid[cy * mw + nx] || solid[cy * mw + nx] || grid[ny * mw + cx] || solid[ny * mw + cx])) continue;
    if (field[j] < best) { best = field[j]; bx = nx; by = ny; }
  }
  return best < cur ? [bx + 0.5, by + 0.5] : null;
}

/* --------------------------------------------------------------- radio */
const radioQ = []; let radioT = 0; const portraits = {};
function portraitURL(mood) { return portraits[mood] || (portraits[mood] = portraitCanvas(mood).toDataURL()); }
function radio(mood, text, urgent) {
  if (urgent) { radioQ.length = 0; radioT = 0; }
  radioQ.push({ mood, text });
}
function updateRadio(dt) {
  if (radioT > 0) { radioT -= dt; if (radioT <= 0 && !radioQ.length) $('radio').classList.add('hidden'); }
  if (radioT <= 0 && radioQ.length) {
    const m = radioQ.shift();
    $('radioFace').src = portraitURL(m.mood); setText($('radioName'), CONFIG.her.toUpperCase()); $('radioText').textContent = '"' + m.text + '"';
    $('radio').classList.remove('hidden'); $('radio').style.animation = 'none'; void $('radio').offsetWidth; $('radio').style.animation = '';
    radioT = Math.max(3.8, m.text.length * 0.07); Sound.play('radio');
  }
}

/* ----------------------------------------------------------- HUD bits */
function showIntro(def, i) {
  const el = $('intro');
  el.innerHTML = '';
  [['l1', def.title + ' - ' + def.name], ['l2', def.time + '   |   ' + def.place.toUpperCase()], ['l3', def.intro[0] + '. ' + def.intro[1]]].forEach(([c, t], k) => {
    const d = document.createElement('div'); d.className = c; d.textContent = t; d.style.animationDelay = k * 0.5 + 's'; el.appendChild(d);
  });
}
function popup(text, cls) {
  const d = document.createElement('div'); d.className = 'pop ' + (cls || ''); d.textContent = text; $('popups').appendChild(d);
  setTimeout(() => d.remove(), 1500);
  while ($('popups').children.length > 5) $('popups').firstChild.remove();
}
function banner(text, sub) {
  const b = $('banner'); b.innerHTML = ''; b.append(text);
  if (sub) { const s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
  b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); Sound.play('banner');
}
function killFeed(name, head) {
  const d = document.createElement('div'); d.className = 'kf';
  const b = document.createElement('b'); b.textContent = CONFIG.callsign;
  const i = document.createElement('i'); i.textContent = '[' + WEAPONS[P.wi].name + ']';
  d.append(b, i, name);
  if (head) { const u = document.createElement('u'); u.textContent = 'HEADSHOT'; d.appendChild(u); }
  $('killfeed').appendChild(d); setTimeout(() => d.remove(), 5600);
  while ($('killfeed').children.length > 4) $('killfeed').firstChild.remove();
}
function hitmarker(kill) {
  const h = $('hitmarker'); h.classList.toggle('kill', !!kill); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
  clearTimeout(hitmarker.t); hitmarker.t = setTimeout(() => h.classList.remove('on'), 90);
}

function forgivenessTarget() {
  const d = LV.def, [a, b] = d.forgive;
  let f = 0;
  if (d.boss) f = LV.boss ? (LV.boss.dead ? 1 : 1 - LV.boss.hp / LV.boss.maxHp) : 0;
  else if (d.lara) f = clamp((P.x - 2) / 16, 0, 1);
  else f = LV.total ? LV.kills / LV.total : 0;
  if (LV.cleared) f = 1;
  return a + (b - a) * f;
}

/* ---------------------------------------------------------- minimap */
let miniBase = null;
function buildMinimapBase() {
  const { mw, mh, grid, solid } = LV, cs = Math.min(150 / mw, 150 / mh);
  miniBase = document.createElement('canvas'); miniBase.width = 150; miniBase.height = 150;
  const g = miniBase.getContext('2d'); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 150, 150);
  LV.mini = { cs, ox: (150 - mw * cs) / 2, oy: (150 - mh * cs) / 2 };
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const v = grid[y * mw + x];
    if (v === 9) g.fillStyle = '#ff4d79'; else if (v) g.fillStyle = '#7d8a73'; else if (solid[y * mw + x]) g.fillStyle = '#4b5443'; else continue;
    g.fillRect(LV.mini.ox + x * cs, LV.mini.oy + y * cs, cs + 0.5, cs + 0.5);
  }
}
function drawMinimap() {
  const { cs, ox, oy } = LV.mini;
  mg.clearRect(0, 0, 150, 150); mg.drawImage(miniBase, 0, 0);
  // gates that have opened
  if (LV.gateOpen) { mg.fillStyle = 'rgba(255,77,121,.25)'; LV.gates.forEach(k => mg.fillRect(ox + (k % LV.mw) * cs, oy + ((k / LV.mw) | 0) * cs, cs, cs)); }
  const dot = (x, y, r, c) => { mg.fillStyle = c; mg.beginPath(); mg.arc(ox + x * cs, oy + y * cs, r, 0, TAU); mg.fill(); };
  LV.items.forEach(it => { if (!it.taken) dot(it.x, it.y, 2, it.type === 'c' ? '#ff8fb1' : '#e8c21a'); });
  if (LV.exit && LV.gateOpen) dot(LV.exit.x, LV.exit.y, 3.2, '#ff4d79');
  if (LV.lara) dot(LV.lara.x, LV.lara.y, 3.2, '#ff4d79');
  LV.enemies.forEach(e => { if (!e.dead && (e.state !== 'idle' || Math.hypot(e.x - P.x, e.y - P.y) < 8)) dot(e.x, e.y, e.t.boss ? 3.6 : 2.4, '#ff4040'); });
  const px = ox + P.x * cs, py = oy + P.y * cs;
  mg.save(); mg.translate(px, py); mg.rotate(P.ang); mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(5, 0); mg.lineTo(-3.5, 3.5); mg.lineTo(-2, 0); mg.lineTo(-3.5, -3.5); mg.closePath(); mg.fill(); mg.restore();
}

/* --------------------------------------------------------- weapons */
function startReload() {
  const w = WEAPONS[P.wi], ws = P.ws[P.wi];
  if (P.reload > 0 || ws.ammo >= w.mag || ws.res <= 0) return;
  P.reload = 0.0001; Sound.play('reload');
}
function switchWeapon(i) {
  if (i === P.wi || i < 0 || i >= WEAPONS.length) return;
  P.wi = i; P.swap = 1; P.reload = 0; P.pump = 0; Sound.play('swap');
}

function castShot(px, py) {
  const ix = Math.floor(px);
  if (ix < 0 || ix >= R.W) return {};
  const wallD = R.zbuf[ix], cam = R.cam, list = R.proj;
  const pointAt = (depth, zpx) => {
    const camX = (2 * px) / R.W - 1;
    return { x: cam.x + (cam.dirX + cam.planeX * camX) * depth, y: cam.y + (cam.dirY + cam.planeY * camX) * depth, z: 0.5 - ((zpx - cam.hz) * depth) / R.H };
  };
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (p.depth >= wallD || !p.s.hit) continue;
    if (px < p.x0 || px > p.x1 || py < p.top || py > p.bot) continue;
    const img = p.s.img, u = (((px - p.x0) / (p.x1 - p.x0)) * img.w) | 0, v = (((py - p.top) / (p.bot - p.top)) * img.h) | 0;
    if (img.px[v * img.w + u] >>> 24 < 70) continue;
    const pt = pointAt(p.depth, py);
    if (p.s.hit === 'enemy') return { enemy: p.s.ref, head: (py - p.top) / (p.bot - p.top) < p.s.ref.t.head, depth: p.depth, ...pt };
    return { block: true, depth: p.depth, ...pt };
  }
  return { wall: true, depth: wallD, ...pointAt(wallD, py) };
}

function spawnFx(x, y, z, kind, life) {
  LV.fxs.push({ x, y, z: z - 0.07, img: SPR.spark[kind], age: 0, life: life || 0.2 });
}

function fireWeapon() {
  const w = WEAPONS[P.wi], ws = P.ws[P.wi];
  if (ws.ammo <= 0) { Sound.play('empty'); P.cd = 0.3; startReload(); return; }
  ws.ammo--; P.cd = w.rate; P.kick = Math.min(1.4, P.kick + w.kick); P.flash = 1; P.lastShot = S.time;
  P.recoil = Math.min(34, P.recoil + w.kick * 2.4); P.ang += rand(-0.0035, 0.0035) * (w.pellets > 1 ? 0.5 : 1);
  P.bloom = Math.min(1.8, P.bloom + w.bloom * 0.18);
  if (w.pump) P.pump = 0.0001;
  Sound.play(w.snd); S.stats.shots++; noiseAlert();
  const spread = w.spread * (1 + P.bloom) * (P.moveAmt > 0.5 ? (P.sprint ? 1.8 : 1.35) : 1);
  let anyHit = false, anyKill = false, anyHead = false;
  for (let i = 0; i < w.pellets; i++) {
    const a = Math.random() * TAU, r = (w.pellets > 1 ? Math.sqrt(Math.random()) : Math.random() * (ws.ammo === w.mag - 1 ? 0.2 : 1)) * spread;
    const res = castShot(R.W / 2 + Math.cos(a) * r, R.H / 2 + Math.sin(a) * r * 0.8);
    if (res.enemy) {
      anyHit = true; spawnFx(res.x, res.y, res.z, 'pink', 0.15);
      const killed = hurtEnemy(res.enemy, w.dmg, res.head, w.headMul);
      anyKill = anyKill || killed; anyHead = anyHead || res.head;
    } else if (res.wall || res.block) spawnFx(res.x - 0.0, res.y - 0.0, res.z, 'gold', 0.18);
  }
  if (anyHit) { S.stats.hits++; hitmarker(anyKill); Sound.play(anyHead ? 'headshot' : 'hit'); }
  if (ws.ammo <= 0) setTimeout(() => { if (S.mode === 'play') startReload(); }, 250);
}

function noiseAlert() {
  for (const e of LV.enemies) {
    if (e.dead || e.state !== 'idle') continue;
    const f = LV.field[(e.y | 0) * LV.mw + (e.x | 0)];
    if (f >= 0 && f < 15) wake(e);
  }
}
function wake(e) {
  if (e.state !== 'idle') return;
  e.state = 'chase'; e.cd = rand(0.5, 1.4);
  if (e.t.boss) bossIntro(e);
}

function hurtEnemy(e, dmg, head, headMul) {
  if (e.dead) return false;
  const T = e.t, mult = head ? (T.boss ? Math.min(headMul, 1.5) : headMul) : 1;
  e.hp -= dmg * mult; e.flash = 1; wake(e); e.alert = true;
  if (e.hp <= 0) { killEnemy(e, head); return true; }
  return false;
}

function killEnemy(e, head) {
  e.dead = true; e.deadT = 0; e.state = 'dead'; LV.kills++; LV.alive--; S.stats.kills++;
  const T = e.t; let pts = T.score;
  if (head) { S.stats.heads++; pts += 50; popup('HEADSHOT +50', 'head'); }
  S.score += pts; popup('+' + T.score + ' ' + T.name, '');
  killFeed(T.name, head);
  Sound.play('kill');
  S.streak++;
  if (S.streak === 3) banner('3 KILL STREAK', 'KEEP IT UP');
  if (S.streak === 5) { banner('5 KILL STREAK', 'CARE PACKAGE INBOUND'); careDrop(); }
  if (S.streak === 8) { banner('8 KILL STREAK', 'SHE\'S IMPRESSED'); }
  if (!T.boss && Math.random() < 0.14) LV.items.push({ x: e.x, y: e.y, type: Math.random() < 0.5 ? 'a' : 'c', taken: false, ph: 0 });
  const r = LV.def.radio.kills && LV.def.radio.kills[LV.kills];
  if (r) radio(r[0], r[1]);
  if (T.boss) bossDown(e);
}
function careDrop() {
  const ox = [-0.7, 0.7];
  [['a', ox[0]], ['c', ox[1]]].forEach(([type, o]) => {
    const x = P.x + Math.cos(P.ang + Math.PI / 2) * o + Math.cos(P.ang) * 1.2, y = P.y + Math.sin(P.ang + Math.PI / 2) * o + Math.sin(P.ang) * 1.2;
    if (!blockedAt(x, y)) LV.items.push({ x, y, type, taken: false, ph: 0 });
  });
}

/* ---------------------------------------------------------- enemies */
function enemyFire(e) {
  const T = e.t, D = DIFFICULTY[S.diff], f = T.fire;
  const base = Math.atan2(P.y - e.y, P.x - e.x);
  for (let i = 0; i < f.count; i++) {
    const a = base + (f.count > 1 ? (i - (f.count - 1) / 2) * f.spread : 0) + rand(-0.08, 0.08) * D.aim;
    LV.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * f.speed, vy: Math.sin(a) * f.speed, dmg: f.dmg * D.dmg, life: 5, kind: f.kind, z: 0.42 });
  }
  e.shootT = 0.28; Sound.play('enemyShot');
}

function updateEnemy(e, dt) {
  e.anim += dt;
  if (e.flash > 0) e.flash -= dt * 5;
  if (e.shootT > 0) e.shootT -= dt;
  if (e.attackT > 0) e.attackT -= dt;
  if (e.dead) { e.deadT += dt; return; }
  const T = e.t, D = DIFFICULTY[S.diff];
  const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy) || 0.001;
  e.moving = false;
  if (e.state === 'idle') {
    if (dist < (T.boss ? 14 : 9) && hasLOS(e.x, e.y, P.x, P.y)) wake(e);
    return;
  }
  const los = hasLOS(e.x, e.y, P.x, P.y);
  e.cd -= dt;
  if (T.boss) { updateBoss(e, dt, dx, dy, dist, los); return; }
  let vx = 0, vy = 0, sp = T.speed;
  if (T.melee) {
    const tgt = los ? [P.x, P.y] : pathStep(e);
    if (tgt && dist > T.melee.range * 0.8) { const tx = tgt[0] - e.x, ty = tgt[1] - e.y, l = Math.hypot(tx, ty) || 1; vx = tx / l; vy = ty / l; }
    if (dist < T.melee.range && e.cd <= 0) { hurtPlayer(T.melee.dmg * D.dmg, e.x, e.y); e.cd = T.melee.cd; e.attackT = 0.35; }
  } else {
    if (los && dist < T.range) {
      e.strafeT -= dt; if (e.strafeT <= 0) { e.strafe = -e.strafe; e.strafeT = rand(1, 2.6); }
      const nx = dx / dist, ny = dy / dist;
      if (dist > T.pref + 1) { vx = nx; vy = ny; }
      else if (dist < T.pref - 1.8) { vx = -nx * 0.8; vy = -ny * 0.8; }
      else { vx = -ny * e.strafe * 0.7; vy = nx * e.strafe * 0.7; }
      if (e.cd <= 0) { enemyFire(e); e.cd = rand(T.fire.cd[0], T.fire.cd[1]) * (S.diff === 0 ? 1.25 : 1); }
    } else {
      const tgt = pathStep(e);
      if (tgt) { const tx = tgt[0] - e.x, ty = tgt[1] - e.y, l = Math.hypot(tx, ty) || 1; vx = tx / l; vy = ty / l; }
    }
  }
  // keep a little distance from friends
  for (const o of LV.enemies) { if (o === e || o.dead) continue; const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy); if (od < 0.6 && od > 0.001) { vx += (ox / od) * 0.6; vy += (oy / od) * 0.6; } }
  const l = Math.hypot(vx, vy);
  if (l > 0.01) { e.moving = true; slide(e, (vx / Math.max(1, l)) * sp * dt, (vy / Math.max(1, l)) * sp * dt, T.r); }
}

/* ---- the boss ---- */
function bossIntro(e) {
  $('bossbar').classList.remove('hidden');
  Sound.play('bossRoar'); banner('PRIDE', 'IT WILL NOT ADMIT IT WAS WRONG'); S.shakeBoss = 1;
}
function updateBoss(e, dt, dx, dy, dist, los) {
  const T = e.t, D = DIFFICULTY[S.diff], frac = e.hp / e.maxHp;
  const phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (phase !== e.phase) {
    e.phase = phase; Sound.play('bossRoar'); banner(phase === 2 ? 'PRIDE IS ANGRY' : 'PRIDE IS FURIOUS', 'REINFORCEMENTS');
    const sp = LV.def.ghostSpawns || [];
    sp.slice(0, phase === 2 ? 2 : 3).forEach(([x, y]) => { const g = makeEnemy('g', x + 0.5, y + 0.5, LV); g.state = 'chase'; LV.enemies.push(g); LV.alive++; LV.total++; });
    [[3, 15, 'c'], [22, 15, 'c'], [12, 17, 'a'], [8, 22, 'a']].forEach(([x, y, type]) => LV.items.push({ x: x + 0.5, y: y + 0.5, type, taken: false, ph: 0 }));
    const lines = LV.def.bossLines, key = phase === 2 ? 0.66 : 0.33;
    if (lines && lines[key]) radio(lines[key][0], lines[key][1]);
  }
  // orbit the player
  e.orbitT -= dt; if (e.orbitT <= 0) { e.orbit = -e.orbit; e.orbitT = rand(2.5, 5); }
  const nx = dx / dist, ny = dy / dist, radial = clamp((dist - 7.5) * 0.6, -1, 1);
  let vx = -ny * e.orbit + nx * radial, vy = nx * e.orbit + ny * radial; const l = Math.hypot(vx, vy) || 1;
  const sp = T.speed * (1 + 0.25 * (phase - 1)); e.moving = true;
  slide(e, (vx / l) * sp * dt, (vy / l) * sp * dt, T.r);
  // aimed fan
  if (e.cd <= 0 && los) {
    const n = phase === 1 ? 3 : 5, base = Math.atan2(dy, dx);
    for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.2 + rand(-0.03, 0.03) * D.aim; LV.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 4.6, vy: Math.sin(a) * 4.6, dmg: 9 * D.dmg, life: 6, kind: 'violet', z: 0.6 }); }
    e.cd = [1.9, 1.5, 1.15][phase - 1] * (S.diff === 0 ? 1.3 : 1); e.attackT = 0.5; Sound.play('bossShot');
  }
  // ring with a gap to slip through
  e.ringT -= dt;
  if (e.ringT <= 0) {
    const n = 20, gapC = Math.atan2(dy, dx) + rand(-0.8, 0.8);
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n, diff = Math.abs((((a - gapC + Math.PI) % TAU) + TAU) % TAU - Math.PI);
      if (diff < (1.7 * TAU) / n) continue;
      LV.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, dmg: 8 * D.dmg, life: 7, kind: 'pink', z: 0.5 });
    }
    e.ringT = [5.5, 4.2, 3.4][phase - 1]; e.attackT = 0.6; Sound.play('bossShot');
  }
}
function bossDown(e) {
  Sound.play('bossRoar');
  LV.enemies.forEach(o => { if (!o.dead && o !== e) { o.dead = true; o.deadT = 0; o.state = 'dead'; LV.alive--; } });
  LV.projs.length = 0;
  $('bossbar').classList.add('hidden');
  banner('PRIDE DEFEATED', 'THE HARDEST ONE');
}

/* ------------------------------------------------------ player damage */
function hurtPlayer(dmg, sx, sy) {
  if (P.hp <= 0 || S.god || S.mode !== 'play') return;
  P.hp -= dmg; P.lastHurt = S.time; P.hurtFlash = 1; P.shake = 1; S.streak = 0;
  P.hits.push({ ang: Math.atan2(sy - P.y, sx - P.x), t: 1.6 });
  Sound.play('hurt');
  if (P.hp > 0 && P.hp < 38 && !LV.lowWarned) { LV.lowWarned = true; radio('worried', LOW_HP_LINES[(Math.random() * LOW_HP_LINES.length) | 0], true); }
  if (P.hp <= 0) die();
}
function die() {
  P.hp = 0; S.mode = 'dead'; S.stats.deaths++; Sound.play('die'); P.firing = false; P.hits = []; $('hud').classList.add('hidden');
  try { document.exitPointerLock(); } catch (e) { /* ignore */ }
  setTimeout(() => {
    if (S.mode !== 'dead') return;
    $('deadFace').src = portraitURL('worried'); $('deadText').textContent = '"' + FAIL_LINES[(Math.random() * FAIL_LINES.length) | 0] + '"';
    show('dead');
  }, 1100);
}

/* ------------------------------------------------------------ pickups */
function updateItems() {
  for (const it of LV.items) {
    if (it.taken) continue;
    if (Math.hypot(it.x - P.x, it.y - P.y) > 0.7) continue;
    if (it.type === 'c') {
      if (P.hp >= 100) continue;
      P.hp = 100; popup('CHOCOLATES - HEALTH RESTORED', 'pink');
    } else {
      const a = P.ws[0], b = P.ws[1];
      if (a.res >= WEAPONS[0].max && b.res >= WEAPONS[1].max) continue;
      a.res = Math.min(WEAPONS[0].max, a.res + 60); b.res = Math.min(WEAPONS[1].max, b.res + 10); popup('AMMO RESUPPLIED', 'good');
    }
    it.taken = true; Sound.play('pickup');
  }
}

/* ------------------------------------------------------ flow / progress */
function openGate() {
  LV.gateOpen = true; LV.gates.forEach(k => { LV.grid[k] = 0; });
  Sound.play('gate'); banner('GATE OPEN', 'REACH THE HEART');
  buildMinimapBase();
  if (LV.def.radio.clear && !LV.def.boss) radio(LV.def.radio.clear[0], LV.def.radio.clear[1]);
  if (LV.def.boss && LV.def.radio.clear) radio(LV.def.radio.clear[0], LV.def.radio.clear[1], true);
}
function completeLevel() {
  if (S.mode !== 'play') return;
  S.mode = 'between'; LV.cleared = true; Sound.play('complete'); P.firing = false; $('hud').classList.add('hidden');
  try { document.exitPointerLock(); } catch (e) { /* ignore */ }
  const def = LV.def, last = S.lvl + 1 >= LEVELS.length - 1;
  const shots = S.stats.shots - LV.startShots, hits = S.stats.hits - LV.startHits;
  setTimeout(() => {
    $('betTitle').textContent = def.title + ' COMPLETE';
    const f = def.radio.clear || ['soft', 'Keep going.'];
    $('betFace').src = portraitURL(f[0]); $('betText').textContent = '"' + f[1] + '"';
    const st = $('betStats'); st.innerHTML = '';
    [['BAD HABITS ELIMINATED', S.stats.kills - LV.startKills], ['ACCURACY', shots ? Math.round((hits / shots) * 100) + '%' : '-'], ['FORGIVENESS', Math.round(def.forgive[1]) + '%']].forEach(([a, b]) => { const x = document.createElement('span'), y = document.createElement('span'); x.textContent = a; y.textContent = b; st.append(x, y); });
    $('next').textContent = last ? 'GO TO ' + CONFIG.her.toUpperCase() : 'NEXT MISSION';
    show('between');
  }, 700);
}
function nextLevel() {
  const i = S.lvl + 1;
  S.fadeT = 1;
  topUpAmmo();
  loadLevel(i);
  S.mode = 'play'; hideAll(); $('hud').classList.remove('hidden');
  lockPointer(); lastT = performance.now();
}
function topUpAmmo() { P.ws[0].res = Math.min(WEAPONS[0].max, Math.max(P.ws[0].res, WEAPONS[0].reserve)); P.ws[1].res = Math.min(WEAPONS[1].max, Math.max(P.ws[1].res, WEAPONS[1].reserve)); }

/* ---- epilogue ---- */
let finalIdx = 0, typeTimer = null, noCount = 0;
function startFinal() {
  if (S.mode !== 'play') return;
  S.mode = 'final'; P.firing = false; LV.finalAng = Math.atan2(LV.lara.y - P.y, LV.lara.x - P.x);
  try { document.exitPointerLock(); } catch (e) { /* ignore */ }
  LV.laraSoft = true; finalIdx = 0; noCount = 0;
  $('radio').classList.add('hidden'); radioQ.length = 0;
  setTimeout(() => {
    if (S.mode !== 'final') return;
    $('hud').classList.add('hidden');
    $('finalWho').textContent = 'FROM ' + CONFIG.from.toUpperCase() + ' TO ' + CONFIG.her.toUpperCase();
    $('ask').classList.add('hidden'); $('finalText').classList.remove('hidden'); $('finalNext').classList.remove('hidden');
    show('final'); typeLine(CONFIG.letter[0]);
  }, 1200);
}
function typeLine(text) {
  const el = $('finalText'); el.textContent = ''; let n = 0; clearInterval(typeTimer);
  typeTimer = setInterval(() => { n += 2; el.textContent = text.slice(0, n); if (n >= text.length) clearInterval(typeTimer); }, 28);
  el._full = text;
}
function finalNext() {
  const el = $('finalText');
  if (el.textContent !== el._full) { clearInterval(typeTimer); el.textContent = el._full; return; }
  finalIdx++;
  if (finalIdx < CONFIG.letter.length) { typeLine(CONFIG.letter[finalIdx]); return; }
  $('finalNext').classList.add('hidden'); $('finalText').textContent = '';
  $('askQ').textContent = CONFIG.question; $('yesBtn').textContent = CONFIG.yes; $('noBtn').textContent = CONFIG.no;
  $('ask').classList.remove('hidden'); $('finalText').classList.add('hidden');
}
const NO_LINES = ['Hmm? Try again.', 'That button seems broken.', 'I think you meant YES.', 'Error: "' + 'No' + '" is not available in this mission.', 'The excuses told it to hide.', 'Come on, ' + CONFIG.her + '...'];
function dodgeNo() {
  const b = $('noBtn'), box = $('ask').getBoundingClientRect(), yes = $('yesBtn').getBoundingClientRect();
  b.style.position = 'absolute';
  for (let i = 0; i < 30; i++) {
    const x = rand(0, Math.max(10, box.width - b.offsetWidth)), y = rand(0, 70);
    b.style.left = x + 'px'; b.style.top = y + 'px';
    const r = b.getBoundingClientRect(), pad = 12;
    if (r.right < yes.left - pad || r.left > yes.right + pad || r.bottom < yes.top - pad || r.top > yes.bottom + pad) break;
  }
  $('noMsg').textContent = NO_LINES[noCount % NO_LINES.length]; noCount++; Sound.play('nope');
}
function winGame() {
  S.mode = 'win'; S.forgive = 100; Sound.play('win'); LV.laraSoft = true;
  $('winFace').src = portraitURL('smile'); $('winText').textContent = '"' + CONFIG.forgiven + '"';
  const t = Math.floor(S.runTime), st = $('winStats'); st.innerHTML = '';
  const acc = S.stats.shots ? Math.round((S.stats.hits / S.stats.shots) * 100) + '%' : '-';
  [['BAD HABITS ELIMINATED', S.stats.kills], ['HEADSHOTS', S.stats.heads], ['ACCURACY', acc], ['TIME TO SAY SORRY', ((t / 60) | 0) + ':' + String(t % 60).padStart(2, '0')], ['TIMES ' + CONFIG.her.toUpperCase() + ' WAS RIGHT', 'ALWAYS'], ['DEATHS', S.stats.deaths], ['SCORE', S.score]].forEach(([a, b]) => { const x = document.createElement('span'), y = document.createElement('span'); x.textContent = a; y.textContent = b; st.append(x, y); });
  show('win'); startConfetti();
}

/* ------------------------------------------------------------- update */
function updatePlayer(dt) {
  if (keys.ArrowLeft) P.ang -= 2.4 * dt; if (keys.ArrowRight) P.ang += 2.4 * dt;
  if (keys.ArrowUp) P.pitch = clamp(P.pitch + 190 * dt, -110, 110); if (keys.ArrowDown) P.pitch = clamp(P.pitch - 190 * dt, -110, 110);
  let fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) - touchMove.y, str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + touchMove.x;
  const len = Math.hypot(fwd, str); if (len > 1) { fwd /= len; str /= len; }
  P.sprint = (keys.ShiftLeft || keys.ShiftRight || (S.touch && len > 0.95)) && fwd > 0.3;
  const sp = (P.sprint ? 4.9 : 3.1) * (P.reload > 0 ? 0.9 : 1);
  const dx = Math.cos(P.ang), dy = Math.sin(P.ang);
  const vx = (dx * fwd - dy * str) * sp * dt, vy = (dy * fwd + dx * str) * sp * dt;
  slide(P, vx, vy, 0.24);
  const moving = Math.hypot(vx, vy) > 0.0005;
  P.moveAmt += ((moving ? 1 : 0) - P.moveAmt) * Math.min(1, dt * 10);
  if (moving) { const prev = Math.sin(P.bob); P.bob += dt * (P.sprint ? 12 : 9); if (prev < 0 && Math.sin(P.bob) >= 0) Sound.play('step'); }
  P.sway *= Math.exp(-dt * 7); P.recoil *= Math.exp(-dt * 7); P.bloom *= Math.exp(-dt * 3.2); P.shake *= Math.exp(-dt * 6); P.hurtFlash *= Math.exp(-dt * 3);
  if (P.hp < 100 && S.time - P.lastHurt > DIFFICULTY[S.diff].regen) P.hp = Math.min(100, P.hp + dt * 22);
  P.hits = P.hits.filter(h => (h.t -= dt) > 0);
  if (P.hp < 38 && P.hp > 0) { P.heartT -= dt; if (P.heartT <= 0) { Sound.play('heartbeat'); P.heartT = 0.85; } }
}

function updateWeapon(dt) {
  const w = WEAPONS[P.wi], ws = P.ws[P.wi];
  P.cd = Math.max(0, P.cd - dt); P.kick = Math.max(0, P.kick - dt * 5); P.flash = Math.max(0, P.flash - dt * 14); P.swap = Math.max(0, P.swap - dt * 3.5);
  if (P.pump > 0) { P.pump += dt / 0.5; if (P.pump >= 1) P.pump = 0; }
  if (P.reload > 0) {
    P.reload += dt / w.reload;
    if (P.reload >= 1) { const take = Math.min(w.mag - ws.ammo, ws.res); ws.ammo += take; ws.res -= take; P.reload = 0; }
  }
  const trigger = w.auto ? P.firing : P.fireEdge;
  if (trigger && !LV.def.lara && P.cd <= 0 && P.reload === 0 && P.swap < 0.4) fireWeapon();
  P.fireEdge = false;
}

function updateProjectiles(dt) {
  for (const p of LV.projs) {
    const steps = Math.max(1, Math.ceil((Math.hypot(p.vx, p.vy) * dt) / 0.12));
    for (let s = 0; s < steps && p.life > 0; s++) {
      p.x += (p.vx * dt) / steps; p.y += (p.vy * dt) / steps;
      if (blockedAt(p.x, p.y)) { p.life = 0; spawnFx(p.x, p.y, p.z, 'gold', 0.15); break; }
      if (Math.hypot(P.x - p.x, P.y - p.y) < 0.3) { p.life = 0; hurtPlayer(p.dmg, p.x - p.vx, p.y - p.vy); break; }
    }
    p.life -= dt;
  }
  LV.projs = LV.projs.filter(p => p.life > 0);
  for (const f of LV.fxs) f.age += dt;
  LV.fxs = LV.fxs.filter(f => f.age < f.life);
}

function update(dt) {
  S.time += dt; S.runTime = (S.runTime || 0) + dt;
  updatePlayer(dt); updateWeapon(dt);
  LV.fieldT -= dt; if (LV.fieldT <= 0) { updateField(); LV.fieldT = 0.25; }
  for (const e of LV.enemies) updateEnemy(e, dt);
  updateProjectiles(dt); updateItems();
  if (S.mode !== 'play') return;
  const L = LV;
  if (!L.def.lara) {
    const done = L.def.boss ? (L.boss ? L.boss.dead : L.enemies.every(e => e.dead)) : L.alive <= 0;
    if (!L.gateOpen && done) openGate();
    if (L.gateOpen && L.exit && Math.hypot(P.x - L.exit.x, P.y - L.exit.y) < 0.85) completeLevel();
  } else {
    while (L.walkIdx < L.def.walk.length && P.x > L.def.walk[L.walkIdx][0]) { const w = L.def.walk[L.walkIdx++]; radio(w[1], w[2]); }
    if (Math.hypot(P.x - L.lara.x, P.y - L.lara.y) < 2.3) startFinal();
  }
}

/* ------------------------------------------------------------ rendering */
function buildSprites(t) {
  const out = [];
  for (const e of LV.enemies) {
    const T = e.t; let img, frame = 0;
    if (T.spr === 'grunt' || T.spr === 'heavy') frame = e.shootT > 0 ? 2 : (e.moving ? ((e.anim * 5) | 0) % 2 : 0);
    else if (T.spr === 'ghost') frame = e.attackT > 0 ? 1 : 0;
    else if (T.spr === 'boss') frame = e.attackT > 0 ? 1 : 0;
    img = SPR[T.spr][frame];
    const s = { x: e.x, y: e.y, z: (T.z || 0) + (T.spr === 'ghost' ? Math.sin(e.anim * 3) * 0.04 : 0), h: T.h, img, flash: e.flash > 0 ? e.flash * 0.8 : 0, ref: e, hit: e.dead ? null : 'enemy' };
    if (e.dead) { const k = clamp(e.deadT / 0.45, 0, 1); s.vs = 1 - 0.86 * k; if (T.spr === 'ghost') s.z = (T.z || 0) * (1 - k); s.alpha = e.deadT > 2 ? 1 - (e.deadT - 2) / 1.5 : 1; if (s.alpha <= 0) continue; if (T.boss) { s.vs = 1 - 0.55 * k; } }
    out.push(s);
  }
  for (const it of LV.items) if (!it.taken) out.push({ x: it.x, y: it.y, z: 0.03 + Math.sin(t * 3 + it.ph) * 0.025, h: it.type === 'c' ? 0.26 : 0.22, img: it.type === 'c' ? SPR.choc : SPR.ammo });
  for (const d of LV.decor) out.push({ x: d.x, y: d.y, z: 0, h: d.flicker ? d.h * (0.96 + Math.sin(t * 17 + d.x * 7) * 0.04) : d.h, img: d.img, hit: d.block ? 'block' : null });
  for (const p of LV.projs) out.push({ x: p.x, y: p.y, z: p.z - 0.07 + Math.sin(t * 20) * 0.01, h: 0.16 + Math.sin(t * 25 + p.x) * 0.015, img: SPR.orb[p.kind], full: true });
  for (const f of LV.fxs) out.push({ x: f.x, y: f.y, z: f.z, h: 0.12 * (1 - (f.age / f.life) * 0.4), img: f.img, full: true, alpha: 1 - f.age / f.life });
  if (LV.lara) out.push({ x: LV.lara.x, y: LV.lara.y, z: 0, h: 0.85 + (LV.laraSoft ? Math.sin(t * 2) * 0.006 : 0), img: LV.laraSoft ? SPR.lara.soft : SPR.lara.cross });
  if (LV.exit && LV.gateOpen) out.push({ x: LV.exit.x, y: LV.exit.y, z: 0.12 + Math.sin(t * 2.4) * 0.05, h: 0.5 + Math.sin(t * 4) * 0.03, img: SPR.exit, full: true });
  return out;
}

function currentCamera(t, dt) {
  if (S.mode === 'title') { const a = t * 0.12; return makeCamera(15, 9.5, a, 0, 0); }
  let ang = P.ang, pitch = P.pitch + P.recoil, bob = 0;
  const k = R.H / 360;
  if (S.mode === 'final' || S.mode === 'win') {
    ang = P.ang = lerpAngle(P.ang, LV.finalAng - (S.mode === 'win' ? 0.36 : 0), Math.min(1, dt * 2.5));
    pitch = P.pitch += (-48 - P.pitch) * Math.min(1, dt * 2);
  }
  if (S.mode === 'dead') { pitch = -90; ang += 0.25; }
  const sh = P.shake * 2.2;
  bob = Math.sin(P.bob) * 2.4 * P.moveAmt + (sh ? rand(-sh, sh) : 0);
  return makeCamera(P.x, P.y, ang + (sh ? rand(-sh, sh) * 0.004 : 0), pitch * k, bob * k);
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; }

function drawFx(t) {
  const w = fxC.width, h = fxC.height;
  fxg.setTransform(1, 0, 0, 1, 0, 0); fxg.clearRect(0, 0, w, h);
  fxg.setTransform(w / 1280, 0, 0, h / 720, 0, 0);
  if ((S.mode === 'play' || S.mode === 'paused' || S.mode === 'between') && !LV.def.lara) {
    const bx = Math.cos(P.bob * 0.5) * 9 * P.moveAmt, by = Math.abs(Math.sin(P.bob)) * 9 * P.moveAmt + (P.sprint ? 18 : 0);
    const reloadK = P.reload > 0 ? P.reload : 0;
    drawWeapon(fxg, P.wi, { x: bx + P.sway, y: by, kick: P.kick, flash: P.flash, reload: reloadK, pump: P.pump, swap: P.swap });
  }
  if (!LV) return;
  // damage vignette
  const low = P.hp < 38 && S.mode === 'play' ? (0.25 + 0.2 * Math.sin(t * 7)) * (1 - P.hp / 38) : 0;
  const a = clamp(P.hurtFlash * 0.55 + low + (S.mode === 'dead' ? 0.5 : 0), 0, 0.9);
  if (a > 0.01) { const gr = fxg.createRadialGradient(640, 360, 280, 640, 360, 760); gr.addColorStop(0, 'rgba(180,0,0,0)'); gr.addColorStop(1, `rgba(200,0,20,${a})`); fxg.fillStyle = gr; fxg.fillRect(0, 0, 1280, 720); }
  // directional hit arcs
  for (const hh of P.hits) {
    fxg.save(); fxg.translate(640, 360); fxg.rotate(hh.ang - P.ang - Math.PI / 2);
    fxg.strokeStyle = `rgba(255,40,40,${clamp(hh.t / 1.6, 0, 1) * 0.9})`; fxg.lineWidth = 14; fxg.lineCap = 'round';
    fxg.beginPath(); fxg.arc(0, 0, 250, -0.22, 0.22); fxg.stroke(); fxg.restore();
  }
  if (S.fadeT > 0) { fxg.fillStyle = `rgba(0,0,0,${S.fadeT})`; fxg.fillRect(0, 0, 1280, 720); }
}

function updateHud(dt) {
  const w = WEAPONS[P.wi], ws = P.ws[P.wi];
  $('hpFill').style.width = clamp(P.hp, 0, 100) + '%'; setText($('hpNum'), String(Math.ceil(clamp(P.hp, 0, 100))));
  $('vitals').classList.toggle('low', P.hp < 38);
  setText($('ammoMag'), String(ws.ammo)); $('ammoMag').classList.toggle('empty', ws.ammo === 0);
  setText($('ammoRes'), '/ ' + ws.res); setText($('wpnName'), w.name);
  setText($('wpnHint'), S.touch ? '' : P.reload > 0 ? 'RELOADING' : ws.ammo === 0 && ws.res > 0 ? 'PRESS R TO RELOAD' : ws.ammo === 0 ? 'NO AMMO' : '[1] RIFLE   [2] SHOTGUN');
  setText($('score'), String(S.score));
  setText($('streakTxt'), S.streak >= 2 ? 'KILL STREAK x' + S.streak : '');
  const d = LV.def;
  setText($('objTitle'), d.title + ' - ' + d.name);
  const boss = LV.def.boss;
  if (LV.gateOpen && d.exitText) setText($('objText'), d.exitText);
  else if (d.lara) setText($('objText'), d.objective);
  else if (boss) setText($('objText'), d.objective);
  else { setText($('objText'), d.objective + ' ' + (LV.total - LV.alive) + '/' + LV.total); }
  S.forgive += (forgivenessTarget() - S.forgive) * Math.min(1, dt * 3);
  $('forgiveFill').style.width = S.forgive + '%'; setText($('forgiveTxt'), Math.round(S.forgive) + '%');
  if (LV.boss && !LV.boss.dead && LV.boss.state !== 'idle') $('bossFill').style.width = clamp((LV.boss.hp / LV.boss.maxHp) * 100, 0, 100) + '%';
  // crosshair spread + target label
  $('crosshair').style.setProperty('--gap', (0.3 + P.bloom * 0.7 + P.moveAmt * 0.35 + (P.sprint ? 0.5 : 0)) + 'em');
  $('crosshair').style.opacity = P.reload > 0 ? 0.35 : 1;
  const res = R.cam ? castShot(R.W / 2, R.H / 2) : {};
  const tg = $('target');
  if (res.enemy && !res.enemy.dead) { setText(tg, res.enemy.t.name); tg.classList.add('on'); } else tg.classList.remove('on');
}

/* -------------------------------------------------------------- confetti */
let confetti = [], confOn = false;
function startConfetti() {
  confOn = true; confetti = [];
  for (let i = 0; i < 140; i++) confetti.push(newHeart(true));
}
function newHeart(initial) {
  return { x: Math.random() * confC.width, y: initial ? Math.random() * -confC.height : -20, s: rand(10, 30) * (confC.width / 1280), v: rand(40, 120) * (confC.height / 720), sw: rand(0.5, 2), ph: Math.random() * 6, col: ['#ff4d79', '#ff8fb1', '#ffc2d4', '#ff2d6f', '#ffd86b'][(Math.random() * 5) | 0] };
}
function drawConfetti(dt, t) {
  cg.clearRect(0, 0, confC.width, confC.height);
  if (!confOn) return;
  for (const c of confetti) {
    c.y += c.v * dt; c.x += Math.sin(t * c.sw + c.ph) * 30 * dt;
    if (c.y > confC.height + 30) Object.assign(c, newHeart(false));
    cg.fillStyle = c.col; cg.save(); cg.translate(c.x, c.y); cg.rotate(Math.sin(t * c.sw + c.ph) * 0.4); heartPath(cg, 0, 0, c.s); cg.fill(); cg.restore();
  }
}

/* ------------------------------------------------------------------ loop */
let lastT = performance.now(), perfAcc = 0, perfN = 0;
const RES_STEPS = [[854, 480], [640, 360], [480, 270], [320, 180]]; let resStep = 0;
function frame(tms) {
  const workStart = performance.now();
  const dtRaw = (tms - lastT) / 1000; lastT = tms;
  const dt = Math.min(0.05, dtRaw), t = tms / 1000;
  if (S.mode === 'play') update(dt);
  else if (S.mode === 'final' && LV) { for (const e of LV.enemies) e.anim += dt; }
  if (LV) {
    if (S.fadeT > 0) S.fadeT = Math.max(0, S.fadeT - dt * 1.4);
    for (const e of LV.enemies) if (S.mode !== 'play') { e.anim += dt; if (e.flash > 0) e.flash -= dt * 5; if (e.dead) e.deadT += dt; }
    const cam = currentCamera(t, dt); R.cam = cam;
    renderScene(cam, LV.grid, LV.mw, buildSprites(t));
    if (S.mode === 'play' || S.mode === 'paused') { updateHud(dt); drawMinimap(); updateRadio(dt); }
    else if (S.mode === 'final' || S.mode === 'win') updateRadio(dt);
    drawFx(t);
  }
  drawConfetti(dt, t);
  // drop resolution on slow machines
  if (S.mode === 'play' && !document.hidden) {
    perfAcc += performance.now() - workStart; perfN++;
    if (perfN >= 120) { if (perfAcc / perfN > 11 && resStep < RES_STEPS.length - 1) { resStep++; setResolution(...RES_STEPS[resStep]); } perfAcc = 0; perfN = 0; }
  }
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- input */
function lockPointer() {
  if (S.touch) return;
  try { const p = stage.requestPointerLock && stage.requestPointerLock(); if (p && p.catch) p.catch(() => { S.noLock = true; }); } catch (e) { S.noLock = true; }
}
document.addEventListener('pointerlockerror', () => { S.noLock = true; });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === stage) { S.hasLock = true; S.noLock = false; }
  else if (S.hasLock) { S.hasLock = false; if (S.mode === 'play') pauseGame(); }
});
function look(dx, dy) {
  P.ang += dx * 0.0022; P.pitch = clamp(P.pitch - dy * 0.0022 * (R.W / 2 / FOV_PLANE) * (360 / R.H), -110, 110);
  P.sway = clamp(P.sway - dx * 0.6, -60, 60);
}
document.addEventListener('mousemove', e => {
  if (S.mode !== 'play') return;
  if (S.hasLock || (S.noLock && (e.buttons & 2))) look(e.movementX, e.movementY);
});
stage.addEventListener('contextmenu', e => e.preventDefault());
stage.addEventListener('mousedown', e => {
  if (S.mode !== 'play' || e.button !== 0) return;
  if (!S.hasLock) lockPointer(); // browsers refuse an instant re-lock after Esc; the next click recaptures the mouse
  P.firing = true; P.fireEdge = true;
});
window.addEventListener('mouseup', e => { if (e.button === 0) P.firing = false; });
stage.addEventListener('wheel', e => { if (S.mode === 'play') switchWeapon(e.deltaY > 0 ? 1 : 0); }, { passive: true });

function pauseGame() {
  if (S.mode !== 'play') return;
  S.mode = 'paused'; P.firing = false; show('pause'); $('hud').classList.remove('hidden');
  try { document.exitPointerLock(); } catch (e) { /* ignore */ }
  $('noLockNote').textContent = S.noLock ? 'Mouse capture is unavailable here: hold the RIGHT mouse button and drag to look around.' : '';
}
function resumeGame() {
  if (S.mode !== 'paused') return;
  hideAll(); S.mode = 'play'; lockPointer(); lastT = performance.now();
}
window.addEventListener('blur', () => { if (S.mode === 'play' && !S.touch) pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play') pauseGame(); });

window.addEventListener('keydown', e => {
  const c = e.code;
  if (S.mode === 'play' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c)) e.preventDefault();
  if (e.repeat) return;
  keys[c] = true;
  if (c === 'KeyM') { const m = Sound.toggleMute(); popupMute(m); }
  if (c === 'KeyF') { if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {}); }
  if (S.mode === 'title' && (c === 'Enter' || c === 'Space')) startGame();
  else if (S.mode === 'play') {
    if (c === 'KeyR') startReload();
    else if (c === 'Digit1') switchWeapon(0); else if (c === 'Digit2') switchWeapon(1); else if (c === 'KeyQ') switchWeapon(1 - P.wi);
    else if (c === 'KeyP' || c === 'Escape') pauseGame();
  } else if (S.mode === 'paused' && (c === 'KeyP' || c === 'Enter')) resumeGame();
  else if (S.mode === 'dead' && (c === 'Enter' || c === 'KeyR')) retry();
  else if (S.mode === 'between' && c === 'Enter') nextLevel();
  else if (S.mode === 'final' && (c === 'Enter' || c === 'Space')) {
    if (!$('finalNext').classList.contains('hidden')) finalNext(); else if (c === 'Enter') winGame();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
function popupMute(m) { if (S.mode === 'play') popup(m ? 'SOUND OFF' : 'SOUND ON', ''); }

/* ---- touch ---- */
function setupTouch() {
  S.touch = true; document.body.classList.add('touch'); $('touch').classList.remove('hidden');
  let joyId = null, lookId = null, jx = 0, jy = 0, lx = 0, ly = 0;
  const knob = $('knob');
  const rel = t => { const r = stage.getBoundingClientRect(); return (t.clientX - r.left) / r.width; };
  stage.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.target.closest('.tbtn') || S.mode !== 'play') continue;
      if (rel(t) < 0.45 && joyId === null) { joyId = t.identifier; jx = t.clientX; jy = t.clientY; }
      else if (rel(t) >= 0.45 && lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  stage.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        const r = Math.min(60, Math.hypot(t.clientX - jx, t.clientY - jy)), a = Math.atan2(t.clientY - jy, t.clientX - jx);
        touchMove.x = (Math.cos(a) * r) / 60; touchMove.y = (Math.sin(a) * r) / 60;
        knob.style.transform = `translate(${Math.cos(a) * r * 0.6}px,${Math.sin(a) * r * 0.6}px)`;
      } else if (t.identifier === lookId) { look((t.clientX - lx) * 1.6, (t.clientY - ly) * 1.6); lx = t.clientX; ly = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { joyId = null; touchMove.x = touchMove.y = 0; knob.style.transform = ''; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  stage.addEventListener('touchend', end); stage.addEventListener('touchcancel', end);
  const hold = (id, on, off) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); on(); }, { passive: false }); b.addEventListener('touchend', e => { e.preventDefault(); if (off) off(); }, { passive: false }); };
  hold('tFire', () => { if (S.mode === 'play') { P.firing = true; P.fireEdge = true; } }, () => { P.firing = false; });
  hold('tReload', () => { if (S.mode === 'play') startReload(); });
  hold('tSwap', () => { if (S.mode === 'play') switchWeapon(1 - P.wi); });
  hold('tPause', () => { if (S.mode === 'play') pauseGame(); });
}

/* --------------------------------------------------------------- screens */
function startGame() {
  if (S.mode !== 'title') return;
  Sound.init();
  S.score = 0; S.runTime = 0; S.stats = { shots: 0, hits: 0, kills: 0, heads: 0, deaths: 0 }; S.forgive = 0;
  resetPlayerLoadout();
  loadLevel(S.startLevel || 0);
  S.mode = 'play'; hideAll(); $('hud').classList.remove('hidden'); lockPointer(); lastT = performance.now();
}
function retry() {
  if (S.mode !== 'dead') return;
  topUpAmmo(); P.ws.forEach((w, i) => { w.ammo = WEAPONS[i].mag; });
  S.stats.shots = LV.startShots; S.stats.hits = LV.startHits; S.stats.kills = LV.startKills;
  loadLevel(S.lvl); S.mode = 'play'; hideAll(); $('hud').classList.remove('hidden'); lockPointer(); lastT = performance.now();
}
function playAgain() {
  confOn = false; cg.clearRect(0, 0, confC.width, confC.height);
  S.mode = 'title'; hideAll(); $('hud').classList.add('hidden'); show('title'); loadLevel(0, { attract: true }); Sound.music(null);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  stage.style.setProperty('--u', w / 1280 + 'px');
  fxC.width = Math.round(w * dpr); fxC.height = Math.round(h * dpr);
  confC.width = Math.round(w * dpr); confC.height = Math.round(h * dpr);
}
window.addEventListener('resize', resize);

function init() {
  buildArt(); initRenderer($('view')); resize();
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) setupTouch();
  setText($('tagline'), CONFIG.tagline); setText($('brandName'), CONFIG.callsign.split('-')[0]);
  $('briefText').textContent = CONFIG.her + ' is upset. Intel says she is hiding behind a wall of excuses, ghosts and stubbornness. All of it is yours. Fight through every room, beat the boss in your own head, and reach her to say it to her face.';
  const dEl = $('diffs');
  DIFFICULTY.forEach((d, i) => {
    const b = document.createElement('button'); b.innerHTML = ''; b.append(d.name); const s = document.createElement('small'); s.textContent = d.note; b.appendChild(s);
    b.classList.toggle('sel', i === S.diff); b.addEventListener('click', () => { S.diff = i; dEl.querySelectorAll('button').forEach((x, k) => x.classList.toggle('sel', k === i)); });
    dEl.appendChild(b);
  });
  $('deploy').addEventListener('click', startGame);
  $('resume').addEventListener('click', resumeGame);
  $('retry').addEventListener('click', retry);
  $('next').addEventListener('click', nextLevel);
  $('again').addEventListener('click', playAgain);
  $('finalNext').addEventListener('click', finalNext);
  $('dlg').addEventListener('click', e => { if (e.target.id === 'finalText') finalNext(); });
  $('yesBtn').addEventListener('click', winGame);
  $('noBtn').addEventListener('pointerenter', dodgeNo);
  $('noBtn').addEventListener('click', e => { e.preventDefault(); dodgeNo(); });
  resetPlayerLoadout();
  loadLevel(0, { attract: true });
  const q = new URLSearchParams(location.search);
  if (q.has('debug')) {
    window.__sorry = { S, P, keys, get LV() { return LV; }, R, loadLevel, startGame, castShot, update, fireWeapon, hurtEnemy, ETYPES, WEAPONS, finalNext, nextLevel, completeLevel, startFinal, winGame, openGate, retry };
    if (q.has('god')) S.god = true;
    if (q.has('level')) { S.startLevel = +q.get('level'); }
  }
  requestAnimationFrame(frame);
}
init();
