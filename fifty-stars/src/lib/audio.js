// Everything you hear is synthesised with the Web Audio API: no audio files.
//
//  * a slow, dreamy loop: warm pad chords (Cadd9 - Am9 - Fmaj9 - G6/9) with a
//    music-box melody drifting over them, through a big soft reverb
//  * a bell chime for every star (climbing a pentatonic scale as she finds more)
//  * a soft cinematic score for the moment the moon wakes up
//
// Browsers only allow sound after a tap, so init() is called from the
// "Enter my universe" button.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const CHORD_LEN = 8; // seconds per chord
const CHORDS = [
  { pad: [48, 55, 59, 62, 64], bass: 36, arp: [72, 76, 79, 83, 86, 84, 88] }, // Cmaj9
  { pad: [45, 52, 55, 59, 64], bass: 33, arp: [69, 72, 76, 79, 83, 81, 84] }, // Am9
  { pad: [41, 48, 52, 57, 64], bass: 29, arp: [72, 76, 77, 81, 79, 84, 88] }, // Fmaj9
  { pad: [43, 50, 55, 59, 64], bass: 31, arp: [74, 79, 81, 83, 86, 88, 91] }, // G6/9
];
const STAR_SCALE = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]; // C major pentatonic, climbing

export function createAudio(options = {}) {
  let ctx = options.context || null;
  let master, musicBus, sfxBus, reverbIn, echoIn;
  let muted = false;
  let started = false;
  let timer = null;
  let musicStart = 0;
  let nextArp = 0;
  let nextChord = 0;
  let arpIdx = 3;
  let heartTimer = null;

  // ---------------------------------------------------------------- graph
  function build() {
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 5;
    comp.attack.value = 0.01;
    comp.release.value = 0.35;
    master.connect(comp);
    comp.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 1;
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    musicBus.connect(master);
    sfxBus.connect(master);

    // lush reverb from a generated impulse response
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 4.2, 2.6);
    reverbIn = ctx.createGain();
    reverbIn.gain.value = 1;
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.62;
    reverbIn.connect(reverb);
    reverb.connect(reverbOut);
    reverbOut.connect(master);

    // soft ping-pong-ish echo for the music-box notes
    echoIn = ctx.createGain();
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.44;
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    echoIn.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(reverbIn);
    damp.connect(musicBus);
  }

  function impulse(c, seconds, decay) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (t < 0.01 ? t / 0.01 : 1);
      }
    }
    return buf;
  }

  // ------------------------------------------------------------- building blocks
  /** One enveloped oscillator routed to a bus (and optionally the reverb/echo). */
  function voice({ f, t, dur, type = 'sine', a = 0.01, r = 0.3, g = 0.1, bus, rev = 0, echo = 0, detune = 0, lp, hp }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + a);
    env.gain.setValueAtTime(g, t + Math.max(a, dur - r));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) {
      const lf = ctx.createBiquadFilter();
      lf.type = 'lowpass';
      lf.frequency.value = lp;
      lf.Q.value = 0.4;
      node.connect(lf);
      node = lf;
    }
    if (hp) {
      const hf = ctx.createBiquadFilter();
      hf.type = 'highpass';
      hf.frequency.value = hp;
      node.connect(hf);
      node = hf;
    }
    node.connect(env);
    env.connect(bus || sfxBus);
    if (rev) sendTo(env, reverbIn, rev);
    if (echo) sendTo(env, echoIn, echo);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function sendTo(src, dest, amount) {
    const s = ctx.createGain();
    s.gain.value = amount;
    src.connect(s);
    s.connect(dest);
  }

  /** Glassy bell: a few inharmonic partials with exponential decay. */
  function bell(note, t, vol = 0.12, { decay = 2.6, bus, echo = 0.5, rev = 0.9 } = {}) {
    const f = midi(note);
    const parts = [
      [1, 1, decay],
      [2.0, 0.34, decay * 0.7],
      [3.01, 0.16, decay * 0.45],
      [4.17, 0.07, decay * 0.3],
    ];
    for (const [mul, amp, d] of parts) {
      voice({ f: f * mul, t, dur: d, a: 0.004, r: d * 0.95, g: vol * amp, bus: bus || sfxBus, rev, echo });
    }
  }

  function noiseBuffer(seconds = 4) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Filtered noise sweep (a soft "whoosh" / riser). */
  function sweep({ t, dur, from, to, g = 0.12, q = 1.2, peak = 0.7, bus }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + dur * peak);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(env);
    env.connect(bus || sfxBus);
    sendTo(env, reverbIn, 0.5);
    src.start(t);
    src.stop(t + dur + 0.1);
  }

  function boom(t, vol = 0.5) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(96, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 2.4);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.08);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(env);
    env.connect(sfxBus);
    sendTo(env, reverbIn, 0.35);
    o.start(t);
    o.stop(t + 3.3);
  }

  /** A warm swelling chord: detuned saws + sines through a low-pass. */
  function swell(notes, t, { dur = 9, a = 3, r = 4, vol = 0.03, lp = 1400 } = {}) {
    for (const n of notes) {
      const f = midi(n);
      voice({ f, t, dur, a, r, g: vol, type: 'sawtooth', detune: -7, lp, bus: sfxBus, rev: 0.6 });
      voice({ f, t, dur, a, r, g: vol, type: 'sawtooth', detune: 7, lp, bus: sfxBus, rev: 0.6 });
      voice({ f, t, dur, a: a * 0.8, r, g: vol * 1.6, type: 'sine', bus: sfxBus, rev: 0.5 });
    }
  }

  /** Airy "ahh" choir pad: saws through two vowel-ish band-pass filters. */
  function choir(notes, t, { dur = 9, a = 3.2, r = 4, vol = 0.05 } = {}) {
    for (const n of notes) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = (Math.random() - 0.5) * 12;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(vol, t + a);
      env.gain.setValueAtTime(vol, t + dur - r);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      for (const [fr, q, gain] of [[700, 6, 1], [1150, 8, 0.6], [2600, 10, 0.25]]) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = fr;
        bp.Q.value = q;
        const gn = ctx.createGain();
        gn.gain.value = gain;
        o.connect(bp);
        bp.connect(gn);
        gn.connect(env);
      }
      env.connect(sfxBus);
      sendTo(env, reverbIn, 0.8);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // ------------------------------------------------------------------ music
  function padChord(chord, t) {
    const dur = CHORD_LEN + 4;
    for (const n of chord.pad) {
      const f = midi(n);
      voice({ f, t, dur, a: 3, r: 4.5, g: 0.034, type: 'sine', bus: musicBus, rev: 0.7 });
      voice({ f, t, dur, a: 3.4, r: 4.5, g: 0.018, type: 'triangle', detune: 6, lp: 900, bus: musicBus, rev: 0.7 });
    }
    voice({ f: midi(chord.bass), t, dur, a: 2, r: 4, g: 0.07, type: 'sine', bus: musicBus, rev: 0.2 });
  }

  function arpNote(t) {
    const chord = CHORDS[Math.floor(Math.max(0, t - musicStart) / CHORD_LEN) % CHORDS.length];
    // random walk over the chord tones so the melody wanders instead of looping
    arpIdx = Math.max(0, Math.min(chord.arp.length - 1, arpIdx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    const n = chord.arp[arpIdx];
    const f = midi(n);
    const g = 0.022 + Math.random() * 0.02;
    voice({ f, t, dur: 2.4, a: 0.006, r: 2.3, g, type: 'sine', bus: musicBus, rev: 0.9, echo: 0.55 });
    voice({ f: f * 2, t, dur: 1.2, a: 0.004, r: 1.1, g: g * 0.25, type: 'sine', bus: musicBus, rev: 0.9, echo: 0.4 });
  }

  function tick() {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (nextArp < now - 0.2) nextArp = now + 0.05;
    if (nextChord < now - 0.2) nextChord = now + 0.05;
    while (nextChord < now + 1.6) {
      const i = Math.round((nextChord - musicStart) / CHORD_LEN);
      padChord(CHORDS[((i % CHORDS.length) + CHORDS.length) % CHORDS.length], nextChord);
      nextChord += CHORD_LEN;
    }
    while (nextArp < now + 1.6) {
      if (nextArp >= musicStart + 1.5 && Math.random() < 0.62) arpNote(nextArp);
      nextArp += 0.5;
    }
  }

  // ------------------------------------------------------------------ public
  const api = {
    /** Create / resume the audio context. Must run inside a tap handler. */
    async init() {
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return false;
          ctx = new AC();
        }
        if (!master) build();
        if (ctx.state === 'suspended') await ctx.resume();
        return true;
      } catch {
        return false;
      }
    },

    startMusic() {
      if (!ctx || started) return;
      started = true;
      musicStart = ctx.currentTime + 0.1;
      nextChord = musicStart;
      nextArp = musicStart;
      tick();
      timer = setInterval(tick, 400);
    },

    stopMusic() {
      started = false;
      clearInterval(timer);
      timer = null;
    },

    setMuted(value) {
      muted = !!value;
      if (!ctx || !master) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.12);
    },

    /** The page was hidden / shown. */
    setVisible(visible) {
      if (!ctx || ctx.state === 'closed') return;
      if (visible && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!visible && ctx.state === 'running') ctx.suspend().catch(() => {});
    },

    duckMusic(level = 0.35, seconds = 1.2) {
      if (!ctx || !musicBus) return;
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setTargetAtTime(level, ctx.currentTime, seconds / 3);
    },

    // ---------------- interaction sounds ----------------
    enter() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.02;
      sweep({ t, dur: 2.4, from: 300, to: 3200, g: 0.05 });
      [72, 76, 79, 84].forEach((n, i) => bell(n, t + 0.12 * i, 0.08));
    },

    /** A star was found. n = how many she has found (0-based index of this one). */
    starFound(n) {
      if (!ctx) return;
      const t = ctx.currentTime + 0.01;
      const note = STAR_SCALE[n % STAR_SCALE.length] + 12 * Math.floor(n / (STAR_SCALE.length * 2)) * 0;
      bell(note, t, 0.14, { decay: 3 });
      bell(note - 12, t + 0.03, 0.05, { decay: 3.4 });
      bell(note + 12, t + 0.1, 0.045, { decay: 2 });
    },

    /** Re-opening a star she already found. */
    starRevisit() {
      if (!ctx) return;
      bell(79, ctx.currentTime + 0.01, 0.06, { decay: 1.8 });
    },

    cardClose() {
      if (!ctx) return;
      bell(88, ctx.currentTime + 0.01, 0.03, { decay: 1.2 });
    },

    /** She poked the moon before it was ready. */
    moonLocked() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.01;
      voice({ f: 196, t, dur: 0.9, a: 0.02, r: 0.7, g: 0.12, type: 'triangle', lp: 500, rev: 0.5 });
      voice({ f: 147, t: t + 0.18, dur: 1.1, a: 0.03, r: 0.9, g: 0.09, type: 'triangle', lp: 420, rev: 0.6 });
    },

    hint() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.01;
      bell(91, t, 0.05, { decay: 1.6 });
      bell(86, t + 0.14, 0.04, { decay: 1.6 });
    },

    /** Stage 1: all 50 stars light up at once. */
    cinematicFlare() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.02;
      this.duckMusic(0.4, 1);
      [84, 88, 91, 95, 98].forEach((n) => bell(n, t, 0.07, { decay: 4 }));
      bell(60, t, 0.1, { decay: 5 });
      sweep({ t, dur: 4, from: 250, to: 7000, g: 0.07, q: 0.9, peak: 0.85 });
      swell([48, 55, 64], t, { dur: 7, a: 2.5, r: 3.5, vol: 0.022, lp: 1100 });
    },

    /** Stage 2: golden light streams toward the moon. */
    cinematicTravel() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.02;
      const run = [72, 76, 79, 81, 84, 86, 88, 91, 93, 96];
      run.forEach((n, i) => bell(n, t + i * 0.2, 0.05 + i * 0.004, { decay: 2.4 }));
      sweep({ t, dur: 3.2, from: 500, to: 6000, g: 0.05, peak: 0.9 });
    },

    /** Stage 3: the moon becomes full and swells to fill the sky. */
    cinematicBloom() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.02;
      boom(t, 0.5);
      swell([41, 48, 57, 60, 64, 67, 69], t, { dur: 12, a: 3.2, r: 6, vol: 0.026, lp: 1700 });
      choir([60, 64, 67, 72], t + 0.4, { dur: 11, a: 3.6, r: 5, vol: 0.045 });
      sweep({ t, dur: 4.5, from: 200, to: 4000, g: 0.06, peak: 0.55 });
      const cascade = [72, 76, 79, 83, 84, 88, 91, 95, 96, 100];
      cascade.forEach((n, i) => bell(n, t + 0.5 + i * 0.28, 0.06, { decay: 3.4 }));
    },

    /** Stage 4: the moon is ready to be clicked. */
    cinematicReady() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.02;
      bell(88, t, 0.08, { decay: 4 });
      bell(91, t + 0.25, 0.07, { decay: 4 });
      bell(96, t + 0.5, 0.06, { decay: 4.5 });
      this.duckMusic(0.8, 2.5);
    },

    /** She clicked the unlocked moon. */
    moonOpen() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.02;
      this.duckMusic(0.55, 1.5);
      sweep({ t, dur: 3.4, from: 220, to: 3800, g: 0.07, peak: 0.6 });
      swell([48, 55, 59, 64, 67], t, { dur: 10, a: 2.6, r: 5, vol: 0.024, lp: 1500 });
      choir([64, 67, 72], t + 0.2, { dur: 10, a: 2.8, r: 5, vol: 0.04 });
      [79, 83, 84, 88, 91].forEach((n, i) => bell(n, t + 0.4 + i * 0.3, 0.06, { decay: 3.6 }));
    },

    /** A line of the final message appears. */
    line(big = false) {
      if (!ctx) return;
      const t = ctx.currentTime + 0.01;
      if (big) {
        bell(72, t, 0.05, { decay: 3.2 });
        bell(79, t + 0.07, 0.045, { decay: 3.2 });
        bell(88, t + 0.15, 0.04, { decay: 3.2 });
      } else {
        bell([84, 86, 88, 91][Math.floor(Math.random() * 4)], t, 0.03, { decay: 2 });
      }
    },

    /** The big heart appears. */
    finale() {
      if (!ctx) return;
      const t = ctx.currentTime + 0.02;
      swell([53, 57, 60, 64, 69], t, { dur: 10, a: 2.2, r: 5, vol: 0.022, lp: 1500 });
      [76, 79, 84, 88, 91, 96].forEach((n, i) => bell(n, t + i * 0.18, 0.06, { decay: 4 }));
    },

    startHeartbeat() {
      if (!ctx || heartTimer) return;
      const beat = () => {
        if (!ctx) return;
        const t = ctx.currentTime + 0.01;
        for (const [dt, g] of [[0, 0.22], [0.26, 0.15]]) {
          voice({ f: 62, t: t + dt, dur: 0.32, a: 0.012, r: 0.25, g, type: 'sine', bus: sfxBus });
        }
      };
      beat();
      heartTimer = setInterval(beat, 1300);
    },

    stopHeartbeat() {
      clearInterval(heartTimer);
      heartTimer = null;
    },

    get ready() {
      return !!ctx && !!master;
    },
    get muted() {
      return muted;
    },
    /** exposed so the sound design can be rendered and inspected offline */
    _internals: {
      build: () => {
        if (!master) build();
      },
      padChord,
      arpNote,
      tick,
      setStart: (t) => {
        musicStart = t;
      },
      CHORDS,
      CHORD_LEN,
    },
  };
  return api;
}

export const audio = createAudio();
