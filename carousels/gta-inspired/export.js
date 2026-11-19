// Renders every .slide in carousels.html to a 1080x1350 PNG in ./export
// Usage: node export.js [scale]   (scale 1 = 1080x1350, 2 = 2160x2700)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const scale = Number(process.argv[2] || 1);
  const out = path.join(__dirname, 'export');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.join(__dirname, 'carousels.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const slides = await page.$$('section.slide');
  for (const s of slides) {
    const name = await s.getAttribute('data-name');
    await s.screenshot({ path: path.join(out, `${name}.png`) });
    console.log('wrote', name);
  }
  await browser.close();
})();
