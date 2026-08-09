// E2E QA: Section 20 — Error Handling Edge Cases
// Tests that the system returns sensible errors and the UI displays them:
//   1. Login with wrong password → 401 + error message shown
//   2. Login with non-existent email → 401
//   3. Register with duplicate email → 4xx
//   4. Register with invalid email → 400
//   5. Register with weak password → 400
//   6. Register with mismatched confirm password → 400
//   7. Register with missing role → 400
//   8. Register with invalid academic level → 400
//   9. Login with empty fields → form validation
//  10. Login with valid creds after error → error clears
//  11. Subject management: trying to create subject with non-admin token → 403

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '20-error-handling.json');
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
  section: '20. ERROR HANDLING EDGE CASES',
  tests: {},
  consoleErrors: [],
  networkErrors: [],
  fatalError: null,
};

async function api(page, method, url, body, token) {
  return page.evaluate(
    async ({ method, url, body, token }) => {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
      const r = await fetch(url, opts);
      const text = await r.text();
      return { status: r.status, body: text };
    },
    { method, url, body, token }
  );
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    // Navigate to login so the origin is set (CORS won't allow fetch from origin=null)
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    page.on('console', (msg) => {
      if (msg.type() === 'error') results.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => results.consoleErrors.push('pageerror: ' + err.message));
    page.on('response', (resp) => {
      if (resp.url().includes('localhost:5220') && resp.status() >= 400) {
        results.networkErrors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    // Get admin token for some tests
    const adminLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', {
      email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
    });
    if (adminLogin.status !== 200) throw new Error('Admin login failed: ' + adminLogin.body);
    const adminToken = JSON.parse(adminLogin.body).token;

    // Get student token
    const studentLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', {
      email: assignmentFixture.studentEmail, password: assignmentFixture.studentPassword,
    });
    const studentToken = studentLogin.status === 200 ? JSON.parse(studentLogin.body).token : null;

    // ===== Test 1: Login with wrong password via UI =====
    {
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
      await page.getByLabel('Email').fill(ADMIN_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill('WrongPassword!2026');
      const respP = page.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 8000 });
      await page.locator('button[type="submit"]').first().click();
      const resp = await respP;
      const errBanner = await page.locator('[role="alert"], .alert, .text-red-700, .text-rose-700').first().textContent().catch(() => null);
      const bodyText = (await page.locator('body').textContent()) || '';
      const containsInvalid = /invalid email or password/i.test(bodyText);
      results.tests.loginWrongPassword = {
        responseStatus: resp ? resp.status() : null,
        uiShowsError: !!errBanner || containsInvalid,
        pageUrl: page.url(),
        stayedOnLogin: page.url().includes('/login'),
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '20-01-wrong-password.png') });
    }

    // ===== Test 2: Login with non-existent email =====
    {
      await page.getByLabel('Email').fill('does-not-exist-xyz@test.local');
      await page.getByLabel('Password', { exact: true }).fill('AnyPassword!2026');
      const respP = page.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 8000 });
      await page.locator('button[type="submit"]').first().click();
      const resp = await respP;
      const bodyText = (await page.locator('body').textContent()) || '';
      results.tests.loginNonexistentEmail = {
        responseStatus: resp ? resp.status() : null,
        uiShowsError: /invalid email or password/i.test(bodyText),
        stayedOnLogin: page.url().includes('/login'),
      };
    }

    // ===== Test 3: Register with duplicate email (admin is already registered) =====
    {
      const r = await api(page, 'POST', 'http://localhost:5220/api/Auth/register', {
        firstName: 'X', lastName: 'Y', email: ADMIN_EMAIL, password: 'StrongPass!2026', confirmPassword: 'StrongPass!2026', role: 'Teacher',
      });
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch (_) {}
      results.tests.registerDuplicateEmail = {
        status: r.status,
        rejected: r.status >= 400,
        message: parsed?.message || parsed?.error || r.body.slice(0, 200),
      };
    }

    // ===== Test 4: Register with invalid email =====
    {
      const r = await api(page, 'POST', 'http://localhost:5220/api/Auth/register', {
        firstName: 'X', lastName: 'Y', email: 'not-an-email', password: 'StrongPass!2026', confirmPassword: 'StrongPass!2026', role: 'Teacher',
      });
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch (_) {}
      results.tests.registerInvalidEmail = {
        status: r.status,
        rejected: r.status >= 400,
        message: parsed?.message || parsed?.error || r.body.slice(0, 200),
      };
    }

    // ===== Test 5: Register with weak password =====
    {
      const r = await api(page, 'POST', 'http://localhost:5220/api/Auth/register', {
        firstName: 'X', lastName: 'Y', email: 'weakpwd-' + Date.now() + '@test.local', password: '123', confirmPassword: '123', role: 'Teacher',
      });
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch (_) {}
      results.tests.registerWeakPassword = {
        status: r.status,
        rejected: r.status >= 400,
        message: parsed?.message || parsed?.error || r.body.slice(0, 200),
      };
    }

    // ===== Test 6: Register with mismatched confirm password =====
    {
      const r = await api(page, 'POST', 'http://localhost:5220/api/Auth/register', {
        firstName: 'X', lastName: 'Y', email: 'mismatch-' + Date.now() + '@test.local', password: 'StrongPass!2026', confirmPassword: 'DifferentPass!2026', role: 'Teacher',
      });
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch (_) {}
      results.tests.registerMismatchedPassword = {
        status: r.status,
        rejected: r.status >= 400,
        message: parsed?.message || parsed?.error || r.body.slice(0, 200),
      };
    }

    // ===== Test 7: Register with missing/empty role =====
    {
      const r = await api(page, 'POST', 'http://localhost:5220/api/Auth/register', {
        firstName: 'X', lastName: 'Y', email: 'norole-' + Date.now() + '@test.local', password: 'StrongPass!2026', confirmPassword: 'StrongPass!2026',
      });
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch (_) {}
      results.tests.registerMissingRole = {
        status: r.status,
        rejected: r.status >= 400,
        message: parsed?.message || parsed?.error || r.body.slice(0, 200),
      };
    }

    // ===== Test 8: Register with non-existent academic level id =====
    {
      const r = await api(page, 'POST', 'http://localhost:5220/api/Auth/register', {
        firstName: 'X', lastName: 'Y', email: 'badlevel-' + Date.now() + '@test.local', password: 'StrongPass!2026', confirmPassword: 'StrongPass!2026', role: 'Student', academicLevelId: '000000000000000000000000',
      });
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch (_) {}
      results.tests.registerInvalidAcademicLevel = {
        status: r.status,
        rejected: r.status >= 400,
        message: parsed?.message || parsed?.error || r.body.slice(0, 200),
      };
    }

    // ===== Test 9: Login with empty fields via UI =====
    {
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
      // Submit without filling
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(500);
      const bodyText = (await page.locator('body').textContent()) || '';
      const emailInvalid = await page.getByLabel('Email').evaluate((el) => !el.validity.valid && el.validity.valueMissing).catch(() => null);
      const pwdInvalid = await page.getByLabel('Password', { exact: true }).evaluate((el) => !el.validity.valid && el.validity.valueMissing).catch(() => null);
      results.tests.loginEmptyFields = {
        stayedOnLogin: page.url().includes('/login'),
        emailFieldRejected: !!emailInvalid,
        passwordFieldRejected: !!pwdInvalid,
        bodyHasError: /required|please|enter/i.test(bodyText.slice(0, 1000)),
      };
    }

    // ===== Test 10: Login valid → error clears =====
    {
      // Trigger an error first
      await page.getByLabel('Email').fill(ADMIN_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill('Wrong!2026');
      const respP = page.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 8000 });
      await page.locator('button[type="submit"]').first().click();
      await respP;
      await page.waitForTimeout(500);
      const errorAfterWrong = await page.locator('[role="alert"], .text-red-700, .text-rose-700').first().isVisible().catch(() => false);
      // Now correct the password and try again
      await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
      const respP2 = page.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 8000 });
      await page.locator('button[type="submit"]').first().click();
      await respP2;
      await page.waitForTimeout(1500);
      const finalUrl = page.url();
      const reachedAdmin = finalUrl.includes('/admin');
      results.tests.loginErrorClearsOnValid = {
        errorShownAfterWrong: errorAfterWrong,
        reachedAdmin: reachedAdmin,
        finalUrl,
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '20-02-error-clears.png') });
    }

    // ===== Test 11: Student trying to create subject =====
    if (studentToken) {
      const r = await api(page, 'POST', 'http://localhost:5220/api/Subjects', {
        name: 'X', code: 'X', academicLevelId: '000000000000000000000000', isCompulsory: true,
      }, studentToken);
      let parsed = null;
      try { parsed = JSON.parse(r.body); } catch (_) {}
      results.tests.studentCreateSubject = {
        status: r.status,
        rejected: r.status >= 400,
        message: parsed?.message || parsed?.error || r.body.slice(0, 200),
      };
    }

    // ===== Test 12: Teacher trying to access admin endpoints =====
    {
      const teacherLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', {
        email: teacherFixture.email, password: teacherFixture.password,
      });
      const teacherToken = teacherLogin.status === 200 ? JSON.parse(teacherLogin.body).token : null;
      if (teacherToken) {
        const r = await api(page, 'POST', 'http://localhost:5220/api/admin/teachers', {
          firstName: 'X', lastName: 'Y', email: 'tryas-' + Date.now() + '@test.local', password: 'StrongPass!2026',
        }, teacherToken);
        results.tests.teacherCreateTeacher = {
          status: r.status,
          rejected: r.status >= 400,
        };
      }
    }
  } catch (err) {
    results.fatalError = err.message;
  } finally {
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  }
})();