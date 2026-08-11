// Phase 7b: Hydration verification after removing the React DevTools guard
// and switching to <Script strategy="beforeInteractive"> for the scrubber.
//
// Pass criteria:
//  - 0 application hydration errors
//  - 0 console errors
//  - 0 page errors
//  - 0 unexpected network errors (only allow same-origin 200/3xx; ignore
//    chrome-extension or third-party noise)
//
// Runs against the *clean* Chromium bundled with Playwright (no extensions).
// Pages: /, /login, /register at 4 viewports, plus /admin /teacher /student
// for the auth-redirect regression check.

const path = require("path");
const fs = require("fs");
const { chromium } = require("C:/EduAssign/node_modules/playwright");

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "375x812", width: 375, height: 812 },
];

const PUBLIC_ROUTES = ["/", "/login", "/register"];
const PROTECTED_ROUTES = ["/admin", "/teacher", "/student"];
const ALL_ROUTES = [...PUBLIC_ROUTES, ...PROTECTED_ROUTES];

const SHOT_DIR = "C:/EduAssign/qa-scripts/screenshots/hydration";
fs.mkdirSync(SHOT_DIR, { recursive: true });

const HYDRATION_PATTERNS = [
  /Hydration failed/i,
  /A tree hydrated but some attributes/i,
  /hydration-mismatch/i,
  /Hydration mismatch/i,
  /did not match/i,
  /server rendered HTML didn't match/i,
];

function isHydrationText(text) {
  return HYDRATION_PATTERNS.some((re) => re.test(String(text || "")));
}

