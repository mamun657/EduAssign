// E2E QA: Phase 3 — single mobile viewport (375x812) + CRUD + teacher + student
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase3-dashboard.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots');
const ADMIN = { email: 'admin@eduassign.local', password: 'L@unchPad!Admin#2026-XqZ' };

function slugify(s) {
  return String(s).replace(/[^a-z0-9]+/gi, '_');
}

(async () => {
  const browser = await chromium.launch();
  const existing = JSON.parse(fs.readFileSync(RESULT_FILE, 'utf8'));
  const report = existing;

  try {
    // ---- 375x812 ----
    {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const page = await ctx.newPage();
      const errors = [];
      const netErrors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const t = msg.text();
          if (/Warning:|hydrat/i.test(t)) return;
          errors.push('console: ' + t);
        }
      });
      page.on('response', (res) => {
        const url = res.url();
        if ((url.indexOf('localhost:3000') !== -1 || url.indexOf('localhost:5220') !== -1) && res.status() >= 500) {
          netErrors.push(res.status() + ' ' + res.request().method() + ' ' + url);
        }
      });

      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const login = await page.evaluate(async (args) => {
        const r = await fetch('http://localhost:5220/api/Auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: args.email, password: args.password }),
        });
        const j = await r.json();
        if (j && j.token) {
          localStorage.setItem('eduassign.token', j.token);
          localStorage.setItem('eduassign.user', JSON.stringify(j.user || {}));
        }
        return { ok: r.ok, status: r.status, role: j && j.user && j.user.role };
      }, ADMIN);

      const vpReport = { login: login, routes: {}, consoleErrors: [], networkErrors: [] };
      if (login.ok) {
        const routes = [
          '/admin', '/admin/students', '/admin/teachers', '/admin/subjects',
          '/admin/curriculum', '/admin/teacher-student-subject', '/admin/assignments', '/admin/submissions',
        ];
        for (const route of routes) {
          await page.goto('http://localhost:3000' + route, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1500);
          const horizontalOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1
          );
          const shotPath = path.join(SHOTS_DIR, 'phase3_' + slugify(route) + '_375x812.png');
          await page.screenshot({ path: shotPath, fullPage: false });
          const bodyText = (await page.locator('body').innerText()).slice(0, 4000);
          vpReport.routes[route] = {
            horizontalOverflow: horizontalOverflow,
            bodyHasContent: bodyText.length > 100,
            snippet: bodyText.slice(0, 200),
          };
        }
      }
      vpReport.consoleErrors = errors.slice();
      vpReport.networkErrors = netErrors.slice();
      report.viewports['375x812'] = vpReport;
      await ctx.close();
    }

    // ---- SUBJECT CRUD ----
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto('http://localhost:3000/login');
      await page.waitForTimeout(600);
      await page.evaluate(async (args) => {
        const r = await fetch('http://localhost:5220/api/Auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: args.email, password: args.password }),
        });
        const j = await r.json();
        localStorage.setItem('eduassign.token', j.token);
        localStorage.setItem('eduassign.user', JSON.stringify(j.user || {}));
      }, ADMIN);

      const uniqueCode = 'P3TEST_' + Date.now().toString(36).toUpperCase();
      const before = await page.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        return fetch('http://localhost:5220/api/Subjects', { headers: { Authorization: 'Bearer ' + tk } }).then((r) => r.json());
      });
      const created = await page.evaluate(async (args) => {
        const tk = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/Subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
          body: JSON.stringify(args.payload),
        });
        return { status: r.status, body: await r.json() };
      }, { payload: { name: uniqueCode, code: uniqueCode, description: 'Phase 3 verification subject', isCompulsory: false, electiveGroupId: null } });
      const after = await page.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        return fetch('http://localhost:5220/api/Subjects', { headers: { Authorization: 'Bearer ' + tk } }).then((r) => r.json());
      });
      const newId = created.body && (created.body.id || created.body._id);
      const createdVisible = after.some((s) => s.code === uniqueCode);
      const deactivated = newId ? await page.evaluate(async (args) => {
        const tk = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/Subjects/' + args.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tk } });
        return { status: r.status };
      }, { id: newId }) : { status: 0 };
      const afterDeact = await page.evaluate(async () => {
        const tk = localStorage.getItem('eduassign.token');
        return fetch('http://localhost:5220/api/Subjects', { headers: { Authorization: 'Bearer ' + tk } }).then((r) => r.json());
      });
      const removedOK = !afterDeact.some((s) => s.id === newId || s._id === newId);
      report.crud.subjects = {
        beforeCount: before.length,
        createdStatus: created.status,
        createdId: newId,
        createdVisibleInList: createdVisible,
        afterCreateCount: after.length,
        deactivatedStatus: deactivated.status,
        removedAfterDeactivate: removedOK,
        afterDeactCount: afterDeact.length,
      };
      await ctx.close();
    }

    // ---- TEACHER DESKTOP ----
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !/Warning:|hydrat/i.test(msg.text())) errors.push(msg.text());
      });
      await page.goto('http://localhost:3000/login');
      await page.waitForTimeout(600);
      const login = await page.evaluate(async () => {
        const creds = [
          { email: 'tariq.aziz@eduassign.local', password: 'Tariq@12345' },
          { email: 'teacher@eduassign.local', password: 'Teacher@12345' },
        ];
        for (const c of creds) {
          const r = await fetch('http://localhost:5220/api/Auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c),
          });
          const j = await r.json();
          if (r.ok && j.user && j.user.role === 'Teacher') {
            localStorage.setItem('eduassign.token', j.token);
            localStorage.setItem('eduassign.user', JSON.stringify(j.user));
            return { ok: true, email: c.email };
          }
        }
        return { ok: false };
      });
      report.teacher.login = login;
      if (login.ok) {
        await page.goto('http://localhost:3000/teacher', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        await page.screenshot({ path: path.join(SHOTS_DIR, 'phase3_teacher_1440x900.png') });
        report.teacher.dashboard = { url: page.url(), horizontalOverflow: overflow, errors: errors.slice() };
      }
      await ctx.close();
    }

    // ---- STUDENT MOBILE ----
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !/Warning:|hydrat/i.test(msg.text())) errors.push(msg.text());
      });
      await page.goto('http://localhost:3000/login');
      await page.waitForTimeout(600);
      const login = await page.evaluate(async () => {
        const creds = [
          { email: 'arif.ahmed@eduassign.local', password: 'Arif@12345' },
          { email: 'student@eduassign.local', password: 'Student@12345' },
        ];
        for (const c of creds) {
          const r = await fetch('http://localhost:5220/api/Auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c),
          });
          const j = await r.json();
          if (r.ok && j.user && j.user.role === 'Student') {
            localStorage.setItem('eduassign.token', j.token);
            localStorage.setItem('eduassign.user', JSON.stringify(j.user));
            return { ok: true, email: c.email };
          }
        }
        return { ok: false };
      });
      report.student.login = login;
      if (login.ok) {
        await page.goto('http://localhost:3000/student', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        await page.screenshot({ path: path.join(SHOTS_DIR, 'phase3_student_390x844.png') });
        report.student.dashboard = { url: page.url(), horizontalOverflow: overflow, errors: errors.slice() };
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
      if (!report.crud.subjects.createdVisibleInList || !report.crud.subjects.removedAfterDeactivate) pass = false;
    }
    if (report.teacher.dashboard) {
      if (report.teacher.dashboard.horizontalOverflow || report.teacher.dashboard.errors.length > 0) pass = false;
    }
    if (report.student.dashboard) {
      if (report.student.dashboard.horizontalOverflow || report.student.dashboard.errors.length > 0) pass = false;
    }
    report.pass = pass;
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      pass: report.pass,
      viewports: Object.keys(report.viewports),
      crud: report.crud.subjects,
      teacher: report.teacher.login && report.teacher.login.ok,
      student: report.student.login && report.student.login.ok,
    }, null, 2));
  } catch (err) {
    report.error = err && err.message;
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.error('VERIFY ERROR:', err && err.message);
  } finally {
    await browser.close();
  }
})();