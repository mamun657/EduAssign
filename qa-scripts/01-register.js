// E2E QA: Section 1 — Registration page
// Verifies academic level dropdown loads + student registration succeeds.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '01-register.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

async function fillForm(page, opts) {
  const roleSelect = page.locator('select').first();
  await roleSelect.selectOption({ label: opts.role });
  await page.waitForTimeout(800);
  if (opts.firstName) await page.getByLabel('First name').fill(opts.firstName);
  if (opts.lastName) await page.getByLabel('Last name').fill(opts.lastName);
  if (opts.email) await page.getByLabel('Email').fill(opts.email);
  if (opts.phone) await page.getByLabel('Phone (optional)').fill(opts.phone);
  if (opts.role === 'Student' && opts.academicLevelLabel) {
    const selects = await page.locator('select').all();
    const lvlSelect = selects[selects.length - 1];
    const lvlVal = await lvlSelect
      .locator('option')
      .filter({ hasText: new RegExp('^' + opts.academicLevelLabel + '$', 'i') })
      .first()
      .getAttribute('value');
    if (lvlVal) await lvlSelect.selectOption(lvlVal);
  }
  await page.getByLabel('Password', { exact: true }).fill(opts.password);
  await page.getByLabel('Confirm password').fill(opts.password);
  await page.waitForTimeout(300);
}

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
  const results = {
    section: '1. AUTHENTICATION — REGISTER',
    pageLoaded: false,
    noHydrationError: true,
    noFailedToFetch: true,
    academicLevelsLoaded: false,
    academicLevels: [],
    studentRegistered: false,
    studentRegisterStatus: null,
    studentRegisterUrl: null,
    duplicateEmailRejected: false,
    invalidEmailRejected: false,
    weakPasswordRejected: false,
    adminRegistrationBlocked: false,
    consoleErrors: [],
    networkErrors: [],
    finalUrl: '',
  };

  try {
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle', timeout: 30000 });
    results.pageLoaded = true;
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-01-register-loaded.png') });

    const hydrationErr = consoleErrors.find((e) => /hydrat/i.test(e));
    if (hydrationErr) {
      results.noHydrationError = false;
      results.consoleErrors.push('hydration: ' + hydrationErr);
    }
    const failedFetch = consoleErrors.find((e) => /failed to fetch/i.test(e));
    if (failedFetch) {
      results.noFailedToFetch = false;
      results.consoleErrors.push('failedfetch: ' + failedFetch);
    }

    await page.locator('select').first().selectOption({ label: 'Student' });
    await page.waitForTimeout(1500);
    const allSelects = await page.locator('select').all();
    const lvlSelect = allSelects[allSelects.length - 1];
    const options = await lvlSelect.locator('option').allTextContents();
    results.academicLevels = options;
    const hasSchool = options.some((o) => /^School$/i.test(o));
    const hasCollege = options.some((o) => /^College$/i.test(o));
    const hasError = options.some((o) => /unable to load/i.test(o));
    results.academicLevelsLoaded = hasSchool && hasCollege && !hasError;
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-02-register-levels.png') });

    if (!results.academicLevelsLoaded) {
      throw new Error('Academic levels not loaded: ' + JSON.stringify(options));
    }

    const student = {
      firstName: 'Abir',
      lastName: 'Khan',
      email: `abir+${unique}@test.local`,
      phone: '01710000000',
      password: 'StrongPass!2026',
      role: 'Student',
      academicLevelLabel: 'School',
    };
    await fillForm(page, student);
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-03-register-filled.png') });

    const regRespPromise = page
      .waitForResponse(
        (r) => /\/Auth\/register/i.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const regResp = await regRespPromise;
    results.studentRegisterStatus = regResp ? regResp.status() : null;
    results.studentRegisterUrl = regResp ? regResp.url() : null;

    try {
      await page.waitForURL((u) => !/\/register/.test(u.toString()), { timeout: 15000 });
      results.studentRegistered = true;
      results.studentLandingUrl = page.url();
    } catch (_) {
      const banner = await page.locator('body').textContent();
      results.studentRegistered = false;
      results.studentRegisterFailureBody = (banner || '').slice(0, 500);
    }
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-04-after-submit.png') });

    if (results.studentRegistered) {
      await page.evaluate(() => {
        localStorage.removeItem('eduassign.token');
        localStorage.removeItem('eduassign.user');
      });
    }
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await fillForm(page, { ...student, firstName: 'Dup', lastName: 'User', email: student.email });
    const dupRespPromise = page
      .waitForResponse(
        (r) => /\/Auth\/register/i.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10000 }
      )
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const dupResp = await dupRespPromise;
    await page.waitForTimeout(2500);
    const body2 = await page.locator('body').textContent();
    results.duplicateEmailStatus = dupResp ? dupResp.status() : null;
    results.duplicateEmailRejected =
      !/\/login|\/student/.test(page.url()) &&
      /already|exists|duplicate|taken|conflict|email/i.test(body2 || '');
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-05-duplicate.png') });

    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await fillForm(page, { ...student, firstName: 'Bad', lastName: 'Email', email: 'not-an-email' });
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);
    const body3 = await page.locator('body').textContent();
    results.invalidEmailRejected =
      !/\/login|\/student/.test(page.url()) &&
      /invalid|email|valid/i.test(body3 || '');
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-06-bad-email.png') });

    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await fillForm(page, {
      ...student,
      firstName: 'Weak',
      lastName: 'Pwd',
      email: `weak+${unique}@test.local`,
      password: 'weak',
    });
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);
    const body4 = await page.locator('body').textContent();
    results.weakPasswordRejected =
      !/\/login|\/student/.test(page.url()) &&
      /password|weak|character|digit|upper|lower|symbol/i.test(body4 || '');
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-07-weak-password.png') });

    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const roleOptions = await page.locator('select').first().locator('option').allTextContents();
    results.roleOptions = roleOptions;
    results.adminRegistrationBlocked = !roleOptions.some((o) => /^Admin$/i.test(o));
    await page.screenshot({ path: path.join(SHOTS_DIR, '01-08-admin-attempt.png') });
  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;
  results.finalUrl = page.url();

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();