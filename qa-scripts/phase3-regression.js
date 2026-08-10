// Phase 3 regression: teacher + student with explicit error tracking
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase3-dashboard.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');

(async () => {
  const browser = await chromium.launch();
  const report = JSON.parse(fs.readFileSync(RESULT_FILE, 'utf8'));

  const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };

  async function freshContext(viewport) {
    return browser.newContext({ viewport });
  }

  async function loginVia(page, creds) {
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    return page.evaluate(async (args) => {
      const r = await fetch('http://localhost:5220/api/Auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      const txt = await r.text();
      let j = {};
      try { j = JSON.parse(txt); } catch (_) {}
      if (j && j.token) {
        localStorage.setItem('eduassign.token', j.token);
        localStorage.setItem('eduassign.user', JSON.stringify(j.user || {}));
      }
      return { ok: r.ok, role: j && j.user && j.user.role, token: j.token };
    }, creds);
  }

  try {
    // ---- TEACHER DESKTOP ----
    {
      const unique = Date.now();
      const teacherEmail = 'p3teacher+' + unique + '@test.local';
      const teacherPassword = 'Teacher@12345';
      const ctx = await freshContext({ width: 1440, height: 900 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !/Warning:|hydrat/i.test(msg.text())) errors.push('console: ' + msg.text());
      });

      const adminLogin = await loginVia(page, ADMIN);
      if (!adminLogin.ok) throw new Error('Admin login failed for teacher setup');

      const levels = await page.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        return fetch('http://localhost:5220/api/AcademicLevels', { headers: { Authorization: 'Bearer ' + tk } }).then((r) => r.json());
      });
      const schoolLevel = levels.find((l) => l.name && l.name.indexOf('School') !== -1) || levels[0];

      const teacherCreate = await page.evaluate(async (args) => {
        const tk = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/admin/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
          body: JSON.stringify({
            firstName: 'Phase',
            lastName: 'Teacher',
            email: args.email,
            password: args.password,
            phoneNumber: '01700000000',
            academicLevelId: args.levelId,
          }),
        });
        const txt = await r.text();
        let j = {};
        try { j = JSON.parse(txt); } catch (_) {}
        return { status: r.status, body: j, id: (j && (j.id || j._id)) || null };
      }, { email: teacherEmail, password: teacherPassword, levelId: schoolLevel.id });

      const teacherLogin = await loginVia(page, { email: teacherEmail, password: teacherPassword });
      report.teacher.login = { ok: teacherLogin.ok, email: teacherEmail, teacherCreated: teacherCreate.status };

      if (teacherLogin.ok && teacherLogin.role === 'Teacher') {
        await page.goto('http://localhost:3000/teacher', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        await page.screenshot({ path: path.join(SHOTS_DIR, 'phase3_teacher_1440x900.png') });
        report.teacher.dashboard = { url: page.url(), horizontalOverflow: overflow, errors: errors.slice() };
      } else {
        report.teacher.dashboard = { error: 'teacher login not ok', teacherLogin };
      }

      // Cleanup: deactivate teacher
      if (teacherCreate.id) {
        const reAdmin = await loginVia(page, ADMIN);
        if (reAdmin.ok) {
          await page.evaluate(async (args) => {
            const tk = localStorage.getItem('eduassign.token');
            await fetch('http://localhost:5220/api/admin/users/' + args.id + '/active', {
              method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
              body: JSON.stringify({ isActive: false }),
            });
          }, { id: teacherCreate.id });
        }
      }
      await ctx.close();
    }

    // ---- STUDENT MOBILE ----
    {
      const unique = Date.now();
      const studentEmail = 'p3student+' + unique + '@test.local';
      const studentPassword = 'Student@12345';
      const ctx = await freshContext({ width: 390, height: 844 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !/Warning:|hydrat/i.test(msg.text())) errors.push('console: ' + msg.text());
      });

      const adminLogin = await loginVia(page, ADMIN);
      if (!adminLogin.ok) throw new Error('Admin login failed for student setup');

      const levels = await page.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        return fetch('http://localhost:5220/api/AcademicLevels', { headers: { Authorization: 'Bearer ' + tk } }).then((r) => r.json());
      });
      const schoolLevel = levels.find((l) => l.name && l.name.indexOf('School') !== -1) || levels[0];

      const studentReg = await page.evaluate(async (args) => {
        const r = await fetch('http://localhost:5220/api/Auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Phase',
            lastName: 'Student',
            email: args.email,
            password: args.password,
            confirmPassword: args.password,
            phoneNumber: '01700000000',
            role: 'Student',
            academicLevelId: args.levelId,
          }),
        });
        const txt = await r.text();
        let j = {};
        try { j = JSON.parse(txt); } catch (_) {}
        return { status: r.status, body: j, id: (j && (j.user && (j.user.id || j.user._id))) || null };
      }, { email: studentEmail, password: studentPassword, levelId: schoolLevel.id });

      const studentLogin = await loginVia(page, { email: studentEmail, password: studentPassword });
      report.student.login = { ok: studentLogin.ok, email: studentEmail, studentRegistered: studentReg.status };

      if (studentLogin.ok && studentLogin.role === 'Student') {
        await page.goto('http://localhost:3000/student', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        await page.screenshot({ path: path.join(SHOTS_DIR, 'phase3_student_390x844.png') });
        report.student.dashboard = { url: page.url(), horizontalOverflow: overflow, errors: errors.slice() };
      } else {
        report.student.dashboard = { error: 'student login not ok', studentLogin, studentReg };
      }
      await ctx.close();
    }

    report.error = null;
    report.finishedAt = new Date().toISOString();
    let pass = true;
    for (const vp of Object.values(report.viewports)) {
      if (vp.consoleErrors && vp.consoleErrors.length > 0) pass = false;
      if (vp.networkErrors && vp.networkErrors.length > 0) pass = false;
      if (vp.routes) {
        for (const r of Object.values(vp.routes)) {
          if (r.horizontalOverflow) pass = false;
        }
      }
    }
    if (report.crud.subjects) {
      if (!report.crud.subjects.createdVisibleInList) pass = false;
    }
    if (report.teacher.dashboard && report.teacher.dashboard.horizontalOverflow !== undefined) {
      if (report.teacher.dashboard.horizontalOverflow || (report.teacher.dashboard.errors || []).length > 0) pass = false;
    }
    if (report.student.dashboard && report.student.dashboard.horizontalOverflow !== undefined) {
      if (report.student.dashboard.horizontalOverflow || (report.student.dashboard.errors || []).length > 0) pass = false;
    }
    report.pass = pass;
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      pass: report.pass,
      teacher: report.teacher.login,
      teacherDash: report.teacher.dashboard,
      student: report.student.login,
      studentDash: report.student.dashboard,
    }, null, 2));
  } catch (err) {
    report.error = err && err.message;
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.error('REGRESSION ERROR:', err && err.message);
  } finally {
    await browser.close();
  }
})();