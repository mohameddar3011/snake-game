import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Universe from './components/Universe.jsx';
import Moon from './components/Moon.jsx';
import Intro from './components/Intro.jsx';
import Sky from './components/Sky.jsx';
import UnlockText from './components/UnlockText.jsx';
import FinalMessage from './components/FinalMessage.jsx';
import Particles from './components/Particles.jsx';
import SoundToggle from './components/SoundToggle.jsx';
import { useViewport } from './hooks/useViewport.js';
import { useProgress } from './hooks/useProgress.js';
import { useSkyLayout } from './hooks/useSkyLayout.js';
import { TOTAL_STARS } from './data/messages.js';
import { readyMoon, skyMoon } from './lib/geometry.js';
import { audio } from './lib/audio.js';

/*
  scene flow
    intro ──Enter──▶ sky ──50th star──▶ awakening ──(≈16s cinematic)──▶ ready
                      ▲                                                  │ click the unlocked moon
                      └──────────── skyDone ◀──── "Back to my universe" ─ message
*/

function moonModeFor(scene, cine) {
  switch (scene) {
    case 'intro':
      return 'intro';
    case 'awakening':
      if (cine === 'travel') return 'charging';
      return ['bloom', 'text1', 'text2'].includes(cine) ? 'massive' : 'locked';
    case 'ready':
      return 'massive';
    case 'message':
      return 'expanding';
    case 'skyDone':
      return 'small';
    default:
      return 'locked';
  }
}

