// Debug form submit on /register
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('request', (req) => {
    if (req.url().includes('localhost:5220')) console.log(`[req] ${req.method()} ${req.url()}`);
  });
  page.on('response', (resp) => {
    if (resp.url().includes('localhost:5220')) console.log(`[resp] ${resp.status()} ${resp.url()}`);
  });

  const unique = Date.now();
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Pick Student role
  await page.locator('select').first().selectOption({ label: 'Student' });
  await page.waitForTimeout(1500);

  // Get school option value
  const allSelects = await page.locator('select').all();
  const lvlSelect = allSelects[allSelects.length - 1];
  const schoolVal = await lvlSelect.locator('option').filter({ hasText: /^School$/ }).first().getAttribute('value');
  console.log('School value:', schoolVal);

  // Fill all fields including byLabel
  await page.getByLabel('First name').fill('Abir');
  await page.getByLabel('Last name').fill('Khan');
  await page.getByLabel('Email').fill(`abir+${unique}@test.local`);
  const lvlSelect2 = (await page.locator('select').all());
  await lvlSelect2[lvlSelect2.length - 1].selectOption(schoolVal);
  await page.getByLabel('Password', { exact: true }).fill('StrongPass!2026');
  await page.getByLabel('Confirm password').fill('StrongPass!2026');
  await page.waitForTimeout(500);

  // What does the form data look like?
  const formData = await page.evaluate(() => {
    const form = document.querySelector('form');
    const inputs = Array.from(form.querySelectorAll('input, select'));
    return inputs.map((i) => ({ id: i.id, name: i.name, type: i.type, value: i.value, required: i.required, valid: i.checkValidity() }));
  });
  console.log('Form state:', JSON.stringify(formData, null, 2));

  // Check form.checkValidity
  const formValid = await page.evaluate(() => document.querySelector('form').checkValidity());
  console.log('Form.valid:', formValid);

  // Look at the button
  const btn = await page.locator('button[type="submit"]').first();
  const btnText = await btn.textContent();
  const btnDisabled = await btn.isDisabled();
  console.log('Button text:', btnText, 'disabled:', btnDisabled);

  // Try clicking via JS dispatch
  const regRespPromise = page.waitForResponse((r) => r.url().includes('/Auth/register'), { timeout: 10000 }).catch((e) => 'timeout: ' + e.message);
  await btn.click();
  const regResp = await regRespPromise;
  console.log('Register response:', regResp);
  await page.waitForTimeout(2000);
  console.log('Final URL:', page.url());

  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'debug-after-submit.png'), fullPage: true });
  await browser.close();
})();
