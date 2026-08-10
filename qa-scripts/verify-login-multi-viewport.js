// Multi-viewport visual sanity check.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const viewports = [
  { name: '1920x1080', w: 1920, h: 1080 },
  { name: '1600x900',  w: 1600, h: 900 },
  { name: '1440x900',  w: 1440, h: 900 },
  { name: '1280x800',  w: 1280, h: 800 },
  { name: '1024x768',  w: 1024, h: 768 },
  { name: '768x1024',  w: 768,  h: 1024 },
  { name: '390x844',   w: 390,  h: 844 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    const out = path.join(SHOTS, `login-${vp.name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    const info = await page.evaluate(() => {
      const img = document.querySelector('img[alt="EduAssign Pro workspace preview"]');
      if (!img) return { found: false };
      const r = img.getBoundingClientRect();
      return {
        renderedWidth: Math.round(r.width),
        renderedHeight: Math.round(r.height),
        aspectRatio: +(r.width / r.height).toFixed(3),
        x: Math.round(r.x),
        y: Math.round(r.y),
      };
    });
    report.push({ viewport: vp.name, ...info });
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})();