export default function App() {
  const { w, h } = useViewport();
  const progress = useProgress();
  const { found, unlocked, finished, muted } = progress;
  const layout = useSkyLayout(w, h);

  const [scene, setScene] = useState('intro');
  const [cine, setCine] = useState(null);
  const [dark, setDark] = useState(false);
  const [shake, setShake] = useState(0);
  const [toast, setToast] = useState(null);

  const fx = useRef(null);
  const starEls = useRef(new Map());
  const timers = useRef([]);
  const toastTimer = useRef(0);
  const running = useRef(false);
  const size = useRef({ w, h });
  size.current = { w, h };

  const later = useCallback((ms, fn) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(
    () => () => {
      clearTimers();
      clearTimeout(toastTimer.current);
    },
    [clearTimers]
  );

  const registerStar = useCallback((id, el) => {
    if (el) starEls.current.set(id, el);
    else starEls.current.delete(id);
  }, []);

  const showToast = useCallback((text) => {
    setToast({ id: Date.now(), text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ------------------------------------------------------------------ sound
  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    const onVis = () => audio.setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const toggleSound = () => {
    const next = !muted;
    progress.setMuted(next);
    if (!next) audio.init().then((ok) => ok && audio.startMusic());
  };

  // ---------------------------------------------------- Part 4: the unlock
  const runCinematic = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setScene('awakening');
    setDark(true);

    // 3 · the crescent becomes a full moon and swells to fill the sky
    let bloomed = false;
    const bloom = () => {
      if (bloomed) return;
      bloomed = true;
      setCine('bloom');
      audio.cinematicBloom();
      const { w: W, h: H } = size.current;
      const c = readyMoon(W, H);
      const colors = ['#ff5fae', '#e58cff', '#ffb347', '#ff8cc6', '#c58cff', '#ffd36b'];
      const boom = (n) => fx.current?.burst(c.cx, c.cy, { count: n, speed: [90, 620], size: [8, 22], life: [1.2, 3], gravity: 0, colors, soft: true });
      boom(90);
      later(1300, () => boom(70));
      later(2800, () => boom(60));
      later(4500, () => boom(50));

      // 4 · the words, then the moon is ready to be clicked
      later(6900, () => setCine('text1'));
      later(9300, () => setCine('text2'));
      later(11900, () => {
        progress.markUnlocked();
        setScene('ready');
        setCine(null);
        audio.cinematicReady();
        running.current = false;
      });
    };

    // 1 · all fifty stars light up at the same moment
    setCine('flare');
    audio.cinematicFlare();

    // 2 · golden light streams from every star toward the moon. The moon blooms
    // once the light has arrived (with a fallback in case frames are very slow)
    later(1800, () => {
      setCine('travel');
      audio.cinematicTravel();
      const { w: W, h: H } = size.current;
      const m = skyMoon(W, H);
      const pts = [...starEls.current.values()].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      fx.current?.comets(pts, { x: m.cx, y: m.cy, r: m.d / 2 }, { dur: [1.5, 2.3], delay: [0, 1], onDone: () => later(700, bloom) });
      later(9000, bloom);
    });
  }, [later, progress]);

  const onFinalStar = useCallback(() => {
    clearTimers();
    setScene('awakening');
    setCine('dimming');
    setDark(true); // the sky slowly darkens while she reads the last message
  }, [clearTimers]);

  // ------------------------------------------------------------ welcome → sky
  const enter = useCallback(() => {
    audio.init().then((ok) => {
      if (!ok) return;
      audio.startMusic();
      audio.enter();
    });
    clearTimers();
    running.current = false;
    if (found.length === TOTAL_STARS && !unlocked) {
      // she found all 50 last time but left before the moon woke up
      setScene('awakening');
      setCine('dimming');
      setDark(true);
      later(3200, runCinematic);
    } else if (unlocked && !finished) {
      setScene('ready');
      setDark(true);
    } else if (unlocked && finished) {
      setScene('skyDone');
      setDark(true);
    } else {
      setScene('sky');
    }
  }, [found.length, unlocked, finished, clearTimers, later, runCinematic]);

  // --------------------------------------------------------- the moon itself
  const onMoon = useCallback(() => {
    if (scene === 'sky') {
      const left = TOTAL_STARS - found.length;
      audio.moonLocked();
      setShake((s) => s + 1);
      showToast(`The moon is still asleep… ${left} ${left === 1 ? 'star is' : 'stars are'} still hiding 🌙`);
      return;
    }
    if ((scene === 'ready' || scene === 'skyDone') && unlocked && found.length === TOTAL_STARS) {
      const { w: W, h: H } = size.current;
      const c = scene === 'ready' ? readyMoon(W, H) : skyMoon(W, H);
      audio.moonOpen();
      fx.current?.setAmbient(null);
      fx.current?.burst(c.cx, c.cy, {
        count: 120,
        speed: [120, 700],
        size: [8, 22],
        life: [1.4, 3.2],
        gravity: 0,
        colors: ['#ff5fae', '#e58cff', '#ffb347', '#ff8cc6', '#c58cff', '#ffd36b'],
        soft: true,
      });
      setScene('message');
    }
  }, [scene, unlocked, found.length, showToast]);

  const backToSky = useCallback(() => {
    fx.current?.setHearts(null);
    setScene('skyDone');
    setDark(true);
  }, []);

  const startOver = useCallback(() => {
    clearTimers();
    running.current = false;
    progress.reset();
    fx.current?.clear();
    fx.current?.setAmbient(null);
    setCine(null);
    setDark(false);
    setScene('sky');
  }, [clearTimers, progress]);

  // safety net: the message can never be shown while the moon is locked
  useEffect(() => {
    if (scene === 'message' && !unlocked) setScene('sky');
  }, [scene, unlocked]);

  // glitter around the moon once it is full
  useEffect(() => {
    const f = fx.current;
    if (!f) return;
    const big = readyMoon(w, h);
    const small = skyMoon(w, h);
    if (scene === 'ready' || (scene === 'awakening' && (cine === 'text1' || cine === 'text2'))) {
      f.setAmbient({ cx: big.cx, cy: big.cy, r: big.d / 2, rate: 38 });
    } else if (scene === 'skyDone') {
      f.setAmbient({ cx: small.cx, cy: small.cy, r: small.d / 2, rate: 14 });
    } else {
      f.setAmbient(null);
    }
  }, [scene, cine, w, h]);

  const moonMode = moonModeFor(scene, cine);
  const moonInteractive = scene === 'sky' || scene === 'ready' || scene === 'skyDone';
  const moonLabel =
    scene === 'sky'
      ? `The moon is locked until you find all ${TOTAL_STARS} stars`
      : scene === 'ready' || scene === 'skyDone'
        ? 'The moon. Click it, my love'
        : 'The moon';
  const showSky = ['sky', 'awakening', 'ready', 'skyDone'].includes(scene);
  const unlockStage = scene === 'ready' ? 'ready' : cine;
  const showUnlockText = scene === 'ready' || (scene === 'awakening' && (cine === 'text1' || cine === 'text2'));

  return (
    <div className="fixed inset-0 overflow-hidden font-ui text-white" data-scene={scene}>
      <Universe dark={dark} hidden={scene === 'message'} />

      <Moon mode={moonMode} w={w} h={h} interactive={moonInteractive} onClick={onMoon} shake={shake} label={moonLabel} />

      {showSky && (
        <Sky
          w={w}
          h={h}
          layout={layout}
          found={found}
          scene={scene}
          cine={cine}
          fx={fx}
          registerStar={registerStar}
          onDiscover={progress.discover}
          onFinalStar={onFinalStar}
          onFinalCardClosed={runCinematic}
          onReset={startOver}
          onToast={showToast}
        />
      )}

      <AnimatePresence>
        {scene === 'intro' && <Intro key="intro" portrait={h >= w} found={found.length} onEnter={enter} />}
      </AnimatePresence>

      <AnimatePresence>{showUnlockText && <UnlockText key="unlock" stage={unlockStage} />}</AnimatePresence>

      {scene === 'message' && unlocked && <FinalMessage fx={fx} onFinished={progress.markFinished} onBack={backToSky} />}

      <Particles ref={fx} />
      <SoundToggle muted={muted} onToggle={toggleSound} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            className="glass fixed inset-x-0 mx-auto w-fit max-w-[88vw] rounded-full px-5 py-3 text-center font-ui text-[0.82rem] font-medium text-white/95"
            style={{ bottom: 'calc(var(--safe-bottom) + 84px)', zIndex: 72 }}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4 }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
