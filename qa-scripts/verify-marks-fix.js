// Marks 0..100 fix verification.
// Strategy: use existing Phase 4 teacher + student + existing TSS link.
// 1. Teacher login (try the Phase 4 fixture password)
// 2. Teacher creates + publishes a fresh assignment to that student
// 3. Student login + submits
// 4. Teacher opens /teacher/submissions/{id} -> verifies label + attrs + 101/100 behavior
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, 'screenshots', 'marks-fix');
fs.mkdirSync(SHOTS, { recursive: true });

const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };
const consoleErrors = [];
const networkErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = {
    adminLogin: false,
    teacherLogin: false,
    studentLogin: false,
    assignmentId: null,
    submitted: false,
    reviewPageLabel: null,
    reviewPageInputAttrs: null,
    attempt101Outcome: null,
    attempt100Outcome: null,
    persistedMarks: null,
    persistedStatus: null,
    screenshots: [],
    consoleErrors: [],
    networkErrors: [],
    fatal: null,
  };

  try {
    // ===== 1. Admin: lookup existing teacher + student + existing TSS link =====
    const adminCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const adminPage = await adminCtx.newPage();
    adminPage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[admin] ' + m.text()); });
    adminPage.on('pageerror', (e) => consoleErrors.push('[admin pageerror] ' + e.message));
    adminPage.on('response', (r) => {
      if (/localhost:5220/.test(r.url()) && r.status() >= 400) networkErrors.push(r.status() + ' ' + r.url());
    });

    await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await adminPage.getByLabel('Email').fill(ADMIN.email);
    await adminPage.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await adminPage.locator('button[type="submit"]').first().click();
    await adminPage.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });
    out.adminLogin = true;

    const lookup = await adminPage.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const auth = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };

      const teachers = await fetch('http://localhost:5220/api/admin/teachers', auth).then((r) => r.json());
      const links = await fetch('http://localhost:5220/api/teacher-student-subjects', auth).then((r) => r.json());

      // Find a teacher who has at least one TSS link
      let teacher = null, link = null;
      for (const t of teachers) {
        const l = links.find((x) => x.teacherId === t.id);
        if (l) { teacher = t; link = l; break; }
      }
      if (!teacher || !link) throw new Error('No teacher with TSS link found');

      // Fetch student details
      const student = await fetch('http://localhost:5220/api/admin/students/' + link.studentId, auth)
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null);

      return {
        teacher: { id: teacher.id, email: teacher.email },
        existingStudent: student ? { id: link.studentId, email: student.email, academicLevelId: student.academicLevelId ?? null } : null,
        subjectId: link.subjectId,
      };
    });
    if (!lookup.existingStudent?.academicLevelId) {
      // Fallback: pick first student
      const more = await adminPage.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        const auth = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
        const students = await fetch('http://localhost:5220/api/admin/students', auth).then((r) => r.json());
        return students[0];
      });
      lookup.existingStudent = { ...lookup.existingStudent, id: more.id, email: more.email, academicLevelId: more.academicLevelId };
    }

    // Register a fresh student with a known password using /Auth/register
    const register = await adminPage.evaluate(async ({ email, password, academicLevelId, selectedSubjectId }) => {
      const r = await fetch('http://localhost:5220/api/Auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Marks',
          lastName: 'Fix',
          email,
          password,
          confirmPassword: password,
          role: 'Student',
          academicLevelId,
        }),
      });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch (_) {}
      return { status: r.status, body: j, raw: txt };
    }, {
      email: `marksfix+${Date.now()}@test.local`,
      password: 'StrongPass!2026',
      academicLevelId: lookup.existingStudent.academicLevelId,
      selectedSubjectId: lookup.subjectId,
    });
    if (register.status !== 200 || !register.body?.user?.id) {
      throw new Error('Register student failed: status=' + register.status + ' body=' + register.raw.slice(0, 300));
    }
    const student = { id: register.body.user.id, email: register.body.user.email, password: 'StrongPass!2026', token: register.body.token };

    // Enroll the new student into the subject using their own token
    const enroll = await adminPage.evaluate(async ({ subjectId, token }) => {
      const r = await fetch('http://localhost:5220/api/students/enroll', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch (_) {}
      return { status: r.status, body: j, raw: txt };
    }, { subjectId: lookup.subjectId, token: student.token });
    if (enroll.status >= 400) {
      throw new Error('Student enroll failed: status=' + enroll.status + ' body=' + enroll.raw.slice(0, 300));
    }

    // Create TSS link: teacher <-> new student <-> same subject
    const linkResp = await adminPage.evaluate(async ({ teacherId, studentId, subjectId }) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/teacher-student-subjects', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, studentId, subjectId }),
      });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch (_) {}
      return { status: r.status, body: j, raw: txt };
    }, { teacherId: lookup.teacher.id, studentId: student.id, subjectId: lookup.subjectId });
    if (linkResp.status !== 200 && linkResp.status !== 201) {
      throw new Error('TSS link create failed: status=' + linkResp.status + ' body=' + linkResp.raw.slice(0, 300));
    }

    await adminCtx.close();

    // ===== 2. Teacher: login + create + publish assignment =====
    const teacherCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const teacherPage = await teacherCtx.newPage();
    teacherPage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[teacher] ' + m.text()); });
    teacherPage.on('pageerror', (e) => consoleErrors.push('[teacher pageerror] ' + e.message));
    teacherPage.on('response', (r) => {
      if (/localhost:5220/.test(r.url()) && r.status() >= 400) networkErrors.push(r.status() + ' ' + r.url());
    });

    const teacherCandidates = ['TeachPass!2026', 'Password!2026', 'StrongPass!2026'];
    let teacherPwd = null;
    for (const pw of teacherCandidates) {
      try {
        await teacherCtx.clearCookies();
        await teacherPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
        await teacherPage.getByLabel('Email').fill(lookup.teacher.email);
        await teacherPage.getByLabel('Password', { exact: true }).fill(pw);
        const respP = teacherPage.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 8000 }).catch(() => null);
        await teacherPage.locator('button[type="submit"]').first().click();
        const r = await respP;
        if (r && r.status() === 200) {
          await teacherPage.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 8000 }).catch(() => {});
          if (/\/teacher/.test(teacherPage.url())) {
            teacherPwd = pw;
            break;
          }
        }
      } catch (_) {}
    }
    if (!teacherPwd) throw new Error('Could not login as teacher. Tried: ' + teacherCandidates.join(','));
    out.teacherLogin = true;

    const created = await teacherPage.evaluate(async ({ studentId, subjectId }) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          subjectId,
          title: `MarksFix ${Date.now()}`,
          description: 'Verification assignment for marks 0-100 fix.',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      const a = await r.json();
      const pub = await fetch('http://localhost:5220/api/assignments/' + a.id + '/publish', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
      });
      return { id: a.id, pubStatus: pub.status };
    }, { studentId: student.id, subjectId: lookup.subjectId });
    out.assignmentId = created.id;

    // ===== 3. Student: login + submit =====
    const studentCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const studentPage = await studentCtx.newPage();
    studentPage.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[student] ' + m.text()); });
    studentPage.on('pageerror', (e) => consoleErrors.push('[student pageerror] ' + e.message));
    studentPage.on('response', (r) => {
      if (/localhost:5220/.test(r.url()) && r.status() >= 400) networkErrors.push(r.status() + ' ' + r.url());
    });
    await studentPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await studentPage.getByLabel('Email').fill(student.email);
    await studentPage.getByLabel('Password', { exact: true }).fill(student.password);
    await studentPage.locator('button[type="submit"]').first().click();
    await studentPage.waitForURL((u) => /\/student/.test(u.toString()), { timeout: 15000 });
    out.studentLogin = true;

    const submit = await studentPage.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments/' + id + '/submit', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionText: 'My answer for MarksFix verification.' }),
      });
      const txt = await r.text();
      let j = null; try { j = JSON.parse(txt); } catch (_) {}
      return { status: r.status, body: j, raw: txt };
    }, created.id);
    out.submitted = submit.status === 200 && submit.body?.status === 'Submitted';
    if (!out.submitted) throw new Error('Submit failed: status=' + submit.status + ' body=' + submit.raw.slice(0, 300));
    await studentCtx.close();

    // ===== 4. Teacher: open review page + verify label + attrs =====
    await teacherPage.goto(`http://localhost:3000/teacher/submissions/${created.id}`, { waitUntil: 'networkidle' });
    await teacherPage.waitForTimeout(800);

    const labelText = (await teacherPage.locator('label[for="marks"]').textContent()) || '';
    out.reviewPageLabel = labelText.trim();
    out.reviewPageInputAttrs = await teacherPage.locator('#marks').evaluate((el) => ({
      min: el.getAttribute('min'),
      max: el.getAttribute('max'),
      step: el.getAttribute('step'),
      type: el.getAttribute('type'),
      required: el.hasAttribute('required'),
    }));
    await teacherPage.screenshot({ path: path.join(SHOTS, '01-review-page-loaded.png'), fullPage: true });
    out.screenshots.push('01-review-page-loaded.png');

    // ===== 5. Attempt 101 =====
    let reviewApiCalls = [];
    teacherPage.on('request', (req) => {
      if (/\/review/.test(req.url()) && req.method() === 'POST') {
        try { reviewApiCalls.push({ body: req.postData() }); } catch (_) {}
      }
    });

    await teacherPage.locator('#marks').fill('101');
    await teacherPage.locator('#feedback').fill('Trying to exceed 100');
    await teacherPage.locator('button[type="submit"]').click();
    await teacherPage.waitForTimeout(1500);

    out.attempt101Outcome = {
      validationAlertShown: await teacherPage.locator('text=/cannot exceed 100/i').count() > 0,
      reviewApiCallsDuringAttempt: reviewApiCalls.slice(),
      inputValidity: await teacherPage.locator('#marks').evaluate((el) => ({
        value: el.value,
        validityValid: el.checkValidity(),
        rangeUnderflow: el.validity.rangeUnderflow,
        rangeOverflow: el.validity.rangeOverflow,
      })),
    };
    await teacherPage.screenshot({ path: path.join(SHOTS, '02-attempt-101.png'), fullPage: true });
    out.screenshots.push('02-attempt-101.png');

    // ===== 6. Attempt 100 =====
    reviewApiCalls = [];
    await teacherPage.locator('#marks').fill('100');
    await teacherPage.locator('#feedback').fill('A valid score of 100. Great job.');
    const reviewRespPromise = teacherPage.waitForResponse(
      (r) => /\/review/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 10000 },
    ).catch(() => null);
    await teacherPage.locator('button[type="submit"]').click();
    const reviewResp = await reviewRespPromise;
    out.attempt100Outcome = {
      apiCalled: reviewApiCalls.length,
      requestBody: reviewApiCalls[0] || null,
      status: reviewResp ? reviewResp.status() : null,
    };
    await teacherPage.waitForTimeout(2000);

    // ===== 7. Refresh + read persisted marks =====
    await teacherPage.reload({ waitUntil: 'networkidle' });
    await teacherPage.waitForTimeout(800);
    const persisted = await teacherPage.evaluate(async (id) => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/assignments/' + id, { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } });
      const j = await r.json();
      return { status: j.status, marks: j.marks };
    }, created.id);
    out.persistedStatus = persisted.status;
    out.persistedMarks = persisted.marks;
    await teacherPage.screenshot({ path: path.join(SHOTS, '03-after-100.png'), fullPage: true });
    out.screenshots.push('03-after-100.png');

    await browser.close();
  } catch (e) {
    out.fatal = e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 6).join('\n') : '');
    try { await browser.close(); } catch (_) {}
  }

  out.consoleErrors = consoleErrors;
  out.networkErrors = networkErrors;
  fs.writeFileSync(path.join(__dirname, 'results', 'marks-fix.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.fatal ? 2 : 0);
})();
