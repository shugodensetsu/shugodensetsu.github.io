/* Renders the app icons (PNG) from one SVG with the page's palette, using the local Chromium.
   usage: ICON_FONT=/path/to/DelaGothicOne-Regular.ttf node src/icon.js
   (needs Playwright; the font is the logo's, Dela Gothic One from Google Fonts, OFL. Without ICON_FONT it falls back to Noto Sans CJK JP)

   The mark, built to read at home-screen size:
   - a grape sunburst ground, like the app's own background
   - a two-layer explosion (pink flash, yellow burst) with ink outlines and hard ink shadows: the DON!! moment
   - DON!! in the logo's pink, with the logo's ink outline and a cyan under-shadow
   - a cyan でん tag tilted across the bottom, like the logo's second line
   - a few sparkles so the corners are not empty */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'icons');

const C = { bg: '#2a1266', bg2: '#3d1c94', deep: '#14063a', ray: '#36198a', ink: '#150733', yellow: '#ffd83d', yellow2: '#fff1a6', yellowDeep: '#f5b800',
  pink: '#ff4fa3', pink2: '#ff8cc6', paper: '#fffaf0', cyan: '#35e0ff', red: '#ff5252', lime: '#a8f03a' };
const FONT = process.env.ICON_FONT && fs.existsSync(process.env.ICON_FONT) ? 'IconDisp' : 'Noto Sans CJK JP';
const FW = FONT === 'IconDisp' ? '400' : '900';

function rays(cx, cy) {
  let d = '';
  for (let i = 0; i < 18; i++) {
    const a0 = (i * 20 - 90) * Math.PI / 180, a1 = ((i + 0.5) * 20 - 90) * Math.PI / 180, R = 1000;
    d += 'M' + cx + ' ' + cy + 'L' + (cx + R * Math.cos(a0)).toFixed(1) + ' ' + (cy + R * Math.sin(a0)).toFixed(1) + 'L' + (cx + R * Math.cos(a1)).toFixed(1) + ' ' + (cy + R * Math.sin(a1)).toFixed(1) + 'Z';
  }
  return '<path d="' + d + '" fill="' + C.ray + '"/>';
}
/* a spiky explosion: n points alternating between two radii, a little uneven so it looks drawn */
function burst(cx, cy, n, r1, r2, rot) {
  const jit = [1, .93, 1.04, .96, 1.02, .9, 1.05, .95, 1, .92, 1.03, .97, .99, .94, 1.04, .96];
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (rot + i * 180 / n) * Math.PI / 180, r = (i % 2 ? r2 : r1 * jit[(i >> 1) % jit.length]);
    d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
  }
  return d + 'Z';
}
function sparkle(x, y, s, fill) {
  return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 -60 C8 -14 14 -8 60 0 C14 8 8 14 0 60 C-8 14 -14 8 -60 0 C-14 -8 -8 -14 0 -60Z" fill="' + fill + '" stroke="' + C.ink + '" stroke-width="' + (10 / s).toFixed(1) + '" stroke-linejoin="round"/>';
}
function card(x, y, w, h, rot, face, mark, markFill) {
  return '<g transform="rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + h / 2) + ')">' +
    '<rect x="' + x + '" y="' + (y + 18) + '" width="' + w + '" height="' + h + '" rx="34" fill="' + C.ink + '"/>' +
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="34" fill="' + face + '" stroke="' + C.ink + '" stroke-width="20"/>' +
    '<circle cx="' + (x + w / 2) + '" cy="' + (y + 92) + '" r="50" fill="' + markFill + '" stroke="' + C.ink + '" stroke-width="14"/>' +
    (mark || '') + '</g>';
}
/* text with the logo's look: thick ink outline drawn under the fill, a hard ink drop and a coloured under-shadow */
function bigText(txt, x, y, size, fill, opts = {}) {
  const f = 'font-family="' + FONT + '" font-weight="' + FW + '" font-size="' + size + '" text-anchor="middle" dominant-baseline="central"' + (opts.ls ? ' letter-spacing="' + opts.ls + '"' : '');
  const sw = opts.sw || Math.round(size * .17), drop = opts.drop || Math.round(size * .09);
  return '<text x="' + x + '" y="' + (y + drop + 8) + '" ' + f + ' fill="' + (opts.under || C.ink) + '" stroke="' + (opts.under || C.ink) + '" stroke-width="' + sw + '" stroke-linejoin="round">' + txt + '</text>' +
    '<text x="' + x + '" y="' + (y + drop) + '" ' + f + ' fill="' + C.ink + '" stroke="' + C.ink + '" stroke-width="' + sw + '" stroke-linejoin="round">' + txt + '</text>' +
    '<text x="' + x + '" y="' + y + '" ' + f + ' fill="' + fill + '" stroke="' + C.ink + '" stroke-width="' + sw + '" stroke-linejoin="round" paint-order="stroke">' + txt + '</text>' +
    (opts.shine ? '<text x="' + x + '" y="' + y + '" ' + f + ' fill="url(#shine)" style="mix-blend-mode:screen">' + txt + '</text>' : '');
}

