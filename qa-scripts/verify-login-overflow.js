const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1600, 900], [1440, 900], [1280, 800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    const info = await p.evaluate(() => {
      const html = document.documentElement;
      const hasVerticalScrollbar = html.scrollHeight > html.clientHeight;
      const hasHorizontalScrollbar = html.scrollWidth > html.clientWidth;
      return {
        vh: { scrollH: html.scrollHeight, clientH: html.clientHeight },
        hw: { scrollW: html.scrollWidth, clientW: html.clientWidth },
        vOverflow: html.scrollHeight - html.clientHeight,
        hOverflow: html.scrollWidth - html.clientWidth,
        hasVerticalScrollbar,
        hasHorizontalScrollbar,
      };
    });
    console.log(w + 'x' + h + ':', JSON.stringify(info));
    await ctx.close();
  }
  await b.close();
})();
