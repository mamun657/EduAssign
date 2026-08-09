// E2E QA: Section 22 — Refresh & Direct URL Navigation
// Tests:
//   1. Refresh on /student while logged in → stays on /student with state intact
//   2. Refresh on /teacher while logged in → stays on /teacher
//   3. Refresh on /admin while logged in → stays on /admin
//   4. Direct URL to /student while unauthenticated → /login
//   5. Direct URL to /admin while unauthenticated → /login
//   6. Direct URL to /teacher while unauthenticated → /login
//   7. Direct URL to /register while authenticated → home/role redirect
//   8. Back/forward navigation in browser
//   9. Multi-tab: open same dashboard in two tabs, refresh one, other still works
//  10. Logout from one tab invalidates the others on next refresh

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '22-navigation.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
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

const results = {
  section: '22. REFRESH & DIRECT URL NAVIGATION',
  tests: {},
  consoleErrors: [],
  networkErrors: [],
  fatalError: null,
};

async function loginViaUI(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const respP = page.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 10000 });
  await page.locator('button[type="submit"]').first().click();
  await respP;
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') results.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => results.consoleErrors.push('pageerror: ' + err.message));
    page.on('response', (resp) => {
      if (resp.url().includes('localhost:5220') && resp.status() >= 500) {
        results.networkErrors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    // ===== Test 1: Refresh on /student while logged in =====
    {
      await loginViaUI(page, assignmentFixture.studentEmail, assignmentFixture.studentPassword);
      await page.waitForURL(/\/student/, { timeout: 10000 });
      await page.waitForTimeout(1500);
      const beforeUrl = page.url();
      const tokenBefore = await page.evaluate(() => localStorage.getItem('eduassign.token'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const afterUrl = page.url();
      const tokenAfter = await page.evaluate(() => localStorage.getItem('eduassign.token'));
      const bodyText = await page.locator('body').textContent();
      const stillStudent = afterUrl.includes('/student');
      const tokenPersisted = !!tokenBefore && !!tokenAfter && tokenBefore === tokenAfter;
      const dashboardVisible = /assignments|enrolled|dashboard/i.test(bodyText || '');
      results.tests.refreshStudentDashboard = {
        beforeUrl, afterUrl, stillStudent, tokenPersisted, dashboardVisible,
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '22-01-refresh-student.png') });
    }

    // ===== Test 2: Refresh on /teacher while logged in =====
    {
      // Logout first
      await page.evaluate(() => { localStorage.clear(); });
      await loginViaUI(page, teacherFixture.email, teacherFixture.password);
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
      await page.waitForTimeout(1500);
      const beforeUrl = page.url();
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const afterUrl = page.url();
      const stillTeacher = afterUrl.includes('/teacher');
      const bodyText = await page.locator('body').textContent();
      const dashboardVisible = /assignment|student/i.test(bodyText || '');
      results.tests.refreshTeacherDashboard = {
        beforeUrl, afterUrl, stillTeacher, dashboardVisible,
      };
    }

    // ===== Test 3: Refresh on /admin while logged in =====
    {
      await page.evaluate(() => { localStorage.clear(); });
      await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.waitForTimeout(1500);
      const beforeUrl = page.url();
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const afterUrl = page.url();
      const stillAdmin = afterUrl.includes('/admin');
      const bodyText = await page.locator('body').textContent();
      const dashboardVisible = /teacher|student|subject/i.test(bodyText || '');
      results.tests.refreshAdminDashboard = {
        beforeUrl, afterUrl, stillAdmin, dashboardVisible,
      };
    }

    // ===== Test 4: Direct URL to /student while unauthenticated =====
    {
      await page.evaluate(() => { localStorage.clear(); });
      await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const finalUrl = page.url();
      results.tests.unauthDirectToStudent = {
        finalUrl,
        redirectedToLogin: finalUrl.includes('/login'),
      };
    }

    // ===== Test 5: Direct URL to /admin while unauthenticated =====
    {
      await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const finalUrl = page.url();
      results.tests.unauthDirectToAdmin = {
        finalUrl,
        redirectedToLogin: finalUrl.includes('/login'),
      };
    }

    // ===== Test 6: Direct URL to /teacher while unauthenticated =====
    {
      await page.goto('http://localhost:3000/teacher', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const finalUrl = page.url();
      results.tests.unauthDirectToTeacher = {
        finalUrl,
        redirectedToLogin: finalUrl.includes('/login'),
      };
    }

    // ===== Test 7: Direct URL to /register while authenticated =====
    {
      await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.waitForTimeout(1500);
      await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const finalUrl = page.url();
      const stayedOnRegister = finalUrl.includes('/register');
      results.tests.authedDirectToRegister = {
        finalUrl,
        // Either: redirects away from register (good UX)
        redirectedAway: !stayedOnRegister || finalUrl.includes('/admin'),
      };
    }

    // ===== Test 8: Back/forward navigation =====
    {
      // Start from a known page (login or home), go to home, then to login, then back to home
      await page.evaluate(() => { localStorage.clear(); });
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      // Open /login via clicking the link to ensure history entry
      await page.locator('a[href="/login"]').first().click();
      await page.waitForURL(/\/login/, { timeout: 8000 });
      await page.waitForTimeout(800);
      await page.goBack({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const backUrl = page.url();
      await page.goForward({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const fwdUrl = page.url();
      results.tests.backForward = {
        backUrl,
        forwardUrl: fwdUrl,
        // Back should return to /, forward should return to /login
        worked: (backUrl.endsWith(':3000/') || backUrl === 'http://localhost:3000/') && fwdUrl.includes('/login'),
      };
    }

    // ===== Test 9: Multi-tab same dashboard =====
    {
      // Make sure admin is logged in
      await page.evaluate(() => { localStorage.clear(); });
      await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.waitForURL(/\/admin/, { timeout: 10000 });

      const tab2 = await ctx.newPage();
      await tab2.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
      await tab2.waitForTimeout(2000);
      const tab2Url = tab2.url();
      const tab2ReachedAdmin = tab2Url.includes('/admin');

      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const tab1AfterReload = page.url();
      const tab1StillAdmin = tab1AfterReload.includes('/admin');
      const tab2StillAdmin = tab2.url().includes('/admin');

      results.tests.multiTab = {
        tab2ReachedAdmin,
        tab1StillAdminAfterReload: tab1StillAdmin,
        tab2StillAdmin: tab2StillAdmin,
      };
      await tab2.close();
    }

    // ===== Test 10: Logout invalidates other tabs =====
    {
      // Open second tab while admin is logged in
      const tab2 = await ctx.newPage();
      await tab2.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
      await tab2.waitForTimeout(1500);
      const tab2BeforeLogout = tab2.url();

      // Click logout on tab1
      const logoutBtn = page.locator('button:has-text("Sign out"), a:has-text("Sign out"), button:has-text("Logout"), button:has-text("Log out")').first();
      const hasLogout = await logoutBtn.count() > 0;
      if (hasLogout) {
        await logoutBtn.click();
        await page.waitForTimeout(1500);
      } else {
        // No logout button — clear storage as fallback
        await page.evaluate(() => { localStorage.clear(); });
      }
      const tab1AfterLogout = page.url();

      // Reload tab2 — should now redirect to /login
      await tab2.reload({ waitUntil: 'networkidle' });
      await tab2.waitForTimeout(2000);
      const tab2AfterLogout = tab2.url();
      results.tests.logoutInvalidates = {
        tab2ReachedAdminInitially: tab2BeforeLogout.includes('/admin'),
        tab1AfterLogout,
        tab2AfterLogout,
        tab2RedirectedToLogin: tab2AfterLogout.includes('/login'),
      };
      await tab2.close();
    }
  } catch (err) {
    results.fatalError = err.message;
  } finally {
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  }
})();