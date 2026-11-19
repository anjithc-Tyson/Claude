// Renders every .slide in gta.html to a 1080x1350 PNG in ./export/<set>/
// Usage: node export.js [scale]   (2 = 2160x2700)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const scale = Number(process.argv[2] || 1);
  const out = path.join(__dirname, 'export');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.join(__dirname, 'gta.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  for (const s of await page.$$('section.slide')) {
    const name = await s.getAttribute('data-name');
    const set = (await s.getAttribute('data-set')) || 'gold-job';
    fs.mkdirSync(path.join(out, set), { recursive: true });
    await s.screenshot({ path: path.join(out, set, `${name}.png`) });
    console.log('wrote', name);
  }
  await browser.close();
})();
