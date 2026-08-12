// Visual verification of the redesigned EduAssign UI.
// - Logs in as admin, teacher, student.
// - Visits every page in the brief and records console errors.
// - Snapshots pixel-level metrics (sidebar width, page bg color, card bg color,
//   first stat card tile color, button colors) for sanity checking the design.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = 'http://localhost:3000';
const API = 'http://localhost:5220';
const SHOTS = path.join(__dirname, 'screenshots', 'visual-redesign');
const RESULT = path.join(__dirname, 'results', 'visual-redesign.json');
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(path.dirname(RESULT), { recursive: true });

const ROLES = {
  admin: {
    email: 'admin@eduassign.local',
    password: 'L@unchPad!Admin#2026-XqZ',
    pages: [
      '/admin',
      '/admin/students',
      '/admin/teachers',
      '/admin/subjects',
      '/admin/curriculum',
      '/admin/assignments',
    ],
  },
  teacher: {
    email: 'tariq.aziz+1786297226770@test.local',
    password: 'TeachPass!2026',
    pages: ['/teacher', '/teacher/assignments', '/teacher/submissions', '/teacher/students', '/teacher/subjects'],
  },
  student: {
    email: 'sara.khan+1786299239080@test.local',
    password: 'StrongPass!2026',
    pages: ['/student', '/student/subjects', '/student/assignments'],
  },
};

const out = {
  startedAt: new Date().toISOString(),
  roles: {},
  globalConsoleErrors: [],
  globalPageErrors: [],
  globalNetworkErrors: [],
};

async function login(page, role) {
  await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });
  // Clear any stored auth from prior run
  await page.evaluate(() => {
    try { localStorage.removeItem('eduassign.token'); } catch {}
    try { localStorage.removeItem('eduassign.user'); } catch {}
  });
  await page.reload({ waitUntil: 'networkidle' });
  // Wait for the form to be hydrated: confirm the React-controlled input
  // actually reflects a user-typed value before submitting. Without this,
  // React's onChange hasn't wired up yet and the form submits with empty
  // state, which the API rejects with "Email and password are required."
  const emailInput = page.getByLabel('Email Address', { exact: true });
  const passwordInput = page.getByLabel('Password', { exact: true });
  await emailInput.waitFor({ state: 'visible' });
  await passwordInput.waitFor({ state: 'visible' });
  await emailInput.click();
  await emailInput.fill('');
  await emailInput.type(role.email, { delay: 5 });
  await passwordInput.click();
  await passwordInput.fill('');
  await passwordInput.type(role.password, { delay: 5 });
  // Confirm values are actually present in the DOM
  const emailValue = await emailInput.inputValue();
  const pwValue = await passwordInput.inputValue();
  if (!emailValue || !pwValue) {
    throw new Error(`login fields not filled: email=${JSON.stringify(emailValue)} pw=${JSON.stringify(pwValue)}`);
  }
  const loginResp = page
    .waitForResponse((r) => /\/Auth\/login/i.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
    .catch(() => null);
  await page.locator('button[type=submit]').first().click();
  const resp = await loginResp;
  if (resp) {
    let body = '';
    try { body = await resp.text(); } catch {}
    out.loginAttempts = out.loginAttempts || [];
    out.loginAttempts.push({ role: role.email, status: resp.status(), body: body.slice(0, 200) });
    if (resp.status() >= 400) {
      throw new Error(`login failed: HTTP ${resp.status()} for ${role.email} :: ${body.slice(0, 200)}`);
    }
  }
  const landing = role.email.includes('admin')
    ? /\/admin/
    : /tariq|teacher/i.test(role.email)
      ? /\/teacher/
      : /\/student/;
  await page.waitForURL(landing, { timeout: 15000 });
}

async function measure(page) {
  return await page.evaluate(() => {
    const body = document.body;
    const cs = getComputedStyle(body);
    const card = document.querySelector('[data-card], .rounded-xl');
    const sidebar = document.querySelector('aside');
    const navActive = document.querySelector('a[aria-current="page"]');
    const button = document.querySelector('button[class*="emerald"], button[class*="bg-emerald"]') ||
      document.querySelector('button');
    function bg(el) { return el ? getComputedStyle(el).backgroundColor : null; }
    function color(el) { return el ? getComputedStyle(el).color : null; }
    function border(el) { return el ? getComputedStyle(el).borderColor : null; }
    return {
      bodyBg: cs.backgroundColor,
      bodyColor: cs.color,
      cardBg: bg(card),
      cardBorder: border(card),
      sidebarBg: bg(sidebar),
      sidebarColor: color(sidebar),
      activeNavBg: bg(navActive),
      activeNavColor: color(navActive),
      firstButtonBg: bg(button),
      firstButtonColor: color(button),
    };
  });
}

async function visit(role, key) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' && !msg.text().includes('chrome-extension://')) {
      out.globalConsoleErrors.push({ role: key, url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) =>
    out.globalPageErrors.push({ role: key, url: page.url(), text: String(err) }),
  );
  page.on('response', (resp) => {
    if (!resp.url().startsWith(API)) return;
    if (resp.status() >= 400) {
      const url = resp.url();
      // Whitelist known noisy / expected 401/403s
      if (/\/Students\/(enrolled-subjects|available-subjects)/.test(url)) return;
      if (/\/me\b/.test(url) && resp.status() === 401) return;
      out.globalNetworkErrors.push({
        role: key,
        url,
        status: resp.status(),
      });
    }
  });
  out.roles[key] = { pages: {} };
  try {
    await login(page, role);
  } catch (e) {
    out.roles[key].loginError = String(e);
    await browser.close();
    return;
  }
  for (const p of role.pages) {
    try {
      await page.goto(`${APP}${p}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200); // let data load
      const slug = p.replace(/\//g, '_').replace(/^_/, '');
      const file = path.join(SHOTS, `${key}-${slug}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const metrics = await measure(page);
      out.roles[key].pages[p] = { file, metrics };
    } catch (e) {
      out.roles[key].pages[p] = { error: String(e) };
    }
  }
  await browser.close();
}

(async () => {
  for (const [key, role] of Object.entries(ROLES)) {
    await visit(role, key);
  }
  out.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();