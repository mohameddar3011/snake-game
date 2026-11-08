import { useEffect, useState } from 'react';

const read = () => ({ w: window.innerWidth, h: window.innerHeight });

/** Current viewport size in CSS pixels (updates on resize / rotation). */
export function useViewport() {
  const [vp, setVp] = useState(read);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const n = read();
        setVp((p) => (p.w === n.w && p.h === n.h ? p : n));
      });
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return vp;
}
