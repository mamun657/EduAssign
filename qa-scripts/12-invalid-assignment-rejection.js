// E2E QA: Section 12 — Invalid TSS Assignment Rejection (Defense in Depth)
// Verifies server-side rejections for invalid TSS assignment attempts via API:
//   A. Assign subject that student is NOT enrolled in → 400 "Student is not enrolled in this subject"
//   B. Assign inactive subject → 400 "Subject is not active"
//   C. Assign subject to a non-Teacher user → 400 "Selected user is not a Teacher"
//   D. Assign subject to a non-Student user → 400 "Selected user is not a Student"
//   E. Assign with non-existent teacherId → 400 / 404
//   F. Assign with non-existent subjectId → 400 / 404
//   G. Assign with empty body → 400

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '12-invalid-assignment-rejection.json');
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

  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };
  const results = {
    section: '12. INVALID TSS ASSIGNMENT REJECTION',
    adminLogin: false,
    A_unenrolledRejected: false,
    A_statusCode: null,
    A_message: null,
    B_inactiveSubjectRejected: false,
    B_statusCode: null,
    B_message: null,
    C_nonTeacherRejected: false,
    C_statusCode: null,
    C_message: null,
    D_nonStudentRejected: false,
    D_statusCode: null,
    D_message: null,
    E_nonExistentTeacherRejected: false,
    E_statusCode: null,
    F_nonExistentSubjectRejected: false,
    F_statusCode: null,
    G_emptyBodyRejected: false,
    G_statusCode: null,
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

    // 2. Gather fixtures
    const fixtures = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const students = await fetch('http://localhost:5220/api/admin/students', opts).then((r) => r.json());
      const teachers = await fetch('http://localhost:5220/api/admin/teachers', opts).then((r) => r.json());
      const subjects = await fetch('http://localhost:5220/api/Subjects', opts).then((r) => r.json());

      // Find a student with an availableNotSelected subject
      let studentWithBio = null;
      let unselectedSubjectId = null;
      for (const s of students) {
        const d = await fetch('http://localhost:5220/api/admin/students/' + s.id, opts).then((r) => r.json());
        const avail = (d.availableNotSelectedSubjects || []);
        if (avail.length > 0) {
          studentWithBio = { id: s.id, name: s.firstName + ' ' + s.lastName, selectedIds: (d.selectedSubjects || []).map((x) => x.subjectId) };
          unselectedSubjectId = avail[0].subjectId;
          break;
        }
      }

      const activeSubject = subjects.find((s) => s.isActive);
      const inactiveSubject = subjects.find((s) => !s.isActive);

      return {
        students,
        teachers,
        subjects,
        studentWithBio,
        unselectedSubjectId,
        activeSubject,
        inactiveSubject,
      };
    });
    if (!fixtures.studentWithBio) throw new Error('No student with available-not-selected subject found');
    if (!fixtures.teachers.length) throw new Error('No teacher found');
    if (!fixtures.activeSubject) throw new Error('No active subject found');

    // 3. Helper to POST and capture status + body
    async function postAssign(body) {
      return await page.evaluate(async (b) => {
        const tk = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/teacher-student-subjects', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
          body: JSON.stringify(b),
        });
        const text = await r.text();
        let parsed = null;
        try { parsed = JSON.parse(text); } catch {}
        return { status: r.status, body: text.slice(0, 400), message: parsed?.message || null };
      }, body);
    }

    // A. Subject not in student's selected list
    const A = await postAssign({
      teacherId: fixtures.teachers[0].id,
      studentId: fixtures.studentWithBio.id,
      subjectId: fixtures.unselectedSubjectId,
    });
    results.A_statusCode = A.status;
    results.A_message = A.message;
    results.A_unenrolledRejected = A.status >= 400;

    // B. Inactive subject
    if (fixtures.inactiveSubject) {
      const B = await postAssign({
        teacherId: fixtures.teachers[0].id,
        studentId: fixtures.studentWithBio.id,
        subjectId: fixtures.inactiveSubject.id,
      });
      results.B_statusCode = B.status;
      results.B_message = B.message;
      results.B_inactiveSubjectRejected = B.status >= 400;
    } else {
      results.B_message = 'No inactive subject exists in seed (skipped)';
    }

    // C. Use student role as teacher (use second student as teacher)
    const C = await postAssign({
      teacherId: fixtures.students[1]?.id || fixtures.students[0].id,
      studentId: fixtures.studentWithBio.id,
      subjectId: fixtures.studentWithBio.selectedIds[0],
    });
    results.C_statusCode = C.status;
    results.C_message = C.message;
    results.C_nonTeacherRejected = C.status >= 400;

    // D. Use teacher role as student
    const D = await postAssign({
      teacherId: fixtures.teachers[0].id,
      studentId: fixtures.teachers[0].id,
      subjectId: fixtures.studentWithBio.selectedIds[0],
    });
    results.D_statusCode = D.status;
    results.D_message = D.message;
    results.D_nonStudentRejected = D.status >= 400;

    // E. Non-existent teacherId
    const fakeId = '507f1f77bcf86cd799439011';
    const E = await postAssign({
      teacherId: fakeId,
      studentId: fixtures.studentWithBio.id,
      subjectId: fixtures.studentWithBio.selectedIds[0],
    });
    results.E_statusCode = E.status;
    results.E_nonExistentTeacherRejected = E.status >= 400;

    // F. Non-existent subjectId
    const F = await postAssign({
      teacherId: fixtures.teachers[0].id,
      studentId: fixtures.studentWithBio.id,
      subjectId: fakeId,
    });
    results.F_statusCode = F.status;
    results.F_nonExistentSubjectRejected = F.status >= 400;

    // G. Empty body
    const G = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const r = await fetch('http://localhost:5220/api/teacher-student-subjects', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: '{}',
      });
      return { status: r.status };
    });
    results.G_statusCode = G.status;
    results.G_emptyBodyRejected = G.status >= 400;

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();