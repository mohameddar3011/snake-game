import { motion } from 'framer-motion';

/** Round glass mute button, always in the top-right corner. */
export default function SoundToggle({ muted, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? 'Turn the music on' : 'Mute the music'}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      className="glass fixed grid h-11 w-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
      style={{ right: 14, top: 'calc(var(--safe-top) + 12px)', zIndex: 80 }}
    >
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gold-200">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" fillOpacity="0.25" />
        {muted ? (
          <>
            <path d="M16 9.5l5 5" />
            <path d="M21 9.5l-5 5" />
          </>
        ) : (
          <>
            <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
            <path d="M18.2 6.8a7.5 7.5 0 0 1 0 10.4" />
          </>
        )}
      </svg>
    </motion.button>
  );
}
