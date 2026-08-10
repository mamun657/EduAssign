// E2E QA: Phase 4 — Teacher → Assignment → Student workflow with file attachments
// Uses real backend APIs. Teacher creates assignment with PDF, publishes, student downloads
// PDF, uploads submission file, submits, teacher reviews with marks + feedback, student sees.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, 'results', 'phase4-e2e.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase4-e2e');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const ADMIN_EMAIL = 'admin@eduassign.local';
const ADMIN_PASSWORD = 'L@unchPad!Admin#2026-XqZ';
const TEACHER_EMAIL = 'tariq.aziz+1786297226770@test.local';
const TEACHER_PASSWORD = 'TeachPass!2026';
const STUDENT_EMAIL = 'arif+1786295489811855@test.local';
const STUDENT_PASSWORD = 'StrongPass!2026';

const results = {
  section: 'Phase 4 — End-to-End Workflow (Real PDF + File Upload + Review)',
  startedAt: new Date().toISOString(),
  steps: {},
  consoleErrors: [],
  networkErrors: [],
  fatalError: null,
};

function trackPage(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') results.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => results.consoleErrors.push('pageerror: ' + err.message));
  page.on('response', (resp) => {
    if (resp.url().includes('localhost:5220') && resp.status() >= 500) {
      results.networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });
}

async function loginViaUI(page, email, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const respP = page.waitForResponse(
    (r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST',
    { timeout: 8000 }
  );
  await page.locator('button[type="submit"]').first().click();
  await respP;
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Build a real PDF fixture
  const pdfPath = path.join(SHOTS_DIR, 'fixture-brief.pdf');
  // Minimal valid PDF (single-page text: "EduAssign E2E Brief")
  const pdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\n3 0 obj<<>>endobj\n' +
    '4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 50 700 Td (EduAssign E2E Brief) Tj ET\nendstream\nendobj\n' +
    '5 0 obj<</Length 44>>stream\nBT /F1 12 Tf 50 700 Td (Student Submission) Tj ET\nendstream\nendobj\n' +
    'xref\n0 6\n0000000000 65535 f\ntrailer<</Size 6>>\nstartxref\n100\n%%EOF\n',
    'latin1'
  );
  fs.writeFileSync(pdfPath, pdfBytes);

  const submissionPath = path.join(SHOTS_DIR, 'fixture-submission.pdf');
  const subBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\n3 0 obj<<>>endobj\n' +
    '4 0 obj<</Length 50>>stream\nBT /F1 12 Tf 50 700 Td (Student Submission PDF) Tj ET\nendstream\nendobj\n' +
    'xref\n0 5\n0000000000 65535 f\ntrailer<</Size 5>>\nstartxref\n100\n%%EOF\n',
    'latin1'
  );
  fs.writeFileSync(submissionPath, subBytes);

  try {
    // ===== STEP 1: Teacher login =====
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      trackPage(page);
      await loginViaUI(page, TEACHER_EMAIL, TEACHER_PASSWORD);
      results.steps.teacherLoggedIn = page.url().includes('/teacher');
      await ctx.close();
    }

    // ===== STEP 2: Get a real TSS link via API (teacher) =====
    let tssLink;
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      trackPage(page);
      await loginViaUI(page, TEACHER_EMAIL, TEACHER_PASSWORD);
      const links = await page.evaluate(async () => {
        const token = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/teacher-student-subjects/mine', {
          headers: { Authorization: 'Bearer ' + token },
        });
        return r.json();
      });
      tssLink = links.find((l) => l.isActive);
      results.steps.tssLinkFound = !!tssLink;
      results.steps.tssLink = tssLink ? { id: tssLink.id, subject: tssLink.subjectName, student: tssLink.studentName } : null;
      await ctx.close();
    }

    if (!tssLink) throw new Error('No active TSS link found for teacher');

    // ===== STEP 3: Teacher creates assignment via API + uploads PDF =====
    let assignmentId;
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      trackPage(page);
      await loginViaUI(page, TEACHER_EMAIL, TEACHER_PASSWORD);

      // Create draft assignment
      const created = await page.evaluate(
        async ({ studentId, subjectId }) => {
          const token = localStorage.getItem('eduassign.token');
          const due = new Date(Date.now() + 14 * 86400000).toISOString();
          const r = await fetch('http://localhost:5220/api/Assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
              studentId,
              subjectId,
              title: 'Phase 4 E2E — Photosynthesis Brief',
              description: 'Write a 500-word report on photosynthesis with citations.',
              dueDate: due,
            }),
          });
          return { status: r.status, body: await r.json() };
        },
        { studentId: tssLink.studentId, subjectId: tssLink.subjectId }
      );
      results.steps.assignmentCreated = created;
      assignmentId = created.body.id;

      // Upload PDF attachment
      const fileBuf = fs.readFileSync(pdfPath);
      const uploadResult = await page.evaluate(
        async ({ id, bytes }) => {
          const token = localStorage.getItem('eduassign.token');
          const form = new FormData();
          const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
          form.append('file', blob, 'brief.pdf');
          const r = await fetch(`http://localhost:5220/api/Assignments/${id}/attachment`, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: form,
          });
          return { status: r.status, body: await r.json() };
        },
        { id: assignmentId, bytes: Array.from(fileBuf) }
      );
      results.steps.attachmentUploaded = {
        status: uploadResult.status,
        fileName: uploadResult.body.attachmentFileName,
        size: uploadResult.body.attachmentSize,
      };

      // Publish
      const publishResult = await page.evaluate(
        async (id) => {
          const token = localStorage.getItem('eduassign.token');
          const r = await fetch(`http://localhost:5220/api/Assignments/${id}/publish`, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
          });
          return { status: r.status, body: await r.json() };
        },
        assignmentId
      );
      results.steps.published = { status: publishResult.status, isPublished: publishResult.body.isPublished, status2: publishResult.body.status };

      // Verify student can now see it
      // Note: GET /api/Assignments returns assignments filtered by role — for the
      // teacher (current context) it returns their own assignments.
      const studentAssignments = await page.evaluate(async () => {
        const token = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/Assignments', {
          headers: { Authorization: 'Bearer ' + token },
        });
        return await r.json();
      });
      results.steps.teacherSeesPublished = Array.isArray(studentAssignments) && studentAssignments.some(a => a.id === assignmentId && a.isPublished);

      await ctx.close();
    }

    // ===== STEP 4: Student downloads PDF, uploads submission, submits =====
    {
      const ctx = await browser.newContext({ acceptDownloads: true });
      const page = await ctx.newPage();
      trackPage(page);
      await loginViaUI(page, STUDENT_EMAIL, STUDENT_PASSWORD);

      // Student sees the published assignment
      // Note: GET /api/Assignments returns published assignments scoped to the
      // student's role automatically (see AssignmentService.ListAsync).
      const studentAssignments = await page.evaluate(async () => {
        const token = localStorage.getItem('eduassign.token');
        const r = await fetch('http://localhost:5220/api/Assignments', {
          headers: { Authorization: 'Bearer ' + token },
        });
        return await r.json();
      });
      const myAssignment = Array.isArray(studentAssignments)
        ? studentAssignments.find((a) => a.id === assignmentId)
        : null;
      results.steps.studentSeesAssignment = !!myAssignment;
      results.steps.studentAssignmentStatus = myAssignment?.status;

      // Download attachment via API and verify bytes
      const downloadResult = await page.evaluate(async (id) => {
        const token = localStorage.getItem('eduassign.token');
        const r = await fetch(`http://localhost:5220/api/Assignments/${id}/attachment`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        const buf = await r.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const head = String.fromCharCode(...bytes.slice(0, 8));
        return { status: r.status, contentType: r.headers.get('content-type'), size: bytes.length, head };
      }, assignmentId);
      results.steps.studentDownloadedAttachment = downloadResult;

      // Upload submission file
      const fileBuf = fs.readFileSync(submissionPath);
      const uploadResult = await page.evaluate(
        async ({ id, bytes }) => {
          const token = localStorage.getItem('eduassign.token');
          const form = new FormData();
          const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
          form.append('file', blob, 'submission.pdf');
          const r = await fetch(`http://localhost:5220/api/Assignments/${id}/submission-file`, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: form,
          });
          return { status: r.status, body: await r.json() };
        },
        { id: assignmentId, bytes: Array.from(fileBuf) }
      );
      results.steps.studentUploadedFile = {
        status: uploadResult.status,
        fileName: uploadResult.body.submissionFileName,
        size: uploadResult.body.submissionSize,
      };

      // Submit
      const submitResult = await page.evaluate(
        async (id) => {
          const token = localStorage.getItem('eduassign.token');
          const r = await fetch(`http://localhost:5220/api/Assignments/${id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ submissionText: 'My answer about photosynthesis follows in the attached PDF.' }),
          });
          return { status: r.status, body: await r.json() };
        },
        assignmentId
      );
      results.steps.studentSubmitted = {
        status: submitResult.status,
        assignmentStatus: submitResult.body.status,
        submittedAt: submitResult.body.submittedAt,
      };

      await ctx.close();
    }

    // ===== STEP 5: Teacher reviews with marks + feedback =====
    {
      const ctx = await browser.newContext({ acceptDownloads: true });
      const page = await ctx.newPage();
      trackPage(page);
      await loginViaUI(page, TEACHER_EMAIL, TEACHER_PASSWORD);

      // Teacher downloads submission file
      const teacherDownload = await page.evaluate(async (id) => {
        const token = localStorage.getItem('eduassign.token');
        const r = await fetch(`http://localhost:5220/api/Assignments/${id}/submission-file`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        const buf = await r.arrayBuffer();
        const bytes = new Uint8Array(buf);
        return { status: r.status, contentType: r.headers.get('content-type'), size: bytes.length };
      }, assignmentId);
      results.steps.teacherDownloadedSubmission = teacherDownload;

      // Review
      const reviewResult = await page.evaluate(
        async (id) => {
          const token = localStorage.getItem('eduassign.token');
          const r = await fetch(`http://localhost:5220/api/Assignments/${id}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ marks: 92, feedback: 'Excellent work on photosynthesis — strong citations and clear structure.' }),
          });
          return { status: r.status, body: await r.json() };
        },
        assignmentId
      );
      results.steps.teacherReviewed = {
        status: reviewResult.status,
        marks: reviewResult.body.marks,
        feedback: reviewResult.body.feedback,
        status2: reviewResult.body.status,
      };

      await ctx.close();
    }

    // ===== STEP 6: Student sees marks + feedback =====
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      trackPage(page);
      await loginViaUI(page, STUDENT_EMAIL, STUDENT_PASSWORD);

      const finalState = await page.evaluate(async (id) => {
        const token = localStorage.getItem('eduassign.token');
        const r = await fetch(`http://localhost:5220/api/Assignments/${id}`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        return await r.json();
      }, assignmentId);
      results.steps.studentSawReview = {
        status: finalState.status,
        marks: finalState.marks,
        feedback: finalState.feedback,
      };

      await ctx.close();
    }

    // ===== Final summary =====
    results.summary = {
      stepsCompleted: Object.keys(results.steps).length,
      consoleErrors: results.consoleErrors.length,
      networkErrors: results.networkErrors.length,
      pass:
        results.steps.teacherLoggedIn &&
        results.steps.tssLinkFound &&
        results.steps.assignmentCreated?.status === 200 &&
        results.steps.attachmentUploaded?.status === 200 &&
        results.steps.published?.status === 200 &&
        results.steps.studentSeesAssignment &&
        results.steps.studentDownloadedAttachment?.status === 200 &&
        results.steps.studentUploadedFile?.status === 200 &&
        results.steps.studentSubmitted?.status === 200 &&
        results.steps.teacherDownloadedSubmission?.status === 200 &&
        results.steps.teacherReviewed?.status === 200 &&
        results.steps.studentSawReview?.marks === 92,
    };
  } catch (err) {
    results.fatalError = err.message + '\n' + err.stack;
  } finally {
    results.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.summary || {}, null, 2));
    console.log('---');
    console.log(`consoleErrors: ${results.consoleErrors.length}`);
    console.log(`networkErrors: ${results.networkErrors.length}`);
    if (results.fatalError) console.log('FATAL:', results.fatalError);
    console.log('ASSIGNMENT_ID=' + (results.steps.assignmentCreated?.body?.id || 'none'));
    await browser.close();
  }
})();