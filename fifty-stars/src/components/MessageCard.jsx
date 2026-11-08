import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Words from './Words.jsx';
import GlassButton from './GlassButton.jsx';
import { TOTAL_STARS } from '../data/messages.js';

const SPARKLE = 'M12 0C12.8 7.2 16.8 11.2 24 12C16.8 12.8 12.8 16.8 12 24C11.2 16.8 7.2 12.8 0 12C7.2 11.2 11.2 7.2 12 0Z';

/** The glass card that opens when a star is tapped. */
export default function MessageCard({ card, text, onClose }) {
  const { index, isNew, isLast } = card;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const eyebrow = isLast
    ? `Star ${index + 1} of ${TOTAL_STARS} · the last one`
    : `Star ${index + 1} of ${TOTAL_STARS}${isNew ? '' : ' · remembered'}`;

  return (
    <motion.div
      className="fixed inset-0 grid place-items-center px-5"
      style={{ zIndex: 75, paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(80% 60% at 50% 50%, rgba(20,6,50,0.55), rgba(3,1,12,0.82))' }} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={eyebrow}
        className="glass-deep edge relative w-full max-w-[26rem] rounded-[32px] px-7 pb-7 pt-12 text-center sm:max-w-md sm:px-9"
        initial={{ opacity: 0, scale: 0.84, y: 36 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* golden star badge */}
        <motion.div
          className="absolute left-1/2 grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-full"
          style={{
            top: -31,
            background: 'radial-gradient(circle at 35% 30%, #fff6d8, #ffd36b 55%, #f4ac26)',
            boxShadow: '0 0 34px rgba(255,201,77,0.75), 0 0 90px rgba(255,140,198,0.4)',
          }}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
        >
          <svg viewBox="0 0 24 24" width="30" height="30" fill="#7a3a00" aria-hidden>
            <path d={SPARKLE} />
          </svg>
        </motion.div>

        <p className="mb-4 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-gold-200/90">{eyebrow}</p>

        <Words
          as="p"
          text={text}
          delay={0.25}
          stagger={isNew ? 0.055 : 0.02}
          className="font-serif text-[1.65rem] font-medium italic leading-[1.28] text-white sm:text-[1.95rem]"
          style={{ textShadow: '0 2px 26px rgba(120,40,160,0.65)' }}
        />

        <div className="mx-auto my-6 flex items-center justify-center gap-3 text-gold-300/80" aria-hidden>
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold-300/70" />
          <span className="text-xs">✦</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold-300/70" />
        </div>

        <GlassButton onClick={onClose} variant="primary" autoFocus className="!px-7 !py-3.5 !text-[0.95rem]">
          {isLast ? 'Look up at the sky ✨' : isNew ? 'Keep exploring ✨' : 'Back to the stars'}
        </GlassButton>
      </motion.div>
    </motion.div>
  );
}
