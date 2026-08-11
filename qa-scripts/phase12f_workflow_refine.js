// Phase 12f — Workflow section refinement verification.
//
// Verifies that the HowItWorks section matches the reference composition:
//   * Two-column header on desktop — text on the LEFT (eyebrow + heading +
//     supporting paragraph), fig7.png illustration on the RIGHT (smaller,
//     no card, no border, no shadow).
//   * Single eyebrow label "WORKFLOW" — no "01 —" / "02 —" numeric prefix
//     and no decorative dash beside the label.
//   * Compact 4-step row at the bottom with the expected copy.
//   * Stacks correctly on tablet / mobile (text → paragraph → illustration
//     → steps).
//   * No horizontal overflow at any viewport.
//   * fig7.png loads with a non-zero natural size.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_HOST = 'http://localhost:3000';
const RESULT_FILE = path.join(__dirname, 'results', 'phase12f_workflow.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase12f_workflow');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'mobile_360x800', width: 360, height: 800 },
];

const EXPECTED_STEPS = [
  { title: 'Setup', body: 'Set up your institution.' },
  { title: 'Assign', body: 'Create and assign work.' },
  { title: 'Submit', body: 'Submit assignments easily.' },
  { title: 'Review', body: 'Review and give feedback.' },
];

async function inspect(page, viewport) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${APP_HOST}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);

  const section = await page.$('#how-it-works');
  if (!section) {
    return { viewport: viewport.name, fatal: 'workflow section not found' };
  }

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const data = await page.evaluate(() => {
    const sec = document.querySelector('#how-it-works');
    if (!sec) return null;
    const secRect = sec.getBoundingClientRect();

    const img = sec.querySelector('img[src="/assets/fig7.png"]');
    let ill = null;
    if (img) {
      const r = img.getBoundingClientRect();
      ill = {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        complete: img.complete,
      };
    }

    const h2 = sec.querySelector('h2');
    const heading = h2 ? h2.textContent.replace(/\s+/g, ' ').trim() : null;

    // Supporting paragraph is the first <p> inside the section.
    const p = sec.querySelector('p');
    const lede = p ? p.textContent.replace(/\s+/g, ' ').trim() : null;

    // Eyebrow: the uppercase small label sitting directly above the h2.
    const eyebrowEl = h2 && h2.parentElement
      ? h2.parentElement.querySelector('div')
      : null;
    const eyebrow = eyebrowEl
      ? eyebrowEl.textContent.replace(/\s+/g, ' ').trim()
      : null;

    // Collect the four workflow steps from the <ol>.
    const ol = sec.querySelector('ol');
    const steps = [];
    if (ol) {
      ol.querySelectorAll(':scope > li').forEach((li) => {
        const h = li.querySelector('h3');
        const pp = li.querySelector('p');
        steps.push({
          title: h ? h.textContent.trim() : null,
          body: pp ? pp.textContent.trim() : null,
        });
      });
    }

    return {
      sectionTop: Math.round(secRect.top + window.scrollY),
      sectionHeight: Math.round(secRect.height),
      illustration: ill,
      heading,
      lede,
      eyebrow,
      steps,
      docScrollWidth: document.documentElement.scrollWidth,
      winWidth: window.innerWidth,
      hasHorizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

  const screenshot = path.join(SHOTS_DIR, `workflow_${viewport.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  return {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    errors,
    data,
    screenshot,
  };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const v of VIEWPORTS) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await inspect(page, v));
  }

  await browser.close();

  // Print a short summary + write the JSON.
  let allPass = true;
  for (const r of results) {
    if (r.fatal) {
      console.log(`[${r.viewport}] FATAL ${r.fatal}`);
      allPass = false;
      continue;
    }
    const stepsOK =
      r.data.steps.length === EXPECTED_STEPS.length &&
      r.data.steps.every((s, i) =>
        s.title === EXPECTED_STEPS[i].title &&
        s.body === EXPECTED_STEPS[i].body,
      );
    const illOK = !!r.data.illustration && r.data.illustration.complete
      && r.data.illustration.naturalW > 0
      && r.data.illustration.naturalH > 0;
    const overflowOK = !r.data.hasHorizontalOverflow;
    const eyebrowOK = (r.data.eyebrow || '').toLowerCase() === 'workflow'
      && !/^\d{1,2}\s*[-—–]/.test(r.data.eyebrow || '');
    const headingOK = /One clear workflow/.test(r.data.heading || '');

    const status =
      stepsOK && illOK && overflowOK && eyebrowOK && headingOK && r.errors.length === 0
        ? 'PASS'
        : 'FAIL';
    if (status !== 'PASS') allPass = false;
    console.log(
      `[${r.viewport}] ${status} ` +
      `sectionH=${r.data.sectionHeight} ` +
      `ill=${illOK ? 'OK' : 'MISS'} ` +
      `steps=${stepsOK ? 'OK' : 'BAD'} ` +
      `eyebrow="${r.data.eyebrow}" ` +
      `overflow=${overflowOK ? 'no' : 'YES'} ` +
      `errors=${r.errors.length}`,
    );
    if (r.errors.length) console.log('  errors:', r.errors);
  }

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${RESULT_FILE}`);
  process.exit(allPass ? 0 : 1);
})();