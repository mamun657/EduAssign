"use strict";
// Phase 9 — final verification screenshots at all 8 viewports.
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

const SHOT_DIR = path.join("qa-scripts", "screenshots", "phase9-after");
fs.mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("requestfailed", (req) => {
      try {
        if (new URL(req.url()).origin === new URL(URL).origin) failedRequests.push(req.url());
      } catch (_) {}
    });

    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // first viewport
    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-top.png`),
      fullPage: false,
    });
    // full page
    await page.screenshot({
      path: path.join(SHOT_DIR, `${vp.name}-full.png`),
      fullPage: true,
    });

    // Internal measurements
    const metrics = await page.evaluate(() => {
      const html = document.documentElement;
      const nav = document.querySelector("header");
      const hero = document.querySelector('[aria-label="Introduction"]');
      const content = hero ? hero.querySelector("div.relative") : null;
      const pill = document.querySelector('[aria-label="Platform capabilities"]');
      const img = hero ? hero.querySelector("img") : null;
      const h1 = hero ? hero.querySelector("h1") : null;
      const ctas = hero ? hero.querySelector("h1").parentElement.querySelector("a") : null;
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom };
      };
      return {
        scrollWidth: html.scrollWidth,
        clientWidth: html.clientWidth,
        nav: box(nav),
        hero: box(hero),
        pill: box(pill),
        img: box(img),
        h1: box(h1),
        vh: window.innerHeight,
      };
    });

    report.push({
      name: vp.name,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      failedRequests: failedRequests.length,
      overflow: metrics.scrollWidth - metrics.clientWidth,
      vh: metrics.vh,
      nav_h: metrics.nav ? metrics.nav.h : null,
      hero_h: metrics.hero ? metrics.hero.h : null,
      hero_bottom: metrics.hero ? metrics.hero.bottom : null,
      pill_bottom: metrics.pill ? metrics.pill.bottom : null,
      pill_visible: metrics.pill ? (metrics.pill.bottom <= metrics.vh && metrics.pill.y >= 0) : null,
      img_w: metrics.img ? metrics.img.w : null,
      consoleErrorsSample: consoleErrors.slice(0, 5),
    });

    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(SHOT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });