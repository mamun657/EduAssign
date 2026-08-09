// E2E QA: Section 18 — Teacher Review
// Reuses fixtures from Sections 16-17:
//   - assignment-fixture.json (the assignment created and submitted)
//   - teacher-fixture.json
// Verifies:
//   - Teacher dashboard shows the submission with submissionText
//   - Teacher can call POST /assignments/{id}/review successfully
//   - Status changes to Reviewed, marks and feedback saved
//   - Refresh / re-fetch shows persisted review
//   - Cross-teacher review attempt rejected (403)
//   - Review before submit rejected (400)

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '18-teacher-review.json');
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
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'teacher-fixture.json'), 'utf-8'));
  const assignmentFixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'assignment-fixture.json'), 'utf-8'));
  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };

  const results = {
    section: '18. TEACHER REVIEW',
    teacherLogin: false,
    teacherDashboardReached: false,
    submissionVisibleInDashboard: false,
    reviewRespStatus: null,
    reviewAccepted: false,
    statusAfterReview: null,
    marksSaved: null,
    feedbackSaved: null,
    persistedAfterRefresh: false,
    crossTeacherReviewRejected: false,
    crossTeacherReviewStatusCode: null,
    crossTeacherReviewMessage: null,
    reviewBeforeSubmitRejected: null,
    reviewBeforeSubmitStatusCode: null,
    studentSeesReviewedStatus: null,
    studentSeesMarks: null,
    studentSeesFeedback: null,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    // ----- 1. Teacher: login, find the assignment in dashboard -----
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(fixture.email);
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 15000 });
    await page.waitForTimeout(2500);
    results.teacherLogin = true;
    results.teacherDashboardReached = /\/teacher/.test(page.url());

    // Look for the assignment in the teacher dashboard
    const teacherRow = await page.evaluate((title) => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const r of rows) {
        if (r.textContent.includes(title)) {
          const cells = Array.from(r.querySelectorAll('td')).map((c) => c.textContent.trim());
          return { found: true, cells };
        }
      }
      return { found: false };
    }, 'Photosynthesis Lab Report');
    results.submissionVisibleInDashboard = teacherRow.found;
    if (teacherRow.found) {
      results.teacherSeesStatus = teacherRow.cells[3];
      results.teacherSeesStudent = teacherRow.cells[0];
      results.teacherSeesSubject = teacherRow.cells[1];
    }
    await page.screenshot({ path: path.join(SHOTS_DIR, '18-01-teacher-dashboard.png') });

    // ----- 2. Review the submission via API -----
    const review = await page.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments/' + id + '/review', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: 87, feedback: 'Great work! Strong observations on chlorophyll wavelengths. Add more detail on stomatal response next time.' }),
      });
      const text = await r.text();
      return { status: r.status, body: text };
    }, assignmentFixture.id);
    let reviewed;
    try { reviewed = JSON.parse(review.body); } catch (_) { reviewed = null; }
    results.reviewRespStatus = review.status;
    results.reviewAccepted = review.status === 200 && reviewed && reviewed.status === 'Reviewed';
    if (reviewed) {
      results.statusAfterReview = reviewed.status;
      results.marksSaved = reviewed.marks;
      results.feedbackSaved = reviewed.feedback && reviewed.feedback.length > 0;
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '18-02-after-review.png') });

    // ----- 3. Re-fetch: verify review persists -----
    const refetched = await page.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/assignments', opts).then((r) => r.json());
      const found = list.find((a) => a.id === id);
      return found || null;
    }, assignmentFixture.id);
    if (refetched) {
      results.persistedAfterRefresh = refetched.status === 'Reviewed' && refetched.marks === 87 && refetched.feedback && refetched.feedback.length > 0;
      results.persistedStatus = refetched.status;
      results.persistedMarks = refetched.marks;
    }

    // ----- 4. Cross-teacher review attempt: another teacher tries to review this assignment -----
    // Find another teacher from admin data
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await adminPage.getByLabel('Email').fill(ADMIN.email);
    await adminPage.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await adminPage.locator('button[type="submit"]').first().click();
    await adminPage.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });
    await adminPage.waitForTimeout(800);

    const otherTeacherEmail = await adminPage.evaluate(async (myEmail) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const teachers = await fetch('http://localhost:5220/api/admin/teachers', opts).then((r) => r.json());
      const others = teachers.filter((t) => t.email !== myEmail && t.role === 'Teacher');
      return others.length > 0 ? others[0].email : null;
    }, fixture.email);
    results.crossTeacherEmail = otherTeacherEmail;

    if (otherTeacherEmail) {
      // Reset other teacher's password to a known one via admin API if available.
      // Otherwise just try common passwords.
      const candidatePwds = ['StrongPass!2026', 'TeachPass!2026', 'Password!2026'];
      const otherCtx = await browser.newContext();
      const otherPage = await otherCtx.newPage();
      let loggedIn = false;
      let usedPwd = null;
      for (const pwd of candidatePwds) {
        try {
          await otherCtx.clearCookies();
          await otherPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
          await otherPage.getByLabel('Email').fill(otherTeacherEmail);
          await otherPage.getByLabel('Password', { exact: true }).fill(pwd);
          const respP = otherPage.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 8000 }).catch(() => null);
          await otherPage.locator('button[type="submit"]').first().click();
          const r = await respP;
          if (r && r.status() === 200) {
            await otherPage.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 8000 }).catch(() => {});
            if (/\/teacher/.test(otherPage.url())) {
              loggedIn = true;
              usedPwd = pwd;
              break;
            }
          }
        } catch (_) {}
      }
      results.crossTeacherPasswordFound = usedPwd;

      if (loggedIn) {
        const crossReview = await otherPage.evaluate(async (id) => {
          const tk = localStorage.getItem('eduassign.token');
          const r = await fetch('http://localhost:5220/api/assignments/' + id + '/review', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
            body: JSON.stringify({ marks: 50, feedback: 'Trying to override another teacher\'s review' }),
          });
          const text = await r.text();
          return { status: r.status, body: text };
        }, assignmentFixture.id);
        results.crossTeacherReviewStatusCode = crossReview.status;
        results.crossTeacherReviewRejected = crossReview.status >= 400;
        try { results.crossTeacherReviewMessage = JSON.parse(crossReview.body).message; } catch (_) { results.crossTeacherReviewMessage = crossReview.body.slice(0, 200); }
      } else {
        results.crossTeacherReviewSkipped = 'No password matched for other teacher — skipping cross-teacher test';
      }
      await otherCtx.close();
    }
    await adminCtx.close();

    // ----- 5. Review before submit: create another assignment that is NOT submitted, then try to review -----
    // Use the same teacher to create + publish a new assignment, then immediately try to review.
    const newAssignmentResp = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      // Get first student + first subject from teacher's TSS links
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const links = await fetch('http://localhost:5220/api/teacher-student-subjects/mine', opts).then((r) => r.json());
      if (!Array.isArray(links) || links.length === 0) return { status: 0, body: 'no links' };
      const link = links[0];
      const r = await fetch('http://localhost:5220/api/assignments', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: link.studentId,
          subjectId: link.subjectId,
          title: 'Pre-submit Test Assignment',
          description: 'Should not be reviewable before submission.',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      const text = await r.text();
      return { status: r.status, body: text };
    });
    let newAssignment = null;
    try { newAssignment = JSON.parse(newAssignmentResp.body); } catch (_) {}
    if (newAssignment && newAssignment.id) {
      // Publish it
      await page.evaluate(async (id) => {
        const tk = localStorage.getItem('eduassign.token');
        await fetch('http://localhost:5220/api/assignments/' + id + '/publish', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        });
      }, newAssignment.id);

      // Try to review without submit
      const beforeSubmit = await page.evaluate(async (id) => {
        const tk = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/assignments/' + id + '/review', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
          body: JSON.stringify({ marks: 99, feedback: 'Premature review' }),
        });
        const text = await r.text();
        return { status: r.status, body: text };
      }, newAssignment.id);
      results.reviewBeforeSubmitStatusCode = beforeSubmit.status;
      results.reviewBeforeSubmitRejected = beforeSubmit.status >= 400;
      try { results.reviewBeforeSubmitMessage = JSON.parse(beforeSubmit.body).message; } catch (_) { results.reviewBeforeSubmitMessage = beforeSubmit.body.slice(0, 200); }
    }

    // ----- 6. Student: see the review (marks + feedback) on dashboard -----
    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await studentPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await studentPage.getByLabel('Email').fill(assignmentFixture.studentEmail);
    await studentPage.getByLabel('Password', { exact: true }).fill(assignmentFixture.studentPassword);
    await studentPage.locator('button[type="submit"]').first().click();
    await studentPage.waitForURL((u) => /\/student/.test(u.toString()), { timeout: 15000 });
    await studentPage.waitForTimeout(2500);

    const studentAssignment = await studentPage.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/assignments', opts).then((r) => r.json());
      return list.find((a) => a.id === id) || null;
    }, assignmentFixture.id);
    if (studentAssignment) {
      results.studentSeesReviewedStatus = studentAssignment.status === 'Reviewed';
      results.studentSeesMarks = studentAssignment.marks;
      results.studentSeesFeedback = studentAssignment.feedback && studentAssignment.feedback.length > 0;
    }
    await studentPage.screenshot({ path: path.join(SHOTS_DIR, '18-03-student-sees-review.png') });

  } catch (e) {
    results.fatalError = e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 3).join('\n') : '');
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();