// Phase 6 live UI verification — Teacher Similarity
// Uses clean Chromium (no extensions). Verifies the real UI surfaces the
// real backend /api/similarity/* responses.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_HOST = 'http://localhost:3000';
const API_HOST = 'http://localhost:5220';
const TEACHER_EMAIL = 'imran.hossain+1786299239080@test.local';
const TEACHER_PASSWORD = 'TeachPass!2026';
const STUDENT_EMAIL = 'sara.khan+1786299239080@test.local';
const STUDENT_PASSWORD = 'StrongPass!2026';
const ASSIGNMENT_ID = '6a78c3821d7f8cc453a2e46e';
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase6-ui');
const RESULT_FILE = path.join(__dirname, 'results', 'phase6_ui_teacher.json');

if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const results = {
  startedAt: new Date().toISOString(),
  steps: {},
  consoleErrors: [],
  networkAppErrors: [],
  pageErrors: [],
};

function trackPage(page, label) {
  page.on('console', (msg) => {
    const t = msg.type();
    const txt = msg.text();
    if (t === 'error') {
      // ignore chrome-extension noise
      if (txt.includes('chrome-extension://')) return;
      results.consoleErrors.push({ where: label, text: txt });
    }
  });
  page.on('pageerror', (err) => {
    results.pageErrors.push({ where: label, text: String(err) });
  });
  page.on('response', (resp) => {
    const url = resp.url();
    if (!url.startsWith(API_HOST)) return;
    const s = resp.status();
    if (s >= 400) results.networkAppErrors.push({ where: label, status: s, url });
  });
}

async function loginViaUI(page, email, password) {
  await page.goto(`${APP_HOST}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  // Use label-based locators if possible, else type into email/password inputs.
  const emailInput = page.locator('input[type=email], input[name=email], #email');
  const passInput = page.locator('input[type=password], input[name=password], #password');
  await emailInput.fill(email);
  await passInput.fill(password);
  await Promise.all([
    page.waitForURL(/\/(teacher|student|admin)/, { timeout: 30000 }).catch(() => {}),
    page.locator('button[type=submit], button:has-text("Sign in"), button:has-text("Login")').first().click(),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ========== Teacher flow ==========
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    trackPage(page, 'teacher');
    await loginViaUI(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    results.steps.teacherUrlAfterLogin = page.url();
    await page.screenshot({ path: path.join(SHOTS_DIR, 'teacher-01-dashboard.png'), fullPage: true });

    // Navigate to teacher assignments
    await page.goto(`${APP_HOST}/teacher/assignments`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.screenshot({ path: path.join(SHOTS_DIR, 'teacher-02-assignments-list.png'), fullPage: true });

    // Open the specific assignment detail (Phase 6 UI surface)
    await page.goto(`${APP_HOST}/teacher/assignments/${ASSIGNMENT_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'teacher-03-assignment-detail.png'), fullPage: true });

    // Inspect the page content
    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    results.steps.hasAnalyzeButton = await page.locator('button:has-text("Analyze"), button:has-text("Re-analyze")').count() > 0;
    results.steps.hasSimilarityHeading = /similarity|analy[sz]e/i.test(bodyText);
    results.steps.pageBodySnippet = bodyText.replace(/\s+/g, ' ').slice(0, 1500);

    // Get API token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('eduassign.token') || '');
    results.steps.tokenLen = token.length;

    // Direct API call as Teacher — pre-condition: check current summary (404 expected if not analyzed)
    const headers = { Authorization: `Bearer ${token}` };
    const analyzeUrl = `${API_HOST}/api/similarity/submissions/${ASSIGNMENT_ID}/analyze`;
    const summaryUrl = `${API_HOST}/api/similarity/submissions/${ASSIGNMENT_ID}`;
    try {
      const _r = await fetch(summaryUrl, { headers });
      results.steps.preSummary = { status: _r.status, body: _r.status !== 404 ? await _r.text() : null };
    } catch (_e) { results.steps.preSummary = { error: String(_e) }; }

    // Trigger analyze via UI: locate any Analyze button
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Re-analyze")').first();
    if (await analyzeButton.count() > 0) {
      await analyzeButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      // Wait for the button label/text to change — backend is async-queued
      // Implementation: poll for the result panel appearing with a status of Completed/Analyzing/NotAnalyzed
      let lastStatus = '';
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1000);
        const text = (await page.locator('body').innerText());
        const m = text.match(/(Analyzing|Completed|NotAnalyzed|Failed|Completed\s*—\s*0%|Similarity analysis has not)/i);
        if (m) { lastStatus = m[0]; }
        if (/Completed|analyzed|NotAnalyzed|Failed/.test(text)) break;
      }
      results.steps.polledStatus = lastStatus;
      await page.screenshot({ path: path.join(SHOTS_DIR, 'teacher-04-after-analyze.png'), fullPage: true });

      // Read the persisted summary via API
      const post = await fetch(summaryUrl, { headers });
      results.steps.postSummaryStatus = post.status;
      if (post.status === 200) {
        results.steps.postSummary = await post.json();
      }
    } else {
      results.steps.analyzeButtonMissing = true;
    }

    await ctx.close();
  }

  // ========== Student flow — confirm similarity is hidden ==========
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    trackPage(page, 'student');
    await loginViaUI(page, STUDENT_EMAIL, STUDENT_PASSWORD);
    results.steps.studentUrlAfterLogin = page.url();

    // Try a few pages — student should not see Analyze buttons
    const studentPages = ['/student', '/student/assignments', '/student/submissions'];
    results.steps.studentPages = [];
    for (const p of studentPages) {
      const r = await page.goto(`${APP_HOST}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      const text = (await page.locator('body').innerText()).toLowerCase();
      results.steps.studentPages.push({
        path: p,
        status: r ? r.status() : 0,
        url: page.url(),
        hasAnalyzeUI: /analyze\s+similarity|re-analyze|run similarity/.test(text),
      });
      await page.screenshot({ path: path.join(SHOTS_DIR, `student${p.replace(/\//g, '_')}.png`), fullPage: true });
    }

    // Direct API as student — similarity endpoints must 401/403
    const tok = await page.evaluate(() => localStorage.getItem('eduassign.token') || '');
    const headers = { Authorization: `Bearer ${tok}` };
    const endpoints = [
      ['analyze', `${API_HOST}/api/similarity/submissions/${ASSIGNMENT_ID}/analyze`, 'POST'],
      ['summary', summaryUrlC = `${API_HOST}/api/similarity/submissions/${ASSIGNMENT_ID}`, 'GET'],
      ['list', `${API_HOST}/api/similarity/assignments/${ASSIGNMENT_ID}/summary`, 'GET'],
      ['compare', `${API_HOST}/api/similarity/compare?a=x&b=y`, 'POST'],
    ];
    results.steps.studentApiChecks = {};
    for (const [name, url, method] of endpoints) {
      try {
        const r = await fetch(url, { method, headers });
        results.steps.studentApiChecks[name] = { status: r.status };
      } catch (e) {
        results.steps.studentApiChecks[name] = { error: String(e) };
      }
    }
    await ctx.close();
  }

  await browser.close();
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log('Wrote', RESULT_FILE);
  console.log(JSON.stringify({ consoleErrors: results.consoleErrors.length, networkAppErrors: results.networkAppErrors.length, pageErrors: results.pageErrors.length, postSummaryStatus: results.steps.postSummaryStatus, polledStatus: results.steps.polledStatus }, null, 2));
})();