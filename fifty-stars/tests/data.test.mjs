import test from 'node:test';
import assert from 'node:assert/strict';
import { MESSAGES, TOTAL_STARS } from '../src/data/messages.js';
import { FINAL_LINES, FINALE_LINES, INTRO_LINES, UNLOCK_LINES } from '../src/data/copy.js';
import { sanitize, load, save, STORAGE_KEY } from '../src/lib/storage.js';

test('exactly 50 unique, non-empty messages', () => {
  assert.equal(TOTAL_STARS, 50);
  assert.equal(MESSAGES.length, 50);
  assert.equal(new Set(MESSAGES).size, 50);
  for (const m of MESSAGES) assert.ok(m.trim().length > 10);
});

test('key messages are word-for-word', () => {
  assert.equal(MESSAGES[0], 'I wish I could be next to you right now, even if we did absolutely nothing.');
  assert.equal(MESSAGES[19], 'I can’t wait for the day when saying goodbye doesn’t mean leaving each other at an airport.');
  assert.equal(MESSAGES[42], 'I know that saying sorry is easy. Showing that I mean it takes actions.');
  assert.equal(
    MESSAGES[49],
    'If there’s one thing I never want you to forget, it’s that I love you so much, and you mean more to me than I can properly explain.'
  );
});

test('final message is the exact text, in order', () => {
  assert.deepEqual(
    FINAL_LINES.map((l) => l.text),
    [
      'I’m sorry, my love.',
      'I LOVE YOU SO MUCH.',
      'YOU’RE THE LOVE OF MY LIFE.',
      'I care about you more than you know, and I wish I could show you that every single day.',
      'I wish I could be beside you right now, hold your hand, hug you, and tell you all of this instead of having to do it through a screen.',
      'I’m genuinely sorry for hurting you. I never want you to feel like your feelings don’t matter to me, because they matter so much.',
      'I know I can’t fix everything with a website or a few words. I want to show you through my actions that I mean every single thing I’m saying.',
      'You’re so important to me. I don’t want to lose what we have. I want to keep learning, growing, and making things better together.',
      'Please forgive me, my love. ❤️',
      'I LOVE YOU SO MUCH.',
      'ALWAYS YOURS. ❤️',
    ]
  );
  assert.deepEqual(FINALE_LINES, [
    'Until I can hug you for real, here’s a million virtual ones.',
    'One day, no more screens between us. 🌙❤️',
  ]);
  assert.equal(UNLOCK_LINES.title, 'YOU FOUND ALL 50 STARS…');
  assert.equal(INTRO_LINES.button, 'Enter my universe ❤️');
});

test('storage: duplicates, junk and out-of-range ids are dropped', () => {
  const s = sanitize({ found: [3, 3, 7, -1, 50, 'x', 1.5, 7, 0], unlocked: true, finished: true });
  assert.deepEqual(s.found, [3, 7, 0]);
  assert.equal(s.unlocked, false, 'cannot be unlocked without all 50 stars');
  assert.equal(s.finished, false);
});

test('storage: unlock only counts when all 50 are found', () => {
  const all = [...Array(50).keys()];
  assert.equal(sanitize({ found: all, unlocked: true }).unlocked, true);
  assert.equal(sanitize({ found: all.slice(1), unlocked: true }).unlocked, false);
  assert.equal(sanitize({ found: all, unlocked: true, finished: true }).finished, true);
  assert.equal(sanitize({ found: all, finished: true }).finished, false);
});

test('storage: round-trips and survives corrupt data', () => {
  const mem = new Map();
  const fake = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  save({ found: [4, 9], unlocked: false, finished: false, muted: true }, fake);
  assert.deepEqual(load(fake), { found: [4, 9], unlocked: false, finished: false, muted: true });
  mem.set(STORAGE_KEY, '{not json');
  assert.deepEqual(load(fake).found, []);
  assert.deepEqual(load(null).found, []);
});
