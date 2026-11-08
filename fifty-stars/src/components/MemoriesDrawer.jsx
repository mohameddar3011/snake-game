import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MESSAGES, TOTAL_STARS } from '../data/messages.js';
import GlassButton from './GlassButton.jsx';

/** Bottom sheet listing every message she has found so far, in order. */
export default function MemoriesDrawer({ found, onClose, onShow, onReset }) {
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0" style={{ zIndex: 75 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <div className="absolute inset-0 bg-[#03010c]/70 backdrop-blur-[2px]" />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label="Stars you have found"
        className="glass-deep absolute inset-x-0 bottom-0 mx-auto flex max-h-[82dvh] w-full max-w-xl flex-col rounded-t-[34px] px-5 pt-3"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 18px)' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-white/25" aria-hidden />
        <header className="flex items-start justify-between gap-4 pb-3 pt-1">
          <div>
            <h2 className="font-display text-[1.45rem] font-bold leading-tight text-gold-100">Stars you’ve found</h2>
            <p className="mt-1 font-ui text-[0.78rem] text-white/60">
              {found.length} of {TOTAL_STARS} · tap “Show me” to see where one is shining
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-white/80 outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
          >
            ✕
          </button>
        </header>

        <ol className="no-scrollbar -mx-1 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 pb-4 pt-1">
          {found.length === 0 && (
            <li className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-center font-serif text-lg italic text-white/70">
              Nothing yet… tap the twinkling stars to find what I’ve hidden in them ✨
            </li>
          )}
          {found.map((id, i) => (
            <li key={id} className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5">
              <span
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full font-ui text-[0.72rem] font-bold text-[#6b3300]"
                style={{ background: 'radial-gradient(circle at 35% 30%, #fff6d8, #ffd36b 60%, #f4ac26)', boxShadow: '0 0 16px rgba(255,201,77,0.5)' }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[1.15rem] leading-snug text-white/95">{MESSAGES[i]}</p>
                <button
                  type="button"
                  onClick={() => onShow(id)}
                  className="mt-2 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-blush-300 outline-none hover:text-blush-200 focus-visible:underline"
                >
                  ✦ Show me
                </button>
              </div>
            </li>
          ))}
        </ol>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="font-ui text-[0.7rem] text-white/45">Your progress is saved on this device.</p>
          <GlassButton
            onClick={() => (confirm ? onReset() : setConfirm(true))}
            className={`!px-4 !py-2 !text-[0.7rem] ${confirm ? '!text-blush-300' : '!text-white/60'}`}
          >
            {confirm ? 'Tap again to start over' : 'Start over'}
          </GlassButton>
        </footer>
      </motion.section>
    </motion.div>
  );
}
