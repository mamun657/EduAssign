// Runs ONLY the missing student-mobile-375 case and merges it into phase2-dashboard.json.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "results");
const SHOTS = path.join(__dirname, "screenshots", "phase2");
const FRONTEND = "http://localhost:3000";

const STUDENT_EMAIL = "arif+1786295489811855@test.local";
const STUDENT_PASSWORD = "StrongPass!2026";

const NETWORK_NOISE = [/\/favicon\.ico/, /_next\/static\/chunks\/.*\?ts=/, /hot-update\.json/, /__nextjs_/];

(async () => {
  const resultPath = path.join(ROOT, "phase2-dashboard.json");
  const results = JSON.parse(fs.readFileSync(resultPath, "utf8"));

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PageError: " + e.message));
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (NETWORK_NOISE.some((re) => re.test(url))) return;
    networkErrors.push(`${r.failure()?.errorText ?? "failed"} ${url}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) {
      const url = r.url();
      if (NETWORK_NOISE.some((re) => re.test(url))) return;
      networkErrors.push(`HTTP ${r.status()} ${url}`);
    }
  });

  const run = { viewport: { name: "mobile-375", width: 375, height: 812 }, role: "Student" };

  try {
    // Login (retry on rate-limit 400).
    await page.goto(`${FRONTEND}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    let status = null;
    let redirected = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      await page.fill('input[type="email"]', "");
      await page.fill('input[type="password"]', "");
      await page.fill('input[type="email"]', STUDENT_EMAIL);
      await page.fill('input[type="password"]', STUDENT_PASSWORD);
      const respPromise = page
        .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === "POST", { timeout: 15000 })
        .catch(() => null);
      await page.click('button[type="submit"]');
      const resp = await respPromise;
      status = resp ? resp.status() : null;
      try {
        await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 15000 });
        redirected = true;
        break;
      } catch (_) {}
      await page.waitForTimeout(2500);
    }
    run.loginStatus = status;
    run.loginRedirected = redirected;
    run.afterLoginUrl = page.url();

    if (!redirected) throw new Error(`Student login failed (HTTP ${status})`);

    // Navigate to student dashboard.
    await page.goto(`${FRONTEND}/student`, { waitUntil: "domcontentloaded", timeout: 30000 });
    try { await page.waitForLoadState("networkidle", { timeout: 30000 }); } catch (_) {}
    await page.waitForTimeout(800);

    const sidebarEl = page.locator('aside').first();
    const sidebarVisible = await sidebarEl.isVisible().catch(() => false);
    const sidebarBox = await sidebarEl.boundingBox().catch(() => null);
    run.sidebarVisible = sidebarVisible;
    run.sidebarWidth = sidebarBox?.width ?? null;
    run.sidebarLeft = sidebarBox?.x ?? null;

    const hamburger = page.locator('button[aria-label="Open navigation"]').first();
    run.hamburgerVisible = await hamburger.isVisible().catch(() => false);

    run.drawerInitiallyOpen = await page.evaluate(() => document.body.dataset.drawerOpen === "true");
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(500);
      run.drawerOpens = await page.evaluate(() => document.body.dataset.drawerOpen === "true");
      run.drawerAsideVisible = await page.locator('aside').first().isVisible().catch(() => false);
      await page.screenshot({ path: path.join(SHOTS, "student-mobile-375-drawer-open.png"), fullPage: false });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      run.drawerEscapeCloses = !(await page.evaluate(() => document.body.dataset.drawerOpen === "true"));
    }

    run.overflow = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const cw = document.documentElement.clientWidth;
      return { scrollWidth: sw, clientWidth: cw, overflow: sw > cw + 1 };
    });
    run.navLinkCount = await page.locator('aside a').count().catch(() => 0);

    const signOut = page.locator('button[aria-label="Sign out"]').first();
    run.signOutVisible = await signOut.isVisible().catch(() => false);
    await page.screenshot({ path: path.join(SHOTS, "student-mobile-375.png"), fullPage: false });

    if (run.signOutVisible) {
      await signOut.click();
      await page.waitForTimeout(1200);
      run.afterLogoutToken = await page.evaluate(() => localStorage.getItem("eduassign.token"));
      run.afterLogoutUrl = page.url();
    }

    run.consoleErrors = consoleErrors;
    run.networkErrors = networkErrors;
    run.fatalError = null;
  } catch (err) {
    run.fatalError = err.message ?? String(err);
    run.consoleErrors = consoleErrors;
    run.networkErrors = networkErrors;
  } finally {
    try { await ctx.close(); } catch (_) {}
    await browser.close();
  }

  results.runs["student-mobile-375"] = run;
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log("Wrote student-mobile-375 →", resultPath);
})();