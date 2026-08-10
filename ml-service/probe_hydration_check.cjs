// Verify the scrubber script is in the rendered HTML and that it
// actively removes injected attributes when run.
const { chromium } = require('C:/EduAssign/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto('http://localhost:3000/teacher', { waitUntil: 'load', timeout: 30000 });
  // Inject a fake "extension attribute" before our scrubber's MutationObserver
  // fires, then verify the observer removes it.
  await page.evaluate(() => {
    document.body.setAttribute('bis_skin_checked', '1');
    document.body.setAttribute('__processed_abc123__', 'true');
    document.body.setAttribute('data-extension-xyz', 'leak');
    document.body.setAttribute('data-foo', 'should-not-be-touched');
    document.documentElement.setAttribute('bis_register', 'W3sicm9sZSI6ImFkbWluIn0=');
  });
  await page.waitForTimeout(500);
  const attrs = await page.evaluate(() => {
    const o = {};
    for (let i = 0; i < document.body.attributes.length; i++) {
      o[document.body.attributes[i].name] = document.body.attributes[i].value;
    }
    const h = {};
    for (let i = 0; i < document.documentElement.attributes.length; i++) {
      h[document.documentElement.attributes[i].name] = document.documentElement.attributes[i].value;
    }
    return { body: o, html: h };
  });
  // Inspect head for scrubber script presence.
  const scriptInfo = await page.evaluate(() => {
    const scripts = Array.from(document.head.querySelectorAll('script'));
    const inline = scripts.find((s) => s.textContent && /isBad|scrub/.test(s.textContent));
    return {
      headScriptCount: scripts.length,
      scrubberPresent: !!inline,
      scrubberLen: inline ? inline.textContent.length : 0,
    };
  });
  console.log(JSON.stringify({ attrs, scriptInfo }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });