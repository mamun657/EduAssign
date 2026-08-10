// Probe hydration warning source.
// Loads the running Next.js app (port 3000) with a fresh Chromium and
// captures every console message and page error.
//
// Usage: node probe_hydration.cjs [path]  (path defaults to "/")
// Captures: hydration-mismatch warnings + all attribute diffs reported
// by React DevTools/Next dev overlay. Body attributes are also dumped
// after page load to confirm whether extension-injected attrs survived.

const { chromium } = require('C:/EduAssign/node_modules/playwright');

(async () => {
  const path = process.argv[2] || '/';
  const url = 'http://localhost:3000' + path;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message + '\n' + (err.stack || ''));
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Inspect the body and html element attributes at runtime to confirm
  // what extension-injected attributes survived (if any).
  const attrSnapshot = await page.evaluate(() => {
    const snap = (el) => {
      const out = {};
      if (!el || !el.attributes) return out;
      for (let i = 0; i < el.attributes.length; i++) {
        out[el.attributes[i].name] = (el.attributes[i].value || '').slice(0, 80);
      }
      return out;
    };
    return { bodyAttrs: snap(document.body), htmlAttrs: snap(document.documentElement) };
  });

  // Look for hydration-warning markers in console output.
  const hydrationWarnings = consoleMessages.filter((m) =>
    /hydrat|bis_skin|bis_register|__processed_/.test(m.text)
  );

  console.log(JSON.stringify({
    url,
    hydrationWarnings,
    bodyAttrs: attrSnapshot.bodyAttrs,
    htmlAttrs: attrSnapshot.htmlAttrs,
    totalConsole: consoleMessages.length,
    totalErrors: pageErrors.length,
    sampleConsole: consoleMessages.slice(0, 20),
  }, null, 2));

  await browser.close();
})().catch((e) => {
  console.error('PROBE_FAILED:', e.message);
  process.exit(1);
});