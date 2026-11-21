/* audio.js
   A gentle, generative music-box lullaby made with the Web Audio API (no audio files),
   plus soft sound effects for blooms, collecting and surprises.

   Browsers only allow sound after a tap, so nothing starts until Music.start() is called
   from a click handler. Music.toggle() is the mute / unmute button. */
const Music = (() => {
  const BPM = 62, BEAT = 60 / BPM, STEP = BEAT / 2, BAR = BEAT * 4;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const LEVEL = 1.5;   // master volume when un-muted

  /* Eight bars in C major (a Canon-style progression), repeated forever.
     tones = notes used for arpeggios and melody, pad = soft held chord, bass = root. */
  const CHORDS = [
    { bass: 48, tones: [60, 64, 67, 71, 72, 76], pad: [52, 59, 64, 67] },   // Cmaj7
    { bass: 47, tones: [59, 62, 67, 71, 74, 79], pad: [50, 55, 62, 67] },   // G/B
    { bass: 45, tones: [57, 60, 64, 67, 69, 72], pad: [52, 55, 60, 64] },   // Am7
    { bass: 52, tones: [59, 62, 64, 67, 71, 74], pad: [50, 55, 59, 64] },   // Em7
    { bass: 53, tones: [57, 60, 64, 65, 69, 72], pad: [48, 57, 60, 64] },   // Fmaj7
    { bass: 52, tones: [55, 60, 64, 67, 72, 76], pad: [48, 55, 60, 64] },   // C/E
    { bass: 50, tones: [57, 60, 62, 65, 69, 72], pad: [48, 57, 60, 65] },   // Dm7
    { bass: 55, tones: [55, 59, 62, 67, 71, 74], pad: [50, 55, 59, 62] }    // G
  ];
  const ARP = [[0, 2, 3, 4, 5, 4, 3, 2], [0, 1, 3, 5, 4, 3, 2, 1], [0, 2, 4, 5, 3, 4, 2, 1], [0, 1, 2, 4, 5, 4, 2, 3]];
  const SCALE = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88];   // C major, C5 – E6
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];   // sparkle notes for effects

  let ctx = null, master = null, dry = null, verb = null, echo = null;
  let timer = null, on = false, nextTime = 0, bar = 0, step = 0, lastMel = 79, silent = null;

  /* ---------- graph ---------- */
  function buildGraph() {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .3;
    master.connect(comp); comp.connect(ctx.destination);

    dry = ctx.createGain(); dry.gain.value = .9; dry.connect(master);

    verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * .32; d[i] = lp * Math.pow(1 - i / len, 2.7) * 1.8; }
    }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = .62;
    verb.connect(wet); wet.connect(master);

    echo = ctx.createGain(); echo.gain.value = 1;
    const dl = ctx.createDelay(2); dl.delayTime.value = BEAT * .75;
    const fb = ctx.createGain(); fb.gain.value = .34;
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 2400;
    echo.connect(dl); dl.connect(lpf); lpf.connect(fb); fb.connect(dl); lpf.connect(verb); lpf.connect(dry);
  }

  /* ---------- voices ---------- */
  const out = (node, send = .4, delay = 0) => {
    node.connect(dry);
    const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(verb);
    if (delay) { const e = ctx.createGain(); e.gain.value = delay; node.connect(e); e.connect(echo); }
  };

  /* a music-box / glockenspiel note */
  function bell(m, t, vel = .06, dur = 1.8, send = .5, delay = 0) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + .005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out(g, send, delay);
    [[1, 1, dur], [2, .32, dur * .55], [4.02, .1, dur * .22]].forEach(([mul, amp, d]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz(m) * mul;
      og.gain.setValueAtTime(amp, t); og.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .05);
      o.onended = () => { try { og.disconnect(); } catch (e) {} };
    });
    setTimeout(() => { try { g.disconnect(); } catch (e) {} }, (t - ctx.currentTime + dur + .3) * 1000);
  }

  /* slow breathing pad */
  function pad(notes, t, dur) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 880; f.Q.value = .4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(.03, t + 1.3);
    g.gain.setValueAtTime(.03, t + dur - .6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.6);
    f.connect(g); out(g, .55);
    notes.forEach(m => [-6, 6].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 1.7);
    }));
    setTimeout(() => { try { g.disconnect(); f.disconnect(); } catch (e) {} }, (t - ctx.currentTime + dur + 2) * 1000);
  }

  function bass(m, t) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine'; o.frequency.value = hz(m); f.type = 'lowpass'; f.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.085, t + .06); g.gain.exponentialRampToValueAtTime(0.0001, t + BAR * .95);
    o.connect(f); f.connect(g); out(g, .15);
    o.start(t); o.stop(t + BAR);
    o.onended = () => { try { g.disconnect(); } catch (e) {} };
  }

  /* pick the next melody note: stepwise, leaning on chord tones */
  function melody(chord) {
    const cand = SCALE.map(n => {
      const ct = chord.tones.some(c => c % 12 === n % 12) ? 3 : 1;
      return [n, ct * Math.exp(-Math.abs(n - lastMel) / 3.2) * (n === lastMel ? .35 : 1)];
    });
    let r = Math.random() * cand.reduce((a, c) => a + c[1], 0);
    for (const [n, w] of cand) { r -= w; if (r <= 0) return (lastMel = n); }
    return (lastMel = 79);
  }

  /* ---------- scheduler ---------- */
  function tick() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + .5) {
      const chord = CHORDS[bar % CHORDS.length], t = nextTime;
      if (step === 0) { pad(chord.pad, t, BAR); bass(chord.bass, t); }
      const pat = ARP[Math.floor(bar / 2) % ARP.length];
      bell(chord.tones[pat[step]], t, step % 4 === 0 ? .05 : .034, 1.5, .5, .22);
      if (step % 2 === 0 && (step === 0 || Math.random() > .3)) {
        bell(melody(chord), t + .015, step === 0 ? .06 : .048, 2.6, .8, .1);
      }
      nextTime += STEP;
      if (++step === 8) { step = 0; bar++; }
    }
  }

  /* ---------- keep iOS from muting Web Audio when the ringer switch is off ---------- */
  function unlockIOS() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!ios || silent) return;
      const n = 800, b = new Uint8Array(44 + n);
      const w = (o, s) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
      const u32 = (o, v) => { for (let i = 0; i < 4; i++) b[o + i] = (v >> (8 * i)) & 255; };
      w(0, 'RIFF'); u32(4, 36 + n); w(8, 'WAVEfmt '); u32(16, 16); b[20] = 1; b[22] = 1; u32(24, 8000); u32(28, 8000); b[32] = 1; b[34] = 8; w(36, 'data'); u32(40, n);
      b.fill(128, 44);
      silent = new Audio('data:audio/wav;base64,' + btoa(String.fromCharCode(...b)));
      silent.loop = true; silent.volume = .01; silent.play().catch(() => {});
    } catch (e) {}
  }

  const ramp = v => { if (master) master.gain.setTargetAtTime(v, ctx.currentTime, .25); };

  /* ---------- public ---------- */
  const api = {
    get on() { return on; },
    started: () => !!ctx,
    start() {
      unlockIOS();
      if (!ctx) {
        try { buildGraph(); } catch (e) { return false; }
        nextTime = ctx.currentTime + .15;
        timer = setInterval(tick, 90);
        document.addEventListener('visibilitychange', () => {
          if (!ctx) return;
          if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
        });
      }
      ctx.resume();
      on = true; ramp(LEVEL);
      return true;
    },
    toggle() {
      if (!ctx) return api.start();
      on = !on;
      if (on) ctx.resume();
      ramp(on ? LEVEL : 0);
      return on;
    },

    /* sound effects (silent while muted) */
    chime(i = 0) {
      if (!ctx || !on) return; const t = ctx.currentTime + .02;
      [0, 2, 3, 4].forEach((k, j) => bell(PENTA[Math.min(PENTA.length - 1, i + k)], t + j * .11, .07, 2.2, .9, .2));
    },
    collect() {
      if (!ctx || !on) return; const t = ctx.currentTime + .02;
      bell(84, t, .08, 1.4, .8, .25); bell(91, t + .1, .08, 1.8, .9, .25); bell(96, t + .2, .05, 2.2, 1, .3);
    },
    pop() {
      if (!ctx || !on) return; bell(PENTA[4 + ((Math.random() * 5) | 0)], ctx.currentTime + .01, .05, 1.2, .8, .15);
    },
    whisper() {
      if (!ctx || !on) return; const t = ctx.currentTime + .02;
      bell(88, t, .06, 1.6, .9, .2); bell(95, t + .13, .05, 2, .9, .3);
    },
    unlock() {
      if (!ctx || !on) return; const t = ctx.currentTime + .05;
      for (let i = 0; i < 12; i++) bell(PENTA[i % PENTA.length] + (i >= 10 ? 12 : 0), t + i * .1, .06, 2.4, .9, .2);
    },
    swell() {
      if (!ctx || !on) return; const t = ctx.currentTime + .05;
      pad([48, 55, 60, 64, 67, 71], t, 5);
      [72, 76, 79, 83, 86, 91, 95].forEach((n, i) => bell(n, t + .4 + i * .16, .06, 3, 1, .3));
    }
  };
  return api;
})();
