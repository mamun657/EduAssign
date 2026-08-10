// Visual verification of the updated login page (form + illustration).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SHOT = path.join(__dirname, 'screenshots', 'login-with-illustration-1600x900.png');
fs.mkdirSync(path.dirname(SHOT), { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT, fullPage: false });

  const info = await page.evaluate(() => {
    const img = document.querySelector('img[alt="EduAssign Pro workspace preview"]');
    if (!img) return { found: false };
    const r = img.getBoundingClientRect();
    return {
      found: true,
      src: img.getAttribute('src'),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: Math.round(r.width),
      renderedHeight: Math.round(r.height),
      aspectRatio: +(r.width / r.height).toFixed(3),
      x: Math.round(r.x),
      y: Math.round(r.y),
    };
  });

  console.log(JSON.stringify(info, null, 2));
  console.log('Screenshot:', SHOT);
  await browser.close();
})();
