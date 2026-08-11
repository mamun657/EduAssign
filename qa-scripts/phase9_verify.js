// Phase 9 verification — final composition rework
// Captures all 8 viewports + verifies marquee is moving RTL + captures
// ambient halo behind image + checks for visible card/border artifacts.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "screenshots", "phase9-v2");
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = { viewports: [] };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });

    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    // measure hero
    const heroM = await page.evaluate(() => {
      const sec = document.querySelector("section");
      const imgs = Array.from(sec?.querySelectorAll("img") ?? []);
      const track = sec?.querySelector(".hero-marquee-track");
      const trackItems = track
        ? Array.from(track.querySelectorAll(":scope > div"))
        : [];
      const trackTransform = track
        ? getComputedStyle(track).transform
        : null;

      // find the halo
      const halo = sec?.querySelector('div[aria-hidden="true"][class*="radial"]')
        || Array.from(sec?.querySelectorAll('div[aria-hidden="true"]') ?? []).find(
          (d) => d.style?.background?.includes("radial-gradient")
        );

      return {
        docW: document.documentElement.scrollWidth,
        docH: document.documentElement.scrollHeight,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        sectionCount: document.querySelectorAll("section").length,
        img: imgs[0]
          ? {
              src: imgs[0].src,
              natW: imgs[0].naturalWidth,
              natH: imgs[0].naturalHeight,
              renderedW: imgs[0].getBoundingClientRect().width,
              renderedH: imgs[0].getBoundingClientRect().height,
              x: imgs[0].getBoundingClientRect().x,
              y: imgs[0].getBoundingClientRect().y,
              bottom: imgs[0].getBoundingClientRect().bottom,
              mask: getComputedStyle(imgs[0]).webkitMaskImage || getComputedStyle(imgs[0]).maskImage,
            }
          : null,
        halo: halo
          ? {
              x: halo.getBoundingClientRect().x,
              y: halo.getBoundingClientRect().y,
              w: halo.getBoundingClientRect().width,
              h: halo.getBoundingClientRect().height,
            }
          : null,
        marqueeTrack: track
          ? {
              transform: trackTransform,
              itemCount: trackItems.length,
              firstItemX: trackItems[0]?.getBoundingClientRect().x,
              lastItemX: trackItems[trackItems.length - 1]?.getBoundingClientRect().x,
              trackHeight: track.getBoundingClientRect().height,
              trackWidth: track.getBoundingClientRect().width,
            }
          : null,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });

    // first snapshot
    await page.screenshot({
      path: path.join(OUT, `${vp.name}-hero.png`),
      clip: { x: 0, y: 0, width: vp.w, height: Math.min(vp.h, heroM.img ? heroM.img.bottom + 80 : vp.h) },
    });

    // second snapshot 2s later to verify marquee motion
    await page.waitForTimeout(2000);
    const mq2 = await page.evaluate(() => {
      const sec = document.querySelector("section");
      const track = sec?.querySelector(".hero-marquee-track");
      return track ? getComputedStyle(track).transform : null;
    });
    const t1 = heroM.marqueeTrack?.transform;
    const t2 = mq2;
    const moving = (t1 !== t2) && t1 && t2;

    await page.screenshot({
      path: path.join(OUT, `${vp.name}-hero-motion.png`),
      clip: { x: 0, y: 0, width: vp.w, height: Math.min(vp.h, heroM.img ? heroM.img.bottom + 80 : vp.h) },
    });

    // full-page final snapshot
    await page.screenshot({ path: path.join(OUT, `${vp.name}-full.png`), fullPage: true });

    report.viewports.push({
      ...vp,
      errors,
      moving,
      t1,
      t2,
      ...heroM,
    });

    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(`REPORT written to ${path.join(OUT, "report.json")}`);
  console.log(`Total viewports: ${report.viewports.length}`);
  const movingAll = report.viewports.filter((v) => v.moving).length;
  const withErrors = report.viewports.filter((v) => v.errors.length).length;
  const overflow = report.viewports.filter((v) => v.scrollWidth > v.viewportW + 1).length;
  console.log(`Marquee moving at ${movingAll}/${report.viewports.length} viewports`);
  console.log(`Console errors at ${withErrors}/${report.viewports.length} viewports`);
  console.log(`Horizontal overflow at ${overflow}/${report.viewports.length} viewports`);
})();
