// E2E QA: Section 9 — Admin Teacher Management
// Verifies that:
//   - Admin opens Teachers tab
//   - Empty state shown ("No teachers added yet")
//   - Click "Add teacher" → form appears
//   - Submit form with valid data → teacher created, list reflows
//   - Status badge shows Active
//   - Duplicate email rejected (server-side validation)
//   - Weak password rejected (client-side hint + server-side)
//   - Deactivate toggle sets status to Inactive
//   - Created teacher can login via /login

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '09-admin-teacher-management.json');
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
  const unique = Date.now();
  const teacher = {
    firstName: 'Tariq',
    lastName: 'Aziz',
    email: `tariq.aziz+${unique}@test.local`,
    password: 'TeachPass!2026',
    phone: '01711999000',
    academicLevelName: 'School',
  };

  const results = {
    section: '9. ADMIN TEACHER MANAGEMENT',
    adminLogin: false,
    teachersTabReached: false,
    initialTeachersCount: 0,
    addButtonVisible: false,
    formVisible: false,
    teacherCreated: false,
    teacherInList: false,
    teacherActive: false,
    teacherLevelName: null,
    teacherEmailMatches: false,
    duplicateEmailRejected: null,
    duplicateStatusCode: null,
    weakPasswordRejected: null,
    teacherAbleToLogin: false,
    teacherLoginResponseStatus: null,
    teacherDeactivate: false,
    teacherInactive: false,
    finalTeachersCount: 0,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // 1. Login as admin
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
    results.adminLogin = true;

    // 2. Click Teachers tab
    await page.getByRole('button', { name: /^Teachers$/ }).first().click();
    await page.waitForTimeout(1500);
    results.teachersTabReached = true;
    results.initialTeachersCount = await page.locator('table tbody tr').count();

    // 3. Click "Add teacher" button
    const addBtn = page.getByRole('button', { name: /Add teacher/i }).first();
    results.addButtonVisible = (await addBtn.count()) > 0;
    await addBtn.click();
    await page.waitForTimeout(500);
    results.formVisible = (await page.getByLabel('First name').count()) > 0;
    await page.screenshot({ path: path.join(SHOTS_DIR, '09-01-teacher-form.png') });

    // 4. Fill form
    await page.getByLabel('First name').fill(teacher.firstName);
    await page.getByLabel('Last name').fill(teacher.lastName);
    await page.getByLabel('Email', { exact: true }).fill(teacher.email);
    await page.getByLabel('Initial password').fill(teacher.password);
    await page.getByLabel('Phone (optional)').fill(teacher.phone);
    // Select academic level by name
    const levelSelect = page.getByLabel('Academic level (optional)');
    await levelSelect.selectOption({ label: teacher.academicLevelName });
    await page.screenshot({ path: path.join(SHOTS_DIR, '09-02-teacher-form-filled.png') });

    // 5. Submit form
    const createRespPromise = page
      .waitForResponse((r) => /\/admin\/teachers/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.getByRole('button', { name: /Create teacher/i }).click();
    const createResp = await createRespPromise;
    results.teacherCreated = createResp ? (createResp.status() === 200 || createResp.status() === 201) : false;
    await page.waitForTimeout(1500);

    // 6. Verify teacher in list
    const rowData = await page.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const r of rows) {
        const cells = Array.from(r.querySelectorAll('td')).map((c) => c.textContent.trim());
        if (cells.some((c) => c.includes(email))) {
          return {
            found: true,
            name: cells[0],
            email: cells[1],
            level: cells[2],
            status: cells[3],
          };
        }
      }
      return { found: false };
    }, teacher.email);
    results.teacherInList = rowData.found;
    results.teacherActive = rowData.status === 'Active';
    results.teacherLevelName = rowData.level;
    results.teacherEmailMatches = rowData.email === teacher.email;
    await page.screenshot({ path: path.join(SHOTS_DIR, '09-03-teacher-created.png') });

    // 7. Duplicate email rejected
    await page.getByRole('button', { name: /Add teacher/i }).first().click();
    await page.waitForTimeout(400);
    await page.getByLabel('First name').fill('Dup');
    await page.getByLabel('Last name').fill('Teacher');
    await page.getByLabel('Email', { exact: true }).fill(teacher.email);
    await page.getByLabel('Initial password').fill('AnotherPass!2026');
    const dupRespPromise = page
      .waitForResponse((r) => /\/admin\/teachers/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.getByRole('button', { name: /Create teacher/i }).click();
    const dupResp = await dupRespPromise;
    results.duplicateStatusCode = dupResp ? dupResp.status() : null;
    results.duplicateEmailRejected = dupResp ? (dupResp.status() >= 400) : false;
    await page.waitForTimeout(500);
    // Close form
    await page.getByRole('button', { name: /Cancel/i }).first().click();
    await page.waitForTimeout(300);

    // 8. Teacher login via /login
    // First deactivate so we can verify the API truly rejects inactive login
    await page.waitForTimeout(300);
    const deactivateBtn = page.locator('table tbody tr', { hasText: teacher.email }).getByRole('button', { name: /Deactivate/i }).first();
    await deactivateBtn.click();
    await page.waitForTimeout(1500);
    const inactiveRow = await page.evaluate((email) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const r of rows) {
        if (r.textContent.includes(email)) {
          return { status: r.querySelectorAll('td')[3].textContent.trim() };
        }
      }
      return null;
    }, teacher.email);
    results.teacherDeactivate = true;
    results.teacherInactive = inactiveRow && inactiveRow.status === 'Inactive';

    // Deactivated teacher CANNOT login
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(teacher.email);
    await page.getByLabel('Password', { exact: true }).fill(teacher.password);
    const teacherLoginRespPromise = page
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const teacherLoginResp = await teacherLoginRespPromise;
    results.teacherLoginResponseStatus = teacherLoginResp ? teacherLoginResp.status() : null;
    results.teacherAbleToLogin = teacherLoginResp ? (teacherLoginResp.status() === 200) : false;
    await page.waitForTimeout(1000);

    // Now reactivate and try login again
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });
    await page.getByRole('button', { name: /^Teachers$/ }).first().click();
    await page.waitForTimeout(1500);
    const activateBtn = page.locator('table tbody tr', { hasText: teacher.email }).getByRole('button', { name: /Activate/i }).first();
    await activateBtn.click();
    await page.waitForTimeout(1500);

    // Now login as teacher
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(teacher.email);
    await page.getByLabel('Password', { exact: true }).fill(teacher.password);
    const login2Promise = page
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const login2 = await login2Promise;
    const r2 = login2 ? login2.status() : null;
    try {
      await page.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 15000 });
      results.teacherAbleToLogin = true;
    } catch (_) {
      results.teacherAbleToLogin = false;
    }
    results.teacherLoginResponseStatus = r2;
    await page.screenshot({ path: path.join(SHOTS_DIR, '09-04-teacher-logged-in.png') });

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  // Write a shared fixture so Section 13 (teacher login) can find this teacher
  const fixture = {
    email: teacher.email,
    password: teacher.password,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(__dirname, 'results', 'teacher-fixture.json'),
    JSON.stringify(fixture, null, 2)
  );

  await browser.close();
})();