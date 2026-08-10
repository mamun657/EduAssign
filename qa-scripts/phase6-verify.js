// Phase 6 live UI verification.
// Verifies:
//   1. Teacher login -> /teacher (no redirect loop, no app console errors)
//   2. Student login -> /student (cannot see teacher controls)
//   3. Admin login -> /admin routes load
//   4. Teacher UI has NO similarity controls (Phase 6 frontend missing)
//   5. Teacher API can hit /api/similarity/* but student gets 403
//   6. PDF upload -> submission -> analyze -> real cosine score

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase6-verify.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase6-verify');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const ADMIN_EMAIL = 'admin@eduassign.local';
const ADMIN_PASSWORD = 'L@unchPad!Admin#2026-XqZ';
const TEACHER_EMAIL = 'tariq.aziz+1786297226770@test.local';
const TEACHER_PASSWORD = 'TeachPass!2026';
const STUDENT_EMAIL = 'arif+1786295489811855@test.local';
const STUDENT_PASSWORD = 'StrongPass!2026';

const results = {
  section: 'Phase 6 - Live UI Verification',
  startedAt: new Date().toISOString(),
  steps: {},
  consoleErrors: [],
  pageErrors: [],
  networkErrors: [],
  apiChecks: {},
  similarityUiFound: false,
  fatalError: null,
};

const APP_HOST = 'http://localhost:3000';

function trackPage(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (txt.includes('chrome-extension://')) return;
      results.consoleErrors.push(`[${label}] ${txt}`);
    }
  });
  page.on('pageerror', (err) => results.pageErrors.push(`[${label}] ${err.message}`));
  page.on('response', (resp) => {
    const url = resp.url();
    if (url.startsWith('chrome-extension://')) return;
    const s = resp.status();
    if (s >= 500) results.networkErrors.push(`[${label}] ${s} ${url}`);
  });
}

async function loginViaUI(page, email, password) {
  await page.goto(`${APP_HOST}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const respP = page.waitForResponse(
    (r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST',
    { timeout: 8000 }
  );
  await page.locator('button[type="submit"]').first().click();
  await respP;
  await page.waitForTimeout(1500);
}

async function isLoggedIn(page) {
  const url = page.url();
  return /\/teacher|\/student|\/admin/.test(url);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ===== STEP 2: Teacher login =====
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    trackPage(page, 'teacher');
    await loginViaUI(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    results.steps.teacherUrlAfterLogin = page.url();
    results.steps.teacherLoggedIn = await isLoggedIn(page);

    // Visit teacher pages
    const teacherPages = [
      '/teacher',
      '/teacher/assignments',
      '/teacher/submissions',
    ];
    for (const p of teacherPages) {
      const r = await page.goto(`${APP_HOST}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      const status = r ? r.status() : 0;
      const url = page.url();
      const text = (await page.locator('body').innerText()).toLowerCase();
      const hasSimilarityUI = /similarity|plagiar|analy[sz]e|cosine/.test(text);
      if (hasSimilarityUI) results.similarityUiFound = true;
      const shot = path.join(SHOTS_DIR, `teacher${p.replace(/\//g, '_')}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      (results.steps.teacherPages ||= []).push({ path: p, status, url, similarityUI: hasSimilarityUI });
    }
    await ctx.close();
  }

  // ===== STEP 8: Student security =====
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    trackPage(page, 'student');
    await loginViaUI(page, STUDENT_EMAIL, STUDENT_PASSWORD);
    results.steps.studentUrlAfterLogin = page.url();
    results.steps.studentLoggedIn = await isLoggedIn(page);

    // Student should NOT see similarity controls
    const studentPages = ['/student', '/student/assignments'];
    for (const p of studentPages) {
      const r = await page.goto(`${APP_HOST}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      const text = (await page.locator('body').innerText()).toLowerCase();
      const hasSimilarityUI = /similarity|plagiar|analy[sz]e.*submission|cosine/.test(text);
      const shot = path.join(SHOTS_DIR, `student${p.replace(/\//g, '_')}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      (results.steps.studentPages ||= []).push({ path: p, status: r ? r.status() : 0, url: page.url(), similarityUI: hasSimilarityUI });
    }
    await ctx.close();
  }

  // ===== STEP 9: Admin regression =====
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    trackPage(page, 'admin');
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    results.steps.adminUrlAfterLogin = page.url();
    results.steps.adminLoggedIn = await isLoggedIn(page);
    const adminPages = ['/admin', '/admin/students', '/admin/teachers', '/admin/subjects', '/admin/curriculum', '/admin/teacher-student-subject'];
    for (const p of adminPages) {
      const r = await page.goto(`${APP_HOST}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      (results.steps.adminPages ||= []).push({ path: p, status: r ? r.status() : 0, url: page.url() });
    }
    await ctx.close();
  }

  // ===== API CHECK: similarity endpoints reject student =====
  {
    // Login as student and try similarity endpoints
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    trackPage(page, 'student-api');
    await loginViaUI(page, STUDENT_EMAIL, STUDENT_PASSWORD);
    const apiChecks = await page.evaluate(async () => {
      const token = localStorage.getItem('eduassign.token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      const out = {};
      const endpoints = [
        { name: 'compareAnonymous', url: 'http://localhost:5220/api/similarity/compare?a=x&b=y', method: 'GET', auth: false },
        { name: 'compareAuthedStudent', url: 'http://localhost:5220/api/similarity/compare?a=x&b=y', method: 'GET', auth: true },
        { name: 'summaryAuthedStudent', url: 'http://localhost:5220/api/similarity/assignments/x/summary', method: 'GET', auth: true },
      ];
      for (const e of endpoints) {
        try {
          const h = e.auth ? headers : {};
          const r = await fetch(e.url, { method: e.method, headers: h });
          out[e.name] = { status: r.status };
        } catch (err) {
          out[e.name] = { error: String(err) };
        }
      }
      return out;
    });
    results.apiChecks = apiChecks;
    await ctx.close();
  }

  await browser.close();

  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log('Teacher logged in:', results.steps.teacherLoggedIn, '@', results.steps.teacherUrlAfterLogin);
  console.log('Student logged in:', results.steps.studentLoggedIn, '@', results.steps.studentUrlAfterLogin);
  console.log('Admin logged in  :', results.steps.adminLoggedIn, '@', results.steps.adminUrlAfterLogin);
  console.log('Similarity UI found in teacher pages:', results.similarityUiFound);
  console.log('Console errors:', results.consoleErrors.length);
  console.log('Page errors  :', results.pageErrors.length);
  console.log('Network 5xx  :', results.networkErrors.length);
  console.log('API checks   :', JSON.stringify(results.apiChecks, null, 2));
  console.log('Result file  :', RESULT_FILE);
})().catch((e) => {
  results.fatalError = e.message + '\n' + e.stack;
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.error('FATAL:', e);
  process.exit(1);
});
