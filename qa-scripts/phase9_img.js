const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => {
    const img = document.querySelector('[aria-label="Introduction"] img');
    const r = img.getBoundingClientRect();
    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: r.width,
      renderedHeight: r.height,
      renderedX: r.x,
      renderedY: r.y,
      renderedBottom: r.bottom,
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
