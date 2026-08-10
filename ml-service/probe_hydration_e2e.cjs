// End-to-end hydration validation with simulated extension injection.
// 1. Intercept the SSR HTML response.
// 2. Inject known extension attributes (bis_skin_checked, bis_register,
//    __processed_*, data-extension-*) into body and inner divs.
// 3. Allow page to load and hydrate.
// 4. Verify NO hydration-mismatch warning fires.
const { chromium } = require('C:/EduAssign/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const consoleMessages = [];
  page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }));

  // Inject extension-style attributes into SSR HTML BEFORE React sees it.
  await page.route('**/teacher', async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    // Simulate Bitdefender-style skin checker on body.
    body = body.replace(
      '<body class="min-h-full bg-[#F9FAFB] text-[#111827]">',
      '<body class="min-h-full bg-[#F9FAFB] text-[#111827]" bis_skin_checked="1" bis_register="W3sicm9sZSI6ImFkbWluIn0=" __processed_abc123__="true">'
    );
    route.fulfill({ status: 200, contentType: 'text/html', body });
  });

  await page.goto('http://localhost:3000/teacher', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const finalAttrs = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < document.body.attributes.length; i++) {
      out[document.body.attributes[i].name] = document.body.attributes[i].value;
    }
    return out;
  });

  const hydrationWarnings = consoleMessages.filter((m) =>
    /hydrat/i.test(m.text)
  );

  console.log(JSON.stringify({
    bodyAttrsAfterLoad: finalAttrs,
    hydrationWarnings,
    totalConsole: consoleMessages.length,
  }, null, 2));

  await browser.close();
})().catch((e) => { console.error('PROBE_E2E_FAILED:', e.message); process.exit(1); });