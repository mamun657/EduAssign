"use strict";
// PHASE 8 — baseline screenshot script.
// Captures full-page + first-viewport screenshots of the hero at all required
// viewports BEFORE making any code changes, so we have a verifiable baseline
// of the current vertical overflow / framing / feature-strip problems.

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const URL = "http://localhost:3000/";

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
  { name: "375x812", width: 375, height: 812 },
];

const SHOT_DIR = path.join("qa-scripts", "screenshots", "phase8-baseline");
fs.mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("requestfailed", (req) => {
      if (new URL(req.url()).origin === URL.replace(/\/$/, "")) {
        failedRequests.push(req.url());
      }
    });

    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // First-viewport screenshot.
    const firstPath = path.join(SHOT_DIR, `${vp.name}-top.png`);
    await page.screenshot({ path: firstPath, fullPage: false });

    // Full page screenshot.
    const fullPath = path.join(SHOT_DIR, `${vp.name}-full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });

    // Measure overflow + hero bounding box.
    const metrics = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      const hero = document.querySelector("section[aria-label='Introduction']");
      const heroBox = hero ? hero.getBoundingClientRect() : null;
      return {
        scrollWidth: html.scrollWidth,
        clientWidth: html.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        heroTop: heroBox ? heroBox.top : null,
        heroHeight: heroBox ? heroBox.height : null,
      };
    });

    report.push({
      name: vp.name,
      errors: consoleErrors.length,
      pageErrors: pageErrors.length,
      failedRequests: failedRequests.length,
      overflow: metrics.scrollWidth - metrics.clientWidth,
      heroTop: metrics.heroTop,
      heroHeight: metrics.heroHeight,
    });

    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(
    path.join(SHOT_DIR, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
})().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
