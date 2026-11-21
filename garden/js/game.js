/* game.js
   The whole experience, in order:
     welcome  ->  garden (tap 7 buds, each blooms and reveals a message)  ->  secret heart flower
     ->  "Do you know how beautiful you are?"  ->  finale (flowers fly together into a heart bouquet)
     ->  envelope -> the letter -> "The garden will always bloom for you"  ->  replay                */
(() => {
  'use strict';
  const C = window.GARDEN;
  const TAU = Math.PI * 2;
  const $ = (s, el = document) => el.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const nextFrame = () => new Promise(r => requestAnimationFrame(r));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const easeInOut = u => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  const IDS = C.flowers.map(f => f.id);
  const TOTAL = IDS.length;
  const DATA = Object.fromEntries(C.flowers.map(f => [f.id, f]));

  /* where each plant stands: x, y = base position in % of the screen, s = size */
  const LAYOUT = {
    cherry:    { x: 50, y: 55, s: .9 },
    lavender:  { x: 18, y: 59, s: .92 },
    sunflower: { x: 82, y: 59, s: .98 },
    tulip:     { x: 29, y: 71, s: .95 },
    hibiscus:  { x: 71, y: 71, s: .95 },
    rose:      { x: 15, y: 86, s: 1.08 },
    peony:     { x: 85, y: 86, s: 1.08 },
    heart:     { x: 50, y: 87, s: 1.2 }
  };
  const WELCOME_FLOWERS = [   // id, x, y, size, entrance delay
    ['lavender', 18, 93, .9, .5], ['sunflower', 82, 93, 1, .6],
    ['peony', 6, 99, 1.2, .2], ['rose', 29, 101, 1.1, .3], ['tulip', 71, 101, 1.08, .35], ['hibiscus', 94, 99, 1.2, .25]
  ];
  const WHISPER_EMOJI = { sun: '☀️', cloud: '☁️', star: '⭐', butterfly: '🦋', firefly: '✨', ladybug: '🐞', heart: '💗', envelope: '💌' };

  const S = { screen: 'welcome', collected: new Set(), order: {}, found: new Set(), busy: false, endShown: false, fresh: true };
  let plants = {};
  const el = {};

  /* ======================================================================
     Small helpers
     ====================================================================== */
  const setScreen = name => { S.screen = name; document.body.dataset.screen = name; };
  const setHint = text => { el.hint.textContent = text; };
  const setProgress = n => { const p = n / TOTAL; document.documentElement.style.setProperty('--p', p.toFixed(3)); FX.setDusk(p); };
  const headPos = plant => { const r = plant.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .303, w: r.width, r }; };
  const bump = node => { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); };

  /* split text into words that fade in one after another */
  function words(node, text, { start = 0, gap = .075 } = {}) {
    node.textContent = '';
    node.style.setProperty('--s', start + 's'); node.style.setProperty('--g', gap + 's');
    const parts = text.split(' ');
    parts.forEach((t, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i); s.textContent = t; node.appendChild(s);
      if (i < parts.length - 1) node.appendChild(document.createTextNode(' '));
    });
    return parts.length;
  }

  function toast({ emoji, text }, ms = 5200) {
    const host = el.toast;
    host.querySelectorAll('.toast').forEach(dismiss);
    const t = document.createElement('div');
    t.className = 'toast glass';
    t.innerHTML = '<span class="t-ico"></span><span class="t-tx"></span>';
    t.children[0].textContent = emoji; t.children[1].textContent = text;
    host.appendChild(t);
    setTimeout(() => dismiss(t), ms);
  }
  function dismiss(t) { if (t.dataset.out) return; t.dataset.out = 1; t.classList.add('out'); setTimeout(() => t.remove(), 700); }

  /* ======================================================================
     Message card (used for flower messages, the question and the answers)
     ====================================================================== */
  function showCard({ kicker = '', title = '', text = '', icon = '', actions = [] }) {
    return new Promise(resolve => {
      const card = el.card;
      $('#cardKicker').textContent = kicker;
      $('#cardTitle').textContent = title;
      $('#cardIcon').innerHTML = icon;
      const n = words($('#cardText'), text, { start: .5 });
      const box = $('#cardActions'); box.innerHTML = '';
      actions.forEach((a, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn ' + (a.cls || '');
        b.textContent = a.label;
        b.style.setProperty('--ad', (.5 + n * .075 + .5 + i * .18).toFixed(2) + 's');
        b.addEventListener('click', () => { Music.pop(); resolve(a.value); }, { once: true });
        box.appendChild(b);
      });
      requestAnimationFrame(() => card.classList.add('show'));
      setTimeout(() => { const b = box.querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 900);
    });
  }
  const hideCard = () => el.card.classList.remove('show');

  /* ======================================================================
     Backdrop: stars, clouds, sun, meadow, welcome decorations
     ====================================================================== */
  function buildBackdrop() {
    const stars = $('#stars');
    for (let i = 0; i < 54; i++) {
      const s = document.createElement('span'); s.className = 'star';
      s.style.cssText = `left:${rnd(0, 100)}%;top:${rnd(0, 100)}%;--z:${rnd(1.5, 3.4).toFixed(1)}px;--t:${rnd(2.2, 5).toFixed(1)}s;--d:${rnd(-5, 0).toFixed(1)}s`;
      stars.appendChild(s);
    }
    const cloudSVG = '<svg viewBox="0 0 200 80" aria-hidden="true"><path d="M30 72Q4 72 8 52Q11 34 34 36Q40 10 68 14Q86 -2 110 12Q134 4 148 26Q178 22 182 48Q198 58 186 72Z" fill="#fff"/></svg>';
    const host = $('#clouds');
    [['9%', 'min(34vw, 300px)', 150, -30], ['30%', 'min(24vw, 220px)', 110, -70], ['44%', 'min(30vw, 270px)', 170, -120], ['14%', 'min(20vw, 190px)', 125, -95]].forEach(([top, w, dur, delay]) => {
      const c = document.createElement('div'); c.className = 'cloud';
      c.style.cssText = `--top:${top};--w:${w};--dur:${dur}s;--delay:${delay}s`; c.innerHTML = cloudSVG; host.appendChild(c);
    });
    const wc = C.whispers.find(w => w.kind === 'cloud');
    const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'cloud'; cb.setAttribute('aria-label', 'A fluffy cloud');
    cb.style.cssText = '--top:19%;--w:min(36vw,200px);--dur:130s;--delay:-48s'; cb.innerHTML = cloudSVG;
    host.appendChild(cb); bindWhisper(cb, wc);
    const sun = document.createElement('button'); sun.type = 'button'; sun.className = 'sun'; sun.setAttribute('aria-label', 'The glowing sun');
    $('#sky').insertBefore(sun, host); bindWhisper(sun, C.whispers.find(w => w.kind === 'sun'));

    const meadow = $('#meadow'), cols = ['#ffb6cf', '#fff', '#d9c7f7', '#ffd0e0', '#fff4c2'];
    for (let i = 0; i < 90; i++) {
      const d = document.createElement('span'); d.className = 'dot';
      d.style.cssText = `left:${rnd(0, 100)}%;bottom:${(Math.pow(Math.random(), 1.4) * 94).toFixed(1)}%;--z:${rnd(4, 8.5).toFixed(1)}px;--c:${cols[i % cols.length]}`;
      meadow.appendChild(d);
    }
  }

  function buildWelcome() {
    $('#branch').innerHTML = Art.branch();
    const r = document.createElement('div'); r.className = 'branch right'; r.innerHTML = Art.branch(); $('#welcome').insertBefore(r, $('#branch').nextSibling);
    const wf = $('#welcomeFlowers'); wf.innerHTML = '';
    WELCOME_FLOWERS.forEach(([id, x, y, s, d]) => {
      const p = document.createElement('div'); p.className = 'plant open'; p.dataset.id = id;
      p.style.cssText = `--x:${x}%;--y:${y}%;--s:${s};--gd:${d}s;`;
      p.innerHTML = `<div class="sway" style="--sd:${(-Math.random() * 5).toFixed(1)}s;--sw:${(5 + Math.random() * 3).toFixed(1)}s">${Art.plant(id)}</div>`;
      wf.appendChild(p);
    });
  }

  /* ======================================================================
     The garden: plants, hidden whispers, counter
     ====================================================================== */
  function hitShapes(id) {
    if (id === 'lavender') return '<rect class="hit" x="36" y="30" width="128" height="296"/>';
    if (id === 'cherry') return '<rect class="hit" x="14" y="36" width="172" height="190"/><rect class="hit" x="84" y="190" width="32" height="134"/>';
    return '<circle class="hit" cx="100" cy="100" r="68"/><rect class="hit" x="80" y="120" width="40" height="204"/>';
  }

  function buildGarden() {
    const stage = $('#stage'); stage.innerHTML = ''; plants = {};
    const order = shuffle(IDS.slice());
    [...IDS, 'heart'].forEach(id => {
      const L = LAYOUT[id], isHeart = id === 'heart';
      const p = document.createElement('div');
      p.className = 'plant'; p.dataset.id = id; p.tabIndex = isHeart ? -1 : 0; p.setAttribute('role', 'button');
      p.setAttribute('aria-label', isHeart ? 'The glowing heart flower' : `${DATA[id].name}, tap to make it bloom`);
      const gd = (.15 + order.indexOf(id) * .16).toFixed(2);
      p.style.cssText = `--x:${L.x}%;--y:${L.y}%;--s:${L.s};--gd:${gd}s;z-index:${10 + Math.round(L.y / 4)}`;
      p.innerHTML = `<div class="grow"><div class="sway" style="--sd:${(-Math.random() * 5).toFixed(1)}s;--sw:${(5 + Math.random() * 3).toFixed(1)}s">${Art.plant(id)}</div></div>`;
      p.querySelector('svg').insertAdjacentHTML('beforeend', hitShapes(id));
      p.addEventListener('click', () => onPlant(id));
      p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlant(id); } });
      stage.appendChild(p); plants[id] = p;
    });
    plants.heart.setAttribute('aria-hidden', 'true');

    C.whispers.filter(w => w.x != null).forEach(w => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'whisper'; b.dataset.kind = w.kind;
      b.setAttribute('aria-label', 'A hidden whisper'); b.style.cssText = `left:${w.x}%;top:${w.y}%`;
      b.innerHTML = Art.props[w.kind]();
      stage.appendChild(b); bindWhisper(b, w);
    });

    const slots = $('#slots'); slots.innerHTML = '';
    IDS.forEach(id => { const s = document.createElement('span'); s.className = 'slot'; s.dataset.id = id; slots.appendChild(s); });
    $('#countNum').textContent = '0'; $('#whisperNum').textContent = '0';
  }

  function bindWhisper(node, w) {
    node.addEventListener('click', e => {
      e.stopPropagation();
      const r = node.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      FX.hearts(x, y, 9, 120); FX.sparkles(x, y, 8); Music.whisper();
      toast({ emoji: WHISPER_EMOJI[w.kind] || '💗', text: w.text }, 5600);
      if (S.found.has(w.id)) return;
      S.found.add(w.id); node.classList.add('found');
      $('#whisperNum').textContent = S.found.size; bump(el.chip);
      if (S.found.size === C.whispers.length) setTimeout(() => { toast({ emoji: '💗', text: C.allWhispers }, 6500); FX.hearts(innerWidth / 2, innerHeight / 2, 24, 260); }, 1600);
    });
  }

  /* ======================================================================
     Entering the garden
     ====================================================================== */
  async function enterGarden() {
    if (S.screen !== 'welcome') return;
    S.screen = 'entering';
    Music.start(); syncMute();
    FX.hearts(innerWidth / 2, innerHeight * .62, 16, 240); FX.sparkles(innerWidth / 2, innerHeight * .62, 14, 220);
    $('#welcome').classList.add('leaving');
    await wait(800);
    document.body.classList.add('planted');
    setScreen('garden');
    setHint(C.hints.start);
    Music.chime(2);
    await wait(2500);
    Object.values(plants).forEach(p => { if (p.dataset.id !== 'heart') p.classList.add('ready', 'grown'); });
  }

  /* ======================================================================
     Spotlight: the tapped flower lifts into the middle of the screen
     ====================================================================== */
  function spotlightGeometry(plant) {
    const r = plant.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const land = matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
    const Hs = Math.min(vh * (land ? .74 : .4), vw * (land ? .5 : .95), 400), k = Hs / r.height;
    const tx = land ? vw * .27 : vw / 2, topY = land ? (vh - Hs) / 2 : Math.max(78, vh * .12);
    return { dx: tx - (r.left + r.width / 2), dy: topY + Hs - r.bottom, k, headX: tx, headY: topY + Hs * .303 };
  }
  async function lift(plant) {
    const g = spotlightGeometry(plant);
    document.body.classList.add('spotlight'); el.scrim.classList.add('on');
    plant.classList.add('spot');
    plant.style.transform = `translate(${g.dx}px, ${g.dy}px) scale(${g.k})`;
    await wait(950);
    return g;
  }
  async function drop(plant) {
    el.scrim.classList.remove('on'); document.body.classList.remove('spotlight');
    plant.style.transform = '';
    await wait(950);
    plant.classList.remove('spot');
  }

  async function onPlant(id) {
    if (S.busy || (S.screen !== 'garden' && S.screen !== 'secret')) return;
    if (id === 'heart') return secretChallenge();
    S.busy = true;
    const plant = plants[id], f = DATA[id], idx = IDS.indexOf(id), first = !S.collected.has(id);
    Music.pop();
    const g = await lift(plant);
    if (!plant.classList.contains('open')) {
      plant.classList.add('open');
      Music.chime(idx);
      FX.bloom(id, g.headX, g.headY);
      await wait(1800);
    }
    const n = first ? S.collected.size + 1 : S.order[id];
    await showCard({
      kicker: `Reason ${n} of ${TOTAL}`, title: f.name, text: f.message, icon: Art.icon(id),
      actions: [{ label: first ? C.keepButton : C.closeButton, value: 'ok' }]
    });
    hideCard();
    if (first) collect(id, g);   // runs while the flower settles back into the garden
    await drop(plant);
    S.busy = false;
    if (first && S.collected.size === TOTAL) { await wait(500); unlockSecret(); }
  }

  /* ======================================================================
     Collecting
     ====================================================================== */
  function flyToSlot(id, x0, y0) {
    return new Promise(resolve => {
      const slot = $(`.slot[data-id="${id}"]`), sr = slot.getBoundingClientRect();
      const x1 = sr.left + sr.width / 2, y1 = sr.top + sr.height / 2;
      const f = document.createElement('div'); f.className = 'fly'; f.style.zIndex = 80; f.innerHTML = Art.icon(id); document.body.appendChild(f);
      const cx = (x0 + x1) / 2 + (x0 > innerWidth / 2 ? 90 : -90), cy = Math.min(y0, y1) - 110;
      const t0 = performance.now(), dur = 1250;
      (function step(now) {
        const u = Math.min(1, (now - t0) / dur), e = u * u * (3 - 2 * u), v = 1 - e;
        const x = v * v * x0 + 2 * v * e * cx + e * e * x1, y = v * v * y0 + 2 * v * e * cy + e * e * y1;
        f.style.transform = `translate(${x}px,${y}px) scale(${1.25 - e * 1.0}) rotate(${e * 360}deg)`;
        FX.trail(x, y);
        if (u < 1) requestAnimationFrame(step); else { f.remove(); resolve({ x: x1, y: y1, slot }); }
      })(t0);
    });
  }

  async function collect(id, g) {
    S.collected.add(id); S.order[id] = S.collected.size;
    const n = S.collected.size;
    plants[id].classList.add('done');
    Music.collect();
    const end = await flyToSlot(id, g.headX, g.headY);
    end.slot.innerHTML = Art.icon(id); end.slot.classList.add('filled');
    $('#countNum').textContent = n; bump($('#countNum'));
    FX.sparkles(end.x, end.y, 12, 90); FX.ring(end.x, end.y, '#e8578f', 46, .8, 3); FX.hearts(end.x, end.y + 10, 4, 60);
    setProgress(n);
    if (n < TOTAL) setHint(C.hints.more(TOTAL - n));
    if (n === 1) setTimeout(() => toast(C.firstSecretToast, 6000), 900);
  }

  /* ======================================================================
     The secret heart flower and the question
     ====================================================================== */
  async function unlockSecret() {
    setScreen('secret'); S.busy = true;
    toast(C.unlockToast, 6500);
    setHint(C.hints.secret);
    Music.unlock();
    const hp = plants.heart;
    hp.classList.add('sprout');
    const pos = headPos(hp);
    FX.sparkles(pos.x, pos.r.bottom - 20, 20, 160); FX.ring(pos.x, pos.r.bottom - 10, '#ffb2cd', 120, 1.4, 3);
    await wait(2300);
    hp.classList.add('open', 'done', 'grown');
    Music.chime(6);
    FX.bloom('heart', pos.x, pos.y);
    await wait(1400);
    hp.classList.add('ready'); hp.tabIndex = 0; hp.removeAttribute('aria-hidden');
    S.busy = false;
  }

  async function secretChallenge() {
    S.busy = true;
    const plant = plants.heart, Q = C.challenge;
    Music.pop();
    const g = await lift(plant);
    FX.hearts(g.headX, g.headY, 14, 200);
    const i = await showCard({
      kicker: Q.kicker, text: Q.question, icon: Art.icon('heart'),
      actions: Q.answers.map((a, k) => ({ label: a.label, value: k, cls: 'answer' + (k === Q.answers.length - 1 ? '' : ' ghost') }))
    });
    hideCard(); Music.collect();
    FX.hearts(g.headX, g.headY, 22, 260); FX.ring(g.headX, g.headY, '#ff6fa3', 200, 1.2, 4);
    await wait(750);
    await showCard({ kicker: Q.replyKicker, text: Q.answers[i].reply, icon: Art.icon('heart'), actions: [{ label: Q.next, value: 'go' }] });
    hideCard();
    await drop(plant);
    startFinale();
  }

  /* ======================================================================
     Finale
     ====================================================================== */
  const ENVELOPE = `<svg viewBox="0 0 220 150" aria-hidden="true" focusable="false">
    <rect x="6" y="30" width="208" height="114" rx="10" fill="#fff4ea" stroke="#efc3d3" stroke-width="2"/>
    <g class="env-paper"><rect x="22" y="40" width="176" height="92" rx="6" fill="#fff" stroke="#f1d3df"/><path d="M40 62h140M40 78h104M40 94h124" stroke="#f3c6d7" stroke-width="3.4" stroke-linecap="round"/></g>
    <path d="M6 40L110 112L214 40V136a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8Z" fill="#ffeef3" stroke="#efc3d3" stroke-width="2" stroke-linejoin="round"/>
    <g class="flap"><path d="M6 32Q6 30 14 30H206Q214 30 214 32L110 100Z" fill="#ffdfe9" stroke="#efc3d3" stroke-width="2" stroke-linejoin="round"/></g>
    <g class="seal"><circle cx="110" cy="92" r="17" fill="#d94a7b" stroke="#b83565" stroke-width="2"/><path d="${Art.heart(7.5)}" transform="translate(110 92)" fill="#ffd9e6"/></g>
  </svg>`;

  /* lay out the heart-shaped bouquet in unit coordinates */
  function bouquetLayout(bw) {
    const k = bw / 2.28;
    const toPx = (u, v) => [bw / 2 + u * k, (1.23 - v) * k];
    const inside = (u, v) => Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v <= 0;
    const lattice = step => {
      const pts = [];
      for (let r = 0, v = -.96; v < 1.24; r++, v += step * .866) {
        for (let u = -1.2 + (r % 2 ? step / 2 : 0); u < 1.2; u += step) if (inside(u / .93, (v - .05) / .93 + .05)) pts.push([u, v]);
      }
      return pts;
    };
    let step = .18, pts = lattice(step);
    while (pts.length > 66) pts = lattice((step += .01));
    const HEROES = [['peony', -.62, .62], ['rose', .62, .62], ['sunflower', 0, .36], ['tulip', -.55, -.05], ['hibiscus', .55, -.05], ['lavender', -.26, -.56], ['cherry', .26, -.56]];
    const used = new Set(), heroes = [];
    HEROES.forEach(([id, u, v]) => {
      let best = -1, bd = 9;
      pts.forEach((p, i) => { const d = Math.hypot(p[0] - u, p[1] - v); if (d < bd && !used.has(i)) { bd = d; best = i; } });
      used.add(best); heroes.push({ id, p: pts[best] });
    });
    const fillers = pts.filter((p, i) => !used.has(i) && heroes.every(h => Math.hypot(h.p[0] - p[0], h.p[1] - p[1]) > step * .95));
    return { k, step, toPx, fillers, heroes, tip: toPx(0, -1) };
  }

  function outline(n, push) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * TAU, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      let u = x / 16 * 1.14, v = (y + 17) / 29 * 2.23 - 1;
      const dx = u, dy = v - .1, d = Math.hypot(dx, dy) || 1;
      out.push({ u: u + dx / d * push, v: v + dy / d * push, ang: Math.atan2(-dy, dx) * 180 / Math.PI });
    }
    return out;
  }

  function finaleDOM() {
    const host = $('#finale');
    host.innerHTML = `<div class="fin-wrap" id="finWrap">
      <div class="bouquet hold" id="bouquet"></div>
      <button class="envelope" id="envelope" type="button" aria-label="${C.letter.open}">${ENVELOPE}<span class="env-label">${C.letter.open}</span></button>
      <div class="fin-end" id="finEnd" hidden></div></div>`;
    host.classList.add('on');
    $('#envelope').addEventListener('click', openEnvelope);
  }

  async function startFinale() {
    S.busy = true; setScreen('finale');
    document.body.classList.remove('spotlight');
    finaleDOM();
    const bq = $('#bouquet'), bw = bq.getBoundingClientRect().width, br = bq.getBoundingClientRect();
    const L = bouquetLayout(bw), cx = br.left + bw / 2, cy = br.top + bw * .5;

    /* 1. the flowers lift out of the garden */
    const ids = [...IDS, 'heart'];
    const flyers = ids.map((id, i) => {
      const pos = headPos(plants[id]);
      const f = document.createElement('div'); f.className = 'fly'; f.innerHTML = Art.icon(id);
      const size = pos.w * .8; f.style.width = f.style.height = size + 'px'; f.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      $('#finale').appendChild(f); plants[id].classList.add('gave');
      return { f, id, x0: pos.x, y0: pos.y, a: i / ids.length * TAU - Math.PI / 2 };
    });
    Music.swell();
    setHint('');

    /* 2. they gather, orbit and spiral into one point of light */
    const R = Math.min(innerWidth, innerHeight) * (innerWidth < 640 ? .3 : .27), T1 = 1.4, T2 = 2.8, t0 = performance.now();
    await new Promise(resolve => {
      (function step(now) {
        const t = (now - t0) / 1000;
        flyers.forEach(o => {
          let x, y, s, rot;
          if (t < T1) {
            const u = easeInOut(t / T1), rx = cx + Math.cos(o.a) * R, ry = cy + Math.sin(o.a) * R;
            x = o.x0 + (rx - o.x0) * u; y = o.y0 + (ry - o.y0) * u - Math.sin(u * Math.PI) * 70; s = 1 + .25 * u; rot = u * 120;
          } else {
            const u = Math.min(1, (t - T1) / T2), e = u * u * (3 - 2 * u), ang = o.a + e * TAU * 1.75, rad = R * (1 - Math.pow(u, 3) * .94);
            x = cx + Math.cos(ang) * rad; y = cy + Math.sin(ang) * rad; s = 1.25 - .65 * u; rot = 120 + e * 540;
          }
          o.f.style.transform = `translate(${x}px,${y}px) scale(${s}) rotate(${rot}deg)`;
          if (Math.random() < .3) FX.trail(x, y);
        });
        if (t < T1 + T2) requestAnimationFrame(step); else resolve();
      })(t0);
    });
    flyers.forEach(o => o.f.remove());
    FX.flash(cx, cy, '#ffffff', Math.max(innerWidth, innerHeight) * .7, 1.6, 0, .95); FX.ring(cx, cy, '#ff8fb9', 260, 1.4, 5); FX.ring(cx, cy, '#cdb8f0', 380, 1.8, 3, .15); FX.swirl(cx, cy, 34);

    /* 3. the heart-shaped bouquet blooms outward from that point */
    await assemble(bq, bw, L, cx - br.left, cy - br.top);
    await wait(900);
    $('#envelope').classList.add('show');
    S.busy = false;
  }

  function item(cls, x, y, w, h, html, rot) {
    const d = document.createElement('div'); d.className = 'bq-item ' + cls;
    d.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;--rot:${rot.toFixed(1)}deg;opacity:0`;
    d.innerHTML = html; d._x = x; d._y = y; d._rot = rot; return d;
  }

  async function assemble(bq, bw, L, ox, oy) {
    const hs = L.step * L.k * 1.5, [tx, ty] = L.tip;
    const aura = document.createElement('div'); aura.className = 'bq-aura'; aura.innerHTML = Art.icon('heart'); aura.style.top = (bw * .5 - bw * .575) + 'px'; bq.appendChild(aura);
    const stems = document.createElement('div');
    stems.innerHTML = `<svg class="bq-stems" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">${[[33], [41], [48], [53], [60], [68]].map(([x]) => `<path pathLength="100" d="M50 0C50 12 ${x + (50 - x) * .4} 20 ${x} 40"/>`).join('')}</svg>`;
    const st = stems.firstChild; st.style.top = (ty - bw * .04) + 'px'; st.style.height = (bw * .3) + 'px'; bq.appendChild(st);
    const bow = document.createElement('div'); bow.className = 'bq-bow'; bow.innerHTML = Art.bow(); bow.style.top = (ty - bw * .01) + 'px'; bow.style.translate = '-50% -30%'; bq.appendChild(bow);

    const items = [];
    outline(30, .17).forEach((o, i) => {
      const [x, y] = L.toPx(o.u, o.v);
      items.push(item('bq-leaf', x, y, hs * .62, hs * 1.05, Art.sprigLeaf(0, 40), o.ang + 90 + rnd(-14, 14)));
    });
    outline(44, .2).forEach(o => { const [x, y] = L.toPx(o.u + rnd(-.04, .04), o.v + rnd(-.04, .04)), z = rnd(5, 9); items.push(item('bq-dot', x, y, z, z, '', 0)); });
    const types = shuffle(Array.from({ length: L.fillers.length }, (_, i) => IDS[i % IDS.length]));
    L.fillers.forEach((p, i) => {
      const [x, y] = L.toPx(p[0] + rnd(-.015, .015), p[1] + rnd(-.015, .015)), s = hs * rnd(.88, 1.1);
      items.push(item('bq-head', x, y, s, s, Art.icon(types[i]), rnd(-35, 35)));
    });
    for (let i = 0; i < 16; i++) { const p = L.fillers[(Math.random() * L.fillers.length) | 0]; const [x, y] = L.toPx(p[0] + .08, p[1] + .05), z = rnd(5, 8); items.push(item('bq-dot', x, y, z, z, '', 0)); }
    L.heroes.forEach(h => { const [x, y] = L.toPx(h.p[0], h.p[1]), s = hs * 1.7; items.push(item('bq-head hero', x, y, s, s, Art.icon(h.id), rnd(-14, 14))); });

    bq.append(...items);
    bq.classList.add('lit');
    Music.chime(5);
    const maxD = Math.max(...items.map(it => Math.hypot(it._x - ox, it._y - oy)));
    items.forEach((it, i) => {
      const dx = ox - it._x, dy = oy - it._y, d = Math.hypot(dx, dy), r = it._rot, hero = it.classList.contains('hero');
      it.animate([
        { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(.1) rotate(${r - 220}deg)`, opacity: 0 },
        { transform: `translate(-50%,-50%) scale(1.14) rotate(${r + 8}deg)`, opacity: 1, offset: .74 },
        { transform: `translate(-50%,-50%) rotate(${r}deg)`, opacity: 1 }
      ], { duration: 1150, delay: 120 + (d / maxD) * 1500 + (hero ? 450 : 0) + rnd(0, 120), easing: 'cubic-bezier(.22,.9,.3,1)', fill: 'both' });
    });
    await wait(2000);
    FX.hearts(midX(bq), midY(bq), 22, 300); FX.sparkles(midX(bq), midY(bq), 24, 260);
    bq.classList.add('stemmed');
    await wait(1700);
    bq.classList.remove('hold');
  }
  const midX = n => { const r = n.getBoundingClientRect(); return r.left + r.width / 2; };
  const midY = n => { const r = n.getBoundingClientRect(); return r.top + r.height * .45; };

  async function openEnvelope() {
    const env = $('#envelope');
    if (env.classList.contains('open') || S.busy) return;
    S.busy = true; env.classList.add('open'); Music.collect();
    const r = env.getBoundingClientRect(); FX.sparkles(r.left + r.width / 2, r.top + r.height * .4, 16, 160); FX.hearts(r.left + r.width / 2, r.top + r.height * .4, 8, 120);
    await wait(1100);
    openLetter(false);
    await wait(900);
    env.classList.remove('open', 'show'); env.style.display = 'none';
    S.busy = false;
  }

  /* ======================================================================
     The letter
     ====================================================================== */
  let letterTimer = null, letterAuto = true;
  function openLetter(all) {
    const Lt = C.letter, paper = $('.paper'), scroll = $('#paperScroll'), nextWrap = $('.l-next'), next = $('#letterNext'), skip = $('#letterSkip');
    paper.classList.toggle('all-shown', !!all);
    $('#corner1').innerHTML = Art.icon('rose'); $('#corner2').innerHTML = Art.icon('cherry');
    next.textContent = S.endShown ? Lt.back : Lt.next;
    skip.textContent = Lt.skip; skip.classList.toggle('hide', !!all);
    nextWrap.classList.toggle('show', !!all);

    /* write every block, with a start time so the words appear like handwriting */
    const blocks = []; let t = .9;
    const write = (node, text, gap, pause) => {
      const n = words(node, text, { start: t, gap }); const dur = n * gap;
      blocks.push({ node, start: t, end: t + dur }); t += dur + pause;
    };
    write($('#lGreeting'), Lt.greeting, .16, .5);
    const body = $('#lBody'); body.innerHTML = '';
    Lt.paragraphs.forEach(p => { const e = document.createElement('p'); body.appendChild(e); write(e, p, .14, .6); });
    write($('#lClosing'), Lt.closing, .16, .2);
    write($('#lSign'), Lt.signature, .3, .4);
    scroll.scrollTop = 0;

    $('#letter').classList.add('show'); $('#letter').setAttribute('aria-hidden', 'false');
    Music.swell();
    letterAuto = !all;
    const stop = () => { letterAuto = false; };
    ['touchstart', 'wheel', 'pointerdown', 'keydown'].forEach(ev => scroll.addEventListener(ev, stop, { passive: true, once: true }));

    const t0 = performance.now(); let shown = false;
    clearInterval(letterTimer);
    const reveal = () => { nextWrap.classList.add('show'); skip.classList.add('hide'); shown = true; };
    letterTimer = setInterval(() => {
      const e = (performance.now() - t0) / 1000;
      if (!shown && e > t + 1.2) { reveal(); if (letterAuto) scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' }); }
      if (!letterAuto || shown) return;
      const cur = blocks.filter(b => b.start <= e).pop();
      if (!cur) return;
      const sr = scroll.getBoundingClientRect(), br = cur.node.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (e - cur.start) / (cur.end - cur.start || 1)));
      const target = br.top - sr.top + scroll.scrollTop + br.height * prog;
      if (target > scroll.scrollTop + scroll.clientHeight * .72) scroll.scrollTo({ top: target - scroll.clientHeight * .5, behavior: 'smooth' });
    }, 350);

    skip.onclick = () => { paper.classList.add('all-shown'); letterAuto = false; reveal(); };
    next.onclick = () => { Music.pop(); closeLetter(); if (!S.endShown) showEnding(); };
  }

  function closeLetter(silent) {
    clearInterval(letterTimer);
    $('#letter').classList.remove('show'); $('#letter').setAttribute('aria-hidden', 'true');
  }

  /* ======================================================================
     "The garden will always bloom for you"
     ====================================================================== */
  async function showEnding() {
    S.endShown = true; S.busy = true;
    await wait(900);
    const F = C.finale, end = $('#finEnd'), bq = $('#bouquet');
    const allFound = S.found.size === C.whispers.length;
    end.innerHTML = `<p class="fin-line" id="finL1"></p><p class="fin-line" id="finL2"></p>
      <div class="fin-btns"><button class="btn ghost" id="rereadBtn" type="button">${F.reread}</button><button class="btn" id="replayBtn" type="button">${F.replay}</button></div>
      ${allFound ? '<p class="fin-small">You even found all my little secrets. 💗</p>' : ''}
      <p class="fin-signoff">${C.welcome.footer}</p>`;
    end.hidden = false;
    const n1 = words($('#finL1'), F.line1, { start: .2, gap: .2 });
    words($('#finL2'), F.line2, { start: .2 + n1 * .2 + .15, gap: .2 });
    const total = .2 + (n1 + F.line2.split(' ').length) * .2 + .4;
    $$('.fin-btns .btn, .fin-small, .fin-signoff').forEach((n, i) => { n.style.animation = `fadeUp 1.2s ease ${(total + 1 + i * .25).toFixed(2)}s backwards`; });
    $('#rereadBtn').onclick = () => openLetter(true);
    $('#replayBtn').onclick = replay;
    $('#finWrap').scrollTo({ top: 0 });

    Music.swell();
    const bc = bq.getBoundingClientRect();
    FX.hearts(bc.left + bc.width / 2, bc.top + bc.height * .4, 30, 320); FX.sparkles(bc.left + bc.width / 2, bc.top + bc.height * .4, 30, 300);
    FX.petalRain('cherry', 22, 7);
    setTimeout(() => FX.petalRain('rose', 14, 3), 9000);
    Object.values(plants).forEach((p, i) => { if (p.dataset.id === 'heart') return; p.style.setProperty('--gd', (.2 + i * .22) + 's'); p.classList.remove('gave', 'grown'); });
    S.busy = false;
  }
  const $$ = (s, e = document) => [...e.querySelectorAll(s)];

  /* ======================================================================
     Replay
     ====================================================================== */
  async function replay() {
    if (S.busy) return;
    S.busy = true;
    el.veil.classList.add('on'); await wait(950);
    FX.clear(); closeLetter();
    $('#finale').classList.remove('on'); $('#finale').innerHTML = '';
    el.scrim.classList.remove('on'); hideCard(); $$('.toast').forEach(t => t.remove());
    document.body.classList.remove('planted', 'spotlight');
    document.documentElement.style.setProperty('--p', 0); FX.setDusk(0);
    S.collected.clear(); S.order = {}; S.found.clear(); S.endShown = false;
    $$('.sun, .cloud').forEach(n => n.classList.remove('found'));
    buildGarden();
    $('#welcome').classList.remove('leaving');
    setHint(''); setScreen('welcome');
    await nextFrame(); await wait(150);
    el.veil.classList.remove('on');
    S.busy = false;
  }

  /* ======================================================================
     Music button, taps and start-up
     ====================================================================== */
  function syncMute() {
    const b = el.mute; b.classList.add('used');
    b.setAttribute('aria-pressed', String(!Music.on));
    b.setAttribute('aria-label', Music.on ? 'Mute the music' : 'Turn the music on');
  }

  function init() {
    Object.assign(el, { hint: $('#hint'), card: $('#card'), scrim: $('#scrim'), toast: $('#toast'), mute: $('#muteBtn'), chip: $('#whisperChip') });
    el.veil = document.createElement('div'); el.veil.id = 'veil'; document.body.appendChild(el.veil);

    setScreen('welcome');
    Art.mount($('#defs'));
    FX.init($('#fx-bg'), $('#fx-fg'));
    buildBackdrop(); buildWelcome(); buildGarden();

    $('#enterBtn').addEventListener('click', enterGarden);
    el.mute.addEventListener('click', () => { Music.toggle(); syncMute(); });
    syncMute();

    /* a little burst of hearts wherever she taps the garden */
    let lastTap = 0;
    document.addEventListener('pointerdown', e => {
      if (e.target.closest('button, .plant, .card, #letter, .hit, a')) return;
      const now = performance.now(); if (now - lastTap < 160) return; lastTap = now;
      FX.tap(e.clientX, e.clientY);
    });

    /* occasionally a heart floats up from a collected flower */
    setInterval(() => {
      if (document.hidden || (S.screen !== 'garden' && S.screen !== 'secret') || S.busy) return;
      const done = IDS.filter(id => S.collected.has(id)); if (!done.length) return;
      const p = headPos(plants[done[(Math.random() * done.length) | 0]]);
      FX.hearts(p.x, p.y - 20, 1, 20);
    }, 2400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
