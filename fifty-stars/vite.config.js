import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The production build is ONE self-contained index.html (JS, CSS and fonts inlined),
// written to ../docs/fifty-stars/ so GitHub Pages can host it, and it also works
// when sent as a file and opened offline.
// @fontsource CSS lists a .woff fallback after every .woff2. Every browser that can
// run this page supports woff2, so drop the fallback to keep the single file small.
const woff2Only = {
  name: 'woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!id.includes('@fontsource') || !id.endsWith('.css')) return null;
    return { code: code.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, ''), map: null };
  },
};

export default defineConfig({
  base: './',
  plugins: [woff2Only, react(), viteSingleFile()],
  build: {
    outDir: '../docs/fifty-stars',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
  },
  server: { host: true },
});
