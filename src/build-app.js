/* Builds the home-screen app (PWA) at the repository root from the sources in src/:
   index.html (head + the game), manifest.webmanifest, sw.js (offline cache). Icons come from src/icon.js.
   Usage:  node src/build-app.js        (then commit and push; GitHub Pages serves the root of main) */
const fs = require('fs');
const path = require('path');
const dir = __dirname, out = path.join(dir, '..');
const VERSION = process.argv[2] || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

const CAT_KEYS = ['key', 'name', 'mark', 'color', 'on'];
const CARD_KEYS = ['id', 'cat', 'text', 'cups', 'min', 'dur', 'note', 'on', 'fx'];
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k] === undefined ? null : o[k]]));
const serialize = d => '{"version":1,\n"categories":[\n' + d.categories.map(c => JSON.stringify(pick(c, CAT_KEYS))).join(',\n') +
  '\n],\n"cards":[\n' + d.cards.map(c => JSON.stringify(pick(c, CARD_KEYS))).join(',\n') + '\n]}';

/* the app starts with every category switched on; players change it in カード編集 (saved on their phone) */
const deck = JSON.parse(fs.readFileSync(path.join(dir, 'deck.json'), 'utf8'));
deck.categories = deck.categories.map(c => Object.assign({}, c, { on: true }));

const tpl = fs.readFileSync(path.join(dir, 'deck-template.html'), 'utf8');
const js = ['part-head.js', 'part-editor.js', 'part-game.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('').trimEnd();
if (/<\/script/i.test(js)) throw new Error('page.js contains a closing script tag');
const page = tpl.replace('__DECK_JSON__', () => serialize(deck).replace(/</g, '\\u003c')).replace('__PAGE_JS__', () => js);
const cut = page.indexOf('<div class="app"');
if (cut < 0) throw new Error('app root not found');
const headPart = page.slice(0, cut).trim(), bodyPart = page.slice(cut).trim();

const head = fs.readFileSync(path.join(dir, 'part-head.js'), 'utf8');
const reset = /<style>(.*?)<\/style>/.exec(eval(/const SKELETON = ('.*?');/.exec(head)[1]))[1];

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="飲み会を盛り上げるカードゲーム。引いたが最後！ 天国か、地獄か。">
<meta name="theme-color" content="#2a1266">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="酒GO!!伝説">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>${reset}
html{background:#2a1266}</style>
${headPart}
<script>window.SAKEGO_APP = true;</script>
</head>
<body>
${bodyPart}
<script>
if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
</script>
</body>
</html>
`;

const manifest = {
  name: '酒GO!!伝説', short_name: '酒GO!!伝説',
  description: '飲み会を盛り上げるカードゲーム。引いたが最後！ 天国か、地獄か。',
  lang: 'ja', dir: 'ltr', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
  background_color: '#2a1266', theme_color: '#2a1266',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const sw = `/* 酒GO!!伝説 service worker — plays offline after the first visit.
   The page itself is fetched fresh when online (so updates arrive), falling back to the saved copy offline;
   icons and fonts come from the cache. Bump VERSION on every release. */
const VERSION = 'sakego-${VERSION}';
const FONTS = 'sakego-fonts';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = (ms, p) => new Promise((ok, ng) => { const t = setTimeout(() => ng(new Error('timeout')), ms); p.then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); ng(e); }); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(timeout(4000, fetch(req)).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./', copy)); }
        return res;
      }).catch(() => caches.match('./').then(r => r || caches.match(req))));
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; });
      return hit || net;
    })));
  }
});
`;

fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'sw.js'), sw);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('app built', VERSION, 'index', Buffer.byteLength(html), 'bytes; categories on:', deck.categories.map(c => c.key).join(','));
