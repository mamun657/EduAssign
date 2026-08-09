// E2E QA: Section 23 — Complete Final E2E Scenario
// Full end-to-end happy path:
//   1. Register a fresh student via UI → auto-login → /student
//   2. Register a fresh teacher via UI
//   3. Admin logs in
//   4. Admin links teacher → student → subject
//   5. Student logs in, sees enrolled subject
//   6. Student picks optional subject (if available), enrolls
//   7. Teacher logs in
//   8. Teacher creates assignment (via API since UI may not expose full form)
//   9. Teacher publishes assignment
//  10. Student logs in, sees the new assignment
//  11. Student submits work (via API)
//  12. Teacher logs in, reviews submission (via API) with marks + feedback
//  13. Student logs in, sees Reviewed status with marks and feedback
//  14. Logout, verify cleared
//
// Goal: complete a brand-new assignment cycle from registration to reviewed in a single run.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', '23-full-e2e.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const ADMIN_EMAIL = 'admin@eduassign.local';
const ADMIN_PASSWORD = 'L@unchPad!Admin#2026-XqZ';

const results = {
  section: '23. COMPLETE FINAL E2E SCENARIO',
  steps: {},
  consoleErrors: [],
  networkErrors: [],
  fatalError: null,
};

async function api(page, method, url, body, token) {
  return page.evaluate(
    async ({ method, url, body, token }) => {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
      const r = await fetch(url, opts);
      const text = await r.text();
      return { status: r.status, body: text };
    },
    { method, url, body, token }
  );
}

async function loginViaUI(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const respP = page.waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 10000 });
  await page.locator('button[type="submit"]').first().click();
  await respP;
  await page.waitForTimeout(1500);
}

