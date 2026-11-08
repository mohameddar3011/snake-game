import { motion } from 'framer-motion';

const HEART = 'M60 104C20 74 4 52 4 33C4 16 17 5 33 5C45 5 54 11 60 21C66 11 75 5 87 5C103 5 116 16 116 33C116 52 100 74 60 104Z';

/** The massive beating heart for the finale. */
export default function BigHeart() {
  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: 'clamp(15rem, min(84vw, 50vh), 34rem)' }}
      initial={{ scale: 0, rotate: -14, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 11, stiffness: 70, mass: 1.2 }}
    >
      {/* halo that breathes with the heart */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: '170%',
          aspectRatio: '1',
          background: 'radial-gradient(closest-side, rgba(255,90,170,0.55), rgba(170,90,255,0.28) 55%, transparent 78%)',
          animation: 'heartbeat 1.3s ease-in-out infinite',
        }}
      />
      <div style={{ animation: 'heartbeat 1.3s ease-in-out infinite', transformOrigin: '50% 55%' }}>
        <svg
          viewBox="0 0 120 108"
          className="relative block w-full"
          style={{ filter: 'drop-shadow(0 0 22px rgba(255,80,170,0.85)) drop-shadow(0 0 70px rgba(160,80,255,0.7))' }}
          role="img"
          aria-label="A big, beating heart"
        >
          <defs>
            <linearGradient id="hg" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#ffc2e0" />
              <stop offset="0.42" stopColor="#ff5fae" />
              <stop offset="1" stopColor="#9a46ff" />
            </linearGradient>
            <radialGradient id="hs" cx="0.3" cy="0.22" r="0.55">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d={HEART} fill="url(#hg)" />
          <path d={HEART} fill="url(#hs)" />
          <path d="M26 20C17 22 11 30 12 40" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3.2" strokeLinecap="round" />
          <path d={HEART} fill="none" stroke="#ffe9f5" strokeOpacity="0.5" strokeWidth="1" />
        </svg>
      </div>
    </motion.div>
  );
}
