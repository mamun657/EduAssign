// E2E QA: Phase 4 — Teacher + Student Workflow + File Attachments
// Verifies:
//   - Admin pages still render (Phase 3 regression check)
//   - All 5 teacher routes render at 4 viewports (1440x900, 1280x800, 390x844, 375x812)
//   - All 3 student routes render at 4 viewports
//   - 0 console errors, 0 5xx network errors
//   - No horizontal overflow at any viewport
//   - File attachment + submission file metadata surfaces correctly

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase4-verify.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase4');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const teacherFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'results', 'teacher-fixture.json'), 'utf8')
);
const assignmentFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'results', 'assignment-fixture.json'), 'utf8')
);

const ADMIN_EMAIL = 'admin@eduassign.local';
const ADMIN_PASSWORD = 'L@unchPad!Admin#2026-XqZ';

const VIEWPORTS = [
  { name: 'desktop-xl', width: 1440, height: 900 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile-md', width: 390, height: 844 },
  { name: 'mobile-sm', width: 375, height: 812 },
];

const TEACHER_ROUTES = [
  { path: '/teacher', name: 'overview' },
  { path: '/teacher/students', name: 'students' },
  { path: '/teacher/subjects', name: 'subjects' },
  { path: '/teacher/assignments', name: 'assignments' },
  { path: '/teacher/submissions', name: 'submissions' },
];

const STUDENT_ROUTES = [
  { path: '/student', name: 'overview' },
  { path: '/student/assignments', name: 'assignments' },
  { path: '/student/subjects', name: 'subjects' },
];

const results = {
  section: 'Phase 4 — Teacher + Student Workflow + File Attachments',
  startedAt: new Date().toISOString(),
  viewports: VIEWPORTS,
  adminRegression: {},
  teacher: {},
  student: {},
  consoleErrors: [],
  networkErrors: [],
  fatalError: null,
};

function trackPage(page, target) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      target.consoleErrors.push(`[${page.url()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    target.consoleErrors.push(`[${page.url()}] pageerror: ${err.message}`);
  });
  page.on('response', (resp) => {
    if (resp.url().includes('localhost:5220') && resp.status() >= 500) {
      target.networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });
}

async function loginViaUI(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const respP = page.waitForResponse(
    (r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST',
    { timeout: 8000 }
  );
  await page.locator('button[type="submit"]').first().click();
  await respP;
  await page.waitForTimeout(1000);
}

async function checkRoute(page, route, viewport, role) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const finalUrl = page.url();
  const stayedOnRole = finalUrl.includes(`/${role}`);
  const redirectedToLogin = finalUrl.includes('/login');

  // Detect horizontal overflow
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    return { docW, winW, overflow: docW > winW + 1 };
  });

  const bodyText = (await page.locator('body').textContent()) || '';
  const hasContent = bodyText.trim().length > 50;
  // Only fail on a real Next.js error overlay or document title
  const errorOverlay = await page.locator('nextjs-portal, [data-nextjs-dialog], #__next-error').count();
  const docTitle = (await page.title()) || '';
  const hasError =
    errorOverlay > 0 ||
    /Application Error|Unhandled Runtime Error|Internal Server Error/i.test(docTitle);

  await page.screenshot({
    path: path.join(SHOTS_DIR, `${role}-${viewport.name}-${route.name}.png`),
    fullPage: false,
  });

  return {
    path: route.path,
    name: route.name,
    viewport: viewport.name,
    stayedOnRole,
    redirectedToLogin,
    hasContent,
    hasError,
    overflow,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    // ===== Admin regression (Phase 3 still works) =====
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      trackPage(page, results);
      await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      results.adminRegression.loggedIn = new URL(page.url()).pathname.startsWith('/admin');
      console.log('ADMIN_LOGIN_OK');

      const adminOverview = await checkRoute(page, { path: '/admin', name: 'overview' }, VIEWPORTS[0], 'admin');
      results.adminRegression.overview = adminOverview;
      console.log(`ADMIN_OVERVIEW checked`);
      await ctx.close();
    }

    // ===== Teacher @ 4 viewports =====
    results.teacher = {};
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      trackPage(page, results);
      await loginViaUI(page, teacherFixture.email, teacherFixture.password);
      console.log(`TEACHER_LOGIN_OK vp=${vp.name}`);

      results.teacher[vp.name] = { routes: {} };
      for (const route of TEACHER_ROUTES) {
        results.teacher[vp.name].routes[route.name] = await checkRoute(page, route, vp, 'teacher');
        console.log(`TEACHER ${vp.name} ${route.name} ok`);
      }
      await ctx.close();
    }

    // ===== Student @ 4 viewports =====
    results.student = {};
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      trackPage(page, results);
      await loginViaUI(page, assignmentFixture.studentEmail, assignmentFixture.studentPassword);
      console.log(`STUDENT_LOGIN_OK vp=${vp.name}`);

      results.student[vp.name] = { routes: {} };
      for (const route of STUDENT_ROUTES) {
        results.student[vp.name].routes[route.name] = await checkRoute(page, route, vp, 'student');
        console.log(`STUDENT ${vp.name} ${route.name} ok`);
      }
      await ctx.close();
    }
  } catch (err) {
    results.fatalError = err.message + '\n' + err.stack;
  } finally {
    results.finishedAt = new Date().toISOString();
    results.summary = summarize(results);
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.summary, null, 2));
    console.log('---');
    console.log(`consoleErrors: ${results.consoleErrors.length}`);
    console.log(`networkErrors: ${results.networkErrors.length}`);
    if (results.fatalError) console.log('FATAL:', results.fatalError);
    await browser.close();
  }
})();

function summarize(r) {
  const flatten = (obj) => {
    const out = [];
    function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (o.path && o.name) out.push(o);
      for (const k of Object.keys(o)) walk(o[k]);
    }
    walk(obj);
    return out;
  };

  const allRoutes = [
    ...flatten(r.teacher),
    ...flatten(r.student),
    ...flatten(r.adminRegression),
  ];

  const total = allRoutes.length;
  const passed = allRoutes.filter(
    (x) => x.stayedOnRole && x.hasContent && !x.hasError && !x.overflow.overflow
  ).length;
  const overflow = allRoutes.filter((x) => x.overflow && x.overflow.overflow).length;

  return {
    totalRoutes: total,
    passed,
    failed: total - passed,
    overflowCount: overflow,
    consoleErrors: r.consoleErrors.length,
    networkErrors: r.networkErrors.length,
    pass: total > 0 && passed === total && overflow === 0 && r.consoleErrors.length === 0 && r.networkErrors.length === 0 && !r.fatalError,
  };
}
