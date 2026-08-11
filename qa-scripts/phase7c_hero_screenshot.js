// Phase 7c — premium dark hero verification.
// Loads the landing page at 4 viewports, asserts:
//   - the dark hero is rendered (background-color matches charcoal)
//   - the background.png hero image element is present and has natural dimensions
//   - the marquee track exists and contains >= 7 unique items
//   - the marquee wrapper has a non-empty transform animation computed (or
//     transform === none when prefers-reduced-motion is set)
//   - the navbar is sticky at top and has transparent background
//   - there is no horizontal overflow and no console/page errors
// Saves per-viewport screenshots for visual diff.

const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/EduAssign/node_modules/playwright");

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "375x812", width: 375, height: 812 },
];

const SHOT_DIR = "C:/EduAssign/qa-scripts/screenshots/hero-phase7c";
fs.mkdirSync(SHOT_DIR, { recursive: true });

function fail(summary, msg) {
  summary.pass = false;
  summary.failureReasons.push(msg);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-extensions", "--disable-dev-shm-usage"],
  });
  const summary = {
    browserVersion: browser.version(),
    startedAt: new Date().toISOString(),
    viewports: {},
    pass: true,
    failureReasons: [],
  };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) =>
      pageErrors.push(e && e.message ? e.message : String(e))
    );

    await page.goto("http://localhost:3000/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(500);

    const measurements = await page.evaluate(() => {
      const $ = (s) => document.querySelector(s);
      const heroSection = document.querySelector("section[aria-label='Introduction']");
      const bgImg = document.querySelector(
        "section[aria-label='Introduction'] img[src$='background.png']"
      );
      const marquee = document.querySelector(".hero-marquee");
      const header = document.querySelector("header");
      const headerCs = header ? getComputedStyle(header) : null;

      const heroCs = heroSection ? getComputedStyle(heroSection) : null;
      const imgInfo = bgImg
        ? (() => {
            const r = bgImg.getBoundingClientRect();
            return {
              src: bgImg.getAttribute("src"),
              complete: bgImg.complete,
              naturalWidth: bgImg.naturalWidth,
              naturalHeight: bgImg.naturalHeight,
              width: r.width,
              height: r.height,
              objectFit: getComputedStyle(bgImg).objectFit,
            };
          })()
        : null;

      const marqueeInfo = marquee
        ? (() => {
            const r = marquee.getBoundingClientRect();
            const cs = getComputedStyle(marquee);
            const items = marquee.querySelectorAll(":scope > div");
            return {
              width: r.width,
              height: r.height,
              animationName: cs.animationName,
              animationDuration: cs.animationDuration,
              animationTimingFunction: cs.animationTimingFunction,
              animationIterationCount: cs.animationIterationCount,
              childCount: items.length,
              uniqueLabels: Array.from(items)
                .map((it) => it.textContent.trim().replace(/\s+/g, " "))
                .filter((v, i, a) => a.indexOf(v) === i).length,
            };
          })()
        : null;

      const headerInfo = header
        ? (() => {
            const r = header.getBoundingClientRect();
            return {
              position: headerCs.position,
              top: headerCs.top,
              dataScrolled: header.getAttribute("data-scrolled"),
              width: r.width,
              height: r.height,
              backgroundColor: headerCs.backgroundColor,
              borderBottomColor: headerCs.borderBottomColor,
            };
          })()
        : null;

      return {
        hero: heroSection
          ? {
              backgroundColor: heroCs.backgroundColor,
              ariaLabel: heroSection.getAttribute("aria-label"),
              top: heroSection.getBoundingClientRect().top,
              height: heroSection.getBoundingClientRect().height,
            }
          : null,
        image: imgInfo,
        marquee: marqueeInfo,
        header: headerInfo,
        html: {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        },
        body: {
          scrollWidth: document.body.scrollWidth,
          clientWidth: document.body.clientWidth,
        },
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    });

    summary.viewports[vp.name] = { measurements, consoleErrors, pageErrors };

    // assertions
    if (!measurements.hero) {
      fail(summary, `${vp.name}: hero <section> not found`);
    } else {
      const bg = measurements.hero.backgroundColor;
      // rgb(11,15,26) = #0B0F1A, or rgb(11,15,26,0/0.x) etc. Strip alpha.
      const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(bg);
      if (!m || m[1] !== "11" || m[2] !== "15" || m[3] !== "26") {
        fail(
          summary,
          `${vp.name}: hero background-color is "${bg}", expected #0B0F1A (11,15,26)`
        );
      }
    }

    if (!measurements.image) {
      fail(summary, `${vp.name}: hero background.png image not found`);
    } else if (measurements.image.naturalWidth < 1700 || measurements.image.naturalHeight < 800) {
      fail(
        summary,
        `${vp.name}: hero background.png natural size is ${measurements.image.naturalWidth}x${measurements.image.naturalHeight}, expected ~1740x904`
      );
    }

    if (!measurements.marquee) {
      fail(summary, `${vp.name}: .hero-marquee wrapper not found`);
    } else {
      if (measurements.marquee.uniqueLabels < 7) {
        fail(
          summary,
          `${vp.name}: marquee only has ${measurements.marquee.uniqueLabels} unique labels, expected >= 7`
        );
      }
      if (!measurements.reducedMotion) {
        if (!/marquee/i.test(measurements.marquee.animationName)) {
          fail(
            summary,
            `${vp.name}: marquee animationName is "${measurements.marquee.animationName}", expected a marquee keyframes name`
          );
        }
        if (measurements.marquee.animationDuration === "0s") {
          fail(summary, `${vp.name}: marquee animationDuration is 0s (motion should be enabled)`);
        }
      }
    }

    if (!measurements.header || measurements.header.position !== "sticky") {
      fail(summary, `${vp.name}: navbar is not sticky (got "${measurements.header && measurements.header.position}")`);
    } else {
      // top state must be transparent so the dark hero shows through
      const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(
        measurements.header.backgroundColor
      );
      const rgbaNumeric = m
        ? `${m[1]},${m[2]},${m[3]}`
        : measurements.header.backgroundColor;
      const isTransparent =
        measurements.header.backgroundColor === "rgba(0, 0, 0, 0)" ||
        measurements.header.backgroundColor === "transparent" ||
        /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\)/.test(measurements.header.backgroundColor);
      if (!isTransparent) {
        fail(
          summary,
          `${vp.name}: navbar top-state background is "${measurements.header.backgroundColor}", expected transparent (so the dark hero shows through)`
        );
      }
    }

    const overflow =
      measurements.html.scrollWidth > measurements.html.clientWidth + 1 ||
      measurements.body.scrollWidth > measurements.body.clientWidth + 1;
    if (overflow) {
      fail(
        summary,
        `${vp.name}: horizontal overflow (html=${measurements.html.scrollWidth}/${measurements.html.clientWidth} body=${measurements.body.scrollWidth}/${measurements.body.clientWidth})`
      );
    }

    if (consoleErrors.length) {
      fail(summary, `${vp.name}: ${consoleErrors.length} console error(s) — ${consoleErrors.join(" | ")}`);
    }
    if (pageErrors.length) {
      fail(summary, `${vp.name}: ${pageErrors.length} page error(s) — ${pageErrors.join(" | ")}`);
    }

    // screenshots
    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-top.png`),
      fullPage: false,
    });
    // full-page for visual diff
    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-full.png`),
      fullPage: true,
    });

    await context.close();
  }

  await browser.close();

  summary.finishedAt = new Date().toISOString();
  const out = path.join(SHOT_DIR, "summary.json");
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));

  console.log("HERO PHASE7C RESULT:", summary.pass ? "PASS" : "FAIL");
  if (!summary.pass) {
    console.log("Reasons:");
    for (const r of summary.failureReasons) console.log(" -", r);
  }
  for (const vp of Object.keys(summary.viewports)) {
    const v = summary.viewports[vp].measurements;
    console.log(`\n[${vp}]`);
    console.log(`  hero bg:     ${v.hero && v.hero.backgroundColor}`);
    console.log(`  hero h:      ${v.hero && v.hero.height}px`);
    console.log(`  image size:  ${v.image ? v.image.naturalWidth + "x" + v.image.naturalHeight : "—"} (rendered ${v.image ? Math.round(v.image.width) + "x" + Math.round(v.image.height) : "—"})`);
    console.log(`  marquee:     anim=${v.marquee && v.marquee.animationName} duration=${v.marquee && v.marquee.animationDuration} uniqueLabels=${v.marquee && v.marquee.uniqueLabels}`);
    console.log(`  header:      pos=${v.header && v.header.position} bg=${v.header && v.header.backgroundColor}`);
    console.log(`  overflow:    html=${v.html.scrollWidth}/${v.html.clientWidth} body=${v.body.scrollWidth}/${v.body.clientWidth}`);
    console.log(`  errors:      console=${summary.viewports[vp].consoleErrors.length} page=${summary.viewports[vp].pageErrors.length}`);
  }
  console.log(`\nScreenshots: ${SHOT_DIR}\nDetailed summary: ${out}`);
  process.exit(summary.pass ? 0 : 1);
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
