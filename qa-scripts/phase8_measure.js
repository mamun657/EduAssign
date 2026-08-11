"use strict";
// Phase 8 — hero internals inspector with safer awaits.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

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

const OUT = path.join("qa-scripts", "screenshots", "phase8-measure.json");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector("section[aria-label='Introduction']", { timeout: 10000 });
    await page.waitForTimeout(400);
    const data = await page.evaluate(() => {
      const hero = document.querySelector("section[aria-label='Introduction']");
      if (!hero) return { error: "hero not found" };
      const heroBox = hero.getBoundingClientRect();
      const inner = hero.querySelector("div.mx-auto");
      const innerBox = inner ? inner.getBoundingClientRect() : null;
      const img = hero.querySelector("img");
      const imgBox = img ? img.getBoundingClientRect() : null;
      const leftCol = hero.querySelector(".hero-fade-in");
      const leftBox = leftCol ? leftCol.getBoundingClientRect() : null;
      const marquee = hero.querySelector('[aria-label="Platform capabilities"]');
      const marqueeBox = marquee ? marquee.getBoundingClientRect() : null;
      const navbar = document.querySelector("header");
      const navBox = navbar ? navbar.getBoundingClientRect() : null;
      const html = document.documentElement;
      return {
        overflow: html.scrollWidth - html.clientWidth,
        innerH: innerBox ? innerBox.height : null,
        innerTop: innerBox ? innerBox.top : null,
        innerBottom: innerBox ? innerBox.bottom : null,
        heroH: heroBox.height,
        heroTop: heroBox.top,
        heroBottom: heroBox.bottom,
        imgBox: imgBox && {
          x: Math.round(imgBox.x),
          y: Math.round(imgBox.y),
          w: Math.round(imgBox.width),
          h: Math.round(imgBox.height),
          bottom: Math.round(imgBox.bottom),
          right: Math.round(imgBox.right),
        },
        leftBox: leftBox && {
          x: Math.round(leftBox.x),
          y: Math.round(leftBox.y),
          w: Math.round(leftBox.width),
          h: Math.round(leftBox.height),
          bottom: Math.round(leftBox.bottom),
        },
        marqueeBox: marqueeBox && {
          x: Math.round(marqueeBox.x),
          y: Math.round(marqueeBox.y),
          w: Math.round(marqueeBox.width),
          h: Math.round(marqueeBox.height),
          bottom: Math.round(marqueeBox.bottom),
        },
        navH: navBox ? Math.round(navBox.height) : null,
        viewportH: window.innerHeight,
        marqueeVisibleInVp:
          marqueeBox && marqueeBox.top >= 0 && marqueeBox.bottom <= window.innerHeight,
        heroInVp: heroBox.top < window.innerHeight && heroBox.bottom > 0,
      };
    });
    out.push({ name: vp.name, data });
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
