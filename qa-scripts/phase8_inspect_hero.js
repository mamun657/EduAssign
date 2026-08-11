"use strict";
// Inspection utility — measures hero internals and image positioning at multiple
// viewports so we can tune the composition mathematically before committing
// changes.

const { chromium } = require("playwright");

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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const hero = document.querySelector("section[aria-label='Introduction']");
      const heroBox = hero.getBoundingClientRect();
      const img = hero.querySelector("img");
      const imgBox = img ? img.getBoundingClientRect() : null;
      const container = hero.querySelector("div.mx-auto.max-w-7xl");
      const containerBox = container.getBoundingClientRect();
      const leftCol = hero.querySelector(".hero-fade-in");
      const leftBox = leftCol ? leftCol.getBoundingClientRect() : null;
      const marquee = hero.querySelector('[aria-label="Platform capabilities"]');
      const marqueeBox = marquee ? marquee.getBoundingClientRect() : null;
      const navbar = document.querySelector("header");
      const navBox = navbar ? navbar.getBoundingClientRect() : null;
      return {
        heroH: heroBox.height,
        imgBox: imgBox && {
          x: Math.round(imgBox.x),
          y: Math.round(imgBox.y),
          w: Math.round(imgBox.width),
          h: Math.round(imgBox.height),
          bottom: Math.round(imgBox.bottom),
          right: Math.round(imgBox.right),
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
        },
        containerBox: {
          x: Math.round(containerBox.x),
          y: Math.round(containerBox.y),
          w: Math.round(containerBox.width),
          h: Math.round(containerBox.height),
          bottom: Math.round(containerBox.bottom),
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
      };
    });
    out.push({ name: vp.name, data });
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
