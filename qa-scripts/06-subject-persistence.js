// E2E QA: Section 6 — Subject Persistence
// Verifies that:
//   - Compulsory subjects persist across refresh, logout/login, and direct navigation
//   - Selected elective (Biology) persists across all scenarios
//   - Unselected elective (Higher Math) does NOT appear as enrolled
//   - localStorage is keyed correctly (eduassign.token + eduassign.user)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '06-subject-persistence.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

async function fetchEnrolled(page) {
  return await page.evaluate(async () => {
    const tk = localStorage.getItem('eduassign.token');
    const r = await fetch('http://localhost:5220/api/Students/enrolled-subjects', {
      headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' },
    });
    return r.status === 200 ? await r.json() : null;
  });
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

  const results = {
    section: '6. SUBJECT PERSISTENCE',
    student: null,
    initialEnrolled: [],
    afterRefreshEnrolled: [],
    afterLogoutLoginEnrolled: [],
    afterDirectNavEnrolled: [],
    initialCompulsoryCount: null,
    afterRefreshCompulsoryCount: null,
    afterLogoutLoginCompulsoryCount: null,
    afterDirectNavCompulsoryCount: null,
    initialElective: null,
    afterRefreshElective: null,
    afterLogoutLoginElective: null,
    afterDirectNavElective: null,
    unselectedNotEnrolledAnywhere: null,
    localStorageKeysAfterLogin: [],
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // Register fresh School student
    const firstName = 'Sumaiya';
    const lastName = 'Akter';
    const email = `${firstName.toLowerCase()}+${Date.now()}@test.local`;
    const password = 'StrongPass!2026';

    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('select').first().selectOption({ label: 'Student' });
    await page.waitForTimeout(800);
    const allSelects = await page.locator('select').all();
    const lvlSelect = allSelects[allSelects.length - 1];
    const schoolVal = await lvlSelect.locator('option').filter({ hasText: /^School$/ }).first().getAttribute('value');

    await page.getByLabel('First name').fill(firstName);
    await page.getByLabel('Last name').fill(lastName);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone (optional)').fill('01711000000');
    await lvlSelect.selectOption(schoolVal);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);

    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => !/\/register/.test(u.toString()), { timeout: 15000 });
    results.student = { firstName, lastName, email, password };

    // Confirm localStorage keys
    results.localStorageKeysAfterLogin = await page.evaluate(() => Object.keys(localStorage));

    // Navigate to /student and capture initial state (4 compulsory, 0 elective)
    await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    let enrolled = await fetchEnrolled(page);
    results.initialEnrolled = (enrolled || []).map((s) => ({ code: s.subjectCode, compulsory: s.isCompulsory }));
    results.initialCompulsoryCount = (enrolled || []).filter((s) => s.isCompulsory).length;
    results.initialElective = null;
    await page.screenshot({ path: path.join(SHOTS_DIR, '06-01-initial.png') });

    // Pick Biology via UI
    const biologyCard = page.locator('text="Biology"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    await biologyCard.locator('button', { hasText: /^Enroll$/ }).first().click();
    await page.waitForTimeout(1500);
    enrolled = await fetchEnrolled(page);
    results.initialElective = (enrolled || []).filter((s) => !s.isCompulsory).map((s) => s.subjectCode);
    await page.screenshot({ path: path.join(SHOTS_DIR, '06-02-after-pick.png') });

    // === Scenario 1: Refresh ===
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    enrolled = await fetchEnrolled(page);
    results.afterRefreshEnrolled = (enrolled || []).map((s) => ({ code: s.subjectCode, compulsory: s.isCompulsory }));
    results.afterRefreshCompulsoryCount = (enrolled || []).filter((s) => s.isCompulsory).length;
    results.afterRefreshElective = (enrolled || []).filter((s) => !s.isCompulsory).map((s) => s.subjectCode);
    await page.screenshot({ path: path.join(SHOTS_DIR, '06-03-after-refresh.png') });

    // === Scenario 2: Logout + Login ===
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => /\/student/.test(u.toString()), { timeout: 15000 });
    await page.waitForTimeout(1500);
    enrolled = await fetchEnrolled(page);
    results.afterLogoutLoginEnrolled = (enrolled || []).map((s) => ({ code: s.subjectCode, compulsory: s.isCompulsory }));
    results.afterLogoutLoginCompulsoryCount = (enrolled || []).filter((s) => s.isCompulsory).length;
    results.afterLogoutLoginElective = (enrolled || []).filter((s) => !s.isCompulsory).map((s) => s.subjectCode);
    await page.screenshot({ path: path.join(SHOTS_DIR, '06-04-after-relogin.png') });

    // === Scenario 3: Direct URL navigation ===
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    enrolled = await fetchEnrolled(page);
    results.afterDirectNavEnrolled = (enrolled || []).map((s) => ({ code: s.subjectCode, compulsory: s.isCompulsory }));
    results.afterDirectNavCompulsoryCount = (enrolled || []).filter((s) => s.isCompulsory).length;
    results.afterDirectNavElective = (enrolled || []).filter((s) => !s.isCompulsory).map((s) => s.subjectCode);
    await page.screenshot({ path: path.join(SHOTS_DIR, '06-05-after-direct-nav.png') });

    // Confirm unselected elective (Higher Math) is NEVER in any enrolled list
    const allEnrolledLists = [
      results.initialEnrolled,
      results.afterRefreshEnrolled,
      results.afterLogoutLoginEnrolled,
      results.afterDirectNavEnrolled,
    ];
    results.unselectedNotEnrolledAnywhere = allEnrolledLists.every(
      (list) => !list.some((s) => s.code === 'SCH_HMATH')
    );

    // Confirm compulsory count is exactly 4 in every scenario
    results.compulsoryConsistent =
      results.initialCompulsoryCount === 4 &&
      results.afterRefreshCompulsoryCount === 4 &&
      results.afterLogoutLoginCompulsoryCount === 4 &&
      results.afterDirectNavCompulsoryCount === 4;

    // Confirm Biology is in every post-pick list
    results.biologyConsistent =
      results.afterRefreshElective.includes('SCH_BIO') &&
      results.afterLogoutLoginElective.includes('SCH_BIO') &&
      results.afterDirectNavElective.includes('SCH_BIO');

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();