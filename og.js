// Renders og.html to assets/og.jpg, the picture a shared link shows.
// Run it by hand after changing the card: `node og.js`. It needs Google Chrome
// installed, and sharp (already a build dependency) to turn the screenshot into
// a JPEG: WhatsApp drops preview pictures much over 300 KB, and the PNG is 700.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const png = path.join(__dirname, 'og.png');
const out = path.join(__dirname, 'assets', 'og.jpg');

execFileSync(chrome, [
  '--headless=new',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  '--virtual-time-budget=3000',
  `--screenshot=${png}`,
  'file://' + path.join(__dirname, 'og.html'),
], { stdio: 'ignore' });

require('sharp')(png).jpeg({ quality: 85, mozjpeg: true }).toFile(out).then(() => {
  fs.unlinkSync(png);
  console.log('Wrote', path.relative(process.cwd(), out));
});
