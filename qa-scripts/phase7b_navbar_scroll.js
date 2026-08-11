const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/EduAssign/node_modules/playwright");

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

const SHOT_DIR = "C:/EduAssign/qa-scripts/screenshots/navbar";
fs.mkdirSync(SHOT_DIR, { recursive: true });

const SCROLL_THRESHOLD = 8;
const SCROLL_DELTA = 200;

function fail(summary, msg) {
  summary.pass = false;
  summary.failureReasons.push(msg);
}

function readHeaderState(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    const inner = header.querySelector("div");
    const innerH = inner ? inner.getBoundingClientRect().height : null;
    const cs = getComputedStyle(header);
    return {
      scrolled: header.getAttribute("data-scrolled"),
      className: header.className,
      position: cs.position,
      top: cs.top,
      topPx: rect.top,
      width: rect.width,
      height: rect.height,
      innerHeight: innerH,
      boxShadow: cs.boxShadow,
      backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
      backgroundColor: cs.backgroundColor,
      borderBottomColor: cs.borderBottomColor,
      transition: cs.transition,
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-extensions", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext();
  const summary = {
    browserVersion: browser.version(),
    startedAt: new Date().toISOString(),
    viewports: {},
    pass: true,
    failureReasons: [],
  };

  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) =>
      pageErrors.push(err && err.message ? err.message : String(err))
    );

    const vpResult = {
      steps: {},
      consoleErrors: [],
      pageErrors: [],
    };

    // 1. Load at top.
    await page.goto("http://localhost:3000/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    // Give the scroll listener effect a tick to attach.
    await page.waitForTimeout(300);

    // Confirm no horizontal overflow at the top.
    vpResult.scrollWidthTop = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    vpResult.clientWidthTop = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    if (vpResult.scrollWidthTop > vpResult.clientWidthTop + 1) {
      fail(summary, `${vp.name} top: horizontal overflow (scrollWidth=${vpResult.scrollWidthTop} > clientWidth=${vpResult.clientWidthTop})`);
    }

    const topState = await readHeaderState(page);
    vpResult.steps.top = topState;
    if (!topState) {
      fail(summary, `${vp.name}: no <header> element found at top`);
    } else {
      if (topState.position !== "sticky") {
        fail(summary, `${vp.name} top: position is "${topState.position}", expected "sticky"`);
      }
      if (topState.topPx !== 0) {
        fail(summary, `${vp.name} top: header.top=${topState.topPx}, expected 0`);
      }
      if (topState.scrolled !== "false") {
        fail(summary, `${vp.name} top: data-scrolled="${topState.scrolled}", expected "false"`);
      }
      if (!/border-transparent/.test(topState.className)) {
        fail(summary, `${vp.name} top: header does not have border-transparent class`);
      }
      if (/backdrop-blur-xl/.test(topState.className)) {
        fail(summary, `${vp.name} top: header has backdrop-blur-xl in top state (should be only in scrolled state)`);
      }
      if (!/shadow-none/.test(topState.className)) {
        fail(summary, `${vp.name} top: header does not have shadow-none in top state`);
      }
      if (topState.innerHeight !== 64) {
        fail(summary, `${vp.name} top: inner height=${topState.innerHeight}, expected 64 (h-16)`);
      }
    }

    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-1-top.png`),
      fullPage: false,
    });

    // 2. Scroll 200px.
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "auto" }), SCROLL_DELTA);
    await page.waitForTimeout(450); // transition is 300ms; allow it to settle.

    // Confirm no horizontal overflow while scrolled.
    vpResult.scrollWidthScrolled = vpResult.scrollWidthTop;
    vpResult.clientWidthScrolled = vpResult.clientWidthTop;
    if (vpResult.scrollWidthScrolled > vpResult.clientWidthScrolled + 1) {
      fail(summary, `${vp.name} scrolled: horizontal overflow (scrollWidth=${vpResult.scrollWidthScrolled} > clientWidth=${vpResult.clientWidthScrolled})`);
    }

    const scrolledState = await readHeaderState(page);
    vpResult.steps.scrolled = scrolledState;
    if (!scrolledState) {
      fail(summary, `${vp.name}: no <header> element found after scroll`);
    } else {
      if (scrolledState.position !== "sticky") {
        fail(summary, `${vp.name} scrolled: position is "${scrolledState.position}", expected "sticky"`);
      }
      if (scrolledState.topPx !== 0) {
        fail(summary, `${vp.name} scrolled: header.top=${scrolledState.topPx}, expected 0 (must stay sticky)`);
      }
      if (scrolledState.scrolled !== "true") {
        fail(summary, `${vp.name} scrolled: data-scrolled="${scrolledState.scrolled}", expected "true"`);
      }
      if (!/backdrop-blur-xl/.test(scrolledState.className)) {
        fail(summary, `${vp.name} scrolled: header does not have backdrop-blur-xl class`);
      }
      if (!/supports-\[backdrop-filter\]:bg-\[#0B0F1A\]\/60/.test(scrolledState.className)) {
        fail(summary, `${vp.name} scrolled: header does not have the dark-glass background class`);
      }
      if (!/border-white\/10/.test(scrolledState.className)) {
        fail(summary, `${vp.name} scrolled: header does not have the scrolled border class`);
      }
      if (!/shadow-\[0_8px_28px_-18px_rgba\(0,0,0,0\.6\),0_1px_2px_rgba\(0,0,0,0\.3\)\]/.test(scrolledState.className)) {
        fail(summary, `${vp.name} scrolled: header does not have the scrolled shadow class`);
      }
      if (scrolledState.innerHeight !== 56) {
        fail(summary, `${vp.name} scrolled: inner height=${scrolledState.innerHeight}, expected 56 (h-14)`);
      }
    }
    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-2-scrolled.png`),
      fullPage: false,
    });

    // 3. Scroll back to 0.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
    await page.waitForTimeout(450);

    const topStateAgain = await readHeaderState(page);
    vpResult.steps.backToTop = topStateAgain;
    if (!topStateAgain) {
      fail(summary, `${vp.name}: no <header> element found after scroll back`);
    } else {
      if (topStateAgain.scrolled !== "false") {
        fail(summary, `${vp.name} backToTop: data-scrolled="${topStateAgain.scrolled}", expected "false"`);
      }
      if (!/border-transparent/.test(topStateAgain.className)) {
        fail(summary, `${vp.name} backToTop: top-state border-transparent class missing`);
      }
      if (/backdrop-blur-xl/.test(topStateAgain.className)) {
        fail(summary, `${vp.name} backToTop: backdrop-blur-xl class still present after returning to top`);
      }
      if (topStateAgain.innerHeight !== 64) {
        fail(summary, `${vp.name} backToTop: inner height=${topStateAgain.innerHeight}, expected 64 (h-16)`);
      }
    }
    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-3-back-to-top.png`),
      fullPage: false,
    });

    // 4. Scroll partway (90px) to also exercise the threshold boundary.
    await page.evaluate(() => window.scrollTo({ top: 90, behavior: "auto" }));
    await page.waitForTimeout(450);
    const midState = await readHeaderState(page);
    vpResult.steps.midScroll = midState;
    if (midState && midState.scrolled !== "true") {
      fail(summary, `${vp.name} midScroll: data-scrolled="${midState.scrolled}", expected "true" at 90px`);
    }

    vpResult.consoleErrors = consoleErrors;
    vpResult.pageErrors = pageErrors;
    if (consoleErrors.length) {
      fail(summary, `${vp.name}: ${consoleErrors.length} console error(s)`);
    }
    if (pageErrors.length) {
      fail(summary, `${vp.name}: ${pageErrors.length} page error(s)`);
    }

    summary.viewports[vp.name] = vpResult;
    await page.close();
  }

  await context.close();
  await browser.close();

  summary.finishedAt = new Date().toISOString();
  const out = "C:/EduAssign/qa-scripts/screenshots/navbar/summary.json";
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));

  console.log("NAVBAR SCROLL RESULT:", summary.pass ? "PASS" : "FAIL");
  if (!summary.pass) {
    console.log("Reasons:");
    for (const r of summary.failureReasons) console.log(" -", r);
  }
  for (const vp of Object.keys(summary.viewports)) {
    const r = summary.viewports[vp];
    const t = r.steps.top || {};
    const s = r.steps.scrolled || {};
    const b = r.steps.backToTop || {};
    console.log(`\n[${vp}]`);
    console.log(
      `  top:        scrolled=${t.scrolled} innerH=${t.innerHeight} shadow="${t.boxShadow}"`
    );
    console.log(
      `  scrolled:   scrolled=${s.scrolled} innerH=${s.innerHeight} shadow="${s.boxShadow}"`
    );
    console.log(
      `  backToTop:  scrolled=${b.scrolled} innerH=${b.innerHeight}`
    );
    console.log(
      `  horizontal: top=${r.scrollWidthTop}/${r.clientWidthTop}  scrolled=${r.scrollWidthScrolled}/${r.clientWidthScrolled}`
    );
    console.log(
      `  errors:     console=${r.consoleErrors.length} page=${r.pageErrors.length}`
    );
  }
  console.log(`\nDetailed summary: ${out}`);
  process.exit(summary.pass ? 0 : 1);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
