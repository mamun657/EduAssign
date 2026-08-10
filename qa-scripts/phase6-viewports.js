// Phase 6 multi-viewport verification.
// Tests Teacher, Student, Admin at 4 viewports: 1440x900, 1280x800, 390x844, 375x812
// Clean Chromium (no extensions). Tracks console errors + 4xx/5xx app errors.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase6-viewports.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase6-viewports');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const TEACHER_EMAIL = 'tariq.aziz+1786297226770@test.local';
const TEACHER_PASSWORD = 'TeachPass!2026';
const STUDENT_EMAIL = 'arif+1786295489811855@test.local';
const STUDENT_PASSWORD = 'StrongPass!2026';
const ADMIN_EMAIL = 'admin@eduassign.local';
const ADMIN_PASSWORD = 'L@unchPad!Admin#2026-XqZ';

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'laptop_1280x800', width: 1280, height: 800 },
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'mobile_375x812', width: 375, height: 812 },
];

const APP_HOST = 'http://localhost:3000';

const results = {
  section: 'Phase 6 - Multi-viewport UI Verification',
  startedAt: new Date().toISOString(),
  viewports: {},
  fatalError: null,
};

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
  await page.waitForTimeout(1200);
}

function trackErrors(page, bucket) {
  bucket.consoleErrors = [];
  bucket.networkAppErrors = [];
  bucket.horizontalOverflow = {};
  bucket.pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (txt.includes('chrome-extension://')) return;
      bucket.consoleErrors.push(txt);
    }
  });
  page.on('pageerror', (err) => bucket.pageErrors.push(err.message));
  page.on('response', (resp) => {
    const url = resp.url();
    if (url.startsWith('chrome-extension://')) return;
    if (url.startsWith(APP_HOST) || url.startsWith('http://localhost:5220')) {
      const s = resp.status();
      if (s >= 400) bucket.networkAppErrors.push(`${s} ${resp.request().method()} ${url}`);
    }
  });
}

async function detectOverflow(page, label, bucket) {
  // Check several routes for horizontal overflow
  const routes = ['/teacher', '/teacher/assignments', '/teacher/submissions'];
  for (const route of routes) {
    const url = `${APP_HOST}${route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    }));
    bucket.horizontalOverflow[route] = overflow.scrollWidth > overflow.innerWidth + 1;
    bucket[`_${route.replace(/\//g, '_')}_metrics`] = overflow;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-extensions'] });

  for (const vp of VIEWPORTS) {
    results.viewports[vp.name] = { width: vp.width, height: vp.height, roles: {} };
    const bucket = results.viewports[vp.name];

    // Teacher
    {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      trackErrors(page, bucket.roles.teacher = { routes: {}, shots: [] });
      await loginViaUI(page, TEACHER_EMAIL, TEACHER_PASSWORD);
      const routes = ['/teacher', '/teacher/assignments', '/teacher/submissions', '/teacher/students', '/teacher/subjects'];
      for (const r of routes) {
        const resp = await page.goto(`${APP_HOST}${r}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        }));
        const overflow = m.sw > m.iw + 1;
        const shot = path.join(SHOTS_DIR, `${vp.name}_teacher_${r.replace(/\//g, '_')}.png`);
        await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
        bucket.roles.teacher.routes[r] = { status: resp ? resp.status() : 0, url: page.url(), overflow, metrics: m };
        bucket.roles.teacher.shots.push(shot);
      }
      await ctx.close();
    }

    // Student
    {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      trackErrors(page, bucket.roles.student = { routes: {}, shots: [] });
      await loginViaUI(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      const routes = ['/student', '/student/assignments', '/student/subjects'];
      for (const r of routes) {
        const resp = await page.goto(`${APP_HOST}${r}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        }));
        const overflow = m.sw > m.iw + 1;
        const shot = path.join(SHOTS_DIR, `${vp.name}_student_${r.replace(/\//g, '_')}.png`);
        await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
        bucket.roles.student.routes[r] = { status: resp ? resp.status() : 0, url: page.url(), overflow, metrics: m };
        bucket.roles.student.shots.push(shot);
      }
      await ctx.close();
    }

    // Admin
    {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      trackErrors(page, bucket.roles.admin = { routes: {}, shots: [] });
      await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      const routes = ['/admin', '/admin/students', '/admin/teachers', '/admin/subjects', '/admin/curriculum', '/admin/teacher-student-subject'];
      for (const r of routes) {
        const resp = await page.goto(`${APP_HOST}${r}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
        }));
        const overflow = m.sw > m.iw + 1;
        const shot = path.join(SHOTS_DIR, `${vp.name}_admin_${r.replace(/\//g, '_')}.png`);
        await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
        bucket.roles.admin.routes[r] = { status: resp ? resp.status() : 0, url: page.url(), overflow, metrics: m };
        bucket.roles.admin.shots.push(shot);
      }
      await ctx.close();
    }
  }

  await browser.close();
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n=== VIEWPORT SUMMARY ===');
  for (const [name, vp] of Object.entries(results.viewports)) {
    console.log(`\n${name} ${vp.width}x${vp.height}`);
    for (const [role, data] of Object.entries(vp.roles)) {
      const overflowRoutes = Object.entries(data.routes).filter(([_, r]) => r.overflow).map(([k]) => k);
      const errorRoutes = data.networkAppErrors.filter(e => !/^30[12378]/.test(e)).length;
      console.log(`  ${role}: ${Object.keys(data.routes).length} routes, overflow=${overflowRoutes.length ? overflowRoutes.join(',') : 'none'}, app4xx5xx=${errorRoutes}, consoleErrors=${data.consoleErrors.length}`);
    }
  }
  console.log(`\nResult file: ${RESULT_FILE}`);
})().catch((e) => {
  results.fatalError = e.message + '\n' + e.stack;
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.error('FATAL:', e);
  process.exit(1);
});
