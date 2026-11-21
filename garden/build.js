// Bundles the garden into ONE self-contained HTML file you can send or host anywhere.
//
//   node garden/build.js
//     -> garden/dist/lola-garden.html   the whole site in a single file (works offline except the web fonts)
//     -> docs/lola/index.html           the same file, laid out for GitHub Pages (branch + /docs folder)
//
//   node garden/build.js --fragment out.html
//     -> a page fragment (no <html>/<head>/<body> wrapper) for hosts that add their own document shell
const fs = require('fs'), path = require('path');
const dir = __dirname, root = path.resolve(dir, '..');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => `<style>\n${read(f)}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => {
  const js = read(f);
  if (js.includes('</script')) throw new Error(f + ' contains </script');
  return `<script>\n${js}\n</script>`;
});

const out = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); console.log('wrote', path.relative(root, file), '(' + Math.round(text.length / 1024) + ' KB)'); };

const i = process.argv.indexOf('--fragment');
if (i > -1) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/g, '').replace(/<meta name="viewport"[^>]*>\s*/g, '')
    .replace(/<link rel="(preconnect|icon)"[^>]*>\s*/g, '').replace(/<meta name="(theme-color|apple-mobile-web-app-capable|format-detection)"[^>]*>\s*/g, '');
  const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
  out(path.resolve(process.argv[i + 1]), `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${head.replace(title, '')}\n${body}`);
} else {
  out(path.join(dir, 'dist', 'lola-garden.html'), html);
  out(path.join(root, 'docs', 'lola', 'index.html'), html);
}
