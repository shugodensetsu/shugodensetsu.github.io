/* Renders the app icons (PNG) from one SVG with the page's palette, using the local Chromium. */
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'icons');  /* usage: node src/icon.js (needs Playwright + a Japanese font such as Noto Sans CJK JP) */

const C = { bg: '#2a1266', ray: '#3a1d88', ink: '#150733', yellow: '#ffd83d', pink: '#ff4fa3', paper: '#fffaf0', cyan: '#35e0ff' };
function rays() {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a0 = (i * 22.5 - 90) * Math.PI / 180, a1 = ((i + 0.5) * 22.5 - 90) * Math.PI / 180, R = 900;
    d += 'M512 470L' + (512 + R * Math.cos(a0)).toFixed(1) + ' ' + (470 + R * Math.sin(a0)).toFixed(1) + 'L' + (512 + R * Math.cos(a1)).toFixed(1) + ' ' + (470 + R * Math.sin(a1)).toFixed(1) + 'Z';
  }
  return '<path d="' + d + '" fill="' + C.ray + '"/>';
}
/* the mark: two tilted cards behind a yellow 酒 medal, and a pink GO!! sticker */
function mark() {
  const font = 'font-family="Noto Sans CJK JP" font-weight="900"';
  return '' +
    '<g transform="rotate(-14 330 470)"><rect x="200" y="250" width="260" height="360" rx="34" fill="' + C.paper + '" stroke="' + C.ink + '" stroke-width="22"/></g>' +
    '<g transform="rotate(14 694 470)"><rect x="564" y="250" width="260" height="360" rx="34" fill="' + C.cyan + '" stroke="' + C.ink + '" stroke-width="22"/></g>' +
    '<circle cx="512" cy="452" r="258" fill="' + C.ink + '"/>' +
    '<circle cx="512" cy="440" r="250" fill="' + C.yellow + '" stroke="' + C.ink + '" stroke-width="24"/>' +
    '<text x="512" y="448" text-anchor="middle" dominant-baseline="central" ' + font + ' font-size="318" fill="' + C.ink + '">酒</text>' +
    '<g transform="rotate(-6 512 800)">' +
      '<rect x="262" y="712" width="500" height="178" rx="40" fill="' + C.ink + '"/>' +
      '<rect x="262" y="700" width="500" height="172" rx="40" fill="' + C.pink + '" stroke="' + C.ink + '" stroke-width="20"/>' +
      '<text x="512" y="790" text-anchor="middle" dominant-baseline="central" ' + font + ' font-size="150" fill="#ffffff" stroke="' + C.ink + '" stroke-width="16" paint-order="stroke" letter-spacing="4">GO!!</text>' +
    '</g>';
}
function svg(maskable) {
  const inner = maskable ? '<g transform="translate(512 512) scale(.8) translate(-512 -512)">' + mark() + '</g>' : mark();
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">' +
    '<rect width="1024" height="1024" fill="' + C.bg + '"/>' + rays() +
    '<radialGradient id="v" cx="50%" cy="46%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>' +
    '<rect width="1024" height="1024" fill="url(#v)"/>' + inner + '</svg>';
}

(async () => {
  const browser = await chromium.launch();
  const jobs = [['apple-touch-icon.png', 180, false], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]];
  for (const [name, size, maskable] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent('<html><body style="margin:0;background:#000">' + svg(maskable).replace('width="1024" height="1024"', 'width="' + size + '" height="' + size + '"') + '</body></html>');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
  }
  await browser.close();
  console.log('icons done');
})();
