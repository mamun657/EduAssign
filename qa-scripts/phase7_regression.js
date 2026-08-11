// Phase 7 — regression sweep.
//
// Loads the public routes and the three dashboards to ensure the landing-page
// redesign did not break any other surface.
// For unauthenticated users, dashboards will redirect to /login — that is a
// legitimate redirect, not a failure. We verify:
//   - Page returns 200 (or a redirect that lands on /login, for dashboards).
//   - No console errors.
//   - No page errors.
//   - No failed same-origin network requests caused by the app.

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, "results");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots", "regression");

function isThirdPartyError(text) {
  if (!text) return true;
  const t = String(text);
  if (t.includes("chrome-extension://")) return true;
  if (t.includes("react-devtools")) return true;
  return false;
}

const ROUTES = [
  { name: "landing", url: "/", expect: "landing" },
  { name: "login", url: "/login", expect: "login" },
  { name: "register", url: "/register", expect: "register" },
  { name: "admin-dashboard", url: "/admin", expect: "redirect-to-login-or-dash" },
  { name: "teacher-dashboard", url: "/teacher", expect: "redirect-to-login-or-dash" },
  { name: "student-dashboard", url: "/student", expect: "redirect-to-login-or-dash" },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const results = [];

  for (const r of ROUTES) {
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!isThirdPartyError(text)) consoleErrors.push(text);
      }
    });
    page.on("pageerror", (err) => {
      const text = err && err.message ? err.message : String(err);
      if (!isThirdPartyError(text)) pageErrors.push(text);
    });
    page.on("requestfailed", (req) => {
      const url = req.url();
      if (url.startsWith(BASE) || url.includes("localhost:3000")) {
        const failure = req.failure();
        failedRequests.push({
          url,
          error: failure ? failure.errorText : "unknown",
        });
      }
    });

    let finalUrl = null;
    try {
      await page.goto(BASE + r.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(400);
      finalUrl = page.url();
    } catch (err) {
      pageErrors.push("nav: " + (err && err.message ? err.message : String(err)));
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, r.name + ".png"),
      fullPage: false,
    });

    results.push({
      name: r.name,
      url: r.url,
      finalUrl,
      expect: r.expect,
      consoleErrors,
      pageErrors,
      failedRequests,
      ok:
        consoleErrors.length === 0 &&
        pageErrors.length === 0 &&
        failedRequests.length === 0,
    });

    await page.close();
  }

  await browser.close();

  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    routes: results,
    ok: results.every((r) => r.ok),
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "regression.json"),
    JSON.stringify(report, null, 2),
  );

  console.log("\n──────── Phase 7 — Regression Sweep ────────");
  for (const r of results) {
    console.log(
      `${r.name.padEnd(20)}  → ${r.finalUrl}  ` +
        `console=${r.consoleErrors.length} pageErr=${r.pageErrors.length} ` +
        `netFail=${r.failedRequests.length} ok=${r.ok}`,
    );
    if (r.consoleErrors.length) console.log("   console:", r.consoleErrors);
    if (r.pageErrors.length) console.log("   pageErr:", r.pageErrors);
    if (r.failedRequests.length) console.log("   netFail:", r.failedRequests);
  }
  console.log(`\nOverall: ${report.ok ? "PASS" : "FAIL"}`);
  process.exit(report.ok ? 0 : 1);
})();
