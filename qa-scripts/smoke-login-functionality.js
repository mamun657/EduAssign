// Quick smoke test: confirm login form, demo buttons, and password toggle still work after layout changes
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const checks = {};

  // 1. Header logo + Register link exist
  checks.headerLogo = await page.locator('header a[href="/"]').count();
  checks.registerLink = await page.locator('a[href="/register"]').count();

  // 2. H1 text
  checks.h1Text = await page.locator('h1').textContent();

  // 3. Email + Password inputs visible
  checks.emailInput = await page.locator('input[type="email"]').isVisible();
  checks.passwordInput = await page.locator('input[name="password"], input[type="password"], input[autocomplete="current-password"]').count();

  // 4. Password toggle works
  const pwdInput = page.locator('input[autocomplete="current-password"]');
  await pwdInput.fill('TestPassword123');
  const eyeBtn = page.locator('button[aria-label*="password" i]');
  await eyeBtn.click();
  await page.waitForTimeout(200);
  const typeAfterToggle = await pwdInput.getAttribute('type');
  checks.passwordToggle = typeAfterToggle === 'text';

  // 5. Sign in button exists
  checks.signInBtn = await page.locator('button[type="submit"]').count();

  // 6. Quick demo login section + 3 demo buttons exist
  checks.quickDemoLabel = await page.locator('text=Quick demo login').count();
  checks.demoAdmin = await page.locator('button[aria-label="Sign in as demo admin"]').count();
  checks.demoTeacher = await page.locator('button[aria-label="Sign in as demo teacher"]').count();
  checks.demoStudent = await page.locator('button[aria-label="Sign in as demo student"]').count();

  // 7. Illustration image present at desktop
  checks.illustration = await page.locator('img[alt="EduAssign Pro workspace preview"]').isVisible();

  // 8. No console errors
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  checks.consoleErrors = consoleErrors;

  console.log(JSON.stringify(checks, null, 2));
  await browser.close();
})();