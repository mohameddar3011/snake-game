import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Words from './Words.jsx';
import GlassButton from './GlassButton.jsx';
import { INTRO_LINES } from '../data/copy.js';
import { TOTAL_STARS } from '../data/messages.js';

// when each beat arrives (ms after the previous one)
const BEATS = [900, 3000, 3700, 4600];

/**
 * Part 1: the welcome. Three lines arrive one after another beside the huge
 * crescent moon, then the button. Tapping anywhere skips ahead.
 */
export default function Intro({ portrait, found, onEnter }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= BEATS.length) return undefined;
    const t = setTimeout(() => setStep((s) => s + 1), BEATS[step]);
    return () => clearTimeout(t);
  }, [step]);

  const skip = () => setStep((s) => Math.min(s + 1, BEATS.length));

  return (
    <motion.section
      className="fixed inset-0 flex"
      style={{ zIndex: 65, paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.9 } }}
      onPointerUp={skip}
    >
      <div
        className={
          portrait
            ? 'mx-auto flex h-full w-full max-w-xl flex-col justify-end px-7 pb-8 text-center'
            : 'my-auto ml-[7vw] flex w-[44vw] max-w-[40rem] flex-col text-left'
        }
      >
        <Words
          as="h1"
          show={step >= 1}
          text={INTRO_LINES.greeting}
          stagger={0.18}
          duration={1.3}
          blur={14}
          wordClass="t-gold"
          className="font-script leading-[1.02]"
          style={{
            fontSize: 'clamp(2.4rem, min(10.6vw, 7.4vh), 5.4rem)',
            filter: 'drop-shadow(0 0 22px rgba(255,150,210,0.55))',
          }}
        />

        <Words
          as="p"
          show={step >= 2}
          text={INTRO_LINES.universe}
          stagger={0.085}
          className="mt-4 font-serif font-medium italic leading-[1.28] text-white/95"
          style={{ fontSize: 'clamp(1.1rem, min(5.2vw, 3vh), 1.75rem)', textShadow: '0 2px 20px rgba(80,20,140,0.7)' }}
        />

        <p
          className="mt-4 font-serif leading-[1.3] text-white/90"
          style={{ fontSize: 'clamp(1.02rem, min(4.7vw, 2.8vh), 1.55rem)', textShadow: '0 2px 20px rgba(80,20,140,0.7)' }}
        >
          <Words show={step >= 3} text="50 little stars." wordClass="t-gold font-semibold" stagger={0.14} />{' '}
          <Words show={step >= 3} text="50 things I want you to remember." wordClass="t-gold font-semibold" delay={0.5} stagger={0.1} />{' '}
          <Words show={step >= 3} text="And one very important message waiting for you at the end." wordClass="italic" delay={1.3} stagger={0.1} />
        </p>

        <div className={`mt-7 flex min-h-[5.5rem] flex-col gap-3 ${portrait ? 'items-center' : 'items-start'}`}>
          <AnimatePresence>
            {step >= 4 && (
              <motion.div
                key="cta"
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 160 }}
                onPointerUp={(e) => e.stopPropagation()}
              >
                <GlassButton variant="primary" onClick={onEnter}>
                  {INTRO_LINES.button}
                </GlassButton>
                {found > 0 && (
                  <p className="font-ui text-[0.72rem] tracking-wide text-white/60">
                    Welcome back · {found}/{TOTAL_STARS} stars are waiting for you
                  </p>
                )}
              </motion.div>
            )}
            {step < 4 && step > 0 && (
              <motion.p
                key="skip"
                className="font-ui text-[0.68rem] uppercase tracking-[0.24em] text-white/35"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 1.5 }}
              >
                tap to continue
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
