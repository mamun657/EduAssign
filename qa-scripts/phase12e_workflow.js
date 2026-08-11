// Focused viewport verification for the Phase 12e Workflow / How it works
// section after integrating img4.png and tightening the layout.
//
// Goals:
//   * Confirm the section renders without errors at desktop / tablet / mobile.
//   * Confirm img4.png is visible on the right of the header band.
//   * Confirm the image loaded (natural size = 1536 x 1152).
//   * Confirm the four steps are present with the new short descriptions.
//   * Confirm no horizontal overflow at any viewport width.
//   * Capture screenshots of the section at each breakpoint.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_HOST = 'http://localhost:3000';
const RESULT_FILE = path.join(__dirname, 'results', 'phase12e_workflow.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase12e_workflow');
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
  { n: '01', title: 'Set Up', body: 'Set up your institution.' },
  { n: '02', title: 'Assign', body: 'Create and assign work.' },
  { n: '03', title: 'Submit', body: 'Submit assignments easily.' },
  { n: '04', title: 'Review', body: 'Review, grade, and give feedback.' },
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
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const sec = document.querySelector('#how-it-works');
    if (!sec) return null;
    const secRect = sec.getBoundingClientRect();

    const img = sec.querySelector('img[src="/assets/img4.png"]');
    const imgRect = img ? img.getBoundingClientRect() : null;
    const naturalSize = img ? { w: img.naturalWidth, h: img.naturalHeight } : null;

    const headingEl = sec.querySelector('h2');
    const heading = headingEl ? headingEl.textContent.trim() : '';

    const ledeEl = sec.querySelector('p');
    const lede = ledeEl ? ledeEl.textContent.trim() : '';

    const steps = Array.from(sec.querySelectorAll('ol > li')).map((li) => {
      const h3 = li.querySelector('h3');
      const p = li.querySelector('p');
      const span = li.querySelector('span');
      return {
        n: span ? span.textContent.trim() : '',
        title: h3 ? h3.textContent.trim() : '',
        body: p ? p.textContent.trim() : '',
      };
    });

    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const hasOverflow = docWidth > winWidth;

    return {
      sectionTop: Math.round(secRect.top + window.scrollY),
      sectionHeight: Math.round(secRect.height),
      illustration: imgRect
        ? {
            x: Math.round(imgRect.x),
            y: Math.round(imgRect.y + window.scrollY),
            w: Math.round(imgRect.width),
            h: Math.round(imgRect.height),
            naturalW: naturalSize.w,
            naturalH: naturalSize.h,
            complete: img.complete,
          }
        : null,
      heading,
      lede,
      steps,
      docScrollWidth: docWidth,
      winWidth,
      hasHorizontalOverflow: hasOverflow,
    };
  });

  const shotPath = path.join(SHOTS_DIR, `workflow_${viewport.name}.png`);
  await section.screenshot({ path: shotPath });

  return {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    errors,
    data,
    screenshot: shotPath,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allResults = [];
  for (const vp of VIEWPORTS) {
    try {
      const r = await inspect(page, vp);
      allResults.push(r);
      console.log(JSON.stringify(r, null, 2));
    } catch (e) {
      allResults.push({ viewport: vp.name, fatal: String(e && e.message) });
      console.log(`viewport ${vp.name} failed: ${e.message}`);
    }
  }

  // Cross-check: every expected step is present with the exact title + body.
  const stepAudit = {};
  for (const r of allResults) {
    if (!r.data || r.fatal) continue;
    r.data.steps.forEach((actual, i) => {
      const expected = EXPECTED_STEPS[i];
      if (!expected) return;
      stepAudit[`${r.viewport}::${expected.title}`] = {
        viewport: r.viewport,
        n_expected: expected.n,
        n_actual: actual.n,
        n_match: expected.n === actual.n,
        title_expected: expected.title,
        title_actual: actual.title,
        title_match: expected.title === actual.title,
        body_expected: expected.body,
        body_actual: actual.body,
        body_match: expected.body === actual.body,
      };
    });
  }

  fs.writeFileSync(
    RESULT_FILE,
    JSON.stringify({ results: allResults, stepAudit }, null, 2),
  );
  console.log(`wrote ${RESULT_FILE}`);

  await browser.close();
})();