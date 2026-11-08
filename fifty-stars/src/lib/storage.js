// Progress is saved in localStorage. Everything read back is validated, so a
// corrupt or hand-edited value can never break the page or skip the lock.
import { TOTAL_STARS } from '../data/messages.js';

export const STORAGE_KEY = 'fifty-stars-before-the-moon:v1';

export function emptyState() {
  return { found: [], unlocked: false, finished: false, muted: false };
}

/** found = star ids in the order they were discovered (each at most once). */
export function sanitize(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const seen = new Set();
  const found = [];
  if (Array.isArray(raw.found)) {
    for (const id of raw.found) {
      if (Number.isInteger(id) && id >= 0 && id < TOTAL_STARS && !seen.has(id)) {
        seen.add(id);
        found.push(id);
      }
    }
  }
  const complete = found.length === TOTAL_STARS;
  const unlocked = complete && raw.unlocked === true;
  return {
    found,
    unlocked,
    finished: unlocked && raw.finished === true,
    muted: raw.muted === true,
  };
}

export function load(storage = safeStorage()) {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return emptyState();
  }
}

export function save(state, storage = safeStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(sanitize(state)));
  } catch {
    /* private mode / quota: the experience still works, it just won't be remembered */
  }
}

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
