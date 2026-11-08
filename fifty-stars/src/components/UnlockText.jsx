import { useRef } from 'react';
import { motion } from 'framer-motion';
import Words from './Words.jsx';
import { UNLOCK_LINES } from '../data/copy.js';

const ORDER = ['text1', 'text2', 'ready'];

/**
 * Part 4 captions, in a glass panel at the bottom so they stay readable
 * over the enormous bright moon.
 */
export default function UnlockText({ stage }) {
  const at = (s) => ORDER.indexOf(stage) >= ORDER.indexOf(s);
  // arriving straight at "ready" (she came back after unlocking): let the moon finish swelling first
  const late = useRef(stage === 'ready').current ? 2.8 : 0;
  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center px-4"
      style={{ zIndex: 66, paddingBottom: 'calc(var(--safe-bottom) + 18px)' }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30, transition: { duration: 0.8 } }}
      transition={{ duration: 1.2, ease: 'easeOut', delay: late }}
    >
      <div
        className="glass-deep edge relative w-full max-w-xl rounded-[30px] px-6 pb-6 pt-6 text-center"
        style={{ boxShadow: '0 0 60px rgba(255,150,210,0.28), 0 24px 80px rgba(6,1,24,0.6), inset 0 1px 0 rgba(255,255,255,0.26)' }}
      >
        <Words
          as="h2"
          show={at('text1')}
          delay={late}
          text={UNLOCK_LINES.title}
          stagger={0.16}
          duration={1.1}
          scale={1.2}
          wordClass="t-gold"
          className="font-display font-black uppercase leading-[1.04] tracking-[0.02em]"
          style={{ fontSize: 'clamp(1.7rem, 8.2vw, 3.3rem)', filter: 'drop-shadow(0 0 18px rgba(255,201,77,0.55))' }}
        />
        <Words
          as="p"
          show={at('text2')}
          delay={late}
          text={UNLOCK_LINES.sub}
          stagger={0.08}
          className="mx-auto mt-3 block max-w-[30ch] font-serif text-[1.2rem] font-medium italic leading-snug text-white/95 sm:text-[1.4rem]"
        />
        <Words
          as="p"
          show={at('ready')}
          delay={late}
          text={UNLOCK_LINES.cta}
          stagger={0.14}
          duration={1.2}
          wordClass="t-rose"
          className="mt-3 block font-script leading-none"
          style={{ fontSize: 'clamp(2rem, 9vw, 3rem)', filter: 'drop-shadow(0 0 16px rgba(255,140,198,0.7))' }}
        />
      </div>
    </motion.div>
  );
}
