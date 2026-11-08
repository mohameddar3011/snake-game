import { motion } from 'framer-motion';

/**
 * The full-screen glowing background behind the final message. It fades in
 * while the moon swells over the screen, and glows pink + purple at the end.
 */
export default function MessageGlow({ intense }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 40, background: 'radial-gradient(130% 90% at 50% -8%, #7a2fb4 0%, #42157f 34%, #1d0a4a 66%, #0f0429 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 3.2, delay: 0.9, ease: 'easeInOut' }}
    >
      {/* moonlight pooling from above */}
      <motion.div
        className="glow-blob"
        style={{ width: '120vmax', height: '120vmax', left: '50%', top: '-62vmax', marginLeft: '-60vmax', background: 'radial-gradient(closest-side, rgba(255,222,170,0.62), rgba(255,170,210,0.3) 46%, transparent 74%)' }}
        animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="glow-blob"
        style={{ width: '95vmax', height: '95vmax', left: '-42vmax', top: '24vh', background: 'radial-gradient(closest-side, rgba(255,95,174,0.46), transparent 72%)' }}
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="glow-blob"
        style={{ width: '100vmax', height: '100vmax', right: '-48vmax', bottom: '-34vmax', background: 'radial-gradient(closest-side, rgba(140,90,255,0.55), transparent 72%)' }}
        animate={{ x: [0, -60, 0], y: [0, 24, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* the finale: everything swells pink and purple */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(90% 70% at 50% 62%, rgba(255,70,165,0.62), rgba(180,70,255,0.42) 48%, transparent 80%)' }}
        initial={false}
        animate={{ opacity: intense ? 1 : 0 }}
        transition={{ duration: 3 }}
      />
      {intense && (
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(70% 55% at 50% 60%, rgba(255,180,225,0.4), transparent 70%)' }}
          animate={{ opacity: [0.2, 0.85, 0.2] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 95% at 50% 50%, transparent 52%, rgba(10,2,30,0.5) 100%)' }} />
    </motion.div>
  );
}
