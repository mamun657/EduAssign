// Visual verification of the redesigned register page.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1600x900',  width: 1600, height: 900  },
  { name: '1440x900',  width: 1440, height: 900  },
  { name: '1280x800',  width: 1280, height: 800  },
  { name: '768x1024',  width: 768,  height: 1024 },
  { name: '390x844',   width: 390,  height: 844  },
];

const SHOT_DIR = path.join(__dirname, 'screenshots', 'register-redesign');
fs.mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);

    const shot = path.join(SHOT_DIR, `${v.name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const metrics = await page.evaluate(() => {
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      };
      const headerLogo = document.querySelector('header a[href="/"]');
      const signInLink = document.querySelector('header a[href="/login"]');
      const h1 = document.querySelector('h1');
      const subtitle = h1 ? h1.nextElementSibling : null;
      const form = document.querySelector('form');
      const fields = Array.from(document.querySelectorAll('form label'));
      const roleSelect = fields.find(f => /role/i.test(f.textContent || ''));
      const academicSelect = fields.find(f => /academic/i.test(f.textContent || ''));
      const createAccountBtn = document.querySelector('button[type="submit"]');
      const imgXL = document.querySelectorAll('img[alt="EduAssign Pro workspace preview"]');
      const imgs = Array.from(imgXL).map(i => {
        const b = i.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), aspect: +(b.width / b.height).toFixed(3) };
      });

      return {
        headerLogo: r(headerLogo),
        signInLink: r(signInLink),
        h1: h1 ? { text: h1.textContent, ...r(h1) } : null,
        subtitle: subtitle ? { text: subtitle.textContent.slice(0, 80), ...r(subtitle) } : null,
        form: r(form),
        fieldCount: fields.length,
        fieldNames: fields.map(f => f.textContent.trim()),
        roleSelect: r(roleSelect ? roleSelect.parentElement.querySelector('select,input') : null),
        academicSelect: r(academicSelect ? academicSelect.parentElement.querySelector('select,input') : null),
        createAccountBtn: createAccountBtn ? { text: createAccountBtn.textContent.trim(), ...r(createAccountBtn) } : null,
        images: imgs,
      };
    });

    report.push({ viewport: v.name, shot, metrics });
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})();
