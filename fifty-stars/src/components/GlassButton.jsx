import { motion } from 'framer-motion';

/**
 * A glassy pill button: frosted fill, gradient hairline edge and a slow sheen.
 * variant: "primary" (glowing call to action) | "soft" (quiet glass pill)
 */
export default function GlassButton({ children, onClick, variant = 'soft', className = '', type = 'button', ...rest }) {
  const primary = variant === 'primary';
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={{ scale: 1.045 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`edge relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-ui outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
        primary
          ? 'px-9 py-[18px] text-[1.05rem] font-semibold tracking-[0.02em] text-white'
          : 'glass px-5 py-3 text-[0.82rem] font-semibold tracking-[0.04em] text-white/90'
      } ${className}`}
      style={primary ? { boxShadow: '0 0 34px rgba(255,120,200,0.45), 0 0 90px rgba(150,90,255,0.35), inset 0 1px 0 rgba(255,255,255,0.35)' } : undefined}
      {...rest}
    >
      {primary && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,120,190,0.5), rgba(160,90,240,0.42) 55%, rgba(255,201,77,0.28))',
            WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
            backdropFilter: 'blur(16px) saturate(1.6)',
          }}
        />
      )}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-1/3"
        style={{ left: '-40%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.38), transparent)', transform: 'skewX(-18deg)' }}
        animate={{ left: ['-40%', '140%'] }}
        transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: primary ? 2.2 : 4.5 }}
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
