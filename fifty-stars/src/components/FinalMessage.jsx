import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Words from './Words.jsx';
import GlassButton from './GlassButton.jsx';
import BigHeart from './BigHeart.jsx';
import MessageGlow from './MessageGlow.jsx';
import { FINAL_LINES, FINALE_LINES } from '../data/copy.js';
import { audio } from '../lib/audio.js';

const LOOK = {
  script: { cls: 'font-script leading-[1.05]', size: 'clamp(3rem, 13vw, 6.2rem)', stagger: 0.2, delay: 0 },
  mega: { cls: 'font-display font-black uppercase leading-[0.98] tracking-[-0.01em] text-balance', size: 'clamp(2.7rem, 13.8vw, 8.6rem)', stagger: 0.24, delay: 0 },
  body: { cls: 'font-serif font-medium leading-[1.42] text-balance', size: 'clamp(1.32rem, 5.4vw, 2.05rem)', stagger: 0.12, delay: 0 },
};
const TONE = {
  pink: { word: 't-rose', glow: 'drop-shadow(0 0 30px rgba(255,90,170,0.65))' },
  white: { word: 't-moon', glow: 'drop-shadow(0 0 28px rgba(210,170,255,0.7))' },
  gold: { word: 't-gold', glow: 'drop-shadow(0 0 30px rgba(255,201,77,0.7))' },
  script: { word: 't-gold', glow: 'drop-shadow(0 0 26px rgba(255,150,210,0.65))' },
};

// how long each line is left on screen before the next one arrives (ms)
const hold = (line) => (line.size === 'mega' ? 2700 : line.size === 'script' ? 2900 : 1600 + line.text.length * 42);

/**
 * Parts 5 + 6: the letter, one line at a time, then the giant heart.
 * It scrolls itself to follow the newest line; tapping anywhere hurries along.
 */
