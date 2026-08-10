// Phase 2 live browser verification.
// Uses the root-level playwright install (NODE_PATH=.../EduAssign/node_modules).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "results");
const SHOTS = path.join(__dirname, "screenshots", "phase2");
fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const FRONTEND = "http://localhost:3000";
const BACKEND = "http://localhost:5220";
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
];

const NETWORK_NOISE = [
  /\/favicon\.ico/,
  /_next\/static\/chunks\/.*\?ts=/,
  /hot-update\.json/,
  /__nextjs_/,
];

function loadCredentials() {
  const teacher = JSON.parse(fs.readFileSync(path.join(ROOT, "teacher-fixture.json"), "utf8"));
  const assignment = JSON.parse(fs.readFileSync(path.join(ROOT, "assignment-fixture.json"), "utf8"));
  let e2e = null;
  try { e2e = JSON.parse(fs.readFileSync(path.join(ROOT, "23-e2e-fixture.json"), "utf8")); } catch (_) {}
  return {
    Admin: { email: "admin@eduassign.local", password: "L@unchPad!Admin#2026-XqZ" },
    Teacher: { email: teacher.email, password: teacher.password },
    Student: {
      email: (e2e && e2e.student && e2e.student.email) || assignment.studentEmail,
      password: (e2e && e2e.student && e2e.student.password) || assignment.studentPassword,
    },
  };
}

const CREDS = loadCredentials();

const results = {
  section: "Phase 2 DashboardShell + Sidebar",
  startedAt: new Date().toISOString(),
  credentials: {
    adminEmail: CREDS.Admin.email,
    teacherEmail: CREDS.Teacher.email,
    studentEmail: CREDS.Student.email,
  },
  runs: {},
  fatalError: null,
};

async function gotoSafe(page, url) {
  // Playwright ERR_ABORTED on goto is often harmless (e.g. Next.js dev rebuild).
  // Retry the navigation once if aborted.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      return;
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (/ERR_ABORTED/i.test(msg) && attempt < 2) {
        await page.waitForTimeout(2000);
        continue;
      }
      throw e;
    }
  }
}

async function login(page, role) {
  const creds = CREDS[role];
  if (!creds) throw new Error("No credentials for role " + role);
  await gotoSafe(page, `${FRONTEND}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  // One retry pass in case the backend rate-limit kicks in for rapid back-to-back logins.
  let lastResult = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.fill('input[type="email"]', "");
    await page.fill('input[type="password"]', "");
    await page.fill('input[type="email"]', creds.email);
    await page.fill('input[type="password"]', creds.password);
    const respPromise = page
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === "POST", {
        timeout: 15000,
      })
      .catch(() => null);
    await page.click('button[type="submit"]');
    const resp = await respPromise;
    const status = resp ? resp.status() : null;
    let redirected = false;
    try {
      await page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 15000 });
      redirected = true;
    } catch (_) {}
    lastResult = { url: page.url(), status, redirected };
    if (redirected) break;
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(500);
  return lastResult;
}

async function runForRole(role, roleSlug) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  for (const vp of VIEWPORTS) {
    const key = `${roleSlug}-${vp.name}`;
    if (results.runs[key] && results.runs[key].fatalError == null && results.runs[key].loginRedirected) {
      // Already verified in a previous run — skip to avoid retriggering auth rate-limit.
      results.runs[key].skipped = true;
      continue;
    }
    // Inter-viewport delay so backend auth rate-limit + Next.js dev compile don't trip.
    await new Promise((r) => setTimeout(r, 4000));
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
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

    const run = { viewport: vp, role };
    try {
      const loginRes = await login(page, role);
      run.loginStatus = loginRes.status;
      run.loginRedirected = loginRes.redirected;
      run.afterLoginUrl = loginRes.url;

      if (!loginRes.redirected) {
        run.fatalError = `Login failed (HTTP ${loginRes.status}). Skipping dashboard checks.`;
        run.consoleErrors = consoleErrors;
        run.networkErrors = networkErrors;
        results.runs[`${roleSlug}-${vp.name}`] = run;
        await ctx.close().catch(() => {});
        continue;
      }

      await gotoSafe(page, `${FRONTEND}/${roleSlug}`);
      try {
        await page.waitForLoadState("networkidle", { timeout: 30000 });
      } catch (_) {
        // networkidle can be flaky in dev (HMR keeps connections open). Fall back to a fixed delay.
        await page.waitForTimeout(2000);
      }
      await page.waitForTimeout(800);

      const sidebarEl = page.locator('aside').first();
      const sidebarVisible = await sidebarEl.isVisible().catch(() => false);
      const sidebarBox = await sidebarEl.boundingBox().catch(() => null);
      run.sidebarVisible = sidebarVisible;
      run.sidebarWidth = sidebarBox?.width ?? null;
      run.sidebarLeft = sidebarBox?.x ?? null;

      const isMobile = vp.width < 768;
      const hamburger = page.locator('button[aria-label="Open navigation"]').first();
      run.hamburgerVisible = await hamburger.isVisible().catch(() => false);

      if (isMobile) {
        const drawerOpen = await page.evaluate(() => document.body.dataset.drawerOpen === "true");
        run.drawerInitiallyOpen = drawerOpen;
        if (await hamburger.isVisible().catch(() => false)) {
          await hamburger.click();
          await page.waitForTimeout(500);
          const drawerOpenAfter = await page.evaluate(() => document.body.dataset.drawerOpen === "true");
          run.drawerOpens = drawerOpenAfter;
          const drawerAside = await page.locator('aside').first().isVisible().catch(() => false);
          run.drawerAsideVisible = drawerAside;
          await page.screenshot({ path: path.join(SHOTS, `${roleSlug}-${vp.name}-drawer-open.png`), fullPage: false });
          await page.keyboard.press("Escape");
          await page.waitForTimeout(400);
          const drawerClosed = await page.evaluate(() => document.body.dataset.drawerOpen === "true");
          run.drawerEscapeCloses = !drawerClosed;
        }
      } else {
        run.desktopSidebarVisible = sidebarVisible;
      }

      const overflow = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const cw = document.documentElement.clientWidth;
        return { scrollWidth: sw, clientWidth: cw, overflow: sw > cw + 1 };
      });
      run.overflow = overflow;

      const navLinks = await page.locator('aside a').count().catch(() => 0);
      run.navLinkCount = navLinks;

      const signOut = page.locator('button[aria-label="Sign out"]').first();
      const signOutVisible = await signOut.isVisible().catch(() => false);
      run.signOutVisible = signOutVisible;

      await page.screenshot({ path: path.join(SHOTS, `${roleSlug}-${vp.name}.png`), fullPage: false });

      if (signOutVisible) {
        await signOut.click();
        await page.waitForTimeout(1200);
        const token = await page.evaluate(() => localStorage.getItem("eduassign.token"));
        run.afterLogoutToken = token;
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
    }
    results.runs[`${roleSlug}-${vp.name}`] = run;
    fs.writeFileSync(path.join(ROOT, "phase2-dashboard.json"), JSON.stringify(results, null, 2));
  }
  await browser.close();
}

(async () => {
  try {
    await runForRole("Admin", "admin");
    await runForRole("Teacher", "teacher");
    await runForRole("Student", "student");
  } catch (err) {
    results.fatalError = err.message ?? String(err);
  }
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(ROOT, "phase2-dashboard.json"), JSON.stringify(results, null, 2));
  console.log("Phase 2 verification complete. Results:", path.join(ROOT, "phase2-dashboard.json"));
})();
