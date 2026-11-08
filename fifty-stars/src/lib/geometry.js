// Shared sizes/positions (in CSS pixels) for the moon in every scene, and the
// areas of the screen the HUD uses. Pure functions: easy to test, no DOM.

export const isPortrait = (w, h) => h >= w;

/** The unlocked, screen-filling moon's diameter. */
export function fullDiameter(w, h) {
  return isPortrait(w, h) ? Math.min(w * 1.62, h * 0.78) : h * 1.04;
}

/** The dim, locked crescent that hangs in the sky while she hunts for stars. */
export function skyMoon(w, h) {
  if (isPortrait(w, h)) {
    const d = Math.min(w * 0.56, h * 0.29);
    return { cx: w * 0.64, cy: 112 + d / 2 + 14, d };
  }
  const d = h * 0.46;
  return { cx: w * 0.7, cy: h * 0.47, d };
}

/** The enormous crescent on the welcome screen. */
export function introMoon(w, h) {
  if (isPortrait(w, h)) {
    const d = Math.min(w * 0.98, h * 0.44);
    return { cx: w * 0.6, cy: d / 2 + 22, d };
  }
  const d = Math.min(h * 0.86, w * 0.5);
  return { cx: w * 0.72, cy: h * 0.48, d };
}

/** Where the full moon sits once it has been unlocked. */
export function readyMoon(w, h) {
  const d = fullDiameter(w, h);
  return isPortrait(w, h) ? { cx: w / 2, cy: h * 0.4, d } : { cx: w / 2, cy: h * 0.47, d };
}
