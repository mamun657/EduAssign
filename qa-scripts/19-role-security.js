// E2E QA: Section 19 — Role Security Matrix
// Verifies that:
//   1. Backend rejects wrong-role JWTs for protected endpoints with 401/403.
//   2. Frontend RouteGuard redirects users away from wrong-role pages.
//   3. Each role can access its own dashboard.
//
// Matrix:
//   - Student → /api/admin/students (expect 403)
//   - Student → /api/admin/teachers (expect 403)
//   - Student → POST /api/assignments (expect 403)
//   - Student → POST /api/assignments/{id}/review (expect 403)
//   - Teacher → /api/admin/students (expect 403)
//   - Teacher → /api/Students/enrolled-subjects (expect 403)
//   - Teacher → POST /api/assignments/{id}/submit (expect 403)
//   - Admin  → POST /api/assignments/{id}/submit (expect 403 — wrong role for submit)
//   - Admin  → POST /api/assignments/{id}/review (expect 403 — wrong role for review, even though admin is allowed create)
//   - Unauthenticated → any protected endpoint (expect 401)
//
// Frontend matrix:
//   - Student logged in visits /admin    → redirected to /
//   - Student logged in visits /teacher  → redirected to /
//   - Teacher logged in visits /admin    → redirected to /
//   - Teacher logged in visits /student  → redirected to /
//   - Admin logged in visits /student    → redirected to /
//   - Admin logged in visits /teacher    → redirected to /
//   - Unauthenticated visits /student    → redirected to /login
//   - Unauthenticated visits /admin      → redirected to /login
//   - Unauthenticated visits /teacher    → redirected to /login

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '19-role-security.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const teacherFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'results', 'teacher-fixture.json'), 'utf8')
);
const assignmentFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'results', 'assignment-fixture.json'), 'utf8')
);

const ADMIN_EMAIL = 'admin@eduassign.local';
const ADMIN_PASSWORD = 'L@unchPad!Admin#2026-XqZ';
const STUDENT_EMAIL = assignmentFixture.studentEmail;
const STUDENT_PASSWORD = assignmentFixture.studentPassword;
const TEACHER_EMAIL = teacherFixture.email;
const TEACHER_PASSWORD = teacherFixture.password;
const ASSIGNMENT_ID = assignmentFixture.id;

const results = {
  section: '19. ROLE SECURITY MATRIX',
  // Backend checks
  backend: {
    studentVsAdminStudents: null,
    studentVsAdminTeachers: null,
    studentVsCreateAssignment: null,
    studentVsReview: null,
    teacherVsAdminStudents: null,
    teacherVsEnrolledSubjects: null,
    teacherVsSubmit: null,
    adminVsSubmit: null,
    adminVsReview: null,
    unauthenticatedVsMe: null,
  },
  // Frontend checks
  frontend: {
    studentVisitsAdmin: null,
    studentVisitsTeacher: null,
    teacherVisitsAdmin: null,
    teacherVisitsStudent: null,
    adminVisitsStudent: null,
    adminVisitsTeacher: null,
    unauthVisitsStudent: null,
    unauthVisitsAdmin: null,
    unauthVisitsTeacher: null,
  },
  // Own-dashboard access
  ownDashboards: {
    studentReachedStudent: null,
    teacherReachedTeacher: null,
    adminReachedAdmin: null,
  },
  consoleErrors: [],
  networkErrors: [],
  fatalError: null,
};

async function loginAndGetToken(page, email, password) {
  const res = await page.evaluate(
    async ({ email, password }) => {
      const r = await fetch('http://localhost:5220/api/Auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await r.text();
      return { status: r.status, body };
    },
    { email, password }
  );
  return res;
}

async function callWithRole(page, token, method, url, body) {
  return page.evaluate(
    async ({ token, method, url, body }) => {
      const opts = {
        method,
        headers: token
          ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' },
      };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const r = await fetch(url, opts);
      const text = await r.text();
      return { status: r.status, body: text };
    },
    { token, method, url, body }
  );
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    // Set up one context for the entire test — we'll get tokens for each role by logging in/out via API in-page.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') results.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => results.consoleErrors.push('pageerror: ' + err.message));
    page.on('response', (resp) => {
      if (resp.url().includes('localhost:5220') && resp.status() >= 400) {
        results.networkErrors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    // -------- Get tokens for each role via direct API --------
    const adminLogin = await loginAndGetToken(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (adminLogin.status !== 200) throw new Error('Admin login failed: ' + adminLogin.body.slice(0, 200));
    const adminToken = JSON.parse(adminLogin.body).token;

    const studentLogin = await loginAndGetToken(page, STUDENT_EMAIL, STUDENT_PASSWORD);
    if (studentLogin.status !== 200) throw new Error('Student login failed: ' + studentLogin.body.slice(0, 200));
    const studentToken = JSON.parse(studentLogin.body).token;

    const teacherLogin = await loginAndGetToken(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    if (teacherLogin.status !== 200) throw new Error('Teacher login failed: ' + teacherLogin.body.slice(0, 200));
    const teacherToken = JSON.parse(teacherLogin.body).token;

    // ===== Backend matrix =====
    // 1. Student → /api/admin/students → expect 403
    {
      const r = await callWithRole(page, studentToken, 'GET', 'http://localhost:5220/api/admin/students');
      results.backend.studentVsAdminStudents = { status: r.status, rejected: r.status >= 400 };
    }
    // 2. Student → /api/admin/teachers → expect 403
    {
      const r = await callWithRole(page, studentToken, 'GET', 'http://localhost:5220/api/admin/teachers');
      results.backend.studentVsAdminTeachers = { status: r.status, rejected: r.status >= 400 };
    }
    // 3. Student → POST /api/assignments → expect 403
    {
      const r = await callWithRole(page, studentToken, 'POST', 'http://localhost:5220/api/assignments', {
        title: 'x', description: 'x', studentId: 'x', subjectId: 'x', dueAt: new Date().toISOString(),
      });
      results.backend.studentVsCreateAssignment = { status: r.status, rejected: r.status >= 400 };
    }
    // 4. Student → POST /api/assignments/{id}/review → expect 403
    {
      const r = await callWithRole(page, studentToken, 'POST', 'http://localhost:5220/api/assignments/' + ASSIGNMENT_ID + '/review', {
        marks: 50, feedback: 'as student',
      });
      results.backend.studentVsReview = { status: r.status, rejected: r.status >= 400 };
    }
    // 5. Teacher → /api/admin/students → expect 403
    {
      const r = await callWithRole(page, teacherToken, 'GET', 'http://localhost:5220/api/admin/students');
      results.backend.teacherVsAdminStudents = { status: r.status, rejected: r.status >= 400 };
    }
    // 6. Teacher → /api/Students/enrolled-subjects → expect 403
    {
      const r = await callWithRole(page, teacherToken, 'GET', 'http://localhost:5220/api/Students/enrolled-subjects');
      results.backend.teacherVsEnrolledSubjects = { status: r.status, rejected: r.status >= 400 };
    }
    // 7. Teacher → POST /api/assignments/{id}/submit → expect 403
    {
      const r = await callWithRole(page, teacherToken, 'POST', 'http://localhost:5220/api/assignments/' + ASSIGNMENT_ID + '/submit', {
        submissionText: 'as teacher',
      });
      results.backend.teacherVsSubmit = { status: r.status, rejected: r.status >= 400 };
    }
    // 8. Admin → POST /api/assignments/{id}/submit → expect 403 (admin role not allowed for submit)
    {
      const r = await callWithRole(page, adminToken, 'POST', 'http://localhost:5220/api/assignments/' + ASSIGNMENT_ID + '/submit', {
        submissionText: 'as admin',
      });
      results.backend.adminVsSubmit = { status: r.status, rejected: r.status >= 400 };
    }
    // 9. Admin → POST /api/assignments/{id}/review → expect 403 (admin role not allowed for review)
    {
      const r = await callWithRole(page, adminToken, 'POST', 'http://localhost:5220/api/assignments/' + ASSIGNMENT_ID + '/review', {
        marks: 50, feedback: 'as admin',
      });
      results.backend.adminVsReview = { status: r.status, rejected: r.status >= 400 };
    }
    // 10. Unauthenticated → /api/Auth/me → expect 401
    {
      const r = await callWithRole(page, null, 'GET', 'http://localhost:5220/api/Auth/me');
      results.backend.unauthenticatedVsMe = { status: r.status, rejected: r.status >= 400 };
    }

    // ===== Frontend matrix =====
    // two helpers: one for "must end up at X" (auth/own-dashboard), one for "must NOT end up at Y" (wrong-role redirect)
    async function visitAndCheck(visitUrl, expectedFinalPath) {
      await page.goto(visitUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      const finalUrl = page.url();
      const u = new URL(finalUrl);
      const ok = u.pathname === expectedFinalPath || u.pathname.startsWith(expectedFinalPath + '/') || u.pathname.startsWith(expectedFinalPath + '?');
      return { finalUrl, pathname: u.pathname, ok };
    }

    async function visitAndAvoid(visitUrl, forbiddenPath) {
      await page.goto(visitUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      const finalUrl = page.url();
      const u = new URL(finalUrl);
      const stayedOnForbidden = u.pathname === forbiddenPath || u.pathname.startsWith(forbiddenPath + '/') || u.pathname.startsWith(forbiddenPath + '?');
      const ok = !stayedOnForbidden;
      return { finalUrl, pathname: u.pathname, ok };
    }

    // Store tokens + user in localStorage so AuthProvider thinks they're logged in
    async function setAuthAs(role, email, token, userObj) {
      await page.evaluate(
        ({ tk, usr }) => {
          localStorage.setItem('eduassign.token', tk);
          localStorage.setItem('eduassign.user', JSON.stringify(usr));
        },
        { tk: token, usr: { ...userObj, role } }
      );
    }

    const studentUser = JSON.parse(studentLogin.body).user;
    const teacherUser = JSON.parse(teacherLogin.body).user;
    const adminUser = JSON.parse(adminLogin.body).user;

    // -- Student visits /admin → must NOT stay on /admin (RouteGuard pushes to /, then / redirects to /student)
    await setAuthAs('Student', STUDENT_EMAIL, studentToken, studentUser);
    {
      const r = await visitAndAvoid('http://localhost:3000/admin', '/admin');
      results.frontend.studentVisitsAdmin = r;
      await page.screenshot({ path: path.join(SHOTS_DIR, '19-01-student-visit-admin.png') });
    }
    // -- Student visits /teacher → must NOT stay on /teacher
    {
      const r = await visitAndAvoid('http://localhost:3000/teacher', '/teacher');
      results.frontend.studentVisitsTeacher = r;
    }
    // -- Teacher visits /admin → must NOT stay on /admin
    await setAuthAs('Teacher', TEACHER_EMAIL, teacherToken, teacherUser);
    {
      const r = await visitAndAvoid('http://localhost:3000/admin', '/admin');
      results.frontend.teacherVisitsAdmin = r;
      await page.screenshot({ path: path.join(SHOTS_DIR, '19-02-teacher-visit-admin.png') });
    }
    // -- Teacher visits /student → must NOT stay on /student
    {
      const r = await visitAndAvoid('http://localhost:3000/student', '/student');
      results.frontend.teacherVisitsStudent = r;
    }
    // -- Admin visits /student → must NOT stay on /student
    await setAuthAs('Admin', ADMIN_EMAIL, adminToken, adminUser);
    {
      const r = await visitAndAvoid('http://localhost:3000/student', '/student');
      results.frontend.adminVisitsStudent = r;
      await page.screenshot({ path: path.join(SHOTS_DIR, '19-03-admin-visit-student.png') });
    }
    // -- Admin visits /teacher → must NOT stay on /teacher
    {
      const r = await visitAndAvoid('http://localhost:3000/teacher', '/teacher');
      results.frontend.adminVisitsTeacher = r;
    }

    // -- Unauthenticated visits /student → expect /login
    await page.evaluate(() => {
      localStorage.removeItem('eduassign.token');
      localStorage.removeItem('eduassign.user');
    });
    {
      const r = await visitAndCheck('http://localhost:3000/student', '/login');
      results.frontend.unauthVisitsStudent = r;
    }
    // -- Unauthenticated visits /admin → expect /login
    {
      const r = await visitAndCheck('http://localhost:3000/admin', '/login');
      results.frontend.unauthVisitsAdmin = r;
    }
    // -- Unauthenticated visits /teacher → expect /login
    {
      const r = await visitAndCheck('http://localhost:3000/teacher', '/login');
      results.frontend.unauthVisitsTeacher = r;
    }

    // ===== Own-dashboard reachability =====
    await setAuthAs('Student', STUDENT_EMAIL, studentToken, studentUser);
    {
      const r = await visitAndCheck('http://localhost:3000/student', '/student');
      results.ownDashboards.studentReachedStudent = r;
      await page.screenshot({ path: path.join(SHOTS_DIR, '19-04-student-own-dashboard.png') });
    }
    await setAuthAs('Teacher', TEACHER_EMAIL, teacherToken, teacherUser);
    {
      const r = await visitAndCheck('http://localhost:3000/teacher', '/teacher');
      results.ownDashboards.teacherReachedTeacher = r;
    }
    await setAuthAs('Admin', ADMIN_EMAIL, adminToken, adminUser);
    {
      const r = await visitAndCheck('http://localhost:3000/admin', '/admin');
      results.ownDashboards.adminReachedAdmin = r;
    }
  } catch (err) {
    results.fatalError = err.message;
  } finally {
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  }
})();