// E2E: College ScienceOptional — verifies the new "Options" grouping rule.
//   - College student sees 2 options (Biology, Higher Mathematics), each with 2 papers
//   - Picking Bio1 auto-enrolls Bio2; HMath option becomes "Locked"
//   - Direct API POST HMath1 or HMath2 returns 400
//   - Reverse: fresh student picks HMath1 -> both HMATH papers enrolled; Bio option Locked
//   - Direct API POST Bio1 or Bio2 returns 400

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '24-college-elective-options.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

async function registerCollegeStudent(page, firstName, lastName) {
  const email = `${firstName.toLowerCase()}+${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
  const user = { firstName, lastName, email, phone: '01711000000', password: 'StrongPass!2026' };
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('select').first().selectOption({ label: 'Student' });
  await page.waitForTimeout(800);
  const allSelects = await page.locator('select').all();
  const lvlSelect = allSelects[allSelects.length - 1];
  const collegeVal = await lvlSelect
    .locator('option')
    .filter({ hasText: /^College$/ })
    .first()
    .getAttribute('value');

  await page.getByLabel('First name').fill(user.firstName);
  await page.getByLabel('Last name').fill(user.lastName);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Phone (optional)').fill(user.phone);
  await lvlSelect.selectOption(collegeVal);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !/\/register/.test(u.toString()), { timeout: 15000 });
  return { email };
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

  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  page.on('response', (resp) => {
    if (resp.url().includes('localhost:5220') && resp.status() >= 400) {
      // Filter out the 400s we deliberately cause via tryEnrollApi
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  const results = {
    section: '24. COLLEGE ELECTIVE OPTIONS',
    aBioGroupShape: null,
    aBioPickedBio1: null,
    aBioBothPapersEnrolled: null,
    aBioHmathOptionLocked: null,
    aBioHmathPapersText: null,
    aBioApiHmath1Rejected: null,
    aBioApiHmath1Status: null,
    aBioApiHmath2Rejected: null,
    aBioApiHmath2Status: null,
    bHmathGroupShape: null,
    bHmathPickedHmath1: null,
    bHmathBothPapersEnrolled: null,
    bHmathBioOptionLocked: null,
    bHmathBioPapersText: null,
    bHmathApiBio1Rejected: null,
    bHmathApiBio1Status: null,
    bHmathApiBio2Rejected: null,
    bHmathApiBio2Status: null,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // ===== Part A: College student picks Biology =====
    const a = await registerCollegeStudent(page, 'Ayesha', 'Begum');
    await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const availA = await fetchAvailable(page);
    const sciA = (availA?.electiveGroups || []).find((g) => g.name === 'ScienceOptional');
    results.aBioGroupShape = sciA ? {
      hasOptions: Array.isArray(sciA.options) && sciA.options.length > 0,
      optionCount: sciA.options?.length ?? 0,
      optionKeys: sciA.options?.map((o) => o.key) ?? [],
      subjectsPerOption: sciA.options?.map((o) => o.subjects?.map((s) => s.subjectCode)) ?? [],
    } : null;

    const bioOption = sciA?.options?.find((o) => o.key === 'Biology');
    const hmathOption = sciA?.options?.find((o) => o.key === 'HigherMathematics');
    const bio1 = bioOption?.subjects?.find((s) => s.subjectCode === 'COL_BIO_1');
    const hmath1 = hmathOption?.subjects?.find((s) => s.subjectCode === 'COL_HMATH_1');
    const hmath2 = hmathOption?.subjects?.find((s) => s.subjectCode === 'COL_HMATH_2');

    // Click Enroll on Biology 1st paper
    const bio1Card = page.locator('text="Biology 1st Paper"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const bio1Btn = bio1Card.locator('button', { hasText: /^Enroll$/ });
    await bio1Btn.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '24-01-after-bio1-enroll.png') });

    const enrolledA = await fetchEnrolled(page) || [];
    const hasBio1 = enrolledA.some((e) => e.subjectCode === 'COL_BIO_1');
    const hasBio2 = enrolledA.some((e) => e.subjectCode === 'COL_BIO_2');
    const hasHmath1 = enrolledA.some((e) => e.subjectCode === 'COL_HMATH_1');
    const hasHmath2 = enrolledA.some((e) => e.subjectCode === 'COL_HMATH_2');
    results.aBioPickedBio1 = hasBio1;
    results.aBioBothPapersEnrolled = hasBio1 && hasBio2;
    results.aBioHmathNotEnrolled = !hasHmath1 && !hasHmath2;

    // The Higher Mathematics option should show Locked badge
    const lockedBadgesA = await page.locator('text="Locked"').count();
    results.aBioHmathOptionLocked = lockedBadgesA > 0;

    // The HMath papers should NOT show "Enroll" button — they should be disabled with "Limit reached"
    const hmath1Card = page.locator('text="Higher Mathematics 1st Paper"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const hmath1Btn = hmath1Card.locator('button').first();
    results.aBioHmathPapersText = (await hmath1Btn.textContent())?.trim() ?? null;

    // Direct API POST HMath1 / HMath2 — should be 400
    const r1 = await tryEnrollApi(page, hmath1.subjectId);
    results.aBioApiHmath1Status = r1.status;
    results.aBioApiHmath1Rejected = r1.status >= 400;
    const r2 = await tryEnrollApi(page, hmath2.subjectId);
    results.aBioApiHmath2Status = r2.status;
    results.aBioApiHmath2Rejected = r2.status >= 400;

    await logoutAndClear(page);

    // ===== Part B: Fresh College student picks Higher Mathematics =====
    const b = await registerCollegeStudent(page, 'Babul', 'Mia');
    await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const availB = await fetchAvailable(page);
    const sciB = (availB?.electiveGroups || []).find((g) => g.name === 'ScienceOptional');
    results.bHmathGroupShape = sciB ? {
      hasOptions: Array.isArray(sciB.options) && sciB.options.length > 0,
      optionCount: sciB.options?.length ?? 0,
      optionKeys: sciB.options?.map((o) => o.key) ?? [],
      subjectsPerOption: sciB.options?.map((o) => o.subjects?.map((s) => s.subjectCode)) ?? [],
    } : null;

    const hmathOptionB = sciB?.options?.find((o) => o.key === 'HigherMathematics');
    const bioOptionB = sciB?.options?.find((o) => o.key === 'Biology');
    const hmath1B = hmathOptionB?.subjects?.find((s) => s.subjectCode === 'COL_HMATH_1');
    const bio1B = bioOptionB?.subjects?.find((s) => s.subjectCode === 'COL_BIO_1');
    const bio2B = bioOptionB?.subjects?.find((s) => s.subjectCode === 'COL_BIO_2');

    const hmath1CardB = page.locator('text="Higher Mathematics 1st Paper"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const hmath1BtnB = hmath1CardB.locator('button', { hasText: /^Enroll$/ });
    await hmath1BtnB.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '24-02-after-hmath1-enroll.png') });

    const enrolledB = await fetchEnrolled(page) || [];
    results.bHmathPickedHmath1 = enrolledB.some((e) => e.subjectCode === 'COL_HMATH_1');
    results.bHmathBothPapersEnrolled = enrolledB.some((e) => e.subjectCode === 'COL_HMATH_1')
      && enrolledB.some((e) => e.subjectCode === 'COL_HMATH_2');
    results.bHmathBioNotEnrolled = !enrolledB.some((e) => e.subjectCode === 'COL_BIO_1')
      && !enrolledB.some((e) => e.subjectCode === 'COL_BIO_2');

    const lockedBadgesB = await page.locator('text="Locked"').count();
    results.bHmathBioOptionLocked = lockedBadgesB > 0;

    const bio1CardB = page.locator('text="Biology 1st Paper"').locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
    const bio1BtnB = bio1CardB.locator('button').first();
    results.bHmathBioPapersText = (await bio1BtnB.textContent())?.trim() ?? null;

    const r3 = await tryEnrollApi(page, bio1B.subjectId);
    results.bHmathApiBio1Status = r3.status;
    results.bHmathApiBio1Rejected = r3.status >= 400;
    const r4 = await tryEnrollApi(page, bio2B.subjectId);
    results.bHmathApiBio2Status = r4.status;
    results.bHmathApiBio2Rejected = r4.status >= 400;

  } catch (e) {
    results.fatalError = e.message + '\n' + e.stack;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();