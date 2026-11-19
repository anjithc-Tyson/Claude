// Slices the 7560x1350 panorama in heist.html into seven 1080x1350 carousel slides,
// plus a full-width preview strip.  Usage: node export.js [scale]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const scale = Number(process.argv[2] || 1);
  const out = path.join(__dirname, 'export');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 7560, height: 1350 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.join(__dirname, 'heist.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, 'panorama-full.png'), clip: { x: 0, y: 0, width: 7560, height: 1350 } });
  for (let i = 0; i < 7; i++) {
    const file = path.join(out, `slide-${i + 1}.png`);
    await page.screenshot({ path: file, clip: { x: i * 1080, y: 0, width: 1080, height: 1350 } });
    console.log('wrote', path.basename(file));
  }
  await browser.close();
})();
