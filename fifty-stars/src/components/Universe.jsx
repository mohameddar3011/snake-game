import { motion } from 'framer-motion';
import StarField from './StarField.jsx';

/** The night sky itself: gradient, drifting nebula, stars, and the "darkening" veil. */
export default function Universe({ dark, hidden }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, background: 'linear-gradient(180deg,#05020f 0%,#0a0426 34%,#170a47 68%,#35105f 90%,#52186e 100%)' }}
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={{ duration: 2.4, ease: 'easeInOut' }}
    >
      {/* drifting nebula clouds */}
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      <div className="nebula nebula-c" />
      {/* a rosy glow rising from the horizon */}
      <div className="absolute inset-x-0 bottom-0 h-[38%]" style={{ background: 'radial-gradient(120% 100% at 50% 110%, rgba(255,110,190,0.32), rgba(150,70,220,0.14) 45%, transparent 75%)' }} />
      <StarField />
      {/* darkening veil used while the moon wakes */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(90% 70% at 50% 45%, #0a0420 0%, #02000a 85%)' }}
        initial={false}
        animate={{ opacity: dark ? 0.78 : 0 }}
        transition={{ duration: dark ? 4.5 : 1.6, ease: 'easeInOut' }}
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(2,0,10,0.55) 100%)' }} />
    </motion.div>
  );
}
