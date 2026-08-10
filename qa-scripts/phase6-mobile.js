// Phase 6 mobile-only viewport check (390x844, 375x812).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase6-mobile.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase6-mobile');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const TEACHER_EMAIL = 'tariq.aziz+1786297226770@test.local';
const TEACHER_PASSWORD = 'TeachPass!2026';
const STUDENT_EMAIL = 'arif+1786295489811855@test.local';
const STUDENT_PASSWORD = 'StrongPass!2026';

const VIEWPORTS = [
  { name: 'mobile_390x844', width: 390, height: 844 },
  { name: 'mobile_375x812', width: 375, height: 812 },
];

const APP_HOST = 'http://localhost:3000';

const ROLE_CONFIG = {
  teacher: {
    email: TEACHER_EMAIL, password: TEACHER_PASSWORD,
    routes: ['/teacher', '/teacher/assignments', '/teacher/submissions'],
  },
  student: {
    email: STUDENT_EMAIL, password: STUDENT_PASSWORD,
    routes: ['/student', '/student/assignments'],
  },
};

const results = { section: 'Phase 6 - Mobile viewport', startedAt: new Date().toISOString(), viewports: {} };

async function loginViaAPI(page, email, password) {
  const r = await page.request.post('http://localhost:5220/api/Auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password },
  });
  const body = await r.json();
  const token = body.accessToken || body.token;
  if (!token) throw new Error('no token');
  await page.goto(`${APP_HOST}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(t => localStorage.setItem('eduassign.token', t), token);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-extensions'] });
  for (const vp of VIEWPORTS) {
    results.viewports[vp.name] = { width: vp.width, height: vp.height };
    for (const [roleName, cfg] of Object.entries(ROLE_CONFIG)) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const bucket = { routes: {}, consoleErrors: [], networkAppErrors: [] };
      page.on('console', m => {
        if (m.type() === 'error' && !m.text().includes('chrome-extension://')) bucket.consoleErrors.push(m.text());
      });
      page.on('response', resp => {
        const u = resp.url();
        if (u.startsWith(APP_HOST) || u.startsWith('http://localhost:5220')) {
          const s = resp.status();
          if (s >= 400 && !u.includes('/Auth/login')) bucket.networkAppErrors.push(`${s} ${resp.request().method()} ${u}`);
        }
      });
      try {
        await loginViaAPI(page, cfg.email, cfg.password);
        for (const r of cfg.routes) {
          const resp = await page.goto(`${APP_HOST}${r}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
          const shot = path.join(SHOTS_DIR, `${vp.name}_${roleName}_${r.replace(/\//g, '_')}.png`);
          await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
          bucket.routes[r] = { status: resp ? resp.status() : 0, url: page.url(), overflow: m.sw > m.iw + 1, metrics: m, shot };
        }
      } catch (e) {
        bucket.loginError = e.message;
      }
      await ctx.close();
      results.viewports[vp.name][roleName] = bucket;
    }
  }
  await browser.close();
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log('=== MOBILE SUMMARY ===');
  for (const [n, vp] of Object.entries(results.viewports)) {
    console.log(`\n${n} ${vp.width}x${vp.height}`);
    for (const role of ['teacher', 'student']) {
      const r = vp[role];
      if (!r || !r.routes) { console.log(`  ${role}: ${r && r.loginError || 'no data'}`); continue; }
      const oflow = Object.entries(r.routes).filter(([_, x]) => x.overflow).map(([k]) => k);
      console.log(`  ${role}: ${Object.keys(r.routes).length} routes; overflow=${oflow.length ? oflow.join(',') : 'none'}; app4xx5xx=${r.networkAppErrors.length}; console=${r.consoleErrors.length}`);
    }
  }
  console.log('Result:', RESULT_FILE);
})().catch(e => { results.fatalError = e.message; fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2)); console.error('FATAL:', e); process.exit(1); });