/* makes the dashboard's home-screen icons (tools/icons/*.png). Needs sharp: node server/tools/make-icons.js */
const sharp = require(process.env.SHARP || 'sharp');
const path = require('path');
const svg = full => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${full ? '' : 'rx="112"'} fill="#5b33c9"/>
  <rect width="512" height="512" ${full ? '' : 'rx="112"'} fill="url(#g)"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5cf0"/><stop offset="1" stop-color="#5b33c9"/></linearGradient></defs>
  <rect x="120" y="292" width="64" height="104" rx="18" fill="#ffffff"/>
  <rect x="224" y="220" width="64" height="176" rx="18" fill="#ffffff"/>
  <rect x="328" y="148" width="64" height="248" rx="18" fill="#f7d34a"/>
  <circle cx="360" cy="112" r="22" fill="#ffffff" opacity=".9"/><circle cx="392" cy="128" r="14" fill="#ffffff" opacity=".75"/><circle cx="334" cy="124" r="12" fill="#ffffff" opacity=".75"/>
</svg>`);
(async () => {
  const out = path.join(__dirname, 'icons');
  await sharp(svg(false)).resize(192).png().toFile(path.join(out, 'icon-192.png'));
  await sharp(svg(true)).resize(512).png().toFile(path.join(out, 'icon-512.png'));
  await sharp(svg(true)).resize(180).png().toFile(path.join(out, 'apple-touch-icon.png'));
  console.log('icons written');
})();