function classify(text, url) {
  const s = String(text || "");
  if (!s) return { kind: "empty", reason: "" };
  if (isHydrationText(s)) return { kind: "hydration", reason: "hydration-message" };
  if (/chrome-extension:/i.test(s)) return { kind: "third-party", reason: "chrome-extension" };
  if (/react-devtools/i.test(s) && /devtools/i.test(s)) return { kind: "third-party", reason: "react-devtools" };
  if (/Failed to load resource.*chrome-extension/i.test(s)) return { kind: "third-party", reason: "extension-resource" };
  if (/\[HMR\]/i.test(s)) return { kind: "info", reason: "hmr" };
  if (/Download the React DevTools/i.test(s)) return { kind: "info", reason: "devtools-tip" };
  return { kind: "unknown", reason: "" };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-extensions", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    // Force a clean profile with no extensions, no service workers carrying over.
    ignoreHTTPSErrors: true,
  });

  const summary = {
    browserVersion: browser.version(),
    startedAt: new Date().toISOString(),
    viewports: {},
    routes: {},
    pass: true,
    failureReasons: [],
  };

  // First pass: each viewport scans all routes. This catches hydration errors
  // that depend on layout/scroll position changes, not just per-page.
  for (const vp of VIEWPORTS) {
    summary.viewports[vp.name] = {};
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const consoleErrors = [];
    const pageErrors = [];
    const networkErrors = [];
    const hydrationErrors = [];

    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      const loc = msg.location();
      consoleErrors.push({ text, url: loc && loc.url });
    });

    page.on("pageerror", (err) => {
      pageErrors.push({ text: err && err.message ? err.message : String(err) });
    });

    page.on("requestfailed", (req) => {
      const failure = req.failure();
      networkErrors.push({
        url: req.url(),
        method: req.method(),
        reason: failure ? failure.errorText : "unknown",
      });
    });

    page.on("response", (resp) => {
      const status = resp.status();
      const url = resp.url();
      if (status < 400) return;
      if (url.startsWith("chrome-extension://")) return;
      if (/react-devtools|chromeextension|extension:/i.test(url)) return;
      networkErrors.push({
        url,
        status,
        reason: `http-${status}`,
      });
    });

    for (const route of ALL_ROUTES) {
      const url = `http://localhost:3000${route}`;
      const beforeConsole = consoleErrors.length;
      const beforePage = pageErrors.length;
      const beforeNet = networkErrors.length;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        // Wait one extra tick so React has time to throw hydration errors.
        await page.waitForTimeout(500);
        // Capture a screenshot per route/viewport for visual diff if needed.
        const shot = path.join(
          SHOT_DIR,
          `${vp.name}-${route.replace(/\//g, "_") || "root"}.png`
        );
        await page.screenshot({ path: shot, fullPage: false });
      } catch (e) {
        pageErrors.push({ text: `goto-failed: ${e && e.message ? e.message : e}` });
      }
      const routeConsole = consoleErrors.slice(beforeConsole);
      const routePage = pageErrors.slice(beforePage);
      const routeNet = networkErrors.slice(beforeNet);

      // Classify each console error.
      const routeHydration = [];
      const routeTrue = [];
      const routeTP = [];
      for (const e of routeConsole) {
        const c = classify(e.text, e.url);
        if (c.kind === "hydration") routeHydration.push({ ...e, classification: c });
        else if (c.kind === "third-party" || c.kind === "info") routeTP.push({ ...e, classification: c });
        else routeTrue.push({ ...e, classification: c });
      }
      const routeTruePage = [];
      const routeHydrationPage = [];
      for (const e of routePage) {
        if (isHydrationText(e.text)) routeHydrationPage.push({ ...e });
        else routeTruePage.push({ ...e });
      }

      const routeNetErrors = routeNet.filter((n) => {
        if (!n.url) return false;
        return !/^https?:\/\/localhost:3000/.test(n.url) ? false : true;
      });

      summary.viewports[vp.name][route] = {
        hydrationErrors: [...routeHydration, ...routeHydrationPage],
        consoleErrors: routeTrue,
        pageErrors: routeTruePage,
        networkErrors: routeNetErrors,
        filteredAsThirdParty: routeTP.length,
        filteredAsInfo: 0,
      };

      if (routeHydration.length || routeHydrationPage.length) {
        summary.pass = false;
        summary.failureReasons.push(
          `${vp.name} ${route}: ${routeHydration.length + routeHydrationPage.length} hydration error(s)`
        );
      }
      if (routeTrue.length) {
        summary.pass = false;
        summary.failureReasons.push(
          `${vp.name} ${route}: ${routeTrue.length} application console error(s)`
        );
      }
      if (routeTruePage.length) {
        summary.pass = false;
        summary.failureReasons.push(
          `${vp.name} ${route}: ${routeTruePage.length} application page error(s)`
        );
      }
      if (routeNetErrors.length) {
        summary.pass = false;
        summary.failureReasons.push(
          `${vp.name} ${route}: ${routeNetErrors.length} network error(s)`
        );
      }
    }

    await page.close();
  }

  await context.close();
  await browser.close();

  summary.finishedAt = new Date().toISOString();
  const out = "C:/EduAssign/qa-scripts/screenshots/hydration/summary.json";
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));

  console.log("HYDRATION CHECK RESULT:", summary.pass ? "PASS" : "FAIL");
  if (!summary.pass) {
    console.log("Reasons:");
    for (const r of summary.failureReasons) console.log(" -", r);
  }
  // Per-route totals across all viewports:
  const routeTotals = {};
  for (const vp of Object.keys(summary.viewports)) {
    for (const route of Object.keys(summary.viewports[vp])) {
      const r = summary.viewports[vp][route];
      const k = route;
      if (!routeTotals[k]) routeTotals[k] = { hydration: 0, console: 0, page: 0, network: 0 };
      routeTotals[k].hydration += r.hydrationErrors.length;
      routeTotals[k].console += r.consoleErrors.length;
      routeTotals[k].page += r.pageErrors.length;
      routeTotals[k].network += r.networkErrors.length;
    }
  }
  console.log("\nPer-route totals (sum across all 4 viewports):");
  for (const [k, v] of Object.entries(routeTotals)) {
    console.log(
      `  ${k.padEnd(12)} hydration=${v.hydration} console=${v.console} page=${v.page} network=${v.network}`
    );
  }
  console.log(`\nDetailed summary: ${out}`);
  process.exit(summary.pass ? 0 : 1);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
