// Phase 6 multi-viewport UI verification for the new Similarity panel.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_HOST = 'http://localhost:3000';
const API_HOST = 'http://localhost:5220';
const TEACHER_EMAIL = 'imran.hossain+1786299239080@test.local';
const TEACHER_PASSWORD = 'TeachPass!2026';
const ASSIGNMENT_ID = '6a78c3821d7f8cc453a2e46e';
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase6-viewports');
const RESULT_FILE = path.join(__dirname, 'results', 'phase6_ui_viewports.json');

if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'laptop_1280x800', width: 1280, height: 800 },
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'mobile_375x812', width: 375, height: 812 },
];

const results = {
  startedAt: new Date().toISOString(),
  perViewport: {},
  global: { consoleErrors: [], networkAppErrors: [], pageErrors: [] },
};

function trackPage(page, label) {
  page.on('console', (msg) => {
    const t = msg.type();
    const txt = msg.text();
    if (t === 'error' && !txt.includes('chrome-extension://')) {
      results.global.consoleErrors.push({ where: label, text: txt });
    }
  });
  page.on('pageerror', (err) => results.global.pageErrors.push({ where: label, text: String(err) }));
  page.on('response', (resp) => {
    if (!resp.url().startsWith(API_HOST)) return;
    const s = resp.status();
    if (s >= 400) results.global.networkAppErrors.push({ where: label, status: s, url: resp.url() });
  });
}

async function checkOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      docScrollWidth: doc.scrollWidth, docClientWidth: doc.clientWidth,
      bodyScrollWidth: body.scrollWidth, bodyClientWidth: body.clientWidth,
      hasHorizontalScroll: (doc.scrollWidth > doc.clientWidth + 1) || (body.scrollWidth > body.clientWidth + 1),
    };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    trackPage(page, vp.name);

    const out = { viewport: vp, steps: {} };

    // login
    await page.goto(`${APP_HOST}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.locator('input[type=email], input[name=email], #email').fill(TEACHER_EMAIL);
    await page.locator('input[type=password], input[name=password], #password').fill(TEACHER_PASSWORD);
    await Promise.all([
      page.waitForURL(/\/teacher/, { timeout: 30000 }).catch(() => {}),
      page.locator('button[type=submit], button:has-text("Sign in"), button:has-text("Login")').first().click(),
    ]);
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    out.steps.loginUrl = page.url();

    // navigate to assignment detail
    const r = await page.goto(`${APP_HOST}/teacher/assignments/${ASSIGNMENT_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    out.steps.detailStatus = r ? r.status() : 0;
    out.steps.overflow = await checkOverflow(page);
    await page.screenshot({ path: path.join(SHOTS_DIR, `${vp.name}-01-detail.png`), fullPage: true });

    // Check the analyze panel is present + readable
    const body = (await page.locator('body').innerText()).toLowerCase();
    out.steps.similarityPanelVisible = /similarity analysis/i.test(body);
    out.steps.analyzeButtonVisible = await page.locator('button:has-text("Analyze"), button:has-text("Re-analyze")').count() > 0;
    out.steps.scoreBadgeVisible = /completed|analyzing|notanalyzed|fail/i.test(body);

    // Click analyze (idempotent — backend reuses prior embeddings)
    const btn = page.locator('button:has-text("Analyze"), button:has-text("Re-analyze")').first();
    if (await btn.count() > 0) {
      await btn.click();
      // Poll for completed state
      let lastStatus = '';
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1000);
        const txt = await page.locator('body').innerText();
        const m = txt.match(/(Analyzing|Completed|NotAnalyzed|Failed)/i);
        if (m) lastStatus = m[0];
        if (/Completed|NotAnalyzed|Failed/.test(txt)) break;
      }
      out.steps.polledStatus = lastStatus;
      await page.screenshot({ path: path.join(SHOTS_DIR, `${vp.name}-02-after-analyze.png`), fullPage: true });
      out.steps.overflowAfter = await checkOverflow(page);
    }

    await ctx.close();
    results.perViewport[vp.name] = out;
  }

  await browser.close();
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log('Wrote', RESULT_FILE);
  console.log(JSON.stringify({
    consoleErrors: results.global.consoleErrors.length,
    networkAppErrors: results.global.networkAppErrors.length,
    pageErrors: results.global.pageErrors.length,
    perViewport: Object.fromEntries(Object.entries(results.perViewport).map(([k,v]) => [k, {
      overflow: v.steps.overflow?.hasHorizontalScroll,
      analyzeBtn: v.steps.analyzeButtonVisible,
      score: v.steps.polledStatus || 'no-click',
    }])),
  }, null, 2));
})();