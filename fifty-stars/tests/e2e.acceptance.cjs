/*
  End-to-end acceptance test (needs Playwright + Chromium; not part of `npm test`).

    node tests/e2e.acceptance.cjs                        # tests the built single file ../docs/fifty-stars/index.html
    URL=http://localhost:5173/ node tests/e2e.acceptance.cjs   # or a running dev server

  Starts from a clean browser, finds all 50 stars in a shuffled order (checking every
  message against the spec, in discovery order), checks the moon stays locked until then,
  watches the unlock sequence, clicks the moon and verifies the final message line by line.
*/
const path = require('path');
const { pathToFileURL } = require('url');
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('Playwright is not installed: npm i -D playwright'); process.exit(2); }

const URL = process.env.URL || pathToFileURL(path.join(__dirname, '..', '..', 'docs', 'fifty-stars', 'index.html')).href;
const ok = (cond, msg) => { if (!cond) { console.error('  ✗ FAIL:', msg); process.exitCode = 1; throw new Error(msg); } console.log('  ✓', msg); };

(async () => {
  const { MESSAGES } = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'data', 'messages.js')).href);
  const { FINAL_LINES, FINALE_LINES } = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'data', 'copy.js')).href);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const scene = () => page.locator('[data-scene]').first().getAttribute('data-scene');
  const counter = async () => (await page.getByTestId('count').textContent()).trim();

  console.log('URL:', URL);
  console.log('Intro');
  await page.goto(URL);
  await page.waitForTimeout(700);
  ok(await page.getByText('Hey, my pretty girl…').count() === 1, 'greeting is shown');
  for (let i = 0; i < 6; i++) { await page.mouse.click(200, 300); await page.waitForTimeout(200); }
  ok(await page.getByText('I made an entire little universe for you because I wish I could give you the actual moon.').count() === 1, 'universe line is shown');
  ok(await page.getByText('50 little stars.').count() === 1, 'stars line is shown');
  const enter = page.getByRole('button', { name: 'Enter my universe ❤️' });
  ok(await enter.count() === 1, 'button reads "Enter my universe ❤️"');
  await enter.click();
  await page.waitForTimeout(2500);

  console.log('Sky');
  ok(await scene() === 'sky', 'we are in the sky');
  ok(await page.locator('[data-star-id]').count() === 50, 'exactly 50 stars');
  ok(await page.getByText('Your little universe:').count() === 1 && (await counter()) === '0/50', 'counter starts at 0/50');
  await page.mouse.click(250, 235);
  await page.waitForTimeout(500);
  ok(await scene() === 'sky' && await page.getByRole('dialog').count() === 0, 'tapping the moon early does nothing (it stays locked)');

  const order = [...Array(50).keys()];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }

  for (let k = 0; k < 50; k++) {
    const star = page.locator(`[data-star-id="${order[k]}"]`);
    if (await star.getAttribute('data-found') !== 'false') ok(false, `star #${order[k]} should start un-found`);
    await star.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    const text = (await dialog.locator('p').nth(1).textContent()).trim();
    if (text !== MESSAGES[k]) ok(false, `message ${k + 1} is wrong: ${text}`);
    if (k === 0 || k === 24 || k === 48 || k === 49) console.log(`  ✓ message ${k + 1} correct → "${text.slice(0, 50)}…"`);
    if (k < 49) {
      await page.getByRole('button', { name: /Keep exploring/ }).click();
      await dialog.waitFor({ state: 'detached', timeout: 5000 });
      if (await star.getAttribute('data-found') !== 'true') ok(false, `star #${order[k]} did not turn golden`);
      if (await counter() !== `${k + 1}/50`) ok(false, `counter should be ${k + 1}/50, is ${await counter()}`);
    }
  }
  ok(true, 'every one of the 50 messages appeared, in order, word for word');
  ok(await counter() === '50/50', 'counter reads 50/50');
  ok(await page.locator('[data-found="true"]').count() === 50, 'all 50 stars are golden');
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('fifty-stars-before-the-moon:v1')));
  ok(saved.found.length === 50 && new Set(saved.found).size === 50, 'localStorage holds 50 unique stars');
  ok(saved.unlocked === false, 'moon is not marked unlocked yet');

  ok(await scene() === 'awakening', 'sky enters the awakening state when the 50th star is found');
  ok((await page.getByRole('dialog').textContent()).includes('the last one'), 'the 50th star’s message is shown first');
  await page.getByRole('button', { name: /Look up at the sky/ }).click();

  console.log('Unlock sequence');
  await page.mouse.click(195, 340); // poking the moon mid-cinematic must do nothing
  await page.waitForTimeout(300);
  ok(await scene() === 'awakening', 'the moon ignores clicks while it is waking up');
  await page.waitForFunction(() => document.querySelector('[data-scene]').dataset.scene === 'ready', null, { timeout: 90000 });
  ok(true, 'moon reached the READY state after the cinematic');
  await page.waitForTimeout(3500);
  const bodyText = await page.evaluate(() => document.body.innerText);
  ok(bodyText.includes('YOU FOUND ALL 50 STARS…'), 'shows “YOU FOUND ALL 50 STARS…”');
  ok(bodyText.includes('Now, there’s something I’ve been wanting to tell you.'), 'shows the second line');
  ok(bodyText.includes('Click the moon, my love. 🌙'), 'shows “Click the moon, my love. 🌙”');
  ok(!bodyText.includes('I LOVE YOU SO MUCH'), 'final message is NOT visible before the moon is clicked');
  ok(JSON.parse(await page.evaluate(() => localStorage.getItem('fifty-stars-before-the-moon:v1'))).unlocked === true, 'unlock is saved');

  console.log('Final message');
  await page.mouse.click(195, 250);
  await page.waitForFunction(() => document.querySelector('[data-scene]').dataset.scene === 'message', null, { timeout: 5000 });
  ok(true, 'clicking the unlocked moon opens the message');
  const lines = async () => page.evaluate(() => [...document.querySelectorAll('.no-scrollbar p')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()));
  await page.waitForTimeout(5000);
  for (let i = 0; i < 60; i++) {
    if (await page.getByRole('button', { name: /Back to my universe/ }).count()) break;
    await page.mouse.click(195, 420); await page.waitForTimeout(450);
  }
  await page.getByRole('button', { name: /Back to my universe/ }).waitFor({ timeout: 20000 });
  const got = await lines();
  const want = [...FINAL_LINES.map((l) => l.text), ...FINALE_LINES];
  ok(got.length === want.length && want.every((w, i) => got[i] === w), `all ${want.length} message lines are exact and in order`);

  console.log('Back + reload');
  await page.getByRole('button', { name: /Back to my universe/ }).click();
  await page.waitForTimeout(3500);
  ok(await scene() === 'skyDone', 'returns to the finished sky');
  await page.locator('[data-star-id="3"]').click();
  await page.getByRole('dialog').waitFor();
  ok(/remembered/.test(await page.getByRole('dialog').textContent()), 'a golden star can be revisited');
  ok(await counter() === '50/50', 'revisiting never counts twice');
  await page.getByRole('button', { name: /Back to the stars/ }).click();
  await page.reload();
  await page.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { await page.mouse.click(200, 300); await page.waitForTimeout(200); }
  await page.getByRole('button', { name: 'Enter my universe ❤️' }).click();
  await page.waitForTimeout(3000);
  ok(await page.locator('[data-found="true"]').count() === 50, 'progress survives a reload (50 golden stars)');

  ok(errors.length === 0, `no console/page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(process.exitCode ? '\nFAILED' : '\nALL ACCEPTANCE CHECKS PASSED');
})().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
