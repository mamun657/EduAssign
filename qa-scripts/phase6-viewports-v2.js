// Phase 6 multi-viewport verification - resilient version.
// Tests Teacher, Student, Admin at 4 viewports: 1440x900, 1280x800, 390x844, 375x812
// Uses per-viewport isolated browser contexts and handles login flakiness.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase6-viewports-v2.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase6-viewports-v2');
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

const ROLE_CONFIG = {
  teacher: {
    email: TEACHER_EMAIL, password: TEACHER_PASSWORD,
    routes: ['/teacher', '/teacher/assignments', '/teacher/submissions', '/teacher/students', '/teacher/subjects'],
  },
  student: {
    email: STUDENT_EMAIL, password: STUDENT_PASSWORD,
    routes: ['/student', '/student/assignments', '/student/subjects'],
  },
  admin: {
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
    routes: ['/admin', '/admin/students', '/admin/teachers', '/admin/subjects', '/admin/curriculum', '/admin/teacher-student-subject'],
  },
};

const results = {
  section: 'Phase 6 - Multi-viewport UI Verification (v2)',
  startedAt: new Date().toISOString(),
  viewports: {},
  fatalError: null,
};

async function loginViaUI(page, email, password) {
  // Resolve auth purely through API to avoid navigation fragility
  const loginRes = await page.request.post('http://localhost:5220/api/Auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password },
  });
  if (!loginRes.ok()) throw new Error(`login API failed: ${loginRes.status()}`);
  const body = await loginRes.json();
  const token = body.accessToken || body.token || body.access_token;
  if (!token) throw new Error('no token in login response');
  // Inject token + role into localStorage
  await page.goto(`${APP_HOST}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ t, em, rl }) => {
    localStorage.setItem('eduassign.token', t);
    localStorage.setItem('eduassign.user', JSON.stringify({ email: em, role: rl, name: em }));
  }, { t: token, em: email, rl: email === ADMIN_EMAIL ? 'Admin' : email === TEACHER_EMAIL ? 'Teacher' : 'Student' });
}

async function runForRole(browser, vp, roleName, cfg) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const bucket = { routes: {}, consoleErrors: [], networkAppErrors: [], pageErrors: [], shots: [] };
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

  try {
    await loginViaUI(page, cfg.email, cfg.password);
    for (const r of cfg.routes) {
      try {
        const resp = await page.goto(`${APP_HOST}${r}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
          url: location.pathname,
        }));
        const overflow = m.sw > m.iw + 1;
        const shot = path.join(SHOTS_DIR, `${vp.name}_${roleName}_${r.replace(/\//g, '_')}.png`);
        await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
        bucket.routes[r] = { status: resp ? resp.status() : 0, url: page.url(), overflow, metrics: m };
        bucket.shots.push(shot);
      } catch (e) {
        bucket.routes[r] = { error: e.message };
      }
    }
  } catch (e) {
    bucket.loginError = e.message;
  }

  await ctx.close();
  return bucket;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-extensions'] });
  for (const vp of VIEWPORTS) {
    results.viewports[vp.name] = { width: vp.width, height: vp.height };
    for (const [roleName, cfg] of Object.entries(ROLE_CONFIG)) {
      try {
        results.viewports[vp.name][roleName] = await runForRole(browser, vp, roleName, cfg);
      } catch (e) {
        results.viewports[vp.name][roleName] = { fatal: e.message };
      }
    }
  }
  await browser.close();
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n=== VIEWPORT SUMMARY ===');
  let overflowCount = 0, appErrorCount = 0, consoleErrorCount = 0;
  for (const [name, vp] of Object.entries(results.viewports)) {
    console.log(`\n${name} ${vp.width}x${vp.height}`);
    for (const role of ['teacher', 'student', 'admin']) {
      const r = vp[role];
      if (!r || !r.routes) { console.log(`  ${role}: skipped (${r && r.loginError || r && r.fatal || 'no data'})`); continue; }
      const overflowRoutes = Object.entries(r.routes).filter(([_, x]) => x.overflow).map(([k]) => k);
      const errRoutes = (r.networkAppErrors || []).filter(e => !/^30[12378]/.test(e)).length;
      if (overflowRoutes.length) overflowCount++;
      appErrorCount += errRoutes;
      consoleErrorCount += (r.consoleErrors || []).length;
      console.log(`  ${role}: ${Object.keys(r.routes).length} routes, overflow=${overflowRoutes.length ? overflowRoutes.join(',') : 'none'}, app4xx5xx=${errRoutes}, console=${(r.consoleErrors || []).length}`);
    }
  }
  console.log(`\nTotals: viewportsWithOverflow=${overflowCount}, appErrors=${appErrorCount}, consoleErrors=${consoleErrorCount}`);
  console.log(`Result file: ${RESULT_FILE}`);
})().catch((e) => {
  results.fatalError = e.message + '\n' + e.stack;
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.error('FATAL:', e);
  process.exit(1);
});
