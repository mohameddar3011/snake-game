import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLayout, minDistance } from '../src/lib/layout.js';
import { skyMoon } from '../src/lib/geometry.js';

const SCREENS = [
  [390, 844, 'iPhone 14/15'],
  [393, 852, 'iPhone 15 Pro'],
  [430, 932, 'iPhone 15 Pro Max'],
  [375, 667, 'iPhone SE'],
  [360, 740, 'Android'],
  [768, 1024, 'iPad portrait'],
  [844, 390, 'iPhone landscape'],
  [1024, 768, 'iPad landscape'],
  [1440, 900, 'laptop'],
  [1920, 1080, 'desktop'],
];

for (const [w, h, name] of SCREENS) {
  test(`layout ${name} ${w}x${h}`, () => {
    const { stars, moon } = generateLayout(w, h);
    assert.equal(stars.length, 50);
    assert.deepEqual(stars.map((s) => s.id), [...Array(50).keys()]);
    for (const s of stars) {
      assert.ok(s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1, 'inside the sky');
      assert.ok(Math.hypot(s.x * w - moon.cx, s.y * h - moon.cy) >= moon.d / 2 + 20, 'clear of the moon');
    }
    const px = stars.map((s) => ({ x: s.x * w, y: s.y * h }));
    const min = minDistance(px);
    console.log(`  ${name.padEnd(18)} ${w}x${h}  min gap ${min.toFixed(1)}px`);
    // portrait phones must keep a fingertip-sized gap between star centres
    if (h >= w && w <= 440) assert.ok(min >= 40, `stars too crowded: ${min}`);
  });
}

test('layout is deterministic', () => {
  assert.deepEqual(generateLayout(390, 844).stars, generateLayout(390, 844).stars);
});

test('moon geometry stays on screen', () => {
  for (const [w, h] of SCREENS) {
    const m = skyMoon(w, h);
    assert.ok(m.cx - m.d / 2 >= -1 && m.cx + m.d / 2 <= w + 1);
    assert.ok(m.cy - m.d / 2 >= 0 && m.cy + m.d / 2 <= h);
  }
});
