// Focused viewport verification for the Phase 12 Solutions (Roles) section
// after integrating admin.png into the editorial layout.
//
// Goals:
//   * Confirm the section renders without errors at desktop / tablet / mobile.
//   * Confirm admin.png is visible inside the section.
//   * Confirm no horizontal overflow at any viewport width.
//   * Confirm the 3-column role grid is still present below the illustration.
//   * Confirm the illustration is centered horizontally and respects its max-width.
//   * Capture screenshots of the section at each breakpoint.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_HOST = 'http://localhost:3000';
const RESULT_FILE = path.join(__dirname, 'results', 'phase12_solutions_viewports.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase12_solutions');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'mobile_360x800', width: 360, height: 800 },
];

async function inspect(page, viewport) {
  const url = `${APP_HOST}/`;
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);

  const section = await page.$('#roles');
  if (!section) {
    return { viewport: viewport.name, fatal: 'roles section not found' };
  }

  // Scroll into view and capture
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const sec = document.querySelector('#roles');
    if (!sec) return null;
    const secRect = sec.getBoundingClientRect();

    const img = sec.querySelector('img[src="/assets/admin.png"]');
    const imgRect = img ? img.getBoundingClientRect() : null;
    const naturalSize = img ? { w: img.naturalWidth, h: img.naturalHeight } : null;

    // Outer illustration wrapper
    const wrapper = img ? img.closest('div.mx-auto.mt-20') : null;
    const wrapRect = wrapper ? wrapper.getBoundingClientRect() : null;

    // Role grid wrapper (border-y)
    const grid = sec.querySelector('div.border-y');
    const gridRect = grid ? grid.getBoundingClientRect() : null;

    // Role cards
    const articles = Array.from(sec.querySelectorAll('article'));
    const roleNames = articles.map((a) => {
      const h3 = a.querySelector('h3');
      return h3 ? h3.textContent.trim() : '';
    });

    // Horizontal overflow check on document
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const hasOverflow = docWidth > winWidth;

    // Heading text presence
    const headingEl = sec.querySelector('h2');
    const heading = headingEl ? headingEl.textContent.trim() : '';

    // Centered check: wrapper left + right should be roughly equal inside Container
    const container = sec.querySelector('div.mx-auto');
    const containerRect = container ? container.getBoundingClientRect() : null;
    const centered =
      wrapRect && containerRect
        ? Math.abs(wrapRect.left - containerRect.left - (containerRect.width - wrapRect.width) / 2) < 4
        : null;

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
      wrapper: wrapRect
        ? { w: Math.round(wrapRect.width), left: Math.round(wrapRect.left) }
        : null,
      grid: gridRect
        ? { y: Math.round(gridRect.y + window.scrollY), w: Math.round(gridRect.width) }
        : null,
      roleNames,
      heading,
      docScrollWidth: docWidth,
      winWidth,
      hasHorizontalOverflow: hasOverflow,
      centered,
    };
  });

  // Capture only the section region
  const shotPath = path.join(SHOTS_DIR, `roles_${viewport.name}.png`);
  if (section) {
    await section.screenshot({ path: shotPath });
  }

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

  fs.writeFileSync(RESULT_FILE, JSON.stringify({ ranAt: new Date().toISOString(), results: allResults }, null, 2));
  await browser.close();
  console.log(`wrote ${RESULT_FILE}`);
})();