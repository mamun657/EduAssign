// Cross-page horizontal-overflow check after the CSS change.
// Verifies scrollWidth === clientWidth at all 4 viewports on every route
// to catch any regression introduced by moving overflow-x from html to body.

const { chromium } = require("C:/EduAssign/node_modules/playwright");

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "375x812", width: 375, height: 812 },
];

const ROUTES = ["/", "/login", "/register", "/admin", "/teacher", "/student"];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-extensions"],
  });
  const context = await browser.newContext();

  const results = [];
  let pass = true;

  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of ROUTES) {
      await page.goto(`http://localhost:3000${route}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        bodyScroll: document.body.scrollWidth,
        bodyClient: document.body.clientWidth,
      }));
      const ok =
        widths.scroll <= widths.client + 1 &&
        widths.bodyScroll <= widths.bodyClient + 1;
      results.push({ vp: vp.name, route, ok, widths });
      if (!ok) pass = false;
    }
    await page.close();
  }

  await context.close();
  await browser.close();

  console.log("OVERFLOW CHECK:", pass ? "PASS" : "FAIL");
  for (const r of results) {
    console.log(
      `  ${r.vp.padEnd(9)} ${r.route.padEnd(11)} ${r.ok ? "OK " : "BAD"}  html=${r.widths.scroll}/${r.widths.client}  body=${r.widths.bodyScroll}/${r.widths.bodyClient}`
    );
  }
  process.exit(pass ? 0 : 1);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
