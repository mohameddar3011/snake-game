import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createParticles } from '../lib/particles.js';

/**
 * Full-screen, click-through canvas for sparkles, golden light streams and
 * floating hearts. Exposes the engine's methods through a ref.
 */
const Particles = forwardRef(function Particles(_, ref) {
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const e = createParticles(canvasRef.current, { reduced: !!reduce });
    engine.current = e;
    const onResize = () => e.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      e.destroy();
      engine.current = null;
    };
  }, [reduce]);

  useImperativeHandle(
    ref,
    () => ({
      burst: (...a) => engine.current?.burst(...a),
      heartBurst: (...a) => engine.current?.heartBurst(...a),
      comets: (...a) => engine.current?.comets(...a),
      setAmbient: (...a) => engine.current?.setAmbient(...a),
      setHearts: (...a) => engine.current?.setHearts(...a),
      setDust: (...a) => engine.current?.setDust(...a),
      clear: () => engine.current?.clear(),
    }),
    []
  );

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed left-0 top-0" style={{ zIndex: 60 }} />;
});

export default Particles;
