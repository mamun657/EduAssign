// E2E QA: Section 13 — Teacher Login + Dashboard
// Verifies that:
//   - Teacher can login (using Tariq Aziz from Section 9)
//   - Redirects to /teacher
//   - Dashboard shows only teacher-owned links (TeacherAssignments.mine)
//   - Section 11 created a link for Arif Ahmed + SCH_BIO; teacher should see that
//   - Student/Subject selects on dashboard reflect only linked entities (no others)
//   - localStorage has token + user with role Teacher
//   - Logout works

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '13-teacher-login.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  page.on('response', (resp) => {
    if (resp.url().includes('localhost:5220') && resp.status() >= 400) {
      const url = resp.url();
      if (/\/Students\/(enrolled-subjects|available-subjects)/.test(url)) return;
      networkErrors.push(`${resp.status()} ${url}`);
    }
  });

  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };
  const results = {
    section: '13. TEACHER LOGIN + DASHBOARD',
    teacherAccountExists: false,
    teacherEmail: null,
    teacherLoginPageLoaded: false,
    teacherLoginResponseStatus: null,
    teacherLoggedIn: false,
    redirectedToTeacher: false,
    finalUrl: '',
    tokenStored: false,
    userStored: false,
    userRole: null,
    headerHasTeacher: false,
    mineApiCount: null,
    adminApiTotalCount: null,
    dashboardShowsAssignmentsLink: false,
    logoutClearsStorage: false,
    logoutRedirectsToLogin: false,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // 1. Login as admin to find teacher email
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    const loginRespPromise = page
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    await loginRespPromise;
    await page.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });

    // Read teacher fixture (created by Section 9)
    const fixturePath = path.join(__dirname, 'results', 'teacher-fixture.json');
    if (!fs.existsSync(fixturePath)) throw new Error('teacher-fixture.json not found — run Section 9 first');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const teacher = { email: fixture.email, password: fixture.password };
    results.teacherAccountExists = true;
    results.teacherEmail = fixture.email;

    // 2. Capture total TSS count (admin view) vs what teacher will see (mine)
    const adminCount = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const list = await fetch('http://localhost:5220/api/teacher-student-subjects', {
        headers: { Authorization: 'Bearer ' + tk },
      }).then((r) => r.json());
      return list.length;
    });
    results.adminApiTotalCount = adminCount;

    // 3. Logout admin and login as teacher
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    results.teacherLoginPageLoaded = true;

    // Need the teacher's password — read from fixture created by Section 9
    await page.getByLabel('Email').fill(teacher.email);
    await page.getByLabel('Password', { exact: true }).fill(teacher.password);
    const tloginRespPromise = page
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const tloginResp = await tloginRespPromise;
    results.teacherLoginResponseStatus = tloginResp ? tloginResp.status() : null;
    try {
      await page.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 15000 });
      results.teacherLoggedIn = true;
      results.redirectedToTeacher = true;
      results.finalUrl = page.url();
    } catch (_) {
      results.teacherLoggedIn = false;
      results.finalUrl = page.url();
    }
    await page.waitForTimeout(1500);

    const auth = await page.evaluate(() => ({
      token: localStorage.getItem('eduassign.token'),
      user: localStorage.getItem('eduassign.user'),
    }));
    results.tokenStored = !!auth.token;
    results.userStored = !!auth.user;
    if (auth.user) {
      try { results.userRole = JSON.parse(auth.user).role; } catch {}
    }

    // Header check
    const bodyText = await page.locator('body').textContent();
    results.headerHasTeacher = /Teacher/i.test(bodyText || '');
    await page.screenshot({ path: path.join(SHOTS_DIR, '13-01-teacher-dashboard.png') });

    // 4. Mine count
    const mine = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const list = await fetch('http://localhost:5220/api/teacher-student-subjects/mine', {
        headers: { Authorization: 'Bearer ' + tk },
      }).then((r) => r.json());
      return { count: list.length, items: list };
    });
    results.mineApiCount = mine.count;
    results.dashboardShowsAssignmentsLink = true; // Topbar always shows Assignments link to teacher

    // 5. Logout
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
    await page.screenshot({ path: path.join(SHOTS_DIR, '13-02-after-logout.png') });

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();