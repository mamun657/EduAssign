// Final verification of /login page layout at multiple viewports
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, 'screenshots', 'login-final');
fs.mkdirSync(SHOTS, { recursive: true });

const viewports = [
  { name: '1600x900', w: 1600, h: 900 },
  { name: '1440x900', w: 1440, h: 900 },
  { name: '1280x800', w: 1280, h: 800 },
  { name: '768x1024', w: 768, h: 1024 },
  { name: '390x844', w: 390, h: 844 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(700);

    const shot = path.join(SHOTS, `${vp.name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const metrics = await page.evaluate(() => {
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return {
          x: Math.round(b.x), y: Math.round(b.y),
          w: Math.round(b.width), h: Math.round(b.height),
          right: Math.round(b.right), bottom: Math.round(b.bottom),
        };
      };
      const header = document.querySelector('header');
      const h1 = document.querySelector('h1');
      const form = document.querySelector('form');
      const demoBtn = document.querySelector('button[aria-label="Sign in as demo admin"]');
      const img = document.querySelector('img[alt="EduAssign Pro workspace preview"]');
      const card = img ? img.closest('.aspect-square') : null;
      const docW = document.documentElement.clientWidth;
      const docH = document.documentElement.clientHeight;
      const docSW = document.documentElement.scrollWidth;
      const docSH = document.documentElement.scrollHeight;
      const bodySW = document.body.scrollWidth;
      return {
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        docScrollW: docSW, docScrollH: docSH, bodyScrollW: bodySW,
        clientW: docW, clientH: docH,
        hasVerticalScroll: docSH > docH + 1,
        hasHorizontalScroll: docSW > docW + 1 || bodySW > docW + 1,
        header: r(header),
        h1: r(h1),
        form: r(form),
        demoBtn: r(demoBtn),
        card: r(card),
        img: r(img),
      };
    });
    report.push({ viewport: vp.name, ...metrics });
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})();