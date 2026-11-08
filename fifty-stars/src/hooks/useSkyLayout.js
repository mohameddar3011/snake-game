import { useRef } from 'react';
import { generateLayout } from '../lib/layout.js';

/**
 * The 50 star positions for the current screen. The layout only regenerates
 * when the screen really changes shape (rotation, big resize), not when a phone's
 * browser bar slides away, so stars never jump around under her finger.
 */
export function useSkyLayout(w, h) {
  const ref = useRef(null);
  const cur = ref.current;
  if (!cur || Math.abs(cur.w - w) > 40 || Math.abs(cur.h - h) > 150 || cur.portrait !== h >= w) {
    ref.current = { w, h, portrait: h >= w, layout: generateLayout(w, h) };
  }
  return ref.current.layout;
}
