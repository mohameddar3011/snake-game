import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const SPARKLE = 'M12 0C12.8 7.2 16.8 11.2 24 12C16.8 12.8 12.8 16.8 12 24C11.2 16.8 7.2 12.8 0 12C7.2 11.2 11.2 7.2 12 0Z';

/**
 * One of the 50 clickable stars. Twinkles while hidden, turns golden once found,
 * pops with a ring when tapped. A 48px invisible target keeps it easy to hit.
 */
export default function StarButton({ star, found, flare, hinted, pop, label, onPick, register }) {
  const btn = useRef(null);

  useEffect(() => {
    register?.(star.id, btn.current);
    return () => register?.(star.id, null);
  }, [register, star.id]);

  return (
    <div className="absolute" style={{ left: `${star.x * 100}%`, top: `${star.y * 100}%`, width: 0, height: 0 }}>
      <motion.button
        ref={btn}
        type="button"
        aria-label={label}
        data-star-id={star.id}
        data-found={found ? 'true' : 'false'}
        data-flare={flare ? 'true' : 'false'}
        data-tint={star.tint}
        className="star absolute grid cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
        style={{
          width: 48,
          height: 48,
          left: -24,
          top: -24,
          '--s': star.size,
          '--dur': `${star.dur}s`,
          '--delay': `${star.delay}s`,
        }}
        whileHover={{ scale: 1.18 }}
        whileTap={{ scale: 0.78 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        onClick={() => onPick(star.id, btn.current)}
      >
        <span className="star-glow" />
        <svg className="star-core" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={SPARKLE} />
        </svg>

        {pop > 0 && (
          <>
            <motion.span
              key={`r${pop}`}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(255,225,150,0.95)', boxShadow: '0 0 18px rgba(255,201,77,0.8)' }}
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 3.4, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <motion.span
              key={`s${pop}`}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,246,216,0.95), rgba(255,201,77,0) 65%)' }}
              initial={{ scale: 0.3, opacity: 1 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </>
        )}

        {hinted && (
          <>
            {[0, 0.55, 1.1].map((d) => (
              <motion.span
                key={d}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(255,214,240,0.9)', boxShadow: '0 0 20px rgba(255,140,198,0.8)' }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 3.2], opacity: [0.95, 0] }}
                transition={{ duration: 1.7, delay: d, repeat: Infinity, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </motion.button>
    </div>
  );
}
