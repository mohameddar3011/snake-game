import { useEffect, useRef } from 'react';
import { animate, motion, useAnimationControls, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { drawPhase, paintMoon } from '../lib/moonTexture.js';
import { fullDiameter, introMoon, readyMoon, skyMoon } from '../lib/geometry.js';

/**
 * The one moon that lives through the whole experience.
 *
 * It is always rendered at its biggest ("full") size and then moved/scaled by
 * transforms, so it stays crisp and animates on the GPU. A dark "shadow" disc
 * slides across it: offset = crescent, slid away = full moon.
 *
 * modes: intro | locked | charging | massive | expanding | small
 */
const TEX = 900; // texture size in px
const EASE = [0.65, 0, 0.35, 1];
const SLOW = [0.4, 0, 0.15, 1];

export default function Moon({ mode, w, h, interactive, onClick, shake, label }) {
  const reduce = useReducedMotion();
  const canvasRef = useRef(null);
  const ghostRef = useRef(null);
  const shakeCtl = useAnimationControls();
  const full = fullDiameter(w, h);

  // paint the full moon once into an off-screen canvas, then draw it at the current phase
  const baseRef = useRef(null);
  const phase = useMotionValue(mode === 'intro' || mode === 'locked' || mode === 'charging' ? 0 : 1);
  const render = (v) => {
    const c = canvasRef.current;
    if (c && baseRef.current) drawPhase(c.getContext('2d'), baseRef.current, TEX, v);
  };
  useEffect(() => {
    const base = document.createElement('canvas');
    paintMoon(base, TEX);
    baseRef.current = base;
    const c = canvasRef.current;
    if (c) c.width = c.height = TEX;
    render(phase.get());
    const g = ghostRef.current;
    if (g) {
      g.width = g.height = 450;
      g.getContext('2d')?.drawImage(base, 0, 0, 450, 450);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useMotionValueEvent(phase, 'change', render);

  useEffect(() => {
    if (!shake) return;
    shakeCtl.start({ x: [0, -26, 24, -16, 12, -5, 0], rotate: [0, -1.2, 1, -0.6, 0.4, 0, 0], transition: { duration: 0.65, ease: 'easeOut' } });
  }, [shake, shakeCtl]);

  const target = stateFor(mode, w, h, full);
  const t = transitionFor(mode, reduce);
  useEffect(() => {
    const controls = animate(phase, target.crescent ? 0 : 1, t.shadow);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.crescent]);
  const pulsing = (mode === 'massive' || mode === 'small') && !reduce;

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-disabled={!interactive}
      tabIndex={interactive ? 0 : -1}
      onClick={interactive ? onClick : undefined}
      initial={false}
      animate={{ x: target.x, y: target.y, scale: target.scale, opacity: target.opacity }}
      transition={t.move}
      className="absolute rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-4 focus-visible:ring-gold-300/70"
      style={{
        left: w / 2 - full / 2,
        top: h / 2 - full / 2,
        width: full,
        height: full,
        zIndex: 10,
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        willChange: 'transform, opacity',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* only the round button is a click target; every layer inside lets taps through, so stars near the moon's square bounding box stay tappable */}
      <motion.div className="pointer-events-none absolute inset-0" animate={shakeCtl}>
        <div className={`absolute inset-0 ${pulsing ? 'moon-pulse' : ''}`} style={{ willChange: 'transform' }}>
          {/* the dark side, faintly visible like earthshine */}
          <motion.div className="absolute inset-0" style={{ rotate: -24, willChange: 'transform' }} animate={{ opacity: target.bright * 0.06 }} transition={t.bright}>
            <canvas ref={ghostRef} className="absolute inset-0 h-full w-full rounded-full" />
          </motion.div>

          {/* the lit moon, drawn at the current phase: crescent to full */}
          <motion.div className="absolute inset-0" style={{ rotate: -24, willChange: 'transform' }}>
            {/* glow that hugs the lit part */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute rounded-full"
              style={{
                inset: '-48%',
                willChange: 'transform, opacity',
                background:
                  'radial-gradient(closest-side, rgba(255,236,196,0.6) 0%, rgba(255,196,226,0.32) 34%, rgba(168,104,240,0.14) 62%, rgba(120,60,200,0) 100%)',
              }}
              animate={{ opacity: target.glow, x: target.crescent ? -full * 0.26 : 0, scale: target.crescent ? 0.78 : 1 }}
              transition={t.glow}
            />
            <motion.canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full rounded-full"
              initial={false}
              animate={{ opacity: target.bright }}
              transition={t.bright}
            />
          </motion.div>

          {/* "tap me" ripples once the moon can be opened */}
          {interactive && (mode === 'massive' || mode === 'small') && !reduce && (
            <>
              <span aria-hidden className="moon-ring" />
              <span aria-hidden className="moon-ring" style={{ animationDelay: '1.3s' }} />
            </>
          )}
        </div>
      </motion.div>
    </motion.button>
  );
}

function stateFor(mode, w, h, full) {
  const at = (c, extra = {}) => ({
    x: c.cx - w / 2,
    y: c.cy - h / 2,
    scale: c.d / full,
    opacity: 1,
    crescent: true,
    bright: 1,
    glow: 1,
    ...extra,
  });
  switch (mode) {
    case 'intro':
      return at(introMoon(w, h), { bright: 1, glow: 1 });
    case 'locked':
      return at(skyMoon(w, h), { bright: 0.4, glow: 0.2 });
    case 'charging':
      return at(skyMoon(w, h), { bright: 0.95, glow: 0.9 });
    case 'massive':
      return at(readyMoon(w, h), { crescent: false });
    case 'expanding': {
      const c = readyMoon(w, h);
      return at({ ...c, d: c.d * 3.2 }, { crescent: false, opacity: 0, glow: 1 });
    }
    case 'small':
      return at(skyMoon(w, h), { crescent: false, glow: 0.85 });
    default:
      return at(skyMoon(w, h));
  }
}

function transitionFor(mode, reduce) {
  const k = reduce ? 0.25 : 1;
  switch (mode) {
    case 'locked':
      return { move: { duration: 2.4 * k, ease: EASE }, bright: { duration: 2 * k }, glow: { duration: 2 * k }, shadow: { duration: 1 * k } };
    case 'charging':
      return { move: { duration: 0.6 }, bright: { duration: 2.6 * k, ease: 'easeIn' }, glow: { duration: 2.6 * k }, shadow: { duration: 1 } };
    case 'massive':
      return { move: { duration: 6.2 * k, ease: SLOW }, bright: { duration: 3 * k }, glow: { duration: 4 * k }, shadow: { duration: 3.6 * k, ease: [0.5, 0, 0.2, 1], delay: 0.3 * k } };
    case 'expanding':
      return { move: { duration: 4 * k, ease: [0.5, 0, 0.9, 0.6] }, bright: { duration: 1 }, glow: { duration: 3 }, shadow: { duration: 0.5 } };
    case 'small':
      return { move: { duration: 2.4 * k, ease: EASE }, bright: { duration: 1.6 }, glow: { duration: 1.6 }, shadow: { duration: 1.4 } };
    default:
      return { move: { duration: 1.6 * k, ease: EASE }, bright: { duration: 1.4 }, glow: { duration: 1.4 }, shadow: { duration: 1.4 } };
  }
}
