// Bundles the game into ONE self-contained HTML file you can send to anyone:
//   node build.js   ->   dist/sorry-lara.html  (+ ../docs/index.html for hosting)
const fs = require('fs'), path = require('path');
const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>\n${fs.readFileSync(path.join(dir, f), 'utf8')}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => {
  const js = fs.readFileSync(path.join(dir, f), 'utf8');
  if (js.includes('</script')) throw new Error(f + ' contains </script');
  return `<script>\n${js}\n</script>`;
});
fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist', 'sorry-lara.html'), html);
// the same file as a ready-to-host website (GitHub Pages: branch + /docs folder)
const site = path.join(dir, '..', 'docs');
fs.mkdirSync(site, { recursive: true });
fs.writeFileSync(path.join(site, 'index.html'), html);
console.log('wrote dist/sorry-lara.html and ../docs/index.html (' + Math.round(html.length / 1024) + ' KB)');
