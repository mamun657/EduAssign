// E2E QA: Section 11 — Admin Teacher-Student-Subject Assignment (CRITICAL)
// Verifies that:
//   - Admin opens "Assign Teacher → Student → Subject" tab
//   - Student select has all students
//   - Selecting a student triggers fetch of Admin.studentDetail → Subject dropdown populates with ONLY selectedSubjects
//   - Subject dropdown does NOT show "availableNotSelectedSubjects" (the bug!)
//   - Choose Teacher, Student, Subject → submit → assignment created
//   - New TSS appears in the existing links table
//   - Section 12 preview: API attempt to assign a subject NOT in selectedSubjects → 400 "Student is not enrolled in this subject"

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '11-admin-tss-assignment.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();

  page.on('dialog', async (dialog) => { await dialog.accept(); });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  page.on('response', (resp) => {
    if (resp.url().includes('localhost:5220') && resp.status() >= 400) {
      const url = resp.url();
      if (/\/Students\/(enrolled-subjects|available-subjects)/.test(url)) return;
      if (/\/teacher-student-subjects/.test(url)) return; // captured by handler
      networkErrors.push(`${resp.status()} ${url}`);
    }
  });

  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };

  const results = {
    section: '11. ADMIN TSS ASSIGNMENT (CRITICAL)',
    adminLogin: false,
    tssTabReached: false,
    initialTssCount: 0,
    studentOptionsLoaded: null,
    teacherOptionsLoaded: null,
    subjectOptionsBeforeStudent: null,
    subjectDropdownDisabledBeforeStudent: null,
    studentSelected: null,
    subjectOptionsAfterStudent: null,
    subjectDropdownEnabledAfterStudent: null,
    subjectOnlyShowsSelected: false,
    subjectContainsBio: false,
    subjectContainsHMath: false,
    subjectContainsPHY: false,
    assignmentCreated: false,
    assignmentStatusCode: null,
    finalTssCount: null,
    invalidAssignmentRejected: null,
    invalidAssignmentStatusCode: null,
    invalidAssignmentErrorMessage: null,
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

    // 2. Click "Assign Teacher → Student → Subject" tab
    await page.getByRole('button', { name: /Assign Teacher/i }).first().click();
    await page.waitForTimeout(1500);
    results.tssTabReached = true;
    const linksBefore = await page.locator('table tbody tr').count();
    results.initialTssCount = linksBefore;
    await page.screenshot({ path: path.join(SHOTS_DIR, '11-01-tss-empty.png') });

    // 3. Inspect dropdown options
    const studentSel = page.getByLabel('Student', { exact: true });
    const teacherSel = page.getByLabel('Teacher', { exact: true });
    const subjectSel = page.getByLabel('Subject', { exact: true });
    results.studentOptionsLoaded = await studentSel.locator('option').count();
    results.teacherOptionsLoaded = await teacherSel.locator('option').count();
    results.subjectOptionsBeforeStudent = await subjectSel.locator('option').count();
    results.subjectDropdownDisabledBeforeStudent = await subjectSel.isDisabled();

    // 4. Find a student with selectedSubjects (e.g. Sumaiya or Arif with SCH_BIO)
    const studentData = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/admin/students', opts).then((r) => r.json());
      // Find a School student with elective
      for (const s of list) {
        const d = await fetch('http://localhost:5220/api/admin/students/' + s.id, opts).then((r) => r.json());
        const sel = d.selectedSubjects || [];
        const hasBio = sel.some((x) => x.subjectCode === 'SCH_BIO');
        if (hasBio) {
          return {
            id: s.id,
            name: s.firstName + ' ' + s.lastName,
            email: s.email,
            selectedCodes: sel.map((x) => x.subjectCode),
            availableNotSelectedCodes: (d.availableNotSelectedSubjects || []).map((x) => x.subjectCode),
          };
        }
      }
      return null;
    });
    if (!studentData) throw new Error('No student with elective found');
    results.studentSelected = { id: studentData.id, name: studentData.name, codes: studentData.selectedCodes };

    // 5. Pick a teacher — prefer the one from the shared fixture (Section 9's teacher),
    //    fall back to the first non-empty option if fixture is missing.
    let teacherValue = '';
    const fixturePath = path.join(__dirname, 'results', 'teacher-fixture.json');
    if (fs.existsSync(fixturePath)) {
      try {
        const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
        // Resolve the fixture teacher's actual ID by email from the admin teachers endpoint
        const fixtureTeacherId = await page.evaluate(async (email) => {
          const tk = localStorage.getItem('eduassign.token');
          const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
          const teachers = await fetch('http://localhost:5220/api/admin/teachers', opts).then((r) => r.json());
          const m = teachers.find((t) => t.email === email);
          return m ? m.id : null;
        }, fixture.email);
        if (fixtureTeacherId) teacherValue = fixtureTeacherId;
      } catch (_) {}
    }
    if (!teacherValue) {
      const teacherOptions = await teacherSel.locator('option').all();
      for (const opt of teacherOptions) {
        const v = await opt.getAttribute('value');
        if (v && v !== '') { teacherValue = v; break; }
      }
    }
    if (!teacherValue) throw new Error('No teacher available');
    results.teacherUsedFromFixture = fs.existsSync(fixturePath);

    // 6. Select student → triggers Admin.studentDetail → subject dropdown repopulates
    const studentDetailRespPromise = page
      .waitForResponse((r) => /\/admin\/students\/[^/]+$/.test(r.url()) && r.request().method() === 'GET', { timeout: 15000 })
      .catch(() => null);
    await studentSel.selectOption(studentData.id);
    await studentDetailRespPromise;
    await page.waitForTimeout(800);

    // 7. Now subject dropdown should be enabled and contain only selectedSubjects
    const subjectOptionsAfter = await subjectSel.locator('option').all();
    const subjectOptionValues = [];
    for (const opt of subjectOptionsAfter) {
      const v = await opt.getAttribute('value');
      const t = (await opt.textContent()) || '';
      if (v && v !== '') subjectOptionValues.push({ value: v, text: t.trim() });
    }
    results.subjectOptionsAfterStudent = subjectOptionValues.length;
    results.subjectDropdownEnabledAfterStudent = !(await subjectSel.isDisabled());

    // Resolve the actual subject codes from the API (option values are subject IDs, not codes)
    const subjectApiData = await page.evaluate(async (studentId) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const d = await fetch('http://localhost:5220/api/admin/students/' + studentId, opts).then((r) => r.json());
      const all = await fetch('http://localhost:5220/api/Subjects', opts).then((r) => r.json());
      const codeFor = (id) => {
        const s = all.find((x) => x.id === id || x.subjectId === id);
        return s ? s.code : null;
      };
      return {
        selectedIds: (d.selectedSubjects || []).map((x) => x.subjectId),
        availableNotSelectedIds: (d.availableNotSelectedSubjects || []).map((x) => x.subjectId),
        allCodes: all.map((x) => ({ id: x.id, code: x.code, name: x.name })),
      };
    }, studentData.id);

    // Map subject dropdown values to codes
    const selectedCodesInDropdown = subjectOptionValues
      .map((o) => {
        const m = subjectApiData.allCodes.find((x) => x.id === o.value || x.id === o.value);
        return m ? m.code : null;
      })
      .filter(Boolean);

    results.subjectContainsBio = selectedCodesInDropdown.includes('SCH_BIO');
    results.subjectContainsHMath = selectedCodesInDropdown.includes('SCH_HMATH');
    results.subjectContainsPHY = selectedCodesInDropdown.includes('SCH_PHY');

    // CRITICAL: the subject dropdown must NOT include any of the availableNotSelected codes
    const availableNotSelectedCodes = subjectApiData.allCodes
      .filter((x) => subjectApiData.availableNotSelectedIds.includes(x.id))
      .map((x) => x.code);
    const leakedUnselected = selectedCodesInDropdown.filter((c) => availableNotSelectedCodes.includes(c));
    results.subjectOnlyShowsSelected = leakedUnselected.length === 0;
    results.subjectDropdownIsCorrect = {
      selectedCodesInDropdown,
      availableNotSelectedCodes,
      selectedCount: subjectOptionValues.length,
      expectedSelectedCount: studentData.selectedCodes.length,
      countsMatch: subjectOptionValues.length === studentData.selectedCodes.length,
    };
    await page.screenshot({ path: path.join(SHOTS_DIR, '11-02-subjects-filtered.png') });

    // 8. Find a subject to assign (try Biology first; otherwise first selected)
    let subjectId = null;
    for (const opt of subjectOptionValues) {
      const found = subjectApiData.allCodes.find((x) => x.id === opt.value && x.code === 'SCH_BIO');
      if (found) { subjectId = opt.value; break; }
    }
    if (!subjectId && subjectOptionValues.length > 0) {
      subjectId = subjectOptionValues[0].value;
    }
    if (!subjectId) throw new Error('No subject to select');

    await subjectSel.selectOption(subjectId);
    await teacherSel.selectOption(teacherValue);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS_DIR, '11-03-form-ready.png') });

    // 9. Submit
    const createRespPromise = page
      .waitForResponse((r) => /\/teacher-student-subjects$/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.getByRole('button', { name: /Create link/i }).first().click();
    const createResp = await createRespPromise;
    results.assignmentStatusCode = createResp ? createResp.status() : null;
    results.assignmentCreated = createResp ? (createResp.status() === 200 || createResp.status() === 201) : false;
    await page.waitForTimeout(1500);
    results.finalTssCount = await page.locator('table tbody tr').count();
    await page.screenshot({ path: path.join(SHOTS_DIR, '11-04-link-created.png') });

    // 10. Invalid assignment: try to assign a subject NOT in selectedSubjects via API
    const invalidResp = await page.evaluate(async (studentId) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const teachers = await fetch('http://localhost:5220/api/admin/teachers', opts).then((r) => r.json());
      const d = await fetch('http://localhost:5220/api/admin/students/' + studentId, opts).then((r) => r.json());
      const all = await fetch('http://localhost:5220/api/Subjects', opts).then((r) => r.json());
      const selectedIds = (d.selectedSubjects || []).map((x) => x.subjectId);
      const availIds = (d.availableNotSelectedSubjects || []).map((x) => x.subjectId);
      const unselectedId = availIds[0];
      if (!teachers.length || !unselectedId) return { error: 'missing inputs', teachers: teachers.length, availIds };
      const r = await fetch('http://localhost:5220/api/teacher-student-subjects', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: teachers[0].id, studentId, subjectId: unselectedId }),
      });
      const text = await r.text();
      return { status: r.status, body: text.slice(0, 300) };
    }, studentData.id);
    results.invalidAssignmentStatusCode = invalidResp.status;
    results.invalidAssignmentRejected = invalidResp.status >= 400;
    results.invalidAssignmentErrorMessage = invalidResp.body;

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();