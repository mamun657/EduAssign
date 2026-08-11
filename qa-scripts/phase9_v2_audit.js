const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const audit = await page.evaluate(() => {
    const img = document.querySelector('[aria-label="Introduction"] img');
    const pill = document.querySelector('[aria-label="Platform capabilities"]');
    const hero = document.querySelector('[aria-label="Introduction"]');
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };

    // Check the pill's container styles
    const pillCs = pill ? window.getComputedStyle(pill) : null;
    const imgCs = img ? window.getComputedStyle(img) : null;

    // Look for rounded containers in the hero
    const allRounded = Array.from(hero.querySelectorAll('*')).filter(el => {
      const cs = window.getComputedStyle(el);
      return parseInt(cs.borderRadius) > 0 && el !== img && el !== pill;
    }).slice(0, 10).map(el => ({ tag: el.tagName, cls: el.className.toString().slice(0, 80), br: window.getComputedStyle(el).borderRadius }));

    return {
      img: r(img),
      pill: r(pill),
      pillCs: pillCs && {
        border: pillCs.border,
        borderRadius: pillCs.borderRadius,
        background: pillCs.background.slice(0, 60),
        backdropFilter: pillCs.backdropFilter,
      },
      imgCs: imgCs && {
        maskImage: imgCs.maskImage.slice(0, 120),
        WebkitMaskImage: imgCs.WebkitMaskImage.slice(0, 120),
        maskComposite: imgCs.maskComposite,
        WebkitMaskComposite: imgCs.WebkitMaskComposite,
      },
      roundedContainers: allRounded,
    };
  });
  console.log(JSON.stringify(audit, null, 2));
  await browser.close();
})();