// Real browser verification of Admin Delete flows (Teachers + Students).
// Drives a headless Chromium against http://localhost:3000.
//
// Flow per page:
//   1. Log in as admin
//   2. Navigate to admin page
//   3. Create a sacrificial user (so we don't touch real data)
//   4. Open Delete on that user -> modal appears
//   5. Click Cancel -> modal closes, user still in list, NO DELETE request sent
//   6. Open Delete again -> Click Delete permanently -> DELETE 204, row removed
//   7. Refresh -> deleted user stays gone
//   8. Capture console errors and network DELETE responses

const { chromium } = require('playwright');

const API = 'http://localhost:5220';
const WEB = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@eduassign.local';
const ADMIN_PASS = 'L@unchPad!Admin#2026-XqZ';

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function loginAsAdmin(page) {
  const resp = await page.request.post(`${API}/api/Auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  if (!resp.ok()) throw new Error(`Admin login failed: ${resp.status()}`);
  const json = await resp.json();
  // Inject into localStorage so the SPA picks it up
  await page.goto(WEB + '/login');
  await page.evaluate((t) => {
    localStorage.setItem('eduassign_token', t);
  }, json.token);
  return json.token;
}

async function apiList(page, path, token) {
  const r = await page.request.get(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok()) throw new Error(`List ${path} failed: ${r.status()}`);
  return r.json();
}

async function apiCreate(page, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log(`[apiCreate] POST ${API}${path} token? ${!!token}`);
  const r = await page.request.post(`${API}${path}`, {
    headers,
    data: body,
  });
  if (!r.ok()) throw new Error(`Create ${path} failed: ${r.status()} body=${await r.text()} headers=${JSON.stringify(headers)}`);
  return r.json();
}

async function apiList(page, path) {
  const r = await page.request.get(`${API}${path}`);
  if (!r.ok()) throw new Error(`List ${path} failed: ${r.status()}`);
  return r.json();
}

async function runPage({ browser, pageName, urlPath, apiListPath, apiCreatePath, createBody }) {
  console.log(`\n========================================`);
  console.log(`VERIFY: ${pageName}`);
  console.log(`========================================`);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Track console errors + network DELETE responses
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
  const deleteResponses = [];
  page.on('response', async (resp) => {
    if (resp.request().method() === 'DELETE') {
      deleteResponses.push({
        url: resp.url(),
        status: resp.status(),
        ok: resp.ok(),
      });
    }
  });

  // 1) Login
  const loginResp = await page.request.post(`${API}/api/Auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  if (!loginResp.ok()) throw new Error(`Login failed: ${loginResp.status()}`);
  const loginJson = await loginResp.json();
  const token = loginJson.token;
  const user = loginJson.user;
  await page.goto(WEB + '/login');
  await page.evaluate(({ t, u }) => {
    localStorage.setItem('eduassign.token', t);
    localStorage.setItem('eduassign.user', JSON.stringify(u));
  }, { t: token, u: user });

  // 1b) For student registration, fetch a valid academicLevelId
  let academicLevelId = null;
  if (apiCreatePath.includes('Auth/register')) {
    const lvlResp = await page.request.get(`${API}/api/AcademicLevels`);
    if (lvlResp.ok()) {
      const lvls = await lvlResp.json();
      if (Array.isArray(lvls) && lvls.length > 0) academicLevelId = lvls[0].id;
    }
    if (!academicLevelId) throw new Error('Could not fetch academic levels');
  }

  // 2) Create sacrificial user via API (faster than filling the form)
  // Generate a unique email so we can find it later
  const uniq = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const victimEmail = `verify_${pageName.toLowerCase()}_${uniq}@eduassign.local`;
  // Registration doesn't need auth; admin create endpoints do
  const victimRaw = await apiCreate(page, apiCreatePath, {
    ...createBody,
    email: victimEmail,
    ...(academicLevelId ? { academicLevelId } : {}),
  }, apiCreatePath.includes('Auth') ? null : token);

  // /Auth/register returns {token, user}; /admin/teachers returns the user record directly.
  // Normalize to {id, firstName, lastName, email}.
  let victim;
  if (apiCreatePath.includes('Auth/register')) {
    victim = victimRaw.user;
    if (!victim) throw new Error(`register returned no user: ${JSON.stringify(victimRaw).slice(0, 200)}`);
  } else {
    victim = victimRaw;
  }
  console.log(`Created sacrificial ${pageName}: ${victim.firstName} ${victim.lastName} (${victim.id})`);

  // 3) Navigate to admin page
  await page.goto(WEB + urlPath, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  // Wait for the table to appear
  try {
    await page.waitForSelector('table', { timeout: 20000 });
  } catch (e) {
    const title = await page.title();
    const url = page.url();
    const html = await page.content();
    // Find body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
    const body = bodyMatch ? bodyMatch[1].slice(0, 4000) : '(no body found)';
    console.log(`[debug] url=${url} title=${title}`);
    console.log(`[debug] body: ${body}`);
    // Also dump any visible text
    const visible = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 1000) : '(no body)');
    console.log(`[debug] visible: ${visible}`);
    throw e;
  }

  // 4) Find the row for the sacrificial user by email cell
  const rowSelector = `tr:has(td:has-text("${victim.email}"))`;
  await page.waitForSelector(rowSelector, { timeout: 10000 });
  const row = page.locator(rowSelector).first();

  // Sanity: verify Delete button is present in this row
  const delBtn = row.getByRole('button', { name: /^Delete / });
  if ((await delBtn.count()) === 0) {
    throw new Error(`Delete button not found on row for ${victim.email}`);
  }
  console.log(`✓ Delete button found in row`);

  // 5) Open Delete -> modal appears
  await delBtn.click();
  const modal = page.getByRole('dialog');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  console.log(`✓ Modal opened`);
  const modalText = await modal.textContent();
  if (!modalText.includes('This action cannot be undone')) {
    throw new Error(`Modal missing "This action cannot be undone"`);
  }
  if (!modalText.toLowerCase().includes('delete')) {
    throw new Error(`Modal missing delete warning`);
  }
  if (!modalText.includes(victim.email)) {
    throw new Error(`Modal missing victim email`);
  }
  console.log(`✓ Modal shows victim email + cannot-be-undone text`);

  // 6) Click Cancel -> modal closes, victim still in table
  await modal.getByRole('button', { name: /Cancel/ }).click();
  await modal.waitFor({ state: 'hidden', timeout: 5000 });
  console.log(`✓ Cancel closed modal`);
  if (deleteResponses.length !== 0) {
    throw new Error(`Cancel should not have sent a DELETE request, but found ${deleteResponses.length}`);
  }
  console.log(`✓ No DELETE request sent after Cancel`);
  if ((await page.locator(rowSelector).count()) === 0) {
    throw new Error(`Victim disappeared after Cancel — should still be there`);
  }
  console.log(`✓ Victim still in table after Cancel`);

  // 7) Open Delete again -> Delete permanently
  await delBtn.click();
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  const delPermBtn = modal.getByRole('button', { name: /Delete permanently/ });
  if ((await delPermBtn.count()) === 0) {
    throw new Error(`"Delete permanently" button missing in modal`);
  }
  await delPermBtn.click();

  // Wait for modal to close + row to disappear
  await modal.waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForSelector(rowSelector, { state: 'detached', timeout: 10000 });
  console.log(`✓ Modal closed after Delete permanently`);
  console.log(`✓ Victim row removed from table`);

  // Check a DELETE request was sent and succeeded
  const del = deleteResponses.find((r) => r.url.includes(victim.id));
  if (!del) {
    throw new Error(`No DELETE request seen for victim ${victim.id}`);
  }
  if (del.status !== 204) {
    throw new Error(`DELETE returned ${del.status}, expected 204`);
  }
  console.log(`✓ DELETE API returned 204 for ${victim.id}`);

  // 8) Refresh -> deleted user stays gone
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('table', { timeout: 10000 });
  if ((await page.locator(rowSelector).count()) !== 0) {
    throw new Error(`Victim reappeared after refresh — delete not persisted`);
  }
  console.log(`✓ Victim stays gone after refresh`);

  // 9) Report
  const ignore = (e) =>
    e.includes('Failed to load resource') || // generic
    e.includes('favicon');
  const real = consoleErrors.filter((e) => !ignore(e));
  console.log(`Console errors: ${real.length}`);
  for (const e of real) console.log(`  ${e}`);
  console.log(`DELETE responses captured: ${deleteResponses.length}`);
  for (const r of deleteResponses) console.log(`  ${r.status} ${r.url}`);

  await context.close();
  return { consoleErrors: real };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let pass = true;
  try {
    const r1 = await runPage({
      browser, pageName: 'Teachers', urlPath: '/admin/teachers',
      apiListPath: '/api/admin/teachers', apiCreatePath: '/api/admin/teachers',
      createBody: { firstName: 'Verify', lastName: 'DeleteTeacher', password: 'TestP@ss123!', phoneNumber: '+1-555-0001' },
    });
    if (r1.consoleErrors.length > 0) pass = false;

    const r2 = await runPage({
      browser, pageName: 'Students', urlPath: '/admin/students',
      apiListPath: '/api/admin/students', apiCreatePath: '/api/Auth/register',
      // /api/Auth/register takes {firstName,lastName,email,password,phoneNumber?,academicLevelId?}
      createBody: { firstName: 'Verify', lastName: 'DeleteStudent', password: 'TestP@ss123!', confirmPassword: 'TestP@ss123!', role: 'Student' },
    });
    if (r2.consoleErrors.length > 0) pass = false;
  } catch (err) {
    console.error('FAIL:', err.message);
    pass = false;
  }
  await browser.close();
  console.log(`\n=========================`);
  console.log(pass ? 'OVERALL: PASS' : 'OVERALL: FAIL');
  console.log(`=========================`);
  process.exit(pass ? 0 : 1);
})();