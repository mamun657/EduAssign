"use strict";
// Phase 9 — visual inspection of marquee clipping + hero spacing.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const URL = "http://localhost:3000/";
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "390x844", width: 390, height: 844 },
];

const SHOT_DIR = path.join("qa-scripts", "screenshots", "phase9-before");
fs.mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // Pause animations so we can inspect the "natural" (rest) layout.
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-play-state: paused !important; animation-delay: -9999ms !important; }`,
    });
    await page.waitForTimeout(200);

    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-top.png`),
      fullPage: false,
      clip: { x: 0, y: 0, width: vp.width, height: vp.height },
    });

    // Marquee-only screenshot
    const marquee = await page.$('[aria-label="Platform capabilities"]');
    if (marquee) {
      const box = await marquee.boundingBox();
      if (box) {
        await page.screenshot({
          path: path.join(SHOT_DIR, `${vp.name}-marquee.png`),
          clip: {
            x: Math.max(0, box.x - 8),
            y: Math.max(0, box.y - 6),
            width: Math.min(vp.width, box.width + 16),
            height: box.height + 12,
          },
        });
      }
    }

    const metrics = await page.evaluate(() => {
      const m = document.querySelector('[aria-label="Platform capabilities"]');
      const track = document.querySelector(".hero-marquee");
      const mbox = m ? m.getBoundingClientRect() : null;
      const tbox = track ? track.getBoundingClientRect() : null;
      const fadeL = document.querySelector('[aria-label="Platform capabilities"]') ?
        document.querySelector('[aria-label="Platform capabilities"] > div:nth-of-type(1)') : null;
      const flBox = fadeL ? fadeL.getBoundingClientRect() : null;
      // First visible item
      const firstItem = track ? track.firstElementChild : null;
      const fiBox = firstItem ? firstItem.getBoundingClientRect() : null;
      return {
        mbox: mbox && { x: mbox.x, y: mbox.y, w: mbox.width, h: mbox.height },
        tbox: tbox && { x: tbox.x, y: tbox.y, w: tbox.width, h: tbox.height },
        fadeL_w: flBox && flBox.width,
        firstItem: fiBox && { x: fiBox.x, y: fiBox.y, w: fiBox.width, h: fiBox.height },
      };
    });

    report.push({ name: vp.name, ...metrics });
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(SHOT_DIR, "metrics.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });