/* Builds the home-screen app (PWA) at the repository root from the sources in src/:
   index.html (head + the game), manifest.webmanifest, sw.js (offline cache). Icons come from src/icon.js.
   Usage:  node src/build-app.js        (then commit and push; GitHub Pages serves the root of main) */
const fs = require('fs');
const path = require('path');
const dir = __dirname, out = path.join(dir, '..');
const VERSION = process.argv[2] || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

const CAT_KEYS = ['key', 'name', 'mark', 'color', 'on'];
const CARD_KEYS = ['id', 'cat', 'text', 'cups', 'min', 'dur', 'note', 'on', 'fx', 'drink'];
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k] === undefined ? null : o[k]]));
const serialize = d => '{"version":1,\n"categories":[\n' + d.categories.map(c => JSON.stringify(pick(c, CAT_KEYS))).join(',\n') +
  '\n],\n"cards":[\n' + d.cards.map(c => JSON.stringify(pick(c, CARD_KEYS))).join(',\n') + '\n]}';

/* the app starts with every category switched on; players change it in カード編集 (saved on their phone) */
const deck = JSON.parse(fs.readFileSync(path.join(dir, 'deck.json'), 'utf8'));
deck.categories = deck.categories.map(c => Object.assign({}, c, { on: true }));

const tpl = fs.readFileSync(path.join(dir, 'deck-template.html'), 'utf8');
/* the recorded sounds (src/snd/*.mp3, Kenney CC0) go into the page as base64, so nothing has to be fetched */
const smpData = Object.fromEntries(fs.readdirSync(path.join(dir, 'snd')).filter(f => f.endsWith('.mp3')).sort()
  .map(f => [f.slice(0, -4), fs.readFileSync(path.join(dir, 'snd', f)).toString('base64')]));
let js = ['part-head.js', 'part-editor.js', 'part-game.js', 'part-modes.js', 'part-boot.js'].map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('').trimEnd()
  .replace('__SMP_DATA__', () => JSON.stringify(smpData));
/* the play-count collector (server/collector.js): its address is STAT_URL in part-game.js, and the page may talk to that one origin only.
   A test build can point it at a local stand-in:  STAT_TEST=http://localhost:8787/v1/p node src/build-app.js test */
if (VERSION === 'test' && process.env.STAT_TEST) js = js.replace(/const STAT_URL = '[^']*';/, () => 'const STAT_URL = ' + JSON.stringify(process.env.STAT_TEST) + ';');
/* a test build can also try the paid state (free trial limits):  PLUS_SALE_TEST=1 node src/build-app.js test */
if (VERSION === 'test' && process.env.PLUS_SALE_TEST) js = js.replace('const PLUS_SALE = false;', 'const PLUS_SALE = true;');
const statUrl = (/const STAT_URL = '([^']*)';/.exec(js) || /const STAT_URL = "([^"]*)";/.exec(js) || [])[1];
if (statUrl === undefined) throw new Error('STAT_URL not found');
const statOrigin = statUrl ? new URL(statUrl).origin : '';
if (statOrigin && !/^https:\/\/[a-z0-9.-]+$/.test(statOrigin) && VERSION !== 'test') throw new Error('STAT_URL must be https: ' + statUrl);
/* test builds only (node src/build-app.js test): a handle on the game's state for the automated phone-size tests */
const TEST_HOOK = VERSION === 'test' ? '\nwindow.__T = { get G() { return G; }, get tool() { return tool; }, get bomb() { return bomb; }, get tap() { return tap; }, get timer() { return timer; }, SE, SOUNDS, REAL, SMP, snd, get sheet() { return sheet; }, openSheet, renderSheet, closeTool, closeBomb, closeTap, miniRecord, miniPick, miniStart, miniNext, miniUndo, miniReroll, MG, miniLand, openPlus, renderGame, tryLoad };' : '';
if (/<\/script/i.test(js)) throw new Error('page.js contains a closing script tag');
const page = tpl.replace('__DECK_JSON__', () => serialize(deck).replace(/</g, '\\u003c')).replace('__PAGE_JS__', () => (TEST_HOOK ? js.replace(/\}\)\(\);\s*$/, TEST_HOOK + '\n})();') : js));
const cut = page.indexOf('<div class="app"');
if (cut < 0) throw new Error('app root not found');
const headPart = page.slice(0, cut).trim(), bodyPart = page.slice(cut).trim();

