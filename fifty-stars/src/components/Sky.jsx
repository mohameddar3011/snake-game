import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StarButton from './StarButton.jsx';
import MessageCard from './MessageCard.jsx';
import MemoriesDrawer from './MemoriesDrawer.jsx';
import GlassButton from './GlassButton.jsx';
import { MESSAGES, TOTAL_STARS } from '../data/messages.js';
import { skyMoon } from '../lib/geometry.js';
import { audio } from '../lib/audio.js';

const BLOOM_STAGES = ['bloom', 'text1', 'text2'];

/**
 * The sky scene: the counter, the 50 stars, the dock, and the cards.
 * It stays mounted through the moon's awakening so the stars can light up.
 */
export default function Sky({
  w,
  h,
  layout,
  found,
  scene,
  cine,
  fx,
  registerStar,
  onDiscover,
  onFinalStar,
  onFinalCardClosed,
  onReset,
  onToast,
}) {
  const [queue, setQueue] = useState([]);
  const [drawer, setDrawer] = useState(false);
  const [hintId, setHintId] = useState(null);
  const [pops, setPops] = useState({});
  const hintTimer = useRef(0);
  const closedKey = useRef(null);
  const nonce = useRef(0);
  const timers = useRef([]);
  const revealing = useRef(new Set()); // stars whose card is pending or open: ignore extra taps on them

  const card = queue[0] ?? null;
  const interactive = scene === 'sky' || scene === 'skyDone';
  const count = found.length;
  const flare = scene === 'ready' || scene === 'skyDone' || (scene === 'awakening' && cine && cine !== 'dimming');
  const hud = interactive || (scene === 'awakening' && ['dimming', 'flare', 'travel'].includes(cine));
  const starsDimmed = scene === 'ready' || (scene === 'awakening' && BLOOM_STAGES.includes(cine));
  const moon = skyMoon(w, h);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      clearTimeout(hintTimer.current);
    },
    []
  );

  // ----------------------------------------------------------- tapping a star
  const pick = useCallback(
    (id, el) => {
      if (!interactive || card || drawer || revealing.current.has(id)) return;
      const rect = el?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : w / 2;
      const y = rect ? rect.top + rect.height / 2 : h / 2;
      setHintId((cur) => (cur === id ? null : cur));

      const existing = found.indexOf(id);
      if (existing >= 0) {
        // revisiting a star she already found: same message, nothing new is counted
        revealing.current.add(id);
        audio.starRevisit();
        fx.current?.burst(x, y, { count: 10, size: [4, 9], speed: [30, 120] });
        setQueue((q) => [...q, { id, index: existing, isNew: false, isLast: false, key: `k${nonce.current++}` }]);
        return;
      }

      const res = onDiscover(id);
      if (!res.isNew) return;
      revealing.current.add(id);
      const isLast = res.index === TOTAL_STARS - 1;
      audio.starFound(res.index);
      fx.current?.burst(x, y, { count: 34, speed: [50, 260], size: [7, 18] });
      setPops((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
      if (isLast) onFinalStar(); // the sky starts to darken right away
      timers.current.push(
        setTimeout(() => {
          setQueue((q) => [...q, { id, index: res.index, isNew: true, isLast, key: `k${nonce.current++}` }]);
        }, 520)
      );
    },
    [interactive, card, drawer, found, fx, w, h, onDiscover, onFinalStar]
  );

  const closeCard = useCallback(() => {
    if (!card || closedKey.current === card.key) return;
    closedKey.current = card.key;
    revealing.current.delete(card.id);
    audio.cardClose();
    setQueue((q) => q.slice(1));
    if (card.isLast) onFinalCardClosed();
  }, [card, onFinalCardClosed]);

  // ---------------------------------------------------------------- helpers
  const showStar = useCallback((id) => {
    setDrawer(false);
    setHintId(id);
    audio.hint();
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintId(null), 5200);
  }, []);

  const hint = useCallback(() => {
    const left = layout.stars.filter((s) => !found.includes(s.id));
    if (!left.length) return;
    const s = left[Math.floor(Math.random() * left.length)];
    showStar(s.id);
    onToast('Look for the pulsing ring ✨');
  }, [layout, found, showStar, onToast]);

  const label = (s) => {
    const i = found.indexOf(s.id);
    return i >= 0 ? `Golden star ${i + 1} of ${TOTAL_STARS}. Tap to read its message again` : 'A twinkling star. Tap to discover it';
  };

  return (
    <>
      {/* ----------------------------------------------------- the 50 stars */}
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 5, pointerEvents: interactive ? 'auto' : 'none' }}
        animate={{ opacity: starsDimmed ? 0.5 : 1 }}
        transition={{ duration: 2.5 }}
      >
        {layout.stars.map((s) => (
          <StarButton
            key={s.id}
            star={s}
            found={found.includes(s.id)}
            flare={flare && found.includes(s.id)}
            hinted={hintId === s.id}
            pop={pops[s.id] || 0}
            label={label(s)}
            onPick={pick}
            register={registerStar}
          />
        ))}
      </motion.div>

      {/* ------------------------------------------------------ the counter */}
      <motion.div
        className="pointer-events-none fixed inset-x-0 flex flex-col items-center px-16"
        style={{ top: 'calc(var(--safe-top) + 14px)', zIndex: 65 }}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: hud ? 1 : 0, y: hud ? 0 : -14 }}
        transition={{ duration: 1.2, delay: hud && scene === 'sky' ? 0.5 : 0 }}
      >
        <div
          className="glass edge relative rounded-full px-5 py-2.5 text-center font-ui"
          style={count === TOTAL_STARS ? { boxShadow: '0 0 30px rgba(255,201,77,0.55), 0 0 70px rgba(255,140,198,0.3)' } : undefined}
        >
          <div className="text-[0.64rem] font-semibold uppercase leading-tight tracking-[0.2em] text-white/65">
            Your little universe:
          </div>
          <div className="mt-0.5 whitespace-nowrap text-[0.86rem] font-semibold text-white/90">
            <span data-testid="count" className="t-gold font-display text-[1.25rem] font-extrabold leading-none">
              {count}/{TOTAL_STARS}
            </span>{' '}
            <span>stars discovered</span>
          </div>
        </div>
        <div className="mt-2.5 h-[5px] w-[min(60vw,15rem)] overflow-hidden rounded-full bg-white/12" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL_STARS} aria-valuenow={count} aria-label="Stars discovered">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#ff8cc6,#ffd36b)', boxShadow: '0 0 12px rgba(255,201,77,0.9)' }}
            initial={false}
            animate={{ width: `${(count / TOTAL_STARS) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <AnimatePresence>
          {count === 0 && scene === 'sky' && (
            <motion.p
              key="tip"
              className="mt-3 font-serif text-[1.05rem] italic text-gold-100/90"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: [0, 1, 0.75, 1], y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.6, duration: 1.4 }}
            >
              Tap the twinkling stars ✨
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ----------------------------- lock badge on the sleeping moon */}
      <AnimatePresence>
        {scene === 'sky' && (
          <motion.div
            key="lock"
            aria-hidden
            className="glass pointer-events-none fixed grid h-12 w-12 place-items-center rounded-full"
            style={{ left: moon.cx - 24, top: moon.cy - 24, zIndex: 12 }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.6 }}
            transition={{ delay: 1.4, duration: 0.9 }}
          >
            <motion.svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffe9a8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }}>
              <rect x="5" y="11" width="14" height="9.5" rx="2.5" fill="#ffe9a8" fillOpacity="0.18" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </motion.svg>
          </motion.div>
        )}
        {scene === 'skyDone' && (
          <motion.p
            key="again"
            className="glass pointer-events-none fixed -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 font-ui text-[0.74rem] font-semibold tracking-wide text-gold-100"
            style={{ left: moon.cx, top: moon.cy + moon.d / 2 + 18, zIndex: 12 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2.4, duration: 1 }}
          >
            Tap the moon to read it again 🌙
          </motion.p>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------- dock */}
      <AnimatePresence>
        {interactive && (
          <motion.div
            key="dock"
            className="fixed inset-x-0 flex justify-center gap-3 px-4"
            style={{ bottom: 'calc(var(--safe-bottom) + 16px)', zIndex: 65 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <GlassButton onClick={() => setDrawer(true)} aria-label="Open the stars you have found">
              <span className="text-gold-300">✦</span> Memories
              <span className="ml-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[0.7rem] text-gold-100">{count}</span>
            </GlassButton>
            {count < TOTAL_STARS && (
              <GlassButton onClick={hint} aria-label="Show me a star I haven't found">
                <span className="text-blush-300">✧</span> Hint
              </GlassButton>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------ modals */}
      <AnimatePresence mode="wait">
        {card && <MessageCard key={card.key} card={card} text={MESSAGES[card.index]} onClose={closeCard} />}
      </AnimatePresence>
      <AnimatePresence>
        {drawer && (
          <MemoriesDrawer
            key="drawer"
            found={found}
            onClose={() => setDrawer(false)}
            onShow={showStar}
            onReset={() => {
              setDrawer(false);
              setQueue([]);
              setHintId(null);
              revealing.current.clear();
              timers.current.forEach(clearTimeout);
              timers.current = [];
              onReset();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