function mark() {
  const cx = 512, cy = 462;
  return '' +
    /* the explosion, two layers: a pink outer flash, then the yellow burst; each with a hard ink shadow and an ink outline */
    '<path d="' + burst(cx, cy + 24, 16, 436, 350, -84) + '" fill="' + C.ink + '"/>' +
    '<path d="' + burst(cx, cy, 16, 436, 350, -84) + '" fill="' + C.pink + '" stroke="' + C.ink + '" stroke-width="20" stroke-linejoin="round"/>' +
    '<path d="' + burst(cx, cy + 22, 16, 372, 278, -90) + '" fill="' + C.ink + '"/>' +
    '<path d="' + burst(cx, cy, 16, 372, 278, -90) + '" fill="' + C.yellow + '" stroke="' + C.ink + '" stroke-width="22" stroke-linejoin="round"/>' +
    '<path d="' + burst(cx, cy - 8, 16, 286, 222, -90) + '" fill="url(#core)"/>' +
    /* DON!! */
    '<g transform="rotate(-7 ' + cx + ' ' + (cy - 10) + ')">' + bigText('DON!!', cx, cy - 18, 196, C.pink, { under: C.cyan, sw: 34, drop: 16, ls: -6, shine: true }) + '</g>' +
    /* the でん tag */
    '<g transform="rotate(-5 ' + cx + ' 790)">' +
      '<rect x="292" y="722" width="440" height="168" rx="44" fill="' + C.ink + '"/>' +
      '<rect x="292" y="702" width="440" height="168" rx="44" fill="' + C.cyan + '" stroke="' + C.ink + '" stroke-width="20"/>' +
      '<rect x="318" y="722" width="388" height="34" rx="17" fill="#ffffff" opacity=".35"/>' +
      bigText('でん', cx, 784, 132, '#ffffff', { sw: 26, drop: 10, ls: 6 }) +
    '</g>' +
    sparkle(150, 150, .9, C.yellow) + sparkle(880, 170, .62, '#ffffff') + sparkle(860, 870, .7, C.pink2) + sparkle(160, 860, .55, C.lime);
}

function svg(maskable) {
  const inner = maskable ? '<g transform="translate(512 512) scale(.78) translate(-512 -512)">' + mark() + '</g>' : mark();
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' +
    '<defs>' +
      '<radialGradient id="bg" cx="50%" cy="44%" r="72%"><stop offset="0" stop-color="' + C.bg2 + '"/><stop offset=".62" stop-color="' + C.bg + '"/><stop offset="1" stop-color="' + C.deep + '"/></radialGradient>' +
      '<radialGradient id="core" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="' + C.yellow2 + '"/><stop offset="1" stop-color="' + C.yellow + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset=".08" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".42" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="vig" cx="50%" cy="46%" r="72%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></radialGradient>' +
    '</defs>' +
    '<rect width="1024" height="1024" fill="url(#bg)"/>' + rays(512, 448) + '<rect width="1024" height="1024" fill="url(#vig)"/>' +
    inner + '</svg>';
}

(async () => {
  const fontCss = FONT === 'IconDisp' ? '@font-face{font-family:IconDisp;src:url(data:font/ttf;base64,' + fs.readFileSync(process.env.ICON_FONT).toString('base64') + ')}' : '';
  const browser = await chromium.launch();
  const jobs = [['apple-touch-icon.png', 180, false], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]];
  if (process.env.ICON_PREVIEW) jobs.push(['icon-1024-preview.png', 1024, false]);
  for (const [name, size, maskable] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent('<html><head><style>' + fontCss + 'body{margin:0;background:#000}</style></head><body>' + svg(maskable).replace('width="1024" height="1024"', 'width="' + size + '" height="' + size + '"') + '</body></html>');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(process.env.ICON_PREVIEW || OUT, name), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
  }
  await browser.close();
  console.log('icons done with', FONT);
})();
