import { useCallback, useEffect, useRef, useState } from 'react';
import { TOTAL_STARS } from '../data/messages.js';
import { emptyState, load, sanitize, save } from '../lib/storage.js';

/**
 * Her progress, mirrored into localStorage on every change.
 * `found` is the list of star ids in the order she discovered them.
 */
export function useProgress() {
  const [state, setState] = useState(() => load());
  const ref = useRef(state);

  useEffect(() => {
    ref.current = state;
    save(state);
  }, [state]);

  const commit = useCallback((fn) => {
    const next = sanitize(fn(ref.current));
    ref.current = next; // synchronous, so a fast double-tap can never count twice
    setState(next);
    return next;
  }, []);

  /** Returns { isNew, index }. A star that is already found never counts again. */
  const discover = useCallback(
    (id) => {
      const cur = ref.current;
      if (!Number.isInteger(id) || id < 0 || id >= TOTAL_STARS || cur.found.includes(id)) {
        return { isNew: false, index: cur.found.indexOf(id) };
      }
      const next = commit((s) => ({ ...s, found: [...s.found, id] }));
      return { isNew: true, index: next.found.length - 1 };
    },
    [commit]
  );

  const markUnlocked = useCallback(() => commit((s) => ({ ...s, unlocked: s.found.length === TOTAL_STARS })), [commit]);
  const markFinished = useCallback(() => commit((s) => ({ ...s, finished: s.unlocked })), [commit]);
  const setMuted = useCallback((muted) => commit((s) => ({ ...s, muted })), [commit]);
  const reset = useCallback(() => commit((s) => ({ ...emptyState(), muted: s.muted })), [commit]);

  return { ...state, discover, markUnlocked, markFinished, setMuted, reset };
}
