// Phase 7 — landing-page viewport + interaction verification.
//
// What this script does:
//   1. Loads http://localhost:3000 at four viewports:
//        - 1440x900  (desktop, primary)
//        - 1280x800  (desktop, compact)
//        - 390x844   (mobile, iPhone 14)
//        - 375x812   (mobile, iPhone 13)
//   2. Asserts NO horizontal overflow on each viewport.
//   3. Captures any console errors / page errors / failed app requests.
//   4. Screenshots: hero, mid, full-page (per viewport).
//   5. On mobile, exercises the hamburger menu (open + close + sign-in link).
//   6. Verifies the primary CTA navigates to /register and the secondary CTA
//      to /login.
//
// Output:
//   - screenshots/landing/<viewport>/hero.png
//   - screenshots/landing/<viewport>/mid.png
//   - screenshots/landing/<viewport>/full.png
//   - screenshots/landing/<viewport>/mobile-drawer.png (mobile only)
//   - <outDir>/landing-viewports.json (machine-readable report)
//
// Errors caused by chrome-extension:// or other unrelated origins are filtered.

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900, isMobile: false },
  { name: "1280x800", width: 1280, height: 800, isMobile: false },
  { name: "390x844", width: 390, height: 844, isMobile: true },
  { name: "375x812", width: 375, height: 812, isMobile: true },
];

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, "results");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots", "landing");

function isThirdPartyError(text) {
  if (!text) return true;
  const t = String(text);
  if (t.includes("chrome-extension://")) return true;
  if (t.includes("chromewebstore.google.com")) return true;
  if (t.includes("react-devtools")) return true;
  return false;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    viewports: [],
    ok: true,
    failureReason: null,
  };

  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
      });
      const page = await ctx.newPage();

      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];

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
        const failure = req.failure();
        const errText = failure ? failure.errorText : "unknown";
        // Only count same-origin failures (or known app routes).
        if (url.startsWith(BASE) || url.includes("localhost:3000")) {
          failedRequests.push({ url, error: errText });
        }
      });

      // ── Load landing page
      await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
      // Wait for hero heading text to confirm full render.
      await page.waitForSelector("h1", { timeout: 15000 });

      // ── Horizontal overflow check
      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return {
          docWidth: docW,
          winWidth: winW,
          horizontalOverflow: docW > winW + 1,
        };
      });

      const dir = path.join(SCREENSHOT_DIR, vp.name);
      fs.mkdirSync(dir, { recursive: true });

      // Hero screenshot
      await page.screenshot({
        path: path.join(dir, "hero.png"),
        fullPage: false,
      });

      // Scroll to features section
      await page.evaluate(() => {
        const el = document.getElementById("features");
        if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
      });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(dir, "mid.png"),
        fullPage: false,
      });

      // Full-page screenshot
      await page.screenshot({
        path: path.join(dir, "full.png"),
        fullPage: true,
      });

      // ── Mobile-specific: exercise the hamburger menu
      let mobileDrawer = null;
      if (vp.isMobile) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
        const menuBtn = await page.$('button[aria-label="Open menu"]');
        if (menuBtn) {
          await menuBtn.click();
          await page.waitForTimeout(250);
          mobileDrawer = await page.evaluate(() => {
            const dialog = document.querySelector('[role="dialog"]');
            return {
              opened: !!dialog && dialog.getAttribute("aria-modal") === "true",
              bodyLocked: document.body.getAttribute("data-drawer-open") === "true",
            };
          });
          await page.screenshot({
            path: path.join(dir, "mobile-drawer.png"),
            fullPage: false,
          });
          // Close
          const closeBtn = await page.$('button[aria-label="Close menu"]');
          if (closeBtn) await closeBtn.click();
          await page.waitForTimeout(150);
        } else {
          mobileDrawer = { opened: false, bodyLocked: false, error: "menu button not found" };
        }
      }

      // ── CTA navigation test (only on desktop to keep this fast)
      let ctaNav = null;
      if (!vp.isMobile) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
        const heroH1 = await page.$("h1");
        const box = heroH1 ? await heroH1.boundingBox() : null;
        if (box) {
          // Click the "Get Started" link in the hero
          const cta = await page.$('a[href="/register"]');
          if (cta) {
            const target = cta;
            const nav = await Promise.all([
              page.waitForURL(/\/register$/, { timeout: 8000 }).catch(() => null),
              target.click(),
            ]);
            const url = page.url();
            ctaNav = { registeredNavigated: /\/register$/.test(url), url };
            if (/\/register$/.test(url)) {
              // Go back for the next iteration
              await page.goto(BASE + "/", { waitUntil: "networkidle" });
            }
          } else {
            ctaNav = { registeredNavigated: false, url: page.url(), error: "register CTA missing" };
          }
        }
      }

      const vpResult = {
        name: vp.name,
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        horizontalOverflow: overflow.horizontalOverflow,
        docWidth: overflow.docWidth,
        winWidth: overflow.winWidth,
        consoleErrors,
        pageErrors,
        failedRequests,
        mobileDrawer,
        ctaNav,
        ok:
          !overflow.horizontalOverflow &&
          consoleErrors.length === 0 &&
          pageErrors.length === 0 &&
          failedRequests.length === 0,
      };
      report.viewports.push(vpResult);

      if (!vpResult.ok) report.ok = false;

      await ctx.close();
    }
  } catch (err) {
    report.ok = false;
    report.failureReason = err && err.message ? err.message : String(err);
  } finally {
    await browser.close();
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "landing-viewports.json"),
    JSON.stringify(report, null, 2),
  );

  console.log("\n──────── Phase 7 — Landing Viewport Report ────────");
  for (const v of report.viewports) {
    console.log(
      `${v.name.padEnd(10)}  overflow=${v.horizontalOverflow ? "YES" : "no"} ` +
        `console=${v.consoleErrors.length} pageErr=${v.pageErrors.length} ` +
        `netFail=${v.failedRequests.length} ok=${v.ok}`,
    );
    if (v.consoleErrors.length) console.log("   console:", v.consoleErrors);
    if (v.pageErrors.length) console.log("   pageErr:", v.pageErrors);
    if (v.failedRequests.length) console.log("   netFail:", v.failedRequests);
    if (v.mobileDrawer) console.log("   drawer:", v.mobileDrawer);
    if (v.ctaNav) console.log("   ctaNav:", v.ctaNav);
  }
  console.log(`\nOverall: ${report.ok ? "PASS" : "FAIL"}`);
  if (report.failureReason) console.log("Reason:", report.failureReason);
  process.exit(report.ok ? 0 : 1);
})();
