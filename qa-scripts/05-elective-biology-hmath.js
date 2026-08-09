// E2E QA: Section 5 — Biology / Higher Math Elective (CRITICAL)
// Verifies that:
//   - Student can pick Biology from the ScienceOptional elective group
//   - After picking Biology, Higher Math button is disabled ("Limit reached")
//   - Direct API POST to enroll Higher Math is rejected with 400
//   - Selected elective persists across refresh
//   - Reverse: with a fresh student, pick Higher Math, Biology blocked

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '05-elective-biology-hmath.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

async function registerStudent(page, firstName, lastName) {
  const email = `${firstName.toLowerCase()}+${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
  const user = { firstName, lastName, email, phone: '01711000000', password: 'StrongPass!2026' };

  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('select').first().selectOption({ label: 'Student' });
  await page.waitForTimeout(800);
  const allSelects = await page.locator('select').all();
  const lvlSelect = allSelects[allSelects.length - 1];
  const schoolVal = await lvlSelect
    .locator('option')
    .filter({ hasText: /^School$/ })
    .first()
    .getAttribute('value');

  await page.getByLabel('First name').fill(user.firstName);
  await page.getByLabel('Last name').fill(user.lastName);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Phone (optional)').fill(user.phone);
  await lvlSelect.selectOption(schoolVal);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);

  const regRespPromise = page
    .waitForResponse(
      (r) => /\/Auth\/register/i.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15000 }
    )
    .catch(() => null);
  await page.locator('button[type="submit"]').first().click();
  const regResp = await regRespPromise;
  await page.waitForURL((u) => !/\/register/.test(u.toString()), { timeout: 15000 });
  return { user, regStatus: regResp ? regResp.status() : null };
}

async function fetchAvailable(page) {
  return await page.evaluate(async () => {
    const tk = localStorage.getItem('eduassign.token');
    const r = await fetch('http://localhost:5220/api/Students/available-subjects', {
      headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' },
    });
    return r.status === 200 ? await r.json() : null;
  });
}

async function fetchEnrolled(page) {
  return await page.evaluate(async () => {
    const tk = localStorage.getItem('eduassign.token');
    const r = await fetch('http://localhost:5220/api/Students/enrolled-subjects', {
      headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' },
    });
    return r.status === 200 ? await r.json() : null;
  });
}

async function tryEnrollApi(page, subjectId) {
  return await page.evaluate(async ({ sid }) => {
    const tk = localStorage.getItem('eduassign.token');
    const r = await fetch('http://localhost:5220/api/Students/enroll', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ subjectId: sid }),
    });
    return { status: r.status, body: await r.text() };
  }, { sid: subjectId });
}

async function logoutAndClear(page) {
  await page.evaluate(() => {
    localStorage.removeItem('eduassign.token');
    localStorage.removeItem('eduassign.user');
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
    section: '5. BIOLOGY / HIGHER MATH ELECTIVE',
    studentABiology: null,
    studentBHmath: null,
    abiologyEnrollResult: null,
    abiologyEnrolled: null,
    ahmathButtonDisabled: null,
    ahmathButtonText: null,
    ahmathApiEnrollRejected: null,
    ahmathApiEnrollStatus: null,
    abiologyEnrolledAfterRefresh: null,
    ahmathNotEnrolledAfterRefresh: null,
    bHmathEnrollResult: null,
    bHmathEnrolled: null,
    bBiologyButtonDisabled: null,
    bBiologyButtonText: null,
    bBiologyApiEnrollRejected: null,
    bBiologyApiEnrollStatus: null,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // ====== Part A: Pick Biology ======
    const a = await registerStudent(page, 'Arif', 'Ahmed');
    results.studentABiology = { ...a.user, registerStatus: a.regStatus };
    await page.waitForTimeout(1500);
    await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const availA = await fetchAvailable(page);
    const sciA = (availA?.electiveGroups || []).find((g) => g.name === 'ScienceOptional');
    const biologyA = sciA?.subjects?.find((s) => s.subjectCode === 'SCH_BIO');
    const hmathA = sciA?.subjects?.find((s) => s.subjectCode === 'SCH_HMATH');

    // Click Enroll on Biology via UI (Playwright find by text within ScienceOptional card)
    // Find button containing "Biology" subject name and Enroll nearby
    const biologyCard = page.locator('text="Biology"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const enrollBtnBiology = biologyCard.locator('button', { hasText: /^Enroll$/ });
    await enrollBtnBiology.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '05-01-after-biology-enroll.png') });

    // Verify API enrollment
    const enrolledA = await fetchEnrolled(page);
    const hasBiology = (enrolledA || []).some((e) => e.subjectCode === 'SCH_BIO');
    const hasHmath = (enrolledA || []).some((e) => e.subjectCode === 'SCH_HMATH');
    results.abiologyEnrolled = hasBiology;
    results.ahmathNotEnrolled = !hasHmath;

    // Now verify Higher Math button is disabled with "Limit reached" text
    const hmathCard = page.locator('text="Higher Mathematics"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const hmathBtn = hmathCard.locator('button').first();
    results.ahmathButtonText = (await hmathBtn.textContent())?.trim() || null;
    results.ahmathButtonDisabled = await hmathBtn.isDisabled();

    // Try direct API POST to enroll Higher Math — should be 400
    const directEnrollHmath = await tryEnrollApi(page, hmathA.subjectId);
    results.ahmathApiEnrollStatus = directEnrollHmath.status;
    results.ahmathApiEnrollRejected = directEnrollHmath.status >= 400;

    // Refresh and verify persistence
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '05-02-after-refresh.png') });
    const enrolledAfterRefresh = await fetchEnrolled(page);
    results.abiologyEnrolledAfterRefresh = (enrolledAfterRefresh || []).some((e) => e.subjectCode === 'SCH_BIO');
    results.ahmathNotEnrolledAfterRefresh = !(enrolledAfterRefresh || []).some((e) => e.subjectCode === 'SCH_HMATH');

    // Logout A
    await logoutAndClear(page);

    // ====== Part B: Pick Higher Math ======
    const b = await registerStudent(page, 'Bithi', 'Khan');
    results.studentBHmath = { ...b.user, registerStatus: b.regStatus };
    await page.waitForTimeout(1500);
    await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const availB = await fetchAvailable(page);
    const sciB = (availB?.electiveGroups || []).find((g) => g.name === 'ScienceOptional');
    const hmathB = sciB?.subjects?.find((s) => s.subjectCode === 'SCH_HMATH');
    const biologyB = sciB?.subjects?.find((s) => s.subjectCode === 'SCH_BIO');

    // Click Enroll on Higher Math
    const hmathCardB = page.locator('text="Higher Mathematics"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const enrollBtnHmath = hmathCardB.locator('button', { hasText: /^Enroll$/ });
    await enrollBtnHmath.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '05-03-after-hmath-enroll.png') });

    const enrolledB = await fetchEnrolled(page);
    results.bHmathEnrolled = (enrolledB || []).some((e) => e.subjectCode === 'SCH_HMATH');
    results.bBiologyNotEnrolled = !(enrolledB || []).some((e) => e.subjectCode === 'SCH_BIO');

    // Biology button should now be disabled
    const biologyCardB = page.locator('text="Biology"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const biologyBtnB = biologyCardB.locator('button').first();
    results.bBiologyButtonText = (await biologyBtnB.textContent())?.trim() || null;
    results.bBiologyButtonDisabled = await biologyBtnB.isDisabled();

    // Try direct API POST to enroll Biology — should be 400
    const directEnrollBiology = await tryEnrollApi(page, biologyB.subjectId);
    results.bBiologyApiEnrollStatus = directEnrollBiology.status;
    results.bBiologyApiEnrollRejected = directEnrollBiology.status >= 400;

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();