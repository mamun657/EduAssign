const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1600, 900], [1440, 900], [1280, 800], [1366, 768]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    const info = await p.evaluate(() => {
      const header = document.querySelector('header');
      const grid = document.querySelector('main > div, .min-h-\\[calc\\(100vh-73px\\)\\]');
      const leftCol = document.querySelector('.xl\\:translate-x-4, [class*="xl:translate-x-4"]');
      const img = [...document.querySelectorAll('img')].find((el) => (el.alt || '').includes('workspace preview'));
      const card = img ? img.closest('.aspect-square') : null;
      const rightCol = card ? card.parentElement : null;
      const h1 = document.querySelector('h1');
      const form = document.querySelector('form');
      const r = (el) => el ? { h: Math.round(el.getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom) } : null;
      const headerInfo = r(header);
      const gridInfo = r(grid);
      const leftInfo = r(leftCol);
      const cardInfo = r(card);
      const rightInfo = r(rightCol);
      const formInfo = r(form);
      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        totalH: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollHeight - window.innerHeight,
        header: headerInfo,
        grid: gridInfo,
        left: leftInfo,
        right: rightInfo,
        card: cardInfo,
        form: formInfo,
      };
    });
    console.log(w + 'x' + h, JSON.stringify(info));
    await ctx.close();
  }
  await b.close();
})();
