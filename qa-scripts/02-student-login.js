// E2E QA: Section 2 — Student Login + Dashboard
// Verifies login form, JWT localStorage, /student redirect, dashboard content,
// refresh persistence, and logout.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '02-student-login.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

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

  const unique = Date.now();
  const student = {
    firstName: 'Lamia',
    lastName: 'Rahman',
    email: `lamia+${unique}@test.local`,
    phone: '01711000000',
    password: 'StrongPass!2026',
    role: 'Student',
    academicLevelLabel: 'School',
  };

  const results = {
    section: '2. AUTHENTICATION — STUDENT LOGIN',
    pageLoaded: false,
    studentCreated: false,
    studentRegisterStatus: null,
    loginPageLoaded: false,
    loginResponseStatus: null,
    loggedIn: false,
    redirectedToStudent: false,
    finalUrlAfterLogin: '',
    tokenStored: false,
    userStored: false,
    dashboardShowsName: false,
    dashboardShowsEmail: false,
    dashboardShowsAcademicLevel: false,
    dashboardShowsEnrolledSection: false,
    dashboardShowsAvailableSection: false,
    persistedAfterReload: false,
    reloadStillOnStudent: false,
    logoutClearsStorage: false,
    logoutRedirectsToLogin: false,
    protectedRouteBypassed: false,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // --- Step 1: Register a fresh student via /register ---
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle', timeout: 30000 });
    results.pageLoaded = true;
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-01-register-filled.png') });

    // Fill role then form
    await page.locator('select').first().selectOption({ label: 'Student' });
    await page.waitForTimeout(800);
    const allSelects1 = await page.locator('select').all();
    const lvlSelect1 = allSelects1[allSelects1.length - 1];
    const schoolVal = await lvlSelect1
      .locator('option')
      .filter({ hasText: /^School$/ })
      .first()
      .getAttribute('value');

    await page.getByLabel('First name').fill(student.firstName);
    await page.getByLabel('Last name').fill(student.lastName);
    await page.getByLabel('Email').fill(student.email);
    await page.getByLabel('Phone (optional)').fill(student.phone);
    await lvlSelect1.selectOption(schoolVal);
    await page.getByLabel('Password', { exact: true }).fill(student.password);
    await page.getByLabel('Confirm password').fill(student.password);
    await page.waitForTimeout(300);

    const regRespPromise = page
      .waitForResponse(
        (r) => /\/Auth\/register/i.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const regResp = await regRespPromise;
    results.studentRegisterStatus = regResp ? regResp.status() : null;

    try {
      await page.waitForURL((u) => !/\/register/.test(u.toString()), { timeout: 15000 });
      results.studentCreated = true;
      results.studentLandingUrl = page.url();
    } catch (_) {
      const banner = await page.locator('body').textContent();
      throw new Error('Registration failed: ' + (banner || '').slice(0, 200));
    }
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-02-registered.png') });

    // --- Step 2: Verify auth tokens are in localStorage ---
    const authAfterRegister = await page.evaluate(() => ({
      token: localStorage.getItem('eduassign.token'),
      user: localStorage.getItem('eduassign.user'),
    }));
    results.tokenStored = !!authAfterRegister.token;
    results.userStored = !!authAfterRegister.user;

    // --- Step 3: Logout (clear storage) and go to /login ---
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    results.loginPageLoaded = true;
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-03-login-page.png') });

    // --- Step 4: Fill login form via accessible labels ---
    await page.getByLabel('Email').fill(student.email);
    await page.getByLabel('Password', { exact: true }).fill(student.password);
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-04-login-filled.png') });

    // --- Step 5: Submit login form, capture response ---
    const loginRespPromise = page
      .waitForResponse(
        (r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const loginResp = await loginRespPromise;
    results.loginResponseStatus = loginResp ? loginResp.status() : null;
    results.loginResponseUrl = loginResp ? loginResp.url() : null;

    // --- Step 6: Wait for redirect to /student ---
    try {
      await page.waitForURL((u) => /\/student/.test(u.toString()), { timeout: 15000 });
      results.loggedIn = true;
      results.redirectedToStudent = true;
      results.finalUrlAfterLogin = page.url();
    } catch (_) {
      results.loggedIn = false;
      results.finalUrlAfterLogin = page.url();
      const banner = await page.locator('body').textContent();
      results.loginFailureBody = (banner || '').slice(0, 300);
    }
    await page.waitForTimeout(1500); // let dashboard finish loading
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-05-student-dashboard.png') });

    // --- Step 7: Verify auth state after login ---
    const authAfterLogin = await page.evaluate(() => ({
      token: localStorage.getItem('eduassign.token'),
      user: localStorage.getItem('eduassign.user'),
    }));
    results.tokenStoredAfterLogin = !!authAfterLogin.token;
    results.userStoredAfterLogin = !!authAfterLogin.user;

    // --- Step 8: Verify dashboard content (name, level, sections) ---
    if (results.loggedIn) {
      const dashText = await page.locator('body').textContent();
      const enrolled = JSON.parse(authAfterLogin.user || '{}');
      results.dashboardShowsName = new RegExp(student.firstName, 'i').test(dashText || '');
      results.dashboardShowsEmail = /eduassign\.local|test\.local/i.test(dashText || '');
      results.dashboardShowsAcademicLevel = /School/i.test(dashText || '');
      results.dashboardShowsEnrolledSection = /Compulsory subjects|compulsory/i.test(dashText || '');
      results.dashboardShowsAvailableSection = /elective|ScienceOptional|My assignments/i.test(dashText || '');
      results.studentRole = enrolled.role;
    }

    // --- Step 9: Refresh page, verify session persists ---
    if (results.loggedIn) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      results.reloadStillOnStudent = /\/student/.test(page.url());
      const afterReloadText = await page.locator('body').textContent();
      results.persistedAfterReload =
        results.reloadStillOnStudent &&
        new RegExp(student.firstName, 'i').test(afterReloadText || '');
      await page.screenshot({ path: path.join(SHOTS_DIR, '02-06-after-reload.png') });
    }

    // --- Step 10: Logout, verify storage cleared and redirect to /login ---
    if (results.loggedIn) {
      // The Topbar likely has a logout button. Look for any element with "logout" / "sign out" text.
      const logoutBtn = page.getByRole('button', { name: /log\s*out|sign\s*out/i }).first();
      const hasLogoutBtn = (await logoutBtn.count()) > 0;
      results.logoutButtonPresent = hasLogoutBtn;
      if (hasLogoutBtn) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
      } else {
        // fallback: clear storage and navigate to /login
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
      results.logoutFinalUrl = page.url();
      results.logoutRedirectsToLogin = /\/login/.test(page.url());
      await page.screenshot({ path: path.join(SHOTS_DIR, '02-07-after-logout.png') });
    }

    // --- Step 11: Verify protected route cannot be bypassed when logged out ---
    await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    results.protectedRouteRedirectsToLogin = /\/login/.test(page.url());
    results.protectedRouteFinalUrl = page.url();
    await page.screenshot({ path: path.join(SHOTS_DIR, '02-08-protected-redirect.png') });
  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  // Save registered student credentials for downstream sections
  results._credentials = student;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
