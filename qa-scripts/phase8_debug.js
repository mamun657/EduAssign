"use strict";
const { chromium } = require("playwright");
const URL = "http://localhost:3000/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push("PE:" + e));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => {
    return {
      heroFound: !!document.querySelector("section[aria-label='Introduction']"),
      imgFound: !!document.querySelector("section[aria-label='Introduction'] img"),
      marqueeFound: !!document.querySelector('[aria-label="Platform capabilities"]'),
      allArrows: Array.from(document.querySelectorAll("[aria-label]")).map(
        (e) => e.getAttribute("aria-label"),
      ),
      bodyHTMLLen: document.body.innerHTML.length,
    };
  });
  console.log(JSON.stringify({ data, errs }, null, 2));
  await ctx.close();
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
