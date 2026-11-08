import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { mulberry32 } from '../lib/rng.js';

/**
 * Hundreds of tiny twinkling background stars, drawn on one canvas, plus the
 * odd shooting star. (The 50 clickable stars are separate.)
 */
const TINTS = [
  [255, 255, 255], [255, 255, 255], [255, 255, 255], [236, 226, 255],
  [255, 214, 236], [255, 236, 190], [210, 220, 255],
];

export default function StarField() {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;
    let dpr = 1;
    let stars = [];
    let raf = 0;
    let running = true;
    let shoot = null;
    let nextShoot = performance.now() + 4000;

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rnd = mulberry32(777);
      const count = Math.max(280, Math.min(560, Math.round((W * H) / 1700)));
      stars = Array.from({ length: count }, () => {
        const big = rnd() < 0.06;
        return {
          x: rnd() * W,
          y: rnd() * H,
          r: big ? 1.3 + rnd() * 0.9 : 0.35 + rnd() * 0.9,
          a: 0.35 + rnd() * 0.65,
          sp: 0.5 + rnd() * 2.2,
          ph: rnd() * 6.28,
          c: TINTS[Math.floor(rnd() * TINTS.length)],
          big,
        };
      });
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      const t = now / 1000;
      for (const s of stars) {
        const tw = reduce ? 0.85 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        const a = s.a * tw;
        const [r, g, b] = s.c;
        if (s.big) {
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.fillRect(s.x - s.r * 5, s.y - s.r * 5, s.r * 10, s.r * 10);
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
      // shooting star
      if (!reduce) {
        if (!shoot && now > nextShoot) {
          const fromLeft = Math.random() < 0.5;
          shoot = {
            x: fromLeft ? Math.random() * W * 0.5 : W * (0.5 + Math.random() * 0.5),
            y: Math.random() * H * 0.35,
            vx: (fromLeft ? 1 : -1) * (520 + Math.random() * 300),
            vy: 220 + Math.random() * 160,
            life: 0,
          };
        }
        if (shoot) {
          shoot.life += 1 / 60;
          shoot.x += shoot.vx / 60;
          shoot.y += shoot.vy / 60;
          const a = Math.max(0, 1 - shoot.life / 0.9);
          const len = 130;
          const mag = Math.hypot(shoot.vx, shoot.vy);
          const tx = shoot.x - (shoot.vx / mag) * len;
          const ty = shoot.y - (shoot.vy / mag) * len;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
          g.addColorStop(0, `rgba(255,240,210,${a})`);
          g.addColorStop(1, 'rgba(255,200,230,0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          if (shoot.life > 0.9) {
            shoot = null;
            nextShoot = now + 7000 + Math.random() * 7000;
          }
        }
      }
    }

    function loop(now) {
      if (!running) return;
      draw(now);
      if (!reduce) raf = requestAnimationFrame(loop);
    }

    function onResize() {
      build();
      draw(performance.now());
    }
    function onVis() {
      running = !document.hidden;
      if (running && !reduce) raf = requestAnimationFrame(loop);
    }

    build();
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0" />;
}