const head = fs.readFileSync(path.join(dir, 'part-head.js'), 'utf8');
const reset = /<style>(.*?)<\/style>/.exec(eval(/const SKELETON = ('.*?');/.exec(head)[1]))[1];

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'${statOrigin ? ' ' + statOrigin : ''}; media-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="description" content="飲み会・宅飲みを盛り上げるパーティーカードゲーム。スマホ1台で2〜8人、無料・広告なし・オフラインOK。カード106枚＋ミニゲーム14種。引いたが最後！ 天国か、地獄か。">
<link rel="canonical" href="https://shugodensetsu.github.io/">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="酒GO!!伝説">
<meta property="og:title" content="酒GO!!伝説｜飲み会・宅飲みを盛り上げるパーティーゲーム">
<meta property="og:description" content="スマホ1台で2〜8人。無料・広告なし・オフラインOK。カード106枚＋ミニゲーム14種。引いたが最後！ 天国か、地獄か。">
<meta property="og:url" content="https://shugodensetsu.github.io/">
<meta property="og:image" content="https://shugodensetsu.github.io/icons/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="酒GO!!伝説 — 引いたが最後！ 天国か、地獄か。">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="酒GO!!伝説｜飲み会・宅飲みを盛り上げるパーティーゲーム">
<meta name="twitter:description" content="スマホ1台で2〜8人。無料・広告なし・オフラインOK。">
<meta name="twitter:image" content="https://shugodensetsu.github.io/icons/og.jpg">
<meta name="theme-color" content="#2a1266">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="酒GO!!伝説">
<script>
/* tablets: lay the app out at a phone-like size and let the browser scale it up, so it fills an iPad instead of
   sitting small in the middle (portrait gains the most; phones are left exactly as they are) */
(function () {
  var m = document.querySelector('meta[name=viewport]'), base = m.content;
  function fit() {
    var a = Math.min(screen.width, screen.height), b = Math.max(screen.width, screen.height);
    if (a < 700) { if (m.content !== base) m.content = base; return; }
    var land = window.matchMedia && matchMedia('(orientation: landscape)').matches;
    var w = land ? b : a, h = (land ? a : b) * 0.9;
    var s = Math.max(1, Math.min(w / 430, h / 660, 1.8));
    m.content = 'width=' + Math.round(w / s) + ',viewport-fit=cover,user-scalable=no';
  }
  fit();
  addEventListener('orientationchange', function () { setTimeout(fit, 150); });
})();
</script>
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
  id: './', name: '酒GO!!伝説', short_name: '酒GO!!伝説',
  description: '飲み会・宅飲みを盛り上げるパーティーカードゲーム。スマホ1台で2〜8人、無料・広告なし・オフラインOK。',
  categories: ['games', 'entertainment'],
  lang: 'ja', dir: 'ltr', start_url: './', scope: './', display: 'standalone', orientation: 'portrait',
  background_color: '#2a1266', theme_color: '#2a1266',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  /* shown on Android's install sheet (and reusable for a store listing) */
  screenshots: [
    { src: 'screens/1-title.jpg', sizes: '1080x1920', type: 'image/jpeg', form_factor: 'narrow', label: 'タイトル画面' },
    { src: 'screens/2-card.jpg', sizes: '1080x1920', type: 'image/jpeg', form_factor: 'narrow', label: 'カードを引いて、書いてあるとおりに遊ぶ' },
    { src: 'screens/4-mini.jpg', sizes: '1080x1920', type: 'image/jpeg', form_factor: 'narrow', label: 'ミニゲーム14種で8番勝負' },
    { src: 'screens/6-hanko.jpg', sizes: '1080x1920', type: 'image/jpeg', form_factor: 'narrow', label: '負けた人にはハンコをドン' },
  ],
};

const sw = `/* 酒GO!!伝説 service worker — plays offline after the first visit.
   The page itself is fetched fresh when online (so updates arrive), falling back to the saved copy offline;
   icons and fonts come from the cache. Bump VERSION on every release.
   The 3D dice libraries (vendor/) live in their own cache, kept across releases (rename VENDOR when they change). */
const VERSION = 'sakego-${VERSION}';
const FONTS = 'sakego-fonts';
const VENDOR = 'sakego-vendor-three160-cannon020';
const VENDOR_FILES = ['./vendor/three.module.min.js', './vendor/cannon-es.min.js'];
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then(c => c.addAll(SHELL)),
    caches.open(VENDOR).then(c => Promise.all(VENDOR_FILES.map(f => c.match(f).then(hit => hit || c.add(f))))).catch(() => {}),
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS && k !== VENDOR).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
