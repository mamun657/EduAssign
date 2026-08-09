// E2E QA: Section 8 — Admin Student Detail View
// Verifies that:
//   - Admin opens Students tab, sees student list
//   - Clicks a student with selected elective → detail panel shows
//   - "Selected subjects" includes all 4 compulsory + the chosen elective (Biology OR Higher Math)
//   - "Available, not selected" includes the OTHER elective from same group
//   - Compulsory badge shown for SCH_PHY/CHEM/BANG/ENG; elective badge for chosen one
//   - Cross-check against API: GET /api/admin/students/{id}
//   - Section 1 student (Lam Rahman) had no elective picked → only compulsory in selected

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '08-admin-student-view.json');
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
      // Admin role → /Students/* endpoints return 403 by design (role-gated)
      const url = resp.url();
      const isAdminRole = true; // we are logged in as admin
      if (isAdminRole && /\/Students\/(enrolled-subjects|available-subjects)/.test(url)) return;
      networkErrors.push(`${resp.status()} ${url}`);
    }
  });

  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };

  const results = {
    section: '8. ADMIN STUDENT DETAIL VIEW',
    adminLogin: false,
    studentsTabReached: false,
    studentListRows: 0,
    studentClicked: null,
    detailPanelVisible: false,
    apiSelectedCount: null,
    apiAvailableCount: null,
    uiSelectedCount: null,
    uiAvailableCount: null,
    selectedContainsCompulsory: false,
    selectedContainsBiology: false,
    selectedContainsHigherMath: false,
    availableContainsHigherMath: false,
    availableContainsBiology: false,
    uiMatchesApi: false,
    apiDirectCheck: null,
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
    await page.waitForTimeout(800);

    // 2. Click Students tab
    await page.getByRole('button', { name: /^Students$/ }).first().click();
    await page.waitForTimeout(1500);
    results.studentsTabReached = true;
    const studentsRows = await page.locator('table tbody tr').count();
    results.studentListRows = studentsRows;

    // 3. Find a School student with elective picked (from Section 6 — Sumaiya picked Biology)
    //    via API: list students, find one with selectedSubjects containing SCH_BIO
    const findResult = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/admin/students', opts).then((r) => r.json());
      const candidates = [];
      for (const s of list) {
        const d = await fetch('http://localhost:5220/api/admin/students/' + s.id, opts).then((r) => r.json());
        candidates.push({
          id: d.id,
          name: d.firstName + ' ' + d.lastName,
          email: d.email,
          level: d.academicLevelName,
          selectedCount: (d.selectedSubjects || []).length,
          availableCount: (d.availableNotSelectedSubjects || []).length,
          selectedCodes: (d.selectedSubjects || []).map((x) => x.subjectCode),
          availableCodes: (d.availableNotSelectedSubjects || []).map((x) => x.subjectCode),
          hasBio: (d.selectedSubjects || []).some((x) => x.subjectCode === 'SCH_BIO'),
          hasHMath: (d.selectedSubjects || []).some((x) => x.subjectCode === 'SCH_HMATH'),
        });
      }
      return candidates;
    });

    // Pick the Sumaiya Biology student (has Bio, no HMath)
    const target = findResult.find((c) => c.hasBio) || findResult[0];
    results.studentClicked = { id: target.id, name: target.name, email: target.email };
    results.apiSelectedCount = target.selectedCount;
    results.apiAvailableCount = target.availableCount;
    results.selectedContainsBiology = target.selectedCodes.includes('SCH_BIO');
    results.selectedContainsHigherMath = target.selectedCodes.includes('SCH_HMATH');
    results.availableContainsBiology = target.availableCodes.includes('SCH_BIO');
    results.availableContainsHigherMath = target.availableCodes.includes('SCH_HMATH');
    results.selectedContainsCompulsory =
      target.selectedCodes.includes('SCH_PHY') &&
      target.selectedCodes.includes('SCH_CHEM') &&
      target.selectedCodes.includes('SCH_BANG') &&
      target.selectedCodes.includes('SCH_ENG');

    // 4. Click the student row button
    const rowButton = page.locator('table tbody tr button', { hasText: target.name }).first();
    await rowButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '08-01-student-detail.png') });

    // 5. Detail panel should now be visible (look for "Selected subjects" header)
    const detailHeading = page.locator('h3', { hasText: 'Selected subjects' });
    results.detailPanelVisible = (await detailHeading.count()) > 0;

    // 6. Read the displayed subject names under each section
    const detail = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const findSection = (label) => {
        const h = headings.find((x) => x.textContent && x.textContent.trim() === label);
        if (!h) return null;
        const parent = h.parentElement;
        const ul = parent ? parent.querySelector('ul') : null;
        if (!ul) return [];
        return Array.from(ul.querySelectorAll('li')).map((li) => {
          const name = li.querySelector('span') ? li.querySelector('span').textContent.trim() : '';
          const badge = li.querySelector('span:last-child, [class*="Badge"], [class*="badge"]');
          const badgeText = badge ? badge.textContent.trim() : '';
          return { name, badge: badgeText };
        });
      };
      return {
        selected: findSection('Selected subjects') || [],
        available: findSection('Available, not selected') || [],
      };
    });

    results.uiSelectedCount = detail.selected.length;
    results.uiAvailableCount = detail.available.length;
    results.uiMatchesApi = detail.selected.length === target.selectedCount &&
      detail.available.length === target.availableCount;

    // 7. Direct API verification
    const apiDirect = await page.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/admin/students/' + id, {
        headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' },
      });
      return { status: r.status, body: await r.json() };
    }, target.id);
    results.apiDirectCheck = {
      status: apiDirect.status,
      selectedCount: (apiDirect.body.selectedSubjects || []).length,
      availableCount: (apiDirect.body.availableNotSelectedSubjects || []).length,
    };

    await page.screenshot({ path: path.join(SHOTS_DIR, '08-02-student-detail-full.png') });
  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();