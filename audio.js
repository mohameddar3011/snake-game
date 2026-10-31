/* =====================================================================
   audio.js — all sound is synthesised with the Web Audio API (no files).
   ===================================================================== */
const Sound = (() => {
  let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let muted = false, musicTimer = null, musicName = null, step = 0, nextT = 0;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = 0.28; musBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(freq, dur, o = {}) {
    if (!ac) return;
    const t = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? 0.2 : o.vol, a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(dur, o = {}) {
    if (!ac) return;
    const t = ac.currentTime + (o.delay || 0);
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.f0 || 3000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = ac.createGain(), v = o.vol == null ? 0.4 : o.vol;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  const sfx = {
    rifle() { noise(0.1, { f0: 6000, f1: 700, vol: 0.55 }); tone(150, 0.09, { type: 'square', to: 45, vol: 0.3 }); },
    shotgun() {
      noise(0.32, { f0: 4000, f1: 180, vol: 0.9 }); tone(95, 0.25, { type: 'sawtooth', to: 30, vol: 0.4 });
      noise(0.05, { delay: 0.42, type: 'highpass', f0: 1500, vol: 0.25 });
      noise(0.05, { delay: 0.55, type: 'highpass', f0: 1200, vol: 0.25 });
    },
    enemyShot() { tone(560, 0.14, { type: 'sawtooth', to: 170, vol: 0.09 }); noise(0.06, { type: 'bandpass', f0: 2200, vol: 0.08 }); },
    bossShot() { tone(220, 0.35, { type: 'sawtooth', to: 70, vol: 0.18 }); noise(0.25, { f0: 1800, f1: 200, vol: 0.2 }); },
    hit() { tone(1700, 0.04, { type: 'triangle', vol: 0.14 }); },
    headshot() { tone(1700, 0.05, { type: 'triangle', vol: 0.14 }); tone(2500, 0.09, { type: 'triangle', vol: 0.12, delay: 0.03 }); },
    kill() { tone(300, 0.2, { type: 'triangle', to: 80, vol: 0.25 }); noise(0.15, { f0: 1500, f1: 200, vol: 0.2 }); },
    hurt() { noise(0.22, { f0: 700, f1: 150, vol: 0.55 }); tone(70, 0.25, { type: 'sine', vol: 0.4 }); },
    heartbeat() { tone(60, 0.12, { vol: 0.5 }); tone(52, 0.14, { vol: 0.4, delay: 0.16 }); },
    reload() { noise(0.04, { type: 'highpass', f0: 2000, vol: 0.25 }); noise(0.05, { type: 'highpass', f0: 1500, vol: 0.3, delay: 0.7 }); tone(180, 0.05, { type: 'square', vol: 0.08, delay: 0.7 }); },
    empty() { noise(0.03, { type: 'highpass', f0: 3000, vol: 0.2 }); },
    swap() { noise(0.05, { type: 'highpass', f0: 1800, vol: 0.2 }); },
    step() { noise(0.05, { f0: 500, f1: 150, vol: 0.12 }); },
    pickup() { [660, 880, 1320].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.14, delay: i * 0.06 })); },
    radio() { tone(1250, 0.04, { type: 'square', vol: 0.05 }); tone(1250, 0.04, { type: 'square', vol: 0.05, delay: 0.08 }); noise(0.18, { type: 'bandpass', f0: 2500, vol: 0.05, delay: 0.14 }); },
    banner() { tone(440, 0.18, { type: 'triangle', vol: 0.14 }); tone(660, 0.3, { type: 'triangle', vol: 0.14, delay: 0.1 }); },
    gate() { tone(120, 0.9, { type: 'sawtooth', to: 520, vol: 0.18 }); noise(0.6, { f0: 800, f1: 3000, vol: 0.15 }); },
    complete() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.16, delay: i * 0.12 })); },
    die() { tone(220, 1.2, { type: 'sawtooth', to: 40, vol: 0.25 }); noise(0.8, { f0: 1000, f1: 80, vol: 0.4 }); },
    bossRoar() { tone(90, 1.1, { type: 'sawtooth', to: 40, vol: 0.4 }); noise(0.9, { f0: 900, f1: 90, vol: 0.4 }); },
    win() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 1.4, { type: 'triangle', vol: 0.13, delay: i * 0.14 })); },
    nope() { tone(220, 0.12, { type: 'square', vol: 0.08 }); tone(160, 0.16, { type: 'square', vol: 0.08, delay: 0.1 }); }
  };

  // ---- tiny step sequencer for the background music ----
  const N = n => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz
  const SONGS = {
    tense: { bpm: 96, len: 16, play(s, t, d) {
      const bass = [33, 0, 0, 33, 0, 0, 36, 0, 33, 0, 0, 33, 0, 31, 0, 0][s];
      if (bass) tone(N(bass), d * 1.8, { type: 'sawtooth', vol: 0.5, bus: musBus, delay: t });
      if (s % 4 === 2) noise(0.04, { type: 'highpass', f0: 7000, vol: 0.18, bus: musBus, delay: t });
      if (s === 0) tone(N(45), d * 15, { type: 'sine', vol: 0.18, bus: musBus, delay: t, attack: 1 });
    } },
    boss: { bpm: 132, len: 16, play(s, t, d) {
      const bass = [38, 38, 0, 38, 41, 0, 38, 0, 36, 36, 0, 36, 43, 0, 41, 0][s];
      if (bass) tone(N(bass), d * 1.5, { type: 'sawtooth', vol: 0.55, bus: musBus, delay: t });
      if (s % 2 === 1) noise(0.03, { type: 'highpass', f0: 8000, vol: 0.2, bus: musBus, delay: t });
      if (s % 8 === 0) { noise(0.12, { f0: 400, f1: 60, vol: 0.5, bus: musBus, delay: t }); tone(N(62), d * 7, { type: 'square', vol: 0.06, bus: musBus, delay: t }); }
    } },
    love: { bpm: 74, len: 64, play(s, t, d) {
      const chords = [[48, 55, 64, 67, 71], [43, 50, 62, 67, 71], [45, 52, 60, 64, 67], [41, 48, 60, 65, 69]];
      const c = chords[(s / 16) | 0], k = s % 16;
      if (k === 0) tone(N(c[0]), d * 15, { type: 'sine', vol: 0.4, bus: musBus, delay: t, attack: 0.3 });
      if (k % 2 === 0) { const n = c[1 + ((k / 2) % 4)]; tone(N(n + 12), d * 3, { type: 'triangle', vol: 0.3, bus: musBus, delay: t }); }
    } }
  };

  function music(name) {
    if (name === musicName) return;
    musicName = name;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!ac || !name) return;
    const song = SONGS[name]; step = 0; nextT = ac.currentTime + 0.1;
    const dur = 60 / song.bpm / 4;
    musicTimer = setInterval(() => {
      while (nextT < ac.currentTime + 0.25) {
        song.play(step % song.len, Math.max(0, nextT - ac.currentTime), dur);
        step++; nextT += dur;
      }
    }, 60);
  }

  return {
    init, music,
    play(name) { if (ac && sfx[name]) sfx[name](); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.8; return muted; },
    get muted() { return muted; },
    get ready() { return !!ac; },
    get currentMusic() { return musicName; },
    resumeMusic() { const n = musicName; musicName = null; music(n); }
  };
})();
