// Functional smoke test: confirm academic level still appears for Student role.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Pick Student in the Role select.
  await page.locator('select').first().selectOption({ label: 'Student' });
  await page.waitForTimeout(1500);

  const allLabels = await page.locator('form label').allTextContents();
  const labels = allLabels.map(s => s.trim());
  const hasAcademic = labels.some(l => /academic/i.test(l));
  const academicValue = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('form label'));
    const a = labels.find(l => /academic/i.test(l.textContent || ''));
    return a ? (a.parentElement.querySelector('select')?.value || '') : null;
  });

  console.log(JSON.stringify({
    fieldLabels: labels,
    academicLevelAppearsAfterStudent: hasAcademic,
    academicLevelValue: academicValue,
    errors,
  }, null, 2));

  await browser.close();
})();