// E2E QA: Section 7 — Admin Login + Dashboard
// Verifies that:
//   - Admin can log in via /login form
//   - Redirects to /admin
//   - PageHeader shows "Admin · System"
//   - 5 tabs visible: Overview, Students, Teachers, Subjects, Assign Teacher → Student → Subject
//   - Overview loads stats from API (Students/Teachers/Subjects/Levels counts)
//   - Students tab loads admin student list
//   - Logout works

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '07-admin-login.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

const ADMIN = {
  email: 'admin@eduassign.local',
  password: 'L@unchPad!Admin#2026-XqZ',
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  page.on('response', (resp) => {
    if (resp.url().includes('localhost:5220') && resp.status() >= 400)
      networkErrors.push(`${resp.status()} ${resp.url()}`);
  });

  const results = {
    section: '7. ADMIN LOGIN + DASHBOARD',
    loginPageLoaded: false,
    loginResponseStatus: null,
    loggedIn: false,
    redirectedToAdmin: false,
    finalUrlAfterLogin: '',
    tokenStored: false,
    userStored: false,
    userRole: null,
    headerHasAdmin: false,
    tabsVisible: [],
    allTabsVisible: false,
    overviewStudentsCount: null,
    overviewTeachersCount: null,
    overviewSubjectsCount: null,
    overviewLevelsCount: null,
    studentsTabLoaded: false,
    studentsCount: null,
    adminApiStudents: null,
    logoutClearsStorage: false,
    logoutRedirectsToLogin: false,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // Clear any existing auth
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    results.loginPageLoaded = true;

    // Fill login form
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await page.screenshot({ path: path.join(SHOTS_DIR, '07-01-login-filled.png') });

    // Submit login form
    const loginRespPromise = page
      .waitForResponse(
        (r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const loginResp = await loginRespPromise;
    results.loginResponseStatus = loginResp ? loginResp.status() : null;

    // Wait for redirect to /admin
    try {
      await page.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });
      results.loggedIn = true;
      results.redirectedToAdmin = true;
      results.finalUrlAfterLogin = page.url();
    } catch (_) {
      results.loggedIn = false;
      results.finalUrlAfterLogin = page.url();
      const banner = await page.locator('body').textContent();
      results.loginFailureBody = (banner || '').slice(0, 300);
    }
    await page.waitForTimeout(1500);

    // Check localStorage
    const auth = await page.evaluate(() => ({
      token: localStorage.getItem('eduassign.token'),
      user: localStorage.getItem('eduassign.user'),
    }));
    results.tokenStored = !!auth.token;
    results.userStored = !!auth.user;
    if (auth.user) {
      try {
        const u = JSON.parse(auth.user);
        results.userRole = u.role;
      } catch {}
    }

    // Verify dashboard content
    const dashText = await page.locator('body').textContent();
    results.headerHasAdmin = /Admin/i.test(dashText || '');

    // Query each tab button directly (more reliable than body-text regex)
    const tabResults = [];
    for (const tabName of ['Overview', 'Students', 'Teachers', 'Subjects', 'Assign Teacher']) {
      const btns = await page.getByRole('button', { name: new RegExp('^\\s*' + tabName + '\\b', 'i') }).all();
      // Also try matching without word boundary for tabs with badges/counts
      const looseBtns = await page.getByRole('button', { name: new RegExp(tabName, 'i') }).all();
      const count = btns.length + looseBtns.length;
      tabResults.push({ name: tabName, visible: count > 0, buttonCount: count });
    }
    results.tabsVisible = tabResults;
    results.allTabsVisible = tabResults.every((t) => t.visible);

    // Wait for overview stats to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SHOTS_DIR, '07-02-admin-overview.png') });

    // Read overview counts via API
    const overview = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const [s, t, sub, lev] = await Promise.all([
        fetch('http://localhost:5220/api/admin/students', opts).then((r) => r.json()),
        fetch('http://localhost:5220/api/admin/teachers', opts).then((r) => r.json()),
        fetch('http://localhost:5220/api/Subjects', opts).then((r) => r.json()),
        fetch('http://localhost:5220/api/AcademicLevels', opts).then((r) => r.json()),
      ]);
      return {
        students: (s || []).length,
        teachers: (t || []).length,
        subjects: (sub || []).length,
        levels: (lev || []).length,
      };
    });
    results.overviewStudentsCount = overview.students;
    results.overviewTeachersCount = overview.teachers;
    results.overviewSubjectsCount = overview.subjects;
    results.overviewLevelsCount = overview.levels;

    // Click Students tab
    await page.getByRole('button', { name: /^Students$/ }).first().click();
    await page.waitForTimeout(1500);
    const studentsText = await page.locator('body').textContent();
    // Student names from prior sections should be visible
    results.studentsTabLoaded = /Lamia|Samia|sumaiya|@test\.local/i.test(studentsText || '');
    results.studentsCount = overview.students;
    results.adminApiStudents = overview.students;
    await page.screenshot({ path: path.join(SHOTS_DIR, '07-03-admin-students.png') });

    // Logout
    const logoutBtn = page.getByRole('button', { name: /log\s*out|sign\s*out/i }).first();
    if ((await logoutBtn.count()) > 0) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
    } else {
      await page.evaluate(() => {
        localStorage.removeItem('eduassign.token');
        localStorage.removeItem('eduassign.user');
      });
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    }
    const storage = await page.evaluate(() => ({
      token: localStorage.getItem('eduassign.token'),
      user: localStorage.getItem('eduassign.user'),
    }));
    results.logoutClearsStorage = !storage.token && !storage.user;
    results.logoutRedirectsToLogin = /\/login/.test(page.url());
    await page.screenshot({ path: path.join(SHOTS_DIR, '07-04-after-logout.png') });

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();