async function registerViaUI(page, role, data) {
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.getByLabel('First name').fill(data.firstName);
  await page.getByLabel('Last name').fill(data.lastName);
  await page.getByLabel('Email').fill(data.email);
  await page.getByLabel('Phone', { exact: false }).fill(data.phone);
  await page.getByLabel('Password', { exact: true }).fill(data.password);
  await page.getByLabel('Confirm password', { exact: false }).fill(data.password);
  // role select
  const roleSelect = page.locator('select').first();
  if (await roleSelect.count() > 0) {
    await roleSelect.selectOption(role);
  }
  if (role === 'Student' && data.academicLevelLabel) {
    const levelSelect = page.locator('select').nth(1);
    if (await levelSelect.count() > 0) {
      await levelSelect.selectOption({ label: data.academicLevelLabel });
    }
  }
  const respP = page.waitForResponse((r) => /\/Auth\/register/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 });
  await page.locator('button[type="submit"]').first().click();
  const resp = await respP;
  await page.waitForTimeout(2000);
  return resp ? resp.status() : null;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let adminToken = null;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') results.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => results.consoleErrors.push('pageerror: ' + err.message));
    page.on('response', (resp) => {
      if (resp.url().includes('localhost:5220') && resp.status() >= 500) {
        results.networkErrors.push(`${resp.status()} ${resp.url()}`);
      }
    });

    const unique = Date.now();

    // ===== Step 1: Register a fresh student via UI =====
    const student = {
      firstName: 'Sara',
      lastName: 'Khan',
      email: `sara.khan+${unique}@test.local`,
      phone: '01711000001',
      password: 'StrongPass!2026',
      academicLevelLabel: 'School',
    };
    {
      const status = await registerViaUI(page, 'Student', student);
      const finalUrl = page.url();
      results.steps.step1_registerStudent = {
        status, finalUrl, reachedDashboard: finalUrl.includes('/student'),
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-01-student-registered.png') });
    }

    // ===== Step 2: Register a fresh teacher via UI =====
    const teacher = {
      firstName: 'Imran',
      lastName: 'Hossain',
      email: `imran.hossain+${unique}@test.local`,
      phone: '01711000002',
      password: 'TeachPass!2026',
    };
    {
      const status = await registerViaUI(page, 'Teacher', teacher);
      const finalUrl = page.url();
      results.steps.step2_registerTeacher = {
        status, finalUrl, reachedDashboard: finalUrl.includes('/teacher'),
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-02-teacher-registered.png') });
    }

    // ===== Step 3: Admin logs in =====
    {
      await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      const finalUrl = page.url();
      const adminLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      if (adminLogin.status === 200) adminToken = JSON.parse(adminLogin.body).token;
      results.steps.step3_adminLogin = {
        finalUrl,
        reachedAdmin: finalUrl.includes('/admin'),
        adminTokenAcquired: !!adminToken,
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-03-admin-logged-in.png') });
    }

    // ===== Step 4: Admin links teacher → student → subject =====
    let teacherId, studentId, subjectId;
    {
      // Need IDs first. Look up teacher/student by listing
      const teachersRes = await api(page, 'GET', 'http://localhost:5220/api/admin/teachers', null, adminToken);
      let teachers = [];
      try { teachers = JSON.parse(teachersRes.body); } catch (_) {}
      const t = teachers.find((u) => u.email === teacher.email);
      teacherId = t?.id;

      const studentsRes = await api(page, 'GET', 'http://localhost:5220/api/admin/students', null, adminToken);
      let students = [];
      try { students = JSON.parse(studentsRes.body); } catch (_) {}
      const s = students.find((u) => u.email === student.email);
      studentId = s?.id;

      // Get academic level id for the student
      const levelId = s?.academicLevelId;
      // Get a subject for this level
      const subjectsRes = await api(page, 'GET', 'http://localhost:5220/api/Subjects', null, adminToken);
      let subjects = [];
      try { subjects = JSON.parse(subjectsRes.body); } catch (_) {}
      // Pick a Biology or any subject for school
      const sub = subjects.find((x) => x.code === 'BIO' || x.code === 'PHY' || x.code === 'MATH') || subjects[0];
      subjectId = sub?.id;

      results.steps.step4a_resolvedIds = { teacherId, studentId, subjectId, levelId };

      // Create the link
      const linkRes = await api(page, 'POST', 'http://localhost:5220/api/teacher-student-subjects', {
        teacherId, studentId, subjectId,
      }, adminToken);
      results.steps.step4b_createdLink = {
        status: linkRes.status,
        created: linkRes.status === 200 || linkRes.status === 201,
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-04-link-created.png') });
    }

    // ===== Step 5: Student logs in, sees enrolled subject =====
    {
      await loginViaUI(page, student.email, student.password);
      await page.waitForURL(/\/student/, { timeout: 10000 });
      await page.waitForTimeout(2000);
      const bodyText = (await page.locator('body').textContent()) || '';
      results.steps.step5_studentSeesEnrolled = {
        finalUrl: page.url(),
        reachedStudent: page.url().includes('/student'),
        hasBiologyOrSubjects: /biology|physics|math|subject/i.test(bodyText),
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-05-student-enrolled.png') });
    }

    // ===== Step 6: Student picks optional subject (if available) =====
    // Check available subjects — pick one if present
    {
      const studentLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', { email: student.email, password: student.password });
      const sToken = JSON.parse(studentLogin.body).token;
      const availRes = await api(page, 'GET', 'http://localhost:5220/api/Students/available-subjects', null, sToken);
      let avail = null;
      try { avail = JSON.parse(availRes.body); } catch (_) {}
      const candidates = avail?.compulsory?.concat(avail?.electives?.flatMap((g) => g.subjects) || []) || [];
      // Skip — we already have a Biology-style link from step 4
      results.steps.step6_studentOptionalEnrollment = {
        availableSubjects: candidates.length,
        skipped: 'compulsory link already created in step 4',
      };
    }

    // ===== Step 7: Teacher logs in =====
    {
      await loginViaUI(page, teacher.email, teacher.password);
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
      await page.waitForTimeout(2000);
      const bodyText = (await page.locator('body').textContent()) || '';
      results.steps.step7_teacherLogin = {
        finalUrl: page.url(),
        reachedTeacher: page.url().includes('/teacher'),
        bodyLoaded: bodyText.length > 100,
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-07-teacher-logged-in.png') });
    }

    // ===== Step 8: Teacher creates assignment via API =====
    let assignmentId;
    {
      const teacherLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', { email: teacher.email, password: teacher.password });
      const tToken = JSON.parse(teacherLogin.body).token;
      const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const createRes = await api(page, 'POST', 'http://localhost:5220/api/assignments', {
        title: 'E2E Final — Algebra Quiz',
        description: 'Complete exercises 1-10 from chapter 3.',
        studentId, subjectId, dueAt,
      }, tToken);
      results.steps.step8_createAssignment = { status: createRes.status };
      let body = null;
      try { body = JSON.parse(createRes.body); } catch (_) {}
      assignmentId = body?.id;
      results.steps.step8_createAssignment.assignmentId = assignmentId;
    }

    // ===== Step 9: Teacher publishes assignment =====
    {
      const teacherLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', { email: teacher.email, password: teacher.password });
      const tToken = JSON.parse(teacherLogin.body).token;
      const pubRes = await api(page, 'POST', `http://localhost:5220/api/assignments/${assignmentId}/publish`, null, tToken);
      results.steps.step9_publish = { status: pubRes.status, published: pubRes.status === 200 };
    }

    // ===== Step 10: Student logs in, sees the new assignment =====
    {
      await loginViaUI(page, student.email, student.password);
      await page.waitForURL(/\/student/, { timeout: 10000 });
      await page.waitForTimeout(3000); // wait for assignments to load
      const bodyText = (await page.locator('body').textContent()) || '';
      const seesAssignment = /Algebra Quiz|E2E Final/i.test(bodyText);
      results.steps.step10_studentSeesAssignment = {
        finalUrl: page.url(),
        reachedStudent: page.url().includes('/student'),
        seesAssignment,
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-10-student-sees-assignment.png') });
    }

    // ===== Step 11: Student submits work via API =====
    {
      const studentLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', { email: student.email, password: student.password });
      const sToken = JSON.parse(studentLogin.body).token;
      const subRes = await api(page, 'POST', `http://localhost:5220/api/assignments/${assignmentId}/submit`, {
        submissionText: 'My answers: 1) x=2, 2) y=5, 3) z=10...',
      }, sToken);
      results.steps.step11_submit = { status: subRes.status, submitted: subRes.status === 200 };
    }

    // ===== Step 12: Teacher reviews with marks + feedback =====
    {
      const teacherLogin = await api(page, 'POST', 'http://localhost:5220/api/Auth/login', { email: teacher.email, password: teacher.password });
      const tToken = JSON.parse(teacherLogin.body).token;
      const revRes = await api(page, 'POST', `http://localhost:5220/api/assignments/${assignmentId}/review`, {
        marks: 92,
        feedback: 'Excellent work — clear reasoning throughout.',
      }, tToken);
      results.steps.step12_review = { status: revRes.status, reviewed: revRes.status === 200 };
    }

    // ===== Step 13: Student logs in, sees Reviewed status with marks and feedback =====
    {
      await loginViaUI(page, student.email, student.password);
      await page.waitForURL(/\/student/, { timeout: 10000 });
      await page.waitForTimeout(3000);
      const bodyText = (await page.locator('body').textContent()) || '';
      results.steps.step13_studentSeesReviewed = {
        finalUrl: page.url(),
        reachedStudent: page.url().includes('/student'),
        seesReviewed: /reviewed|92|Excellent/i.test(bodyText),
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-13-student-reviewed.png') });
    }

    // ===== Step 14: Logout =====
    {
      const logoutBtn = page.locator('button:has-text("Sign out"), a:has-text("Sign out"), button:has-text("Logout"), button:has-text("Log out")').first();
      const hasLogout = await logoutBtn.count() > 0;
      if (hasLogout) {
        await logoutBtn.click();
        await page.waitForTimeout(1500);
      } else {
        await page.evaluate(() => { localStorage.clear(); });
      }
      const finalUrl = page.url();
      const clearedToken = await page.evaluate(() => !localStorage.getItem('eduassign.token'));
      results.steps.step14_logout = {
        finalUrl,
        reachedLogin: finalUrl.includes('/login'),
        clearedToken,
      };
      await page.screenshot({ path: path.join(SHOTS_DIR, '23-14-after-logout.png') });
    }

    // Save fixture for any future runs that might want to use this fresh assignment
    fs.writeFileSync(path.join(__dirname, 'results', '23-e2e-fixture.json'), JSON.stringify({
      student, teacher, assignmentId, teacherId, studentId, subjectId,
    }, null, 2));
  } catch (err) {
    results.fatalError = err.message;
  } finally {
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  }
})();