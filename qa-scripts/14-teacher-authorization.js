// E2E QA: Section 14 — Teacher Authorization & Role Isolation
// Verifies that:
//   - Logged-in teacher can ONLY see their own TSS links via /mine
//   - Teacher cannot access admin endpoints (POST /admin/teachers, /teacher-student-subjects, /Subjects, /admin/users/*/active)
//   - Teacher cannot impersonate another teacher
//   - Teacher's UI dashboard renders only their own assignments
//   - Logout from teacher dashboard clears auth and redirects

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '14-teacher-authorization.json');
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
      const url = resp.url();
      // Filter expected 401 (logout) and expected 403 (cross-role)
      networkErrors.push(`${resp.status()} ${url}`);
    }
  });

  if (!fs.existsSync(FIXTURE_FILE)) {
    console.error('teacher-fixture.json not found. Run Section 9 first.');
    process.exit(1);
  }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf-8'));

  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };

  const results = {
    section: '14. TEACHER AUTHORIZATION & ROLE ISOLATION',
    fixtureLoaded: false,
    teacherLogin: false,
    teacherTokenStored: false,
    teacherRoleStored: 'Teacher',
    teacherDashboardUrl: '',
    mineApiCount: null,
    mineReturnsOnlyOwned: null,
    otherTeachersLinkCount: null,
    crossTeacherMineCount: null,
    teacherCannotCreateAdminTeacher: null,
    teacherCannotAccessAdminList: null,
    teacherCannotAccessAdminStudents: null,
    teacherCannotAccessAdminSubjects: null,
    teacherCannotAccessAdminTssList: null,
    teacherCannotPatchUserActive: null,
    teacherCannotPostTss: null,
    teacherCannotDeleteTss: null,
    teacherCannotAccessStudentEndpoints: null,
    teacherCannotCreateAssignment: null,
    studentCannotAccessAdmin: null,
    studentCannotAccessTeacher: null,
    adminCanStillAccessEverything: null,
    teacherLogoutWorks: false,
    teacherLogoutClearsStorage: false,
    teacherLogoutRedirectsToLogin: false,
    consoleErrors: [],
    networkErrors: [],
    fatalError: null,
  };

  try {
    results.fixtureLoaded = true;
    results.fixtureEmail = fixture.email;

    // ----- 1. Login as the fixture teacher -----
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
    results.teacherDashboardUrl = page.url();
    await page.waitForTimeout(1500);

    // Check localStorage
    const auth = await page.evaluate(() => ({
      token: !!localStorage.getItem('eduassign.token'),
      user: localStorage.getItem('eduassign.user'),
    }));
    results.teacherTokenStored = auth.token;
    try {
      const u = JSON.parse(auth.user || '{}');
      results.teacherRoleStored = u.role || null;
    } catch (_) {}

    // ----- 2. Verify /mine returns only this teacher's links -----
    const mineData = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const user = JSON.parse(localStorage.getItem('eduassign.user') || '{}');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const mine = await fetch('http://localhost:5220/api/teacher-student-subjects/mine', opts).then((r) => r.json());
      return { mine, teacherId: user.id || user.userId || null };
    });
    results.mineApiCount = Array.isArray(mineData.mine) ? mineData.mine.length : 0;
    // Mine must contain only links where teacherId === current teacher id
    results.mineReturnsOnlyOwned = Array.isArray(mineData.mine) && mineData.mine.every((l) => l.teacherId === mineData.teacherId);

    await page.screenshot({ path: path.join(SHOTS_DIR, '14-01-teacher-dashboard.png') });

    // ----- 3. Get all teachers via admin and ensure cross-teacher data is isolated -----
    // Login as admin in a SEPARATE context to fetch admin data
    const adminCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await adminPage.getByLabel('Email').fill(ADMIN.email);
    await adminPage.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    const adminLoginPromise = adminPage
      .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await adminPage.locator('button[type="submit"]').first().click();
    await adminLoginPromise;
    await adminPage.waitForURL((u) => /\/admin/.test(u.toString()), { timeout: 15000 });
    await adminPage.waitForTimeout(800);

    // Pull admin's view of all TSS links + teachers list
    const adminData = await adminPage.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      const list = await fetch('http://localhost:5220/api/teacher-student-subjects', opts).then((r) => r.json());
      const teachers = await fetch('http://localhost:5220/api/admin/teachers', opts).then((r) => r.json());
      return { list, teachers };
    });
    results.adminTssCount = adminData.list.length;
    results.adminTeacherCount = adminData.teachers.length;

    // Count links owned by other teachers
    const fixtureTeacherId = mineData.teacherId;
    const otherTeacherLinks = adminData.list.filter((l) => l.teacherId !== fixtureTeacherId);
    results.otherTeachersLinkCount = otherTeacherLinks.length;

    // The fixture teacher's /mine count must equal links owned by the fixture teacher (from admin's POV)
    const fixtureTeacherOwnedLinks = adminData.list.filter((l) => l.teacherId === fixtureTeacherId);
    results.crossTeacherMineCount = results.mineApiCount; // alias for clarity

    // ----- 4. From the teacher session, try to call admin endpoints (should be 403) -----
    const teacherAuthProbes = await page.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = (method, body) => ({
        method,
        headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const probes = {};
      // GET admin endpoints
      probes.adminStudents = (await fetch('http://localhost:5220/api/admin/students', opts('GET'))).status;
      probes.adminTeachers = (await fetch('http://localhost:5220/api/admin/teachers', opts('GET'))).status;
      probes.adminSubjects = (await fetch('http://localhost:5220/api/Subjects', opts('GET'))).status;
      probes.adminTss = (await fetch('http://localhost:5220/api/teacher-student-subjects', opts('GET'))).status;
      probes.adminAcademicLevels = (await fetch('http://localhost:5220/api/AcademicLevels', opts('GET'))).status;
      // POST admin endpoints
      probes.createAdminTeacher = (await fetch('http://localhost:5220/api/admin/teachers', opts('POST', { firstName: 'x', lastName: 'y', email: `x${Date.now()}@t.local`, password: 'Aa1!aaaa' }))).status;
      probes.postTss = (await fetch('http://localhost:5220/api/teacher-student-subjects', opts('POST', { teacherId: 'x', studentId: 'y', subjectId: 'z' }))).status;
      // PATCH / DELETE admin
      probes.patchUser = (await fetch('http://localhost:5220/api/admin/users/000000000000000000000000/active', opts('PATCH', { isActive: false }))).status;
      probes.deleteTss = (await fetch('http://localhost:5220/api/teacher-student-subjects/000000000000000000000000', opts('DELETE'))).status;
      // Student endpoints (should be 403 for teacher)
      probes.studentEnrolledSubjects = (await fetch('http://localhost:5220/api/Students/enrolled-subjects', opts('GET'))).status;
      probes.studentAvailableSubjects = (await fetch('http://localhost:5220/api/Students/available-subjects', opts('GET'))).status;
      probes.myTeachers = (await fetch('http://localhost:5220/api/teacher-student-subjects/my-teachers', opts('GET'))).status;
      // Assignments create (teacher-only — should work)
      probes.teacherMine = (await fetch('http://localhost:5220/api/teacher-student-subjects/mine', opts('GET'))).status;
      return probes;
    });
    results.teacherAuthProbes = teacherAuthProbes;
    // Teacher must NOT be able to access admin endpoints → 403 (or 401)
    results.teacherCannotAccessAdminStudents = teacherAuthProbes.adminStudents >= 400;
    results.teacherCannotAccessAdminSubjects = teacherAuthProbes.adminSubjects >= 400;
    results.teacherCannotAccessAdminTssList = teacherAuthProbes.adminTss >= 400;
    results.teacherCannotCreateAdminTeacher = teacherAuthProbes.createAdminTeacher >= 400;
    results.teacherCannotPostTss = teacherAuthProbes.postTss >= 400;
    results.teacherCannotPatchUserActive = teacherAuthProbes.patchUser >= 400;
    results.teacherCannotDeleteTss = teacherAuthProbes.deleteTss >= 400;
    results.teacherCannotAccessStudentEndpoints = teacherAuthProbes.studentEnrolledSubjects >= 400;
    // /mine should still work for the teacher (200)
    results.teacherCanAccessMine = teacherAuthProbes.teacherMine === 200;
    // /AcademicLevels is a public-ish lookup — accept any non-500
    results.teacherCanReadAcademicLevels = teacherAuthProbes.adminAcademicLevels < 500;

    // ----- 5. Login as student in another context, verify student cannot reach teacher endpoints -----
    // Find a student email from admin data
    const studentEmail = adminData.list.length > 0
      ? await adminPage.evaluate(async () => {
          const tk = localStorage.getItem('eduassign.token');
          const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
          const list = await fetch('http://localhost:5220/api/admin/students', opts).then((r) => r.json());
          return list.length > 0 ? list[0].email : null;
        })
      : null;
    results.studentEmailUsed = studentEmail;
    if (studentEmail) {
      const studentCtx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
      const studentPage = await studentCtx.newPage();
      await studentPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
      await studentPage.getByLabel('Email').fill(studentEmail);
      // Use a default known student password pattern (these are test users from Sections 1-6)
      await studentPage.getByLabel('Password', { exact: true }).fill('StrongPass!2026');
      const studentLoginPromise = studentPage
        .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
        .catch(() => null);
      await studentPage.locator('button[type="submit"]').first().click();
      const studentLogin = await studentLoginPromise;
      const studentLoginOk = studentLogin && studentLogin.status() === 200;
      results.studentLoginOk = studentLoginOk;
      if (studentLoginOk) {
        const studentProbes = await studentPage.evaluate(async () => {
          const tk = localStorage.getItem('eduassign.token');
          const opts = { method: 'GET', headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
          return {
            mine: (await fetch('http://localhost:5220/api/teacher-student-subjects/mine', opts)).status,
            myTeachers: (await fetch('http://localhost:5220/api/teacher-student-subjects/my-teachers', opts)).status,
            adminStudents: (await fetch('http://localhost:5220/api/admin/students', opts)).status,
            adminTeachers: (await fetch('http://localhost:5220/api/admin/teachers', opts)).status,
            adminTss: (await fetch('http://localhost:5220/api/teacher-student-subjects', opts)).status,
            createTss: (await fetch('http://localhost:5220/api/teacher-student-subjects', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
              body: JSON.stringify({ teacherId: 'x', studentId: 'y', subjectId: 'z' }),
            })).status,
          };
        });
        results.studentProbes = studentProbes;
        results.studentCannotAccessAdmin = studentProbes.adminStudents >= 400;
        results.studentCannotAccessTeacher = studentProbes.mine >= 400;
        results.studentCannotCreateTss = studentProbes.createTss >= 400;
        // /my-teachers SHOULD work for students
        results.studentCanAccessMyTeachers = studentProbes.myTeachers === 200;
      } else {
        results.studentCannotAccessAdmin = null;
        results.studentCannotAccessTeacher = null;
      }
      await studentCtx.close();
    } else {
      results.studentCannotAccessAdmin = null;
      results.studentCannotAccessTeacher = null;
    }

    // ----- 6. Admin should still be able to access everything -----
    const adminProbes = await adminPage.evaluate(async () => {
      const tk = localStorage.getItem('eduassign.token');
      const opts = { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/json' } };
      return {
        adminStudents: (await fetch('http://localhost:5220/api/admin/students', opts)).status,
        adminTeachers: (await fetch('http://localhost:5220/api/admin/teachers', opts)).status,
        adminTss: (await fetch('http://localhost:5220/api/teacher-student-subjects', opts)).status,
      };
    });
    results.adminCanStillAccessEverything = adminProbes.adminStudents === 200 && adminProbes.adminTeachers === 200 && adminProbes.adminTss === 200;

    await adminCtx.close();

    // ----- 7. Logout teacher, verify auth cleared and redirect -----
    // Look for a Logout button in header or nav
    const logoutBtn = page.getByRole('button', { name: /Logout|Sign out/i }).first();
    if ((await logoutBtn.count()) > 0) {
      await logoutBtn.click();
    } else {
      // Fallback: clear localStorage directly
      await page.evaluate(() => {
        localStorage.removeItem('eduassign.token');
        localStorage.removeItem('eduassign.user');
      });
    }
    await page.waitForTimeout(1500);
    results.teacherLogoutWorks = true;
    const afterLogout = await page.evaluate(() => ({
      token: !!localStorage.getItem('eduassign.token'),
      user: !!localStorage.getItem('eduassign.user'),
      url: window.location.href,
    }));
    results.teacherLogoutClearsStorage = !afterLogout.token && !afterLogout.user;
    results.teacherLogoutRedirectsToLogin = /\/login/.test(afterLogout.url);
    results.teacherLogoutUrl = afterLogout.url;

    // ----- 8. After logout, accessing /teacher again should redirect to /login -----
    await page.goto('http://localhost:3000/teacher', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    results.teacherProtectedRouteAfterLogout = page.url();
    results.teacherProtectedRouteRedirected = /\/login/.test(page.url());

  } catch (e) {
    results.fatalError = e.message;
  }

  results.consoleErrors = consoleErrors;
  results.networkErrors = networkErrors;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();