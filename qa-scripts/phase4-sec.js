// Phase 4 — Security & negative tests
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase4-sec.json');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });

const TEACHER_EMAIL = 'tariq.aziz+1786297226770@test.local';
const TEACHER_PASSWORD = 'TeachPass!2026';
const STUDENT_EMAIL = 'arif+1786295489811855@test.local';
const STUDENT_PASSWORD = 'StrongPass!2026';

const results = {
  section: 'Phase 4 — Security & Negative Tests',
  startedAt: new Date().toISOString(),
  tests: {},
  fatalError: null,
};

async function loginAndGetToken(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
  return page.evaluate(() => localStorage.getItem('eduassign.token'));
}

async function apiCall(page, url, opts = {}) {
  return page.evaluate(
    async ({ u, o }) => {
      const token = localStorage.getItem('eduassign.token');
      const headers = { ...(o.headers || {}) };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const r = await fetch(u, { ...o, headers });
      // Read body as text first; parse JSON if possible. Avoid double-reading the
      // Response body stream (which throws "body stream already read").
      const text = await r.text();
      let body = text;
      try { body = JSON.parse(text); } catch { /* leave as text */ }
      return { status: r.status, body };
    },
    { u: url, o: opts }
  );
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    // Get a real published assignment ID by triggering workflow
    // We'll first do a quick login as teacher + student to get tokens + IDs
    let publishedId;
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const teacherToken = await loginAndGetToken(page, TEACHER_EMAIL, TEACHER_PASSWORD);
      // Find any existing published assignment
      const all = await apiCall(page, 'http://localhost:5220/api/Assignments');
      publishedId = Array.isArray(all.body) ? all.body.find(a => a.isPublished)?.id : null;
      if (!publishedId) {
        // Need to create + publish one
        const links = await apiCall(page, 'http://localhost:5220/api/teacher-student-subjects/mine');
        const tss = (Array.isArray(links.body) ? links.body : []).find(l => l.isActive);
        if (tss) {
          const created = await apiCall(page, 'http://localhost:5220/api/Assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: tss.studentId,
              subjectId: tss.subjectId,
              title: 'Phase 4 Security Test — Dummy',
              description: 'For security tests.',
              dueDate: new Date(Date.now() + 86400000).toISOString(),
            }),
          });
          if (created.status === 200) {
            publishedId = created.body.id;
            await apiCall(page, `http://localhost:5220/api/Assignments/${publishedId}/publish`, { method: 'POST' });
          }
        }
      }
      results.setup = { publishedId, teacherTokenOk: !!teacherToken };
      await ctx.close();
    }

    if (!publishedId) throw new Error('Could not obtain a published assignment ID');

    // ===== T1: Unauthenticated → /teacher redirects to /login =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto('http://localhost:3000/teacher', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      results.tests.T1_unauthTeacherRedirect = {
        finalUrl: page.url(),
        pass: /\/login/.test(page.url()),
      };
      await ctx.close();
    }

    // ===== T2: Student → /admin redirects =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      results.tests.T2_studentAdminRedirect = {
        finalUrl: page.url(),
        pass: !/\/admin/.test(page.url()),
      };
      await ctx.close();
    }

    // ===== T3: Student → /teacher redirects =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      await page.goto('http://localhost:3000/teacher', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      results.tests.T3_studentTeacherRedirect = {
        finalUrl: page.url(),
        pass: !/\/teacher/.test(page.url()),
      };
      await ctx.close();
    }

    // ===== T4: Student → POST /api/Assignments {create} → 403 =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      const r = await apiCall(page, 'http://localhost:5220/api/Assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: 'fake', subjectId: 'fake', title: 'X', description: 'Y', dueDate: new Date().toISOString() }),
      });
      results.tests.T4_studentCreateAssignment = { status: r.status, pass: r.status === 403 };
      await ctx.close();
    }

    // ===== T5: Student → POST /api/Assignments/{id}/review → 403 =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      const r = await apiCall(page, `http://localhost:5220/api/Assignments/${publishedId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: 50, feedback: 'hack' }),
      });
      results.tests.T5_studentReview = { status: r.status, pass: r.status === 403 };
      await ctx.close();
    }

    // ===== T6: Teacher reviews own assignment → 200 (positive baseline) =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, TEACHER_EMAIL, TEACHER_PASSWORD);
      // First make sure student submitted so review is valid
      const ctx2 = await browser.newContext();
      const p2 = await ctx2.newPage();
      await loginAndGetToken(p2, STUDENT_EMAIL, STUDENT_PASSWORD);
      await apiCall(p2, `http://localhost:5220/api/Assignments/${publishedId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionText: 'sec test' }),
      });
      await ctx2.close();

      const r = await apiCall(page, `http://localhost:5220/api/Assignments/${publishedId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: 80, feedback: 'security test baseline' }),
      });
      results.tests.T6_teacherReviewOwn = { status: r.status, pass: r.status === 200 };
      await ctx.close();
    }

    // ===== T7: Student → teacher endpoint /api/teacher-student-subjects/mine → 403 =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      const r = await apiCall(page, 'http://localhost:5220/api/teacher-student-subjects/mine');
      results.tests.T7_studentTssEndpoint = { status: r.status, pass: r.status === 403 };
      await ctx.close();
    }

    // ===== T8: Student → teacher-only /api/admin/students → 403 =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      const r = await apiCall(page, 'http://localhost:5220/api/admin/students');
      results.tests.T8_studentAdminStudents = { status: r.status, pass: r.status === 403 };
      await ctx.close();
    }

    // ===== T9: Unauthenticated → /api/Auth/me → 401 =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      // Don't login
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      // Make sure no token
      await page.evaluate(() => { localStorage.removeItem('eduassign.token'); localStorage.removeItem('eduassign.user'); });
      const r = await apiCall(page, 'http://localhost:5220/api/Auth/me');
      results.tests.T9_unauthMe = { status: r.status, pass: r.status === 401 };
      await ctx.close();
    }

    // ===== T10: Invalid file type (.exe) upload → 400 =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAndGetToken(page, TEACHER_EMAIL, TEACHER_PASSWORD);
      // Create a draft assignment, attach .exe, expect 400
      const links = await apiCall(page, 'http://localhost:5220/api/teacher-student-subjects/mine');
      const tss = (Array.isArray(links.body) ? links.body : []).find(l => l.isActive);
      if (tss) {
        const cr = await apiCall(page, 'http://localhost:5220/api/Assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: tss.studentId,
            subjectId: tss.subjectId,
            title: 'Phase 4 — Invalid file test',
            description: 'Should reject .exe',
            dueDate: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
        const newId = cr.body.id;
        // Upload .exe
        const r = await page.evaluate(async (id) => {
          const token = localStorage.getItem('eduassign.token');
          const form = new FormData();
          form.append('file', new Blob([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])]), 'malware.exe');
          const resp = await fetch(`http://localhost:5220/api/Assignments/${id}/attachment`, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form,
          });
          return resp.status;
        }, newId);
        results.tests.T10_invalidFileType = { status: r, pass: r === 400 };
      } else {
        results.tests.T10_invalidFileType = { skipped: true };
      }
      await ctx.close();
    }

    const passes = Object.values(results.tests).filter(t => t.pass).length;
    const total = Object.values(results.tests).length;
    results.summary = {
      total,
      passed: passes,
      failed: total - passes,
      pass: passes === total,
    };
  } catch (err) {
    results.fatalError = err.message + '\n' + err.stack;
  } finally {
    results.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    console.log(`SUMMARY: ${results.summary?.passed ?? 0}/${results.summary?.total ?? 0} pass`);
    await browser.close();
  }
})();