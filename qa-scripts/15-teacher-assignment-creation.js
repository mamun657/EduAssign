// E2E QA: Section 15 — Teacher Assignment Creation & Publish
// Verifies that:
//   - Logged-in teacher sees the dashboard with students/subjects derived from /mine links
//   - "New assignment" button opens the form with Student + Subject dropdowns populated
//   - Form submits successfully and creates a draft assignment
//   - Draft assignment shows in the list with status "Draft" and no submission yet
//   - Click "Publish" → status changes to "Published"
//   - Invalid assignment (non-mine student/subject) is rejected
//   - Teacher can delete the assignment

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '15-teacher-assignment-creation.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
const FIXTURE_FILE = path.join(__dirname, 'results', 'teacher-fixture.json');
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
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  if (!fs.existsSync(FIXTURE_FILE)) {
    console.error('teacher-fixture.json not found. Run Section 9 first.');
    process.exit(1);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf-8'));

  const results = {
    section: '15. TEACHER ASSIGNMENT CREATION & PUBLISH',
    fixtureLoaded: false,
    teacherLogin: false,
    dashboardReached: false,
    mineLinkLoaded: false,
    studentCardVisible: false,
    subjectCardVisible: false,
    newAssignmentButtonVisible: false,
    newAssignmentButtonDisabled: false,
    formOpened: false,
    studentDropdownPopulated: null,
    subjectDropdownPopulated: null,
    formFilled: false,
    createRespStatus: null,
    assignmentCreated: false,
    assignmentId: null,
    assignmentInList: false,
    assignmentStatusIsDraft: false,
    assignmentTitleMatches: false,
    publishRespStatus: null,
    publishedSuccessfully: false,
    assignmentStatusIsPublished: false,
    deleteRespStatus: null,
    deleteRespOk: false,
    afterDeleteCount: 0,
    invalidAssignmentRejected: null,
    invalidAssignmentStatusCode: null,
    invalidAssignmentMessage: null,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    results.fixtureLoaded = true;

    // ----- 1. Login as teacher -----
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.getByLabel('Email').fill(fixture.email);
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    const loginRespPromise = page
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.locator('button[type="submit"]').first().click();
    const loginResp = await loginRespPromise;
    await page.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 15000 });
    results.teacherLogin = loginResp && loginResp.status() === 200;

    await page.waitForTimeout(2500);
    results.dashboardReached = /\/teacher/.test(page.url());

    // ----- 2. Verify cards visible -----
    await page.waitForTimeout(1500);
    results.studentCardVisible = (await page.getByText('My students').count()) > 0;
    results.subjectCardVisible = (await page.getByText('My subjects').count()) > 0;
    await page.screenshot({ path: path.join(SHOTS_DIR, '15-01-teacher-dashboard.png') });

    // Pull /mine to know which student/subject IDs to use
    const mineData = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const mine = await fetch('http://localhost:5220/api/teacher-student-subjects/mine', opts).then((r) => r.json());
      const assignments = await fetch('http://localhost:5220/api/assignments', opts).then((r) => r.json());
      return { mine, assignments };
    });
    results.mineLinkLoaded = Array.isArray(mineData.mine) && mineData.mine.length > 0;
    results.mineLinkCount = mineData.mine.length;
    results.initialAssignmentCount = mineData.assignments.length;

    if (!results.mineLinkLoaded) {
      throw new Error('Teacher has no /mine links — cannot test assignment creation');
    }
    // Use the first active link
    const link = mineData.mine.find((l) => l.isActive) || mineData.mine[0];
    results.targetStudentId = link.studentId;
    results.targetStudentName = link.studentName;
    results.targetSubjectId = link.subjectId;
    results.targetSubjectName = link.subjectName;

    // ----- 3. Click "New assignment" -----
    const newBtn = page.getByRole('button', { name: /New assignment/i }).first();
    results.newAssignmentButtonVisible = (await newBtn.count()) > 0;
    results.newAssignmentButtonDisabled = await newBtn.isDisabled();
    await newBtn.click();
    await page.waitForTimeout(800);
    results.formOpened = (await page.getByText('New assignment', { exact: true }).count()) > 0;
    await page.screenshot({ path: path.join(SHOTS_DIR, '15-02-create-form.png') });

    // Count dropdown options
    const studentSel = page.getByLabel('Student', { exact: true });
    const subjectSel = page.getByLabel('Subject', { exact: true });
    results.studentDropdownPopulated = await studentSel.locator('option').count();
    results.subjectDropdownPopulated = await subjectSel.locator('option').count();

    // ----- 4. Fill form -----
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dueDateLocal = future.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    await studentSel.selectOption(link.studentId);
    await subjectSel.selectOption(link.subjectId);
    await page.getByLabel('Title', { exact: true }).fill('Cell Biology - Mitosis Homework');
    await page.getByLabel('Description (optional)').fill('Read chapter 4 and answer questions 1-10.');
    await page.getByLabel('Due date').fill(dueDateLocal);
    results.formFilled = true;
    await page.screenshot({ path: path.join(SHOTS_DIR, '15-03-form-filled.png') });

    // ----- 5. Submit -----
    const createRespPromise = page
      .waitForResponse((r) => /\/api\/assignments$/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await page.getByRole('button', { name: /Create draft/i }).click();
    const createResp = await createRespPromise;
    results.createRespStatus = createResp ? createResp.status() : null;
    results.assignmentCreated = createResp ? (createResp.status() === 200 || createResp.status() === 201) : false;
    await page.waitForTimeout(2000);

    // ----- 6. Verify assignment in list -----
    const listData = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/assignments', opts).then((r) => r.json());
      return list;
    });
    results.afterCreateCount = listData.length;
    const created = listData.find((a) => a.title === 'Cell Biology - Mitosis Homework');
    if (created) {
      results.assignmentId = created.id;
      results.assignmentInList = true;
      results.assignmentStatusIsDraft = created.status === 'Draft';
      results.assignmentTitleMatches = created.title === 'Cell Biology - Mitosis Homework';
      results.assignmentStudentId = created.studentId;
      results.assignmentSubjectId = created.subjectId;
      results.assignmentIsPublished = created.isPublished === false;
    }
    await page.screenshot({ path: path.join(SHOTS_DIR, '15-04-assignment-draft.png') });

    // ----- 7. Publish the assignment -----
    if (results.assignmentId) {
      const publishRespPromise = page
        .waitForResponse((r) => /\/api\/assignments\/[^/]+\/publish$/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
        .catch(() => null);
      // Find the Publish button on this row
      await page.evaluate((id) => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        for (const r of rows) {
          if (r.textContent.includes('Cell Biology - Mitosis Homework')) {
            const btn = Array.from(r.querySelectorAll('button')).find((b) => /Publish/i.test(b.textContent));
            if (btn) { btn.click(); return; }
          }
        }
      }, results.assignmentId);
      const publishResp = await publishRespPromise;
      results.publishRespStatus = publishResp ? publishResp.status() : null;
      results.publishedSuccessfully = publishResp ? (publishResp.status() === 200) : false;
      await page.waitForTimeout(1500);

      const listData2 = await page.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
        const list = await fetch('http://localhost:5220/api/assignments', opts).then((r) => r.json());
        return list;
      });
      const published = listData2.find((a) => a.id === results.assignmentId);
      if (published) {
        results.assignmentStatusIsPublished = published.status === 'Published' && published.isPublished === true;
      }
      await page.screenshot({ path: path.join(SHOTS_DIR, '15-05-assignment-published.png') });
    }

    // ----- 8. Try to create an assignment for a student/subject NOT in /mine -----
    // We need an arbitrary student and subject. Fetch from admin API.
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await adminPage.getByLabel('Email').fill('admin@eduassign.local');
    await adminPage.getByLabel('Password', { exact: true }).fill('L@unchPad!Admin#2026-XqZ');
    await adminPage.locator('button[type="submit"]').first().click();
    await adminPage.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });
    await adminPage.waitForTimeout(800);
    const otherData = await adminPage.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const students = await fetch('http://localhost:5220/api/admin/students', opts).then((r) => r.json());
      const subjects = await fetch('http://localhost:5220/api/Subjects', opts).then((r) => r.json());
      // Find a student+subject that the teacher does NOT own
      return { students, subjects };
    });
    await adminCtx.close();
    // Pick a student different from the teacher's
    const otherStudent = otherData.students.find((s) => s.id !== link.studentId);
    const otherSubject = otherData.subjects.find((s) => s.id !== link.subjectId);
    if (otherStudent && otherSubject) {
      const invalidResp = await page.evaluate(async (payload) => {
        const tk = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/assignments', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await r.text();
        return { status: r.status, body: text.slice(0, 300) };
      }, {
        studentId: otherStudent.id,
        subjectId: otherSubject.id,
        title: 'Unauthorized assignment attempt',
        description: 'Should be rejected',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });
      results.invalidAssignmentStatusCode = invalidResp.status;
      results.invalidAssignmentRejected = invalidResp.status >= 400;
      try { results.invalidAssignmentMessage = JSON.parse(invalidResp.body).message; } catch (_) { results.invalidAssignmentMessage = invalidResp.body; }
    }

    // ----- 9. Delete the assignment -----
    if (results.assignmentId) {
      page.on('dialog', (d) => d.accept().catch(() => {}));
      const deleteRespPromise = page
        .waitForResponse((r) => new RegExp(`/api/assignments/${results.assignmentId}$`).test(r.url()) && r.request().method() === 'DELETE', { timeout: 15000 })
        .catch(() => null);
      await page.evaluate((id) => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        for (const r of rows) {
          if (r.textContent.includes('Cell Biology - Mitosis Homework')) {
            const btn = Array.from(r.querySelectorAll('button')).find((b) => /Delete/i.test(b.textContent));
            if (btn) { btn.click(); return; }
          }
        }
      }, results.assignmentId);
      const deleteResp = await deleteRespPromise;
      results.deleteRespStatus = deleteResp ? deleteResp.status() : null;
      results.deleteRespOk = deleteResp ? (deleteResp.status() === 200 || deleteResp.status() === 204) : false;
      await page.waitForTimeout(1500);

      const listData3 = await page.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
        const list = await fetch('http://localhost:5220/api/assignments', opts).then((r) => r.json());
        return list;
      });
      results.afterDeleteCount = listData3.length;
      await page.screenshot({ path: path.join(SHOTS_DIR, '15-06-after-delete.png') });
    }

  } catch (e) {
    results.fatalError = e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 3).join('\n') : '');
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();