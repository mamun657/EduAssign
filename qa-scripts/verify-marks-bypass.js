// Additional verification: bypass HTML constraints and ensure JS-side validation kicks in.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = { fatal: null };

  try {
    const teacherFixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'marks-fix.json'), 'utf-8'));
    const assignmentId = teacherFixture.assignmentId;

    const teacherEmail = 'tariq.aziz+1786297226770@test.local';
    const teacherPwd = 'TeachPass!2026';

    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const networkErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    page.on('response', (r) => {
      if (/localhost:5220/.test(r.url()) && r.status() >= 400) networkErrors.push(r.status() + ' ' + r.url());
    });

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(teacherEmail);
    await page.getByLabel('Password', { exact: true }).fill(teacherPwd);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((u) => /\/teacher/.test(u.toString()), { timeout: 15000 });

    await page.goto(`http://localhost:3000/teacher/submissions/${assignmentId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Bypass HTML max constraint by removing the attribute, setting value to 250,
    // and calling form.requestSubmit() directly.
    let apiCalls = [];
    page.on('request', (req) => {
      if (/\/review/.test(req.url()) && req.method() === 'POST') apiCalls.push(req.postData());
    });

    await page.evaluate(() => {
      const input = document.getElementById('marks');
      input.removeAttribute('max');
      input.removeAttribute('min');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '250');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Now request submit programmatically
      const form = input.closest('form');
      form.requestSubmit();
    });

    await page.waitForTimeout(2000);

    out.consoleErrors = consoleErrors;
    out.networkErrors = networkErrors;
    out.apiCalls = apiCalls;
    out.jsGuardAlertVisible = await page.locator('text=/cannot exceed 100/i').count() > 0;
    out.pageUrl = page.url();

    await page.screenshot({ path: path.join(__dirname, 'screenshots', 'marks-fix', '04-bypass-test.png'), fullPage: true });
  } catch (e) {
    out.fatal = e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 6).join('\n') : '');
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.fatal ? 2 : 0);
})();