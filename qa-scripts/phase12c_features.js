const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_HOST = 'http://localhost:3000';
const RESULT_FILE = path.join(__dirname, 'results', 'phase12c_features.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase12c_features');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'mobile_360x800', width: 360, height: 800 },
];

// Expected single-sentence descriptions per spec
const EXPECTED_BODIES = {
  'Assignment Management': 'Create and manage class assignments.',
  'Student Management': 'Organize students by level and subject.',
  'Teacher Management': 'Assign teachers to classes and subjects.',
  'Submission & Grading': 'Review submissions, marks, and feedback.',
  'Curriculum Management': 'Manage subjects, levels, and electives.',
  'AI-Powered Similarity Detection':
    'Detect similar submissions with AI.',
};

async function inspect(page, viewport) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${APP_HOST}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);

  const section = await page.$('#features');
  if (!section) {
    return { viewport: viewport.name, fatal: 'features section not found' };
  }

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const sec = document.querySelector('#features');
    if (!sec) return null;
    const secRect = sec.getBoundingClientRect();

    // fig3.png illustration
    const img = sec.querySelector('img[src="/assets/fig3.png"]');
    const imgRect = img ? img.getBoundingClientRect() : null;
    const naturalSize = img ? { w: img.naturalWidth, h: img.naturalHeight } : null;

    // Section header bounds (the eyebrow + heading + image band)
    const headerEl = img ? img.closest('div.grid') : null;
    const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;

    // Heading text
    const headingEl = sec.querySelector('h2');
    const heading = headingEl ? headingEl.textContent.trim() : '';

    // Section eyebrow + label
    const labelEl = sec.querySelector('span'); // first span is the "01" number
    const featureLabelText = sec.textContent.includes('Features');

    // Feature cards — collect title + body
    const articles = Array.from(sec.querySelectorAll('article'));
    const featureCards = articles.map((a) => {
      const h3 = a.querySelector('h3');
      const p = a.querySelector('p');
      return {
        title: h3 ? h3.textContent.trim() : '',
        body: p ? p.textContent.trim() : '',
      };
    });

    // Horizontal overflow
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
      headerHeight: headerRect ? Math.round(headerRect.height) : null,
      heading,
      featureCards,
      hasFeaturesLabel: featureLabelText,
      docScrollWidth: docWidth,
      winWidth,
      hasHorizontalOverflow: hasOverflow,
    };
  });

  const shotPath = path.join(SHOTS_DIR, `features_${viewport.name}.png`);
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

  // Cross-check: every expected title is present, and every body matches
  // the user's required single sentence.
  const bodyAudit = {};
  for (const r of allResults) {
    if (!r.data || r.fatal) continue;
    for (const card of r.data.featureCards) {
      const expected = EXPECTED_BODIES[card.title];
      if (expected) {
        bodyAudit[card.title] = {
          expected,
          actual: card.body,
          match: card.body === expected,
        };
      }
    }
  }

  const summary = {
    ranAt: new Date().toISOString(),
    bodyAudit,
    results: allResults,
  };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(summary, null, 2));
  await browser.close();
  console.log(`wrote ${RESULT_FILE}`);
})();