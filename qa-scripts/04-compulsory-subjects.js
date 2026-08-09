// E2E QA: Section 4 — Compulsory Subjects
// Verifies that:
//   - Compulsory subjects are auto-enrolled upon registration
//   - Compulsory subjects appear with "Enrolled" badge in UI (no Enroll button)
//   - Direct API DELETE on a compulsory subject is rejected (400/422)
//   - Enroll POST on a compulsory subject is also rejected (defense in depth)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '04-compulsory-subjects.json');
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

  const results = {
    section: '4. COMPULSORY SUBJECTS',
    schoolStudent: null,
    schoolDashboardLoaded: false,
    compulsoryInUI: [],
    allCompulsoryEnrolled: false,
    enrollButtonAbsentForCompulsory: true,
    enrolledApiCount: null,
    enrolledApiCompulsoryCount: null,
    enrolledApiElectiveCount: null,
    compulsoryEnrollmentExists: false,
    deleteCompulsoryStatus: null,
    deleteCompulsoryRejected: false,
    enrollCompulsoryStatus: null,
    enrollCompulsoryRejected: false,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // Load existing school student credentials from Section 3 results
    const section3 = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', '03-academic-level.json'), 'utf8'));
    const school = section3.schoolStudent;
    results.schoolStudent = { email: school.email, firstName: school.firstName, lastName: school.lastName };

    // Login as School student
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByLabel('Email').fill(school.email);
    await page.getByLabel('Password', { exact: true }).fill(school.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => /\/student/.test(u.toString()), { timeout: 15000 });
    await page.waitForTimeout(1500);
    results.schoolDashboardLoaded = true;
    await page.screenshot({ path: path.join(SHOTS_DIR, '04-01-dashboard.png') });

    // Read enrolled subjects from API
    const apiEnrolled = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/Students/enrolled-subjects', {
        headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' },
      });
      return { status: r.status, body: r.status === 200 ? await r.json() : await r.text() };
    });
    if (apiEnrolled.status === 200) {
      const list = apiEnrolled.body || [];
      results.enrolledApiCount = list.length;
      results.enrolledApiCompulsoryCount = list.filter((s) => s.isCompulsory === true).length;
      results.enrolledApiElectiveCount = list.filter((s) => s.isCompulsory === false).length;
      results.compulsoryEnrollmentExists = results.enrolledApiCompulsoryCount >= 4;
      results.enrolledApiCodes = list.map((s) => s.subjectCode);
    }

    // Try to DELETE a compulsory subject via direct API call
    // We need to grab one of the 4 compulsory subject IDs from the API
    const apiAvailable = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/Students/available-subjects', {
        headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' },
      });
      return r.status === 200 ? await r.json() : null;
    });

    const compulsoryList = apiAvailable?.compulsorySubjects || [];
    results.apiCompulsoryCount = compulsoryList.length;

    // Try DELETE for each compulsory
    const deleteAttempts = [];
    for (const cs of compulsoryList) {
      const result = await page.evaluate(async ({ subjectId, token }) => {
        const r = await fetch('http://localhost:5220/api/Students/enroll/' + encodeURIComponent(subjectId), {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        });
        return { status: r.status, body: r.status < 300 ? 'OK' : await r.text() };
      }, { subjectId: cs.subjectId, token: await page.evaluate(() => localStorage.getItem('eduassign.token')) });
      deleteAttempts.push({ subjectId: cs.subjectId, code: cs.subjectCode, status: result.status, body: result.body });
    }
    results.deleteAttempts = deleteAttempts;
    // Should be all 4xx (400 or 422). All must be rejected.
    results.deleteCompulsoryStatus = deleteAttempts[0]?.status ?? null;
    results.deleteCompulsoryRejected = deleteAttempts.length > 0 && deleteAttempts.every((a) => a.status >= 400);

    // Try POST enroll for each compulsory (defense in depth)
    const enrollAttempts = [];
    for (const cs of compulsoryList) {
      const result = await page.evaluate(async ({ subjectId, token }) => {
        const r = await fetch('http://localhost:5220/api/Students/enroll', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ subjectId }),
        });
        return { status: r.status, body: r.status < 300 ? 'OK' : await r.text() };
      }, { subjectId: cs.subjectId, token: await page.evaluate(() => localStorage.getItem('eduassign.token')) });
      enrollAttempts.push({ subjectId: cs.subjectId, code: cs.subjectCode, status: result.status, body: result.body });
    }
    results.enrollAttempts = enrollAttempts;
    results.enrollCompulsoryStatus = enrollAttempts[0]?.status ?? null;
    results.enrollCompulsoryRejected = enrollAttempts.length > 0 && enrollAttempts.every((a) => a.status >= 400);

    // Check UI: each compulsory card should show "Enrolled" badge
    const dashHtml = await page.content();
    // Compulsory section: each subjectName followed by either Enrolled badge OR Enroll button
    for (const cs of compulsoryList) {
      const name = cs.subjectName;
      const cardHasEnrolled = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,500}Enrolled', 'i').test(dashHtml);
      const cardHasEnrollBtn = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,500}>Enroll<', 'i').test(dashHtml);
      results.compulsoryInUI.push({ code: cs.subjectCode, name, cardHasEnrolled, cardHasEnrollBtn });
      if (cardHasEnrollBtn) results.enrollButtonAbsentForCompulsory = false;
    }
    results.allCompulsoryEnrolled = results.compulsoryInUI.every((c) => c.cardHasEnrolled);

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();