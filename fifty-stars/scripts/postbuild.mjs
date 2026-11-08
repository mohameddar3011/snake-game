// After `vite build` the whole site is one self-contained file in
// ../docs/fifty-stars/index.html (ready for GitHub Pages). Also drop a copy in
// ../dist/ so it can be sent as a single attachment, like the other game here.
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const built = join(here, '..', '..', 'docs', 'fifty-stars', 'index.html');
const dist = join(here, '..', '..', 'dist');
mkdirSync(dist, { recursive: true });
const target = join(dist, 'fifty-stars-before-the-moon.html');
copyFileSync(built, target);
console.log(`wrote docs/fifty-stars/index.html and dist/fifty-stars-before-the-moon.html (${Math.round(statSync(built).size / 1024)} KB)`);
