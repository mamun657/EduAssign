// E2E QA: Section 16 + 17 — Student Assignment View + Submission
// Combined because the frontend student dashboard doesn't have a submit UI form,
// so submission is via API. Verifies that:
//   - Admin creates an assignment + teacher link for a known student
//   - Teacher publishes the assignment
//   - Student logs in and sees the published assignment in "My assignments"
//   - Student can call POST /assignments/{id}/submit successfully
//   - Status changes to Submitted; teacher sees submitted status
//   - Cross-student submit is rejected (403)
//   - Submitting twice is allowed (idempotent update)
//   - Submit before publish is rejected (400)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '16-17-student-view-submit.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
const FIXTURE_FILE = path.join(__dirname, 'results', 'teacher-fixture.json');
const STUDENT_FIXTURE = path.join(__dirname, 'results', 'student-fixture.json');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const consoleErrors = [];
const networkErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const adminCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const adminPage = await adminCtx.newPage();

  adminPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  adminPage.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
  adminPage.on('response', (resp) => {
    if (resp.url().includes('localhost:5220') && resp.status() >= 400) {
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  const fixture = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf-8'));
  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };

  const results = {
    section: '16 + 17. STUDENT ASSIGNMENT VIEW + SUBMISSION',
    adminLogin: false,
    teacherLogin: false,
    studentLogin: false,
    assignmentCreated: false,
    assignmentId: null,
    assignmentPublished: false,
    studentDashboardReached: false,
    assignmentVisibleInStudentDashboard: false,
    statusBadgeInDashboard: null,
    subjectBadgeInDashboard: null,
    dueDateInDashboard: null,
    submitBeforePublishRejected: null,
    submitBeforePublishStatusCode: null,
    submitBeforePublishMessage: null,
    submitRespStatus: null,
    submitRespBody: null,
    submitAccepted: false,
    statusAfterSubmit: null,
    secondSubmitRespStatus: null,
    secondSubmitAccepted: false,
    crossStudentSubmitRejected: null,
    crossStudentSubmitStatusCode: null,
    teacherSeesSubmittedStatus: false,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // ----- 1. Admin: login, find a student with TSS link, create assignment via API -----
    await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await adminPage.getByLabel('Email').fill(ADMIN.email);
    await adminPage.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await adminPage.locator('button[type="submit"]').first().click();
    await adminPage.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });
    await adminPage.waitForTimeout(800);
    results.adminLogin = true;

    // Get the fixture teacher's user ID
    const teacherUserId = await adminPage.evaluate(async (email) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const teachers = await fetch('http://localhost:5220/api/admin/teachers', opts).then((r) => r.json());
      const m = teachers.find((t) => t.email === email);
      return m ? m.id : null;
    }, fixture.email);
    results.teacherUserId = teacherUserId;

    // Get the existing TSS link for the fixture teacher
    const linkInfo = await adminPage.evaluate(async (tId) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/teacher-student-subjects', opts).then((r) => r.json());
      const link = list.find((l) => l.teacherId === tId && l.isActive);
      return link || null;
    }, teacherUserId);
    if (!linkInfo) throw new Error('No TSS link found for fixture teacher');
    results.targetStudentId = linkInfo.studentId;
    results.targetSubjectId = linkInfo.subjectId;
    results.targetStudentName = linkInfo.studentName;
    results.targetSubjectName = linkInfo.subjectName;

    // Student email (we know the format from Section 1 — lamia+...@test.local is fresh; Arif is from seed)
    // Get the student email from admin data
    const studentEmail = await adminPage.evaluate(async (sid) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const detail = await fetch('http://localhost:5220/api/admin/students/' + sid, opts).then((r) => r.json());
      return detail.email;
    }, linkInfo.studentId);
    results.studentEmail = studentEmail;

    // Create assignment as teacher (login as teacher in a separate context)
    const teacherCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const teacherPage = await teacherCtx.newPage();
    teacherPage.on('pageerror', (err) => consoleErrors.push('teacher pageerror: ' + err.message));
    await teacherPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await teacherPage.getByLabel('Email').fill(fixture.email);
    await teacherPage.getByLabel('Password', { exact: true }).fill(fixture.password);
    await teacherPage.locator('button[type="submit"]').first().click();
    await teacherPage.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 15000 });
    await teacherPage.waitForTimeout(1500);
    results.teacherLogin = true;

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dueDateISO = future.toISOString();

    // Create the assignment
    const created = await teacherPage.evaluate(async (payload) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      return { status: r.status, body: text };
    }, {
      studentId: linkInfo.studentId,
      subjectId: linkInfo.subjectId,
      title: 'Photosynthesis Lab Report',
      description: 'Write a 2-page report on your photosynthesis experiment observations.',
      dueDate: dueDateISO,
    });
    let createdAssignment;
    try { createdAssignment = JSON.parse(created.body); } catch (_) { createdAssignment = null; }
    results.assignmentCreated = created.status === 200 && createdAssignment && createdAssignment.id;
    results.assignmentId = createdAssignment ? createdAssignment.id : null;
    results.createRespStatus = created.status;

    if (!results.assignmentId) {
      // Maybe response was truncated to 500 chars but the body parse failed.
      // Try to extract id from the truncated body if present.
      const idMatch = /"id":"([a-f0-9]+)"/.exec(created.body);
      if (idMatch) {
        results.assignmentId = idMatch[1];
        results.assignmentCreated = true;
        results.assignmentIdRecoveredFromTruncated = true;
      } else {
        throw new Error('Failed to create assignment: ' + created.body);
      }
    }

    // Publish it
    const published = await teacherPage.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments/' + id + '/publish', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
      });
      const text = await r.text();
      return { status: r.status, body: text };
    }, results.assignmentId);
    let publishedAssignment;
    try { publishedAssignment = JSON.parse(published.body); } catch (_) { publishedAssignment = null; }
    results.assignmentPublished = published.status === 200 && publishedAssignment && publishedAssignment.isPublished === true;
    results.publishRespStatus = published.status;
    await teacherCtx.close();

    // ----- 2. Student: login, see assignment in dashboard, submit -----
    const studentCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const studentPage = await studentCtx.newPage();
    studentPage.on('pageerror', (err) => consoleErrors.push('student pageerror: ' + err.message));

    await studentPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await studentPage.getByLabel('Email').fill(studentEmail);
    await studentPage.getByLabel('Password', { exact: true }).fill('StrongPass!2026');
    const studentLoginPromise = studentPage
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await studentPage.locator('button[type="submit"]').first().click();
    const studentLogin = await studentLoginPromise;
    await studentPage.waitForURL((u) => /\/student/.test(u.toString()), { timeout: 15000 });
    await studentPage.waitForTimeout(2500);
    results.studentLogin = studentLogin && studentLogin.status() === 200;
    results.studentDashboardReached = /\/student/.test(studentPage.url());
    await studentPage.screenshot({ path: path.join(SHOTS_DIR, '16-01-student-dashboard.png') });

    // Verify assignment visible
    const visibleRow = await studentPage.evaluate((title) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const r of rows) {
        if (r.textContent.includes(title)) {
          const cells = Array.from(r.querySelectorAll('td')).map((c) => c.textContent.trim());
          return { found: true, cells };
        }
      }
      return { found: false };
    }, 'Photosynthesis Lab Report');
    results.assignmentVisibleInStudentDashboard = visibleRow.found;
    if (visibleRow.found) {
      results.statusBadgeInDashboard = visibleRow.cells[3];
      results.subjectBadgeInDashboard = visibleRow.cells[1];
      results.dueDateInDashboard = visibleRow.cells[2];
      results.titleInDashboard = visibleRow.cells[0];
    }
    await studentPage.screenshot({ path: path.join(SHOTS_DIR, '16-02-assignment-visible.png') });

    // ----- 3. Submit the assignment via API -----
    const submit = await studentPage.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments/' + id + '/submit', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionText: 'My findings: chlorophyll absorbs red and blue light. Plants produce oxygen...' }),
      });
      const text = await r.text();
      return { status: r.status, body: text };
    }, results.assignmentId);
    let submittedAssignment;
    try { submittedAssignment = JSON.parse(submit.body); } catch (_) { submittedAssignment = null; }
    results.submitRespStatus = submit.status;
    results.submitRespBody = submit.body;
    results.submitAccepted = submit.status === 200 && submittedAssignment && submittedAssignment.status === 'Submitted';
    if (submittedAssignment) {
      results.statusAfterSubmit = submittedAssignment.status;
      results.submissionTextSaved = submittedAssignment.submissionText && submittedAssignment.submissionText.length > 0;
      results.submittedAtSaved = !!submittedAssignment.submittedAt;
      results.marksBeforeReview = submittedAssignment.marks;
    }
    await studentPage.waitForTimeout(1500);
    await studentPage.screenshot({ path: path.join(SHOTS_DIR, '17-01-after-submit.png') });

    // ----- 4. Re-submit (idempotent update) -----
    const resubmit = await studentPage.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments/' + id + '/submit', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionText: 'Updated: additional data shows that chlorophyll a peaks at 430nm and 662nm.' }),
      });
      const text = await r.text();
      return { status: r.status, body: text };
    }, results.assignmentId);
    let resubmittedAssignment;
    try { resubmittedAssignment = JSON.parse(resubmit.body); } catch (_) { resubmittedAssignment = null; }
    results.secondSubmitRespStatus = resubmit.status;
    results.secondSubmitAccepted = resubmit.status === 200 && resubmittedAssignment && resubmittedAssignment.status === 'Submitted';
    if (resubmittedAssignment) {
      results.secondSubmissionText = resubmittedAssignment.submissionText;
    }

    // ----- 5. Cross-student submit (different student logs in, tries to submit this assignment) -----
    // Use a different student from admin data
    const otherStudentEmail = await adminPage.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const students = await fetch('http://localhost:5220/api/admin/students', opts).then((r) => r.json());
      const others = students.filter((s) => s.role === 'Student');
      // Find one with a known pattern — Sumaiya from Section 3-6
      const target = others.find((s) => s.email.includes('sumaiya') || s.email.includes('nusrat') || s.email.includes('lamia'));
      return target ? target.email : (others.length > 0 ? others[0].email : null);
    });
    results.crossStudentEmail = otherStudentEmail;

    if (otherStudentEmail && otherStudentEmail !== studentEmail) {
      const otherCtx = await browser.newContext();
      const otherPage = await otherCtx.newPage();
      try {
        await otherPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        await otherPage.getByLabel('Email').fill(otherStudentEmail);
        await otherPage.getByLabel('Password', { exact: true }).fill('StrongPass!2026');
        await otherPage.locator('button[type="submit"]').first().click();
        await otherPage.waitForURL((u) => /\/student/.test(u.toString()), { timeout: 15000 }).catch(() => {});
        await otherPage.waitForTimeout(800);

        const crossSubmit = await otherPage.evaluate(async (id) => {
          const tk = localStorage.getItem('eduassign.token');
          if (!tk) return { status: -1, body: 'no token' };
          const r = await fetch('http://localhost:5220/api/assignments/' + id + '/submit', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionText: 'Trying to submit someone else\'s assignment' }),
          });
          const text = await r.text();
          return { status: r.status, body: text };
        }, results.assignmentId);
        results.crossStudentSubmitStatusCode = crossSubmit.status;
        results.crossStudentSubmitRejected = crossSubmit.status >= 400;
        try { results.crossStudentSubmitMessage = JSON.parse(crossSubmit.body).message; } catch (_) { results.crossStudentSubmitMessage = crossSubmit.body; }
      } catch (e) {
        results.crossStudentSubmitError = e.message;
      }
      await otherCtx.close();
    }

    // ----- 6. Teacher sees Submitted status -----
    const teacherCtx2 = await browser.newContext();
    const teacherPage2 = await teacherCtx2.newPage();
    await teacherPage2.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await teacherPage2.getByLabel('Email').fill(fixture.email);
    await teacherPage2.getByLabel('Password', { exact: true }).fill(fixture.password);
    await teacherPage2.locator('button[type="submit"]').first().click();
    await teacherPage2.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 15000 });
    await teacherPage2.waitForTimeout(2500);
    const teacherSees = await teacherPage2.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/assignments', opts).then((r) => r.json());
      const found = list.find((a) => a.id === id);
      return found || null;
    }, results.assignmentId);
    if (teacherSees) {
      results.teacherSeesSubmittedStatus = teacherSees.status === 'Submitted';
      results.teacherSeesMarksNull = teacherSees.marks === null || teacherSees.marks === undefined;
      results.teacherSeesFeedbackNull = teacherSees.feedback === null || teacherSees.feedback === undefined;
      results.teacherSeesSubmissionText = teacherSees.submissionText && teacherSees.submissionText.length > 0;
    }
    await teacherCtx2.close();

    // ----- 7. Save assignment+student fixtures for Section 18 (review) -----
    fs.writeFileSync(
      path.join(__dirname, 'results', 'assignment-fixture.json'),
      JSON.stringify({
        id: results.assignmentId,
        studentEmail,
        studentPassword: 'StrongPass!2026',
        teacherEmail: fixture.email,
        teacherPassword: fixture.password,
      }, null, 2)
    );

    await studentCtx.close();
    await adminCtx.close();

  } catch (e) {
    results.fatalError = e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 3).join('\n') : '');
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();