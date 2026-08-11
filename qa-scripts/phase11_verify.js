// Phase 11 - Full-landing visual + behavioural QA
// 1) 8 viewports, full-page screenshots
// 2) Console + pageerror capture per viewport
// 3) Per-section breakdown: bg tone, top, height, section tone
// 4) Navbar tone-adapter verification (transitions light <-> dark as user scrolls)
// 5) Horizontal overflow check (documentElement.scrollWidth vs viewport)
// 6) Marquee motion sanity (already verified in phase 10, but cheap to re-check)

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = path.join(__dirname, "screenshots", "phase11");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "1920x1080", w: 1920, h: 1080 },
  { name: "1536x864", w: 1536, h: 864 },
  { name: "1440x900", w: 1440, h: 900 },
  { name: "1280x800", w: 1280, h: 800 },
  { name: "1024x768", w: 1024, h: 768 },
  { name: "768x1024", w: 768, h: 1024 },
  { name: "390x844", w: 390, h: 844 },
  { name: "375x812", w: 375, h: 812 },
];

const SECTION_LABELS = [
  "hero",
  "features",
  "how",
  "roles",
  "product",
  "ai",
  "security",
  "faq",
  "finalcta",
  "footer",
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { base: BASE, viewports: [] };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    const failedRequests = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });
    page.on("requestfailed", (r) => {
      const u = r.url();
      if (u.startsWith(BASE)) failedRequests.push(`${r.failure()?.errorText} ${u}`);
    });

    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    // Section breakdown
    const sections = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("[data-nav-tone]"));
      return nodes.map((el) => {
        const r = el.getBoundingClientRect();
        const docTop = r.top + window.scrollY;
        return {
          tag: el.tagName.toLowerCase(),
          tone: el.getAttribute("data-nav-tone"),
          top: Math.round(docTop),
          height: Math.round(r.height),
          bg: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el).color,
        };
      });
    });

    // Hero / marquee motion sanity
    const marqueeT1 = await page.evaluate(() => {
      const t = document.querySelector(".hero-marquee-track");
      return t ? getComputedStyle(t).transform : null;
    });
    await page.waitForTimeout(1500);
    const marqueeT2 = await page.evaluate(() => {
      const t = document.querySelector(".hero-marquee-track");
      return t ? getComputedStyle(t).transform : null;
    });
    const marqueeMoving = !!marqueeT1 && !!marqueeT2 && marqueeT1 !== marqueeT2;

    // Navbar tone transition check - scroll to first WHITE section, then to first BLACK section
    const navTones = [];
    async function captureNavTone(label, scrollY) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scrollY);
      await page.waitForTimeout(400);
      const nav = await page.evaluate(() => {
        const header = document.querySelector("header");
        if (!header) return null;
        const r = header.getBoundingClientRect();
        const cs = getComputedStyle(header);
        return {
          top: r.top,
          bg: cs.backgroundColor,
          backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
          classes: header.className,
        };
      });
      navTones.push({ label, scrollY, nav });
    }
    if (sections.length) {
      const hero = sections[0];
      const firstWhite = sections.find((s) => s.tone === "dark");
      const firstBlack = sections.find((s, i) => i > 0 && s.tone === "light");
      if (hero) await captureNavTone("hero-top", Math.max(0, hero.top));
      if (firstWhite) await captureNavTone("first-white", firstWhite.top + 20);
      if (firstBlack) await captureNavTone("first-black", firstBlack.top + 20);
    }

    // Back to top + screenshots
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // Hero (above the fold)
    await page.screenshot({
      path: path.join(OUT, `${vp.name}-hero.png`),
      clip: { x: 0, y: 0, width: vp.w, height: vp.h },
    });

    // Full page
    await page.screenshot({
      path: path.join(OUT, `${vp.name}-full.png`),
      fullPage: true,
    });

    // overflow check
    const overflow = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const cw = document.documentElement.clientWidth;
      const innerW = window.innerWidth;
      return { scrollWidth: sw, clientWidth: cw, innerWidth: innerW, overflows: sw > innerW + 1 };
    });

    report.viewports.push({
      ...vp,
      errors,
      failedRequests,
      sections,
      sectionCount: sections.length,
      expectedToneRhythm: SECTION_LABELS.map((_, i) => {
        // hero=black -> light; features=white -> dark; how=black -> light; etc.
        const tone = ["light", "dark", "light", "dark", "light", "dark", "light", "dark", "light", "light"];
        return tone[i] || "?";
      }),
      marqueeMoving,
      navTones,
      overflow,
    });

    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  // Summary
  const total = report.viewports.length;
  const withErrors = report.viewports.filter((v) => v.errors.length).length;
  const withFailedReq = report.viewports.filter((v) => v.failedRequests.length).length;
  const overflows = report.viewports.filter((v) => v.overflow.overflows).length;
  const moving = report.viewports.filter((v) => v.marqueeMoving).length;
  console.log(`--- Phase 11 QA summary ---`);
  console.log(`Viewports:        ${total}`);
  console.log(`Console errors:   ${withErrors}/${total}`);
  console.log(`Failed requests:  ${withFailedReq}/${total}`);
  console.log(`Overflow:         ${overflows}/${total}`);
  console.log(`Marquee moving:   ${moving}/${total}`);
  console.log(`Section count:    ${report.viewports[0]?.sectionCount} (expected 10)`);
  console.log(`Tone rhythm:      ${report.viewports[0]?.sections.map((s) => s.tone).join(",")}`);
  console.log(`Screenshots in:   ${OUT}`);
  console.log(`Report:           ${path.join(OUT, "report.json")}`);

  if (withErrors) {
    console.log(`\nFirst errors:`);
    report.viewports.filter((v) => v.errors.length).slice(0, 3).forEach((v) => {
      console.log(`  ${v.name}: ${v.errors.slice(0, 3).join(" | ")}`);
    });
  }
  if (overflows) {
    console.log(`\nOverflows:`);
    report.viewports.filter((v) => v.overflow.overflows).forEach((v) => {
      console.log(`  ${v.name}: scrollW=${v.overflow.scrollWidth} innerW=${v.overflow.innerWidth}`);
    });
  }
})();
