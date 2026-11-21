/* art.js
   Every flower, leaf, ribbon and little creature in the garden is drawn with code,
   so there are no image files to load or lose.

   Each flower "head" builder returns SVG markup centred on (0,0).
     S = true   static, fully open markup (used for the bouquet and the counter icons)
     S = false  animated markup: petals carry CSS variables (--ro, --rc, --sx ...) and the
                stylesheet turns them from bud to bloom when the plant gets the .open class. */
const Art = (() => {
  /* template tag that rounds every interpolated number to 1 decimal place */
  const D = (s, ...v) => s.reduce((a, str, i) => a + str + (i < v.length ? (+v[i]).toFixed(1) : ''), '');
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- petal outlines: base at the origin, tip pointing up (-y) ---------- */
  const shapes = {
    leaf:  (L, W) => D`M0 0C${-W} ${-L * .3} ${-W * .8} ${-L * .9} 0 ${-L}C${W * .8} ${-L * .9} ${W} ${-L * .3} 0 0Z`,
    round: (L, W) => D`M0 0C${-W} ${-L * .12} ${-W * 1.1} ${-L * .95} 0 ${-L}C${W * 1.1} ${-L * .95} ${W} ${-L * .12} 0 0Z`,
    notch: (L, W) => D`M0 0C${-W * .9} ${-L * .25} ${-W * 1.1} ${-L * .85} ${-W * .28} ${-L}Q0 ${-L * .84} ${W * .28} ${-L}C${W * 1.1} ${-L * .85} ${W * .9} ${-L * .25} 0 0Z`,
    cup:   (L, W) => D`M0 0C${-W} ${-L * .1} ${-W * 1.05} ${-L * .7} ${-W * .35} ${-L * .98}Q0 ${-L * 1.1} ${W * .35} ${-L * .98}C${W * 1.05} ${-L * .7} ${W} ${-L * .1} 0 0Z`,
    ruffle:(L, W) => D`M0 0C${-W} ${-L * .12} ${-W * 1.12} ${-L * .8} ${-W * .55} ${-L * .97}Q${-W * .3} ${-L * 1.08} ${-W * .05} ${-L * .98}Q${W * .2} ${-L * 1.09} ${W * .5} ${-L * .97}C${W * 1.12} ${-L * .8} ${W} ${-L * .12} 0 0Z`,
    fan:   (L, W) => D`M0 0C${-W * .5} ${-L * .12} ${-W * 1.15} ${-L * .5} ${-W * .95} ${-L * .8}Q${-W * .6} ${-L * 1.05} ${-W * .15} ${-L * .97}Q${W * .05} ${-L * 1.07} ${W * .3} ${-L * .98}Q${W * .85} ${-L} ${W * .98} ${-L * .78}C${W * 1.15} ${-L * .5} ${W * .5} ${-L * .12} 0 0Z`
  };
  /* a heart, tip at the bottom, roughly S*1.7 wide and tall */
  const heart = S => D`M0 ${.9 * S}C${-.9 * S} ${.25 * S} ${-1.1 * S} ${-.55 * S} ${-.55 * S} ${-.7 * S}C${-.25 * S} ${-.8 * S} 0 ${-.55 * S} 0 ${-.3 * S}C0 ${-.55 * S} ${.25 * S} ${-.8 * S} ${.55 * S} ${-.7 * S}C${1.1 * S} ${-.55 * S} ${.9 * S} ${.25 * S} 0 ${.9 * S}Z`;

  /* ---------- gradients ---------- */
  const lg = (id, stops, vertical = true) =>
    `<linearGradient id="${id}" x1="0" y1="${vertical ? 1 : 0}" x2="${vertical ? 0 : 1}" y2="0">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>';
  const rg = (id, stops, extra = '') =>
    `<radialGradient id="${id}" ${extra}>` + stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</radialGradient>';

  const defs = () => '<defs>' + [
    lg('g-leaf', [[0, '#67b585'], [1, '#a6dcb7']], false),
    lg('g-stem', [[0, '#5fa87c'], [1, '#8fcfa5']]),
    lg('g-wood', [[0, '#b58a86'], [1, '#d3aaa3']]),
    lg('g-rose-a', [[0, '#c0295b'], [.55, '#ec5a87'], [1, '#ffa3bd']]),
    lg('g-rose-b', [[0, '#b01f52'], [.6, '#e24a7b'], [1, '#ff8fb0']]),
    lg('g-rose-c', [[0, '#8f1745'], [1, '#d6406f']]),
    lg('g-tulip', [[0, '#ff4f8b'], [.6, '#ff7fae'], [1, '#ffc2d8']]),
    lg('g-tulip-d', [[0, '#d63573'], [1, '#ff6b9f']]),
    lg('g-tulip-f', [[0, '#ff6b9f'], [.55, '#ff9cc2'], [1, '#ffe0ec']]),
    lg('g-cherry', [[0, '#ff94bb'], [.55, '#ffd0e1'], [1, '#fff5f9']]),
    lg('g-sun-a', [[0, '#ffae00'], [1, '#ffe680']]),
    lg('g-sun-b', [[0, '#f59300'], [1, '#ffd23f']]),
    rg('g-disc', [[0, '#2f190e'], [.7, '#5a3320'], [1, '#8a5b34']]),
    lg('g-hib', [[0, '#c4175c'], [.45, '#ff4d92'], [1, '#ffaccb']]),
    lg('g-peony-1', [[0, '#ff9dc3'], [1, '#ffe6ef']]),
    lg('g-peony-2', [[0, '#f776a7'], [1, '#ffc6dc']]),
    lg('g-peony-3', [[0, '#ec5b93'], [1, '#ffa6c6']]),
    lg('g-peony-4', [[0, '#dc4584'], [1, '#ff8dba']]),
    lg('g-heart', [[0, '#ff3f84'], [.6, '#ff72a4'], [1, '#ffb2cd']]),
    lg('g-heart-b', [[0, '#ff6ea1'], [1, '#ffc1d6']]),
    lg('g-ribbon', [[0, '#ff6fa3'], [1, '#ffc0d6']], false),
    lg('g-lilac', [[0, '#a78bdf'], [1, '#d9caf6']]),
    rg('g-glow', [[0, 'rgba(255,255,255,.95)'], [.4, 'rgba(255,210,232,.55)'], [1, 'rgba(255,210,232,0)']]),
    rg('g-glow-gold', [[0, 'rgba(255,248,210,.95)'], [.45, 'rgba(255,224,140,.5)'], [1, 'rgba(255,224,140,0)']]),
    rg('g-shadow', [[0, 'rgba(70,120,90,.38)'], [1, 'rgba(70,120,90,0)']])
  ].join('') + '</defs>';

  /* ---------- building blocks ---------- */
  /* wrap markup in a group that animates from "bud" to "open" */
  const grp = (S, inner, o = {}) => {
    const ro = o.ro || 0, sx = o.sx ?? 1, sy = o.sy ?? 1;
    if (S) return `<g transform="rotate(${ro.toFixed(1)}) scale(${sx} ${sy})">${inner}</g>`;
    const rc = o.rc ?? ro * .25, cx = o.cx ?? .3, cy = o.cy ?? .35, d = o.d || 0;
    return `<g class="p" style="--ro:${ro.toFixed(1)}deg;--rc:${rc.toFixed(1)}deg;--sx:${sx};--sy:${sy};--cx:${cx};--cy:${cy};--d:${d.toFixed(2)}s">${inner}</g>`;
  };
  const pet = (S, d, fill, o = {}) =>
    grp(S, `<path d="${d}" fill="${fill}" stroke="${o.stroke || 'rgba(150,40,90,.24)'}" stroke-width="${o.sw || .8}" stroke-linejoin="round"/>`, o);

  const mixHex = (a, b, t) => {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };

  const leaf = (x, y, rot, L, W) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="${shapes.leaf(L, W)}" fill="url(#g-leaf)" stroke="rgba(60,120,80,.22)" stroke-width=".8"/>` +
    `<path d="M0 0L0 ${(-L * .82).toFixed(1)}" stroke="rgba(255,255,255,.5)" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>`;
  const stem = (d, w = 6, grad = 'g-stem') =>
    `<path d="${d}" fill="none" stroke="url(#${grad})" stroke-width="${w}" stroke-linecap="round"/>`;
  const grass = () => [-14, -6, 0, 7, 15].map((dx, i) => leaf(100 + dx, 326, dx * 2.2, 24 + (i % 2) * 10, 4)).join('');

  /* ---------- the flower heads ---------- */
  const heads = {
    rose(S) {
      let s = '<ellipse cx="0" cy="12" rx="21" ry="15" fill="#8fc9a1"/>';
      for (let i = 0; i < 5; i++) s += pet(S, shapes.round(54, 32), 'url(#g-rose-a)', { ro: i * 72, rc: i * 72 - 70, cx: .5, cy: .55, d: i * .05, stroke: 'rgba(140,20,60,.35)' });
      for (let i = 0; i < 5; i++) s += pet(S, shapes.round(44, 28), 'url(#g-rose-b)', { ro: 36 + i * 72, rc: 36 + i * 72 + 60, cx: .5, cy: .55, d: .2 + i * .05, stroke: 'rgba(140,20,60,.35)' });
      for (let i = 0; i < 4; i++) s += pet(S, shapes.round(33, 22), 'url(#g-rose-c)', { ro: 18 + i * 90, rc: 18 + i * 90 - 50, cx: .45, cy: .5, d: .4 + i * .05, stroke: 'rgba(100,10,40,.4)' });
      s += grp(S, '<path d="M-9 0a9 9 0 1 1 18 0a5.5 5.5 0 1 1 -11 0a3 3 0 1 1 6 0" fill="none" stroke="#a31c4c" stroke-width="2.2" stroke-linecap="round"/>', { ro: 0, rc: -120, cx: .1, cy: .1, d: .65 });
      return s;
    },

    tulip(S) {
      const cup = (ro, rc, fill, L, W, o) => pet(S, shapes.cup(L, W), fill, Object.assign({ ro, rc, stroke: 'rgba(170,30,90,.3)' }, o));
      return '<g transform="translate(0 36)">' +
        cup(0, 0, 'url(#g-tulip-d)', 84, 33, { sx: .8, sy: .98, cx: .7, cy: .9, d: .1 }) +
        cup(-25, -3, 'url(#g-tulip)', 88, 36, { cx: .62, cy: .92, d: 0 }) +
        cup(25, 3, 'url(#g-tulip)', 88, 36, { cx: .62, cy: .92, d: 0 }) +
        cup(0, 0, 'url(#g-tulip-f)', 82, 31, { sx: .96, cx: .82, cy: .97, d: .14 }) +
        '</g>';
    },

    /* solo = just the main blossom (used in the bouquet) */
    cherry(S, solo) {
      const blossom = (x, y, sc, rot, d0) => {
        let b = `<g transform="translate(${x} ${y}) scale(${sc}) rotate(${rot})">`;
        for (let i = 0; i < 5; i++) b += pet(S, shapes.notch(35, 24), 'url(#g-cherry)', { ro: i * 72, rc: i * 72 + 25, cx: .5, cy: .5, d: d0 + i * .08, stroke: 'rgba(235,100,150,.5)' });
        for (let j = 0; j < 8; j++) {
          b += grp(S, '<path d="M0 0L0 -11M-2 -12.6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="#ffd66b" stroke="#e45a8a" stroke-width="1" stroke-linecap="round"/>', { ro: j * 45, rc: j * 45, cx: .2, cy: .2, d: d0 + .35 });
        }
        return b + '</g>';
      };
      let s = blossom(0, 0, 1, 0, 0);
      if (!solo) s += blossom(-56, 38, .62, 18, .25) + blossom(50, 56, .55, -12, .4);
      return s;
    },

    sunflower(S) {
      let s = '';
      for (let i = 0; i < 20; i++) s += pet(S, shapes.leaf(64, 12), 'url(#g-sun-b)', { ro: i * 18 + 9, rc: i * 18 + 9 - 95, cx: .42, cy: .5, d: i * .035, stroke: 'rgba(190,100,0,.3)' });
      for (let i = 0; i < 20; i++) s += pet(S, shapes.leaf(57, 13), 'url(#g-sun-a)', { ro: i * 18, rc: i * 18 - 95, cx: .42, cy: .5, d: .1 + i * .035, stroke: 'rgba(190,100,0,.3)' });
      let dark = '', light = '';
      for (let i = 0; i < 92; i++) {
        const r = 2.55 * Math.sqrt(i + 1), a = i * 2.39996, x = r * Math.cos(a), y = r * Math.sin(a), rad = 1.55 + (i % 3 === 0 ? .45 : 0);
        const dot = D`M${x - rad} ${y}a${rad} ${rad} 0 1 0 ${2 * rad} 0a${rad} ${rad} 0 1 0 ${-2 * rad} 0`;
        if (i % 2) light += dot; else dark += dot;
      }
      s += grp(S, `<circle r="27" fill="url(#g-disc)" stroke="#c98a2b" stroke-width="3"/><path d="${dark}" fill="#24120a"/><path d="${light}" fill="#a97543"/>`, { ro: 0, rc: -90, cx: .55, cy: .55, d: .3 });
      return s;
    },

    /* lavender is one plant, so its "head" runs all the way down to the ground (y = 222) */
    lavender(S, sprig) {
      let s = '';
      if (!sprig) for (let i = 0; i < 6; i++) s += leaf(0 + (i - 2.5) * 5, 222, (i - 2.5) * 15, 74 + (i % 2) * 14, 5);
      const spikes = sprig
        ? [{ x1: 0, y1: -62, cx: 0, cy: 0, from: 62, n: 10 }]
        : [{ x1: 0, y1: -34, cx: 6, cy: 90, from: 222, n: 11 }, { x1: -40, y1: -14, cx: -26, cy: 100, from: 222, n: 10 }, { x1: 40, y1: -14, cx: 26, cy: 100, from: 222, n: 10 }];
      spikes.forEach((sp, k) => {
        const P = t => [(1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * sp.cx + t * t * sp.x1, (1 - t) * (1 - t) * sp.from + 2 * (1 - t) * t * sp.cy + t * t * sp.y1];
        s += stem(`M0 ${sp.from}Q${sp.cx} ${sp.cy} ${sp.x1} ${sp.y1}`, sprig ? 3 : 3.6);
        for (let i = 0; i < sp.n; i++) {
          const t = .42 + .58 * (i / (sp.n - 1)), [x, y] = P(t), [x2, y2] = P(Math.min(1, t + .02));
          const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 90, taper = (1 - .45 * (i / (sp.n - 1))) * (sprig ? 1.55 : 1);
          const col = mixHex('#8a64d0', '#d3c0f6', i / (sp.n - 1));
          [-1, 1].forEach(side => {
            s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang + side * 30).toFixed(1)})">` +
              grp(S, `<ellipse cx="0" cy="${(-9 * taper).toFixed(1)}" rx="${(5.6 * taper).toFixed(1)}" ry="${(9.5 * taper).toFixed(1)}" fill="${col}" stroke="rgba(90,50,150,.22)" stroke-width=".7"/>`,
                { ro: 0, rc: 0, cx: .5, cy: .5, d: .08 * i + k * .1 }) + '</g>';
          });
          if (i === sp.n - 1) s += `<ellipse cx="${x.toFixed(1)}" cy="${(y - 8 * taper).toFixed(1)}" rx="4" ry="7" fill="${col}"/>`;
        }
      });
      return s;
    },

    hibiscus(S) {
      let s = '';
      for (let i = 0; i < 5; i++) s += pet(S, shapes.fan(66, 40), 'url(#g-hib)', { ro: i * 72, rc: i * 72 * .3 - 20, cx: .3, cy: .75, d: i * .07, stroke: 'rgba(160,20,80,.3)' });
      for (let i = 0; i < 5; i++) s += pet(S, shapes.leaf(33, 8.5), '#a41155', { ro: i * 72 + 8, rc: i * 72 * .3, cx: .2, cy: .3, d: .3 + i * .03, stroke: 'none' });
      s += '<circle r="6" fill="#7a0d3d"/>';
      let pol = '';
      for (let k = 0; k < 7; k++) pol += `<circle cx="${(22 + Math.cos(k * 1.1) * 5).toFixed(1)}" cy="${(-35 + Math.sin(k * 2.1) * 5).toFixed(1)}" r="2.3" fill="#ffd34f"/>`;
      s += grp(S, `<path d="M0 0Q9 -20 24 -34" fill="none" stroke="#ff8aa8" stroke-width="3.4" stroke-linecap="round"/>${pol}<circle cx="27" cy="-38" r="3.4" fill="#d6245f"/>`, { ro: 0, rc: 0, cx: .05, cy: .05, d: .62 });
      return s;
    },

    peony(S) {
      let s = '<ellipse cx="0" cy="12" rx="22" ry="15" fill="#8fc9a1"/>';
      const rings = [[7, 56, 36, 'g-peony-1', 0, .3], [7, 47, 33, 'g-peony-2', 25.7, .2], [6, 37, 28, 'g-peony-3', 0, .1], [5, 27, 21, 'g-peony-4', 36, 0]];
      rings.forEach(([n, L, W, g, off, d0]) => {
        for (let i = 0; i < n; i++) s += pet(S, shapes.ruffle(L, W), `url(#${g})`, { ro: off + i * 360 / n, rc: off + i * 360 / n * .3, cx: .55, cy: .58, d: d0 + i * .03, stroke: 'rgba(200,60,120,.28)' });
      });
      let st = '';
      for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 3 + (k % 3) * 2.4; st += `<circle cx="${(Math.cos(a) * r).toFixed(1)}" cy="${(Math.sin(a) * r).toFixed(1)}" r="1.7" fill="#ffd45a"/>`; }
      s += grp(S, st, { ro: 0, rc: 0, cx: .1, cy: .1, d: .5 });
      return s;
    },

    heart(S) {
      let s = '';
      for (let i = 0; i < 8; i++) s += grp(S, `<path d="${heart(15)}" transform="translate(0 -64)" fill="url(#g-heart-b)" stroke="rgba(220,60,120,.35)" stroke-width="1"/>`, { ro: i * 45, rc: i * 45, cx: .2, cy: .2, d: .15 + i * .04 });
      s += grp(S, `<path d="${heart(50)}" fill="url(#g-heart)" stroke="rgba(220,60,120,.4)" stroke-width="1.5"/>` +
        '<path d="M-27 -22C-27 -33 -17 -38 -10 -33" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="-17" cy="-12" r="2.6" fill="rgba(255,255,255,.8)"/>', { ro: 0, rc: 0, cx: .1, cy: .1, d: 0 });
      return s;
    }
  };

  /* ---------- whole plants: shadow, stem, leaves and head ---------- */
  const under = {
    rose:  () => stem('M100 112C95 175 106 250 100 324') + leaf(100, 262, -58, 52, 15) + leaf(100, 222, 56, 46, 13) + leaf(100, 296, 62, 40, 12),
    tulip: () => stem('M100 130C104 190 96 255 100 324') + leaf(100, 324, -16, 150, 24) + leaf(100, 324, 18, 130, 22) + leaf(100, 324, 4, 110, 18),
    cherry: () => stem('M100 324C98 250 103 170 100 106', 5, 'g-wood') + stem('M100 214Q80 176 44 138', 3.6, 'g-wood') + stem('M100 244Q127 205 150 156', 3.6, 'g-wood') +
      leaf(100, 280, -64, 34, 10) + leaf(100, 262, 60, 32, 9) + leaf(78, 190, -90, 24, 8) + leaf(124, 218, 75, 24, 8),
    sunflower: () => stem('M100 120C96 190 105 255 100 324', 9) + leaf(100, 270, -70, 66, 25) + leaf(100, 232, 66, 60, 23) + leaf(100, 300, 40, 48, 18),
    lavender: () => '',
    hibiscus: () => stem('M100 118C106 185 95 255 100 324') + leaf(100, 266, -60, 58, 20) + leaf(100, 226, 58, 52, 18) + leaf(100, 300, 64, 42, 15),
    peony: () => stem('M100 114C95 180 105 252 100 324') + leaf(100, 268, -62, 60, 20) + leaf(100, 230, 60, 54, 19) + leaf(100, 304, 52, 40, 14),
    heart: () => stem('M100 112C95 180 106 250 100 324', 6.5) + leaf(100, 262, -58, 56, 17) + leaf(100, 224, 58, 50, 15)
  };

  const plant = id => {
    const lav = id === 'lavender';
    return `<svg class="plant-svg" viewBox="0 0 200 330" aria-hidden="true" focusable="false">` +
      '<g class="ground"><ellipse cx="100" cy="326" rx="44" ry="7" fill="url(#g-shadow)"/>' + grass() + '</g>' + under[id]() +
      `<g class="head" transform="translate(100 100)"><circle class="glow" r="78" fill="url(#g-glow)"/><circle class="hint" r="22" fill="none" stroke="#fff" stroke-width="2.5"/>` +
      `<g class="${lav ? 'still' : 'bob'}">${heads[id](false)}</g></g></svg>`;
  };

  /* ---------- reusable symbols for icons and the bouquet ---------- */
  const symbols = () => ['rose', 'tulip', 'cherry', 'sunflower', 'lavender', 'hibiscus', 'peony', 'heart'].map(id => {
    const inner = id === 'cherry' ? heads.cherry(true, true) : id === 'lavender' ? heads.lavender(true, true) : heads[id](true);
    return `<symbol id="h-${id}" viewBox="-80 -80 160 160" overflow="visible">${inner}</symbol>`;
  }).join('');
  const icon = (id, cls = '') =>
    `<svg class="${cls}" viewBox="-80 -80 160 160" aria-hidden="true" focusable="false"><use href="#h-${id}" x="-80" y="-80" width="160" height="160"/></svg>`;

  /* ---------- extras ---------- */
  /* a leaf for bouquet greenery */
  const sprigLeaf = (rot, L = 40) => `<svg viewBox="-20 -60 40 70" overflow="visible"><g transform="rotate(${rot})"><path d="${shapes.leaf(L, 11)}" fill="url(#g-leaf)" stroke="rgba(60,120,80,.25)" stroke-width=".8"/></g></svg>`;

  /* a cherry branch for the welcome screen (viewBox 0 0 300 300) */
  const branch = () => {
    const spots = [[250, 104, .5, 10], [214, 88, .46, -20], [178, 70, .55, 35], [146, 58, .42, 0], [112, 52, .5, -30], [74, 40, .6, 15], [44, 26, .44, 0], [196, 120, .38, 50], [128, 96, .4, -45], [88, 82, .36, 20], [236, 150, .42, 0], [56, 70, .3, -10]];
    return `<svg class="branch-svg" viewBox="0 0 300 300" aria-hidden="true" focusable="false">` +
      stem('M300 86C262 100 232 74 188 74S110 54 76 44S30 26 0 20', 6, 'g-wood') +
      stem('M232 92C238 112 238 132 232 150', 3, 'g-wood') + stem('M180 74C196 90 198 108 196 120', 3, 'g-wood') + stem('M120 62C128 76 130 88 128 96', 3, 'g-wood') +
      spots.map(([x, y, s, r]) => `<g class="bl" style="animation-delay:${(-(x * 7 + y * 3) % 5).toFixed(1)}s"><use href="#h-cherry" x="${x - 80 * s * 1}" y="${y - 80 * s * 1}" width="${160 * s}" height="${160 * s}" transform="rotate(${r} ${x} ${y})"/></g>`).join('') +
      '</svg>';
  };

  /* the satin bow tied around the bouquet (viewBox 0 0 200 120) */
  const bow = () => `<svg class="bow-svg" viewBox="0 0 200 130" aria-hidden="true" focusable="false">
    <path d="M100 56C90 80 70 112 44 124C60 96 70 78 80 62Z" fill="url(#g-ribbon)" stroke="rgba(210,70,130,.4)" stroke-width="1"/>
    <path d="M100 56C110 80 130 112 156 124C140 96 130 78 120 62Z" fill="url(#g-ribbon)" stroke="rgba(210,70,130,.4)" stroke-width="1"/>
    <path d="M100 52C78 14 22 2 12 30C4 52 52 72 100 52Z" fill="url(#g-ribbon)" stroke="rgba(210,70,130,.45)" stroke-width="1.2"/>
    <path d="M100 52C122 14 178 2 188 30C196 52 148 72 100 52Z" fill="url(#g-ribbon)" stroke="rgba(210,70,130,.45)" stroke-width="1.2"/>
    <path d="M96 50C70 32 40 26 24 32" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/>
    <path d="M104 50C130 32 160 26 176 32" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="100" cy="54" rx="15" ry="17" fill="#ff7fae" stroke="rgba(210,70,130,.5)" stroke-width="1.2"/>
    <path d="M94 46C96 42 102 42 104 46" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.4" stroke-linecap="round"/></svg>`;

  /* tiny scene props for the hidden whispers */
  const props = {
    heart: () => `<svg viewBox="-20 -20 40 40"><path d="${heart(11)}" fill="url(#g-heart)" stroke="rgba(220,60,120,.4)" stroke-width="1"/><path d="M-8 -6C-8 -10 -4 -12 -1 -10" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-linecap="round"/></svg>`,
    ladybug: () => `<svg viewBox="-20 -20 40 40"><ellipse cx="0" cy="3" rx="11" ry="12" fill="#ff4d5e"/><path d="M0 -9V15" stroke="#4a2a3a" stroke-width="1.6"/><circle cx="0" cy="-8" r="6" fill="#4a2a3a"/><g fill="#4a2a3a"><circle cx="-5" cy="2" r="2.2"/><circle cx="5" cy="2" r="2.2"/><circle cx="-4.5" cy="9" r="1.9"/><circle cx="4.5" cy="9" r="1.9"/></g><circle cx="-2.4" cy="-9.5" r="1.2" fill="#fff"/><circle cx="2.4" cy="-9.5" r="1.2" fill="#fff"/></svg>`,
    firefly: () => `<svg viewBox="-24 -24 48 48"><circle r="22" fill="url(#g-glow-gold)"/><ellipse class="wing" cx="-5" cy="-5" rx="6" ry="3" fill="rgba(255,255,255,.85)" transform="rotate(-35 -5 -5)"/><ellipse class="wing" cx="5" cy="-5" rx="6" ry="3" fill="rgba(255,255,255,.85)" transform="rotate(35 5 -5)"/><ellipse cx="0" cy="1" rx="3.2" ry="5.4" fill="#5a4636"/><ellipse cx="0" cy="5" rx="3.2" ry="3.6" fill="#ffe27a"/></svg>`,
    envelope: () => `<svg viewBox="-24 -20 48 40"><rect x="-19" y="-12" width="38" height="25" rx="3" fill="#fffaf2" stroke="#e7b8c9" stroke-width="1.5"/><path d="M-19 -10L0 4L19 -10" fill="none" stroke="#e7b8c9" stroke-width="1.5" stroke-linejoin="round"/><path d="${heart(5)}" transform="translate(0 3)" fill="#ff6b9d"/></svg>`,
    star: () => `<svg viewBox="-24 -24 48 48"><circle r="22" fill="url(#g-glow-gold)"/><path d="M0 -15L4.2 -4.6L15 -4.2L6.6 2.8L9.4 13.4L0 7.4L-9.4 13.4L-6.6 2.8L-15 -4.2L-4.2 -4.6Z" fill="#ffe27a" stroke="#f3b947" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    butterfly: () => `<svg viewBox="-30 -26 60 52"><g class="wing wl"><path d="M0 0C-8 -22 -26 -24 -27 -10C-28 2 -12 6 0 0Z" fill="#ffa6cc" stroke="#ef7fb0" stroke-width="1"/><path d="M0 2C-6 6 -20 8 -17 20C-14 27 -3 18 0 2Z" fill="#c7aaf3" stroke="#a785e3" stroke-width="1"/></g><g class="wing wr"><path d="M0 0C8 -22 26 -24 27 -10C28 2 12 6 0 0Z" fill="#ffa6cc" stroke="#ef7fb0" stroke-width="1"/><path d="M0 2C6 6 20 8 17 20C14 27 3 18 0 2Z" fill="#c7aaf3" stroke="#a785e3" stroke-width="1"/></g><ellipse cx="0" cy="2" rx="1.8" ry="9" fill="#6a4a76"/></svg>`
  };

  /* mount: put gradients and symbols into the page once */
  const mount = host => { host.innerHTML = defs() + symbols(); };

  return { mount, plant, icon, heart, shapes, branch, bow, sprigLeaf, props, heads, mixHex, SVGNS };
})();