export default function FinalMessage({ fx, onFinished, onBack }) {
  const [shown, setShown] = useState(0); // main lines revealed so far
  const [stage, setStage] = useState(0); // 0 none · 1 heart · 2/3 closing lines · 4 buttons
  const [run, setRun] = useState(0); // bumps to read it again
  const scroller = useRef(null);
  const lineEls = useRef([]);
  const finaleEls = useRef([]);
  const lastUserScroll = useRef(0);
  const seq = useRef({ steps: [], i: 0, timer: 0 });

  const follow = useCallback((el) => {
    if (!el) return;
    if (Date.now() - lastUserScroll.current < 4500) return; // she is scrolling herself
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 160);
  }, []);

  // ---- the timeline -------------------------------------------------------
  useEffect(() => {
    setShown(0);
    setStage(0);
    scroller.current?.scrollTo({ top: 0 });
    const s = seq.current;
    s.i = 0;
    clearTimeout(s.timer);

    const steps = [];
    FINAL_LINES.forEach((line, k) => {
      steps.push({
        wait: k === 0 ? 3900 : hold(FINAL_LINES[k - 1]),
        run: () => {
          setShown(k + 1);
          audio.line(line.size !== 'body');
        },
      });
    });
    const lastLine = FINAL_LINES[FINAL_LINES.length - 1];
    steps.push({
      wait: hold(lastLine) + 500,
      run: () => {
        setStage(1);
        audio.finale();
        audio.startHeartbeat();
        fx.current?.setDust(null);
        fx.current?.setHearts({ rate: 22, prefill: 170 });
        fx.current?.heartBurst(window.innerWidth / 2, window.innerHeight * 0.45, 70);
        onFinished?.();
      },
    });
    steps.push({ wait: 3600, run: () => setStage(2) });
    steps.push({ wait: 5200, run: () => setStage(3) });
    steps.push({ wait: 4400, run: () => setStage(4) });
    s.steps = steps;

    const advance = () => {
      const step = s.steps[s.i];
      if (!step) return;
      s.i += 1;
      step.run();
      const nextStep = s.steps[s.i];
      if (nextStep) s.timer = setTimeout(advance, nextStep.wait);
    };
    s.advance = advance;
    s.timer = setTimeout(advance, steps[0].wait);

    fx.current?.setDust({ rate: 7 });
    return () => {
      clearTimeout(s.timer);
      fx.current?.setDust(null);
      fx.current?.setHearts(null);
      audio.stopHeartbeat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // ---- follow the newest thing on screen -----------------------------------
  useEffect(() => {
    if (stage === 0) follow(lineEls.current[shown - 1]);
  }, [shown, stage, follow]);
  useEffect(() => {
    if (stage >= 1) follow(finaleEls.current[Math.min(stage - 1, 3)]);
  }, [stage, follow]);

  const hurry = () => {
    const s = seq.current;
    if (s.i === 0 || !s.steps[s.i]) return; // not started yet, or already finished
    clearTimeout(s.timer);
    s.advance();
  };

  const noteUserScroll = () => {
    lastUserScroll.current = Date.now();
  };

  return (
    <>
      <MessageGlow intense={stage >= 1} />
      <motion.div
        ref={scroller}
        className="no-scrollbar fixed inset-0 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ zIndex: 65, WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', scrollBehavior: 'smooth' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 2.2 }}
        onPointerUp={hurry}
        onWheel={noteUserScroll}
        onTouchMove={noteUserScroll}
      >
        <div
          className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center gap-[clamp(1.8rem,6vh,3.2rem)] px-5 text-center sm:px-6"
          style={{ paddingTop: 'max(22vh, 7rem)', paddingBottom: '36vh' }}
        >
          {FINAL_LINES.slice(0, shown).map((line, i) => {
            const look = LOOK[line.size];
            const tone = TONE[line.size === 'script' ? 'script' : line.tone] || TONE.white;
            return (
              <div key={`${run}-${i}`} ref={(el) => (lineEls.current[i] = el)}>
                {line.size === 'body' ? (
                  <Words
                    as="p"
                    text={line.text}
                    stagger={look.stagger}
                    duration={1}
                    className={`${look.cls} mx-auto max-w-[27em] text-white`}
                    style={{ fontSize: look.size, textShadow: '0 2px 30px rgba(60,10,110,0.8), 0 0 2px rgba(60,10,110,0.5)' }}
                  />
                ) : (
                  <Words
                    as="p"
                    text={line.text}
                    stagger={look.stagger}
                    duration={1.3}
                    blur={16}
                    scale={line.size === 'mega' ? 1.22 : 1}
                    y={line.size === 'mega' ? 30 : 18}
                    wordClass={tone.word}
                    className={look.cls}
                    style={{ fontSize: look.size, filter: tone.glow }}
                  />
                )}
              </div>
            );
          })}

          {/* ---- Part 6: the final animation ---- */}
          {stage >= 1 && (
            <div className="mt-6 flex w-full flex-col items-center gap-[clamp(1.4rem,4.5vh,2.4rem)]">
              <div ref={(el) => (finaleEls.current[0] = el)} className="w-full">
                <BigHeart />
              </div>
              <div ref={(el) => (finaleEls.current[1] = el)} className="min-h-[1px]">
                {stage >= 2 && (
                  <Words
                    as="p"
                    text={FINALE_LINES[0]}
                    stagger={0.14}
                    duration={1.2}
                    wordClass="t-moon"
                    className="font-serif font-semibold italic leading-[1.22] text-balance mx-auto max-w-[18em]"
                    style={{ fontSize: 'clamp(1.7rem, 7.4vw, 3.2rem)', filter: 'drop-shadow(0 0 26px rgba(255,120,200,0.75))' }}
                  />
                )}
              </div>
              <div ref={(el) => (finaleEls.current[2] = el)} className="min-h-[1px]">
                {stage >= 3 && (
                  <Words
                    as="p"
                    text={FINALE_LINES[1]}
                    stagger={0.16}
                    duration={1.3}
                    wordClass="t-gold"
                    className="font-script leading-[1.1] text-balance mx-auto"
                    style={{ fontSize: 'clamp(2.4rem, 10vw, 4.6rem)', filter: 'drop-shadow(0 0 28px rgba(255,201,77,0.7))' }}
                  />
                )}
              </div>
              <div ref={(el) => (finaleEls.current[3] = el)} className="min-h-[1px]" onPointerUp={(e) => e.stopPropagation()}>
                <AnimatePresence>
                  {stage >= 4 && (
                    <motion.div
                      key="end"
                      className="flex flex-wrap items-center justify-center gap-3 pt-2"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.2 }}
                    >
                      <GlassButton variant="primary" onClick={onBack}>
                        Back to my universe 🌙
                      </GlassButton>
                      <GlassButton onClick={() => setRun((r) => r + 1)}>
                        Read it again ❤️
                      </GlassButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
