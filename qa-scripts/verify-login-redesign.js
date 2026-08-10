// Visual verification of the redesigned login page (top header + form + demo buttons + illustration).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1600x900',  width: 1600, height: 900  },
  { name: '1440x900',  width: 1440, height: 900  },
  { name: '1280x800',  width: 1280, height: 800  },
  { name: '1024x768',  width: 1024, height: 768  },
  { name: '768x1024',  width: 768,  height: 1024 },
  { name: '390x844',   width: 390,  height: 844  },
];

const SHOT_DIR = path.join(__dirname, 'screenshots', 'login-redesign');
fs.mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(700);

    const shot = path.join(SHOT_DIR, `${v.name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const metrics = await page.evaluate(() => {
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      };
      const logo = document.querySelector('header a[href="/"]');
      const registerLink = document.querySelector('a[href="/register"]');
      const h1 = document.querySelector('h1');
      const subtitle = h1 ? h1.nextElementSibling : null;
      const emailLabel = Array.from(document.querySelectorAll('label')).find(l => /email/i.test(l.textContent || ''));
      const passwordLabel = Array.from(document.querySelectorAll('label')).find(l => /password/i.test(l.textContent || ''));
      const eyeBtn = document.querySelector('button[aria-label*="password" i]');
      const signIn = document.querySelector('button[type="submit"]');
      const quickLabel = Array.from(document.querySelectorAll('span')).find(s => /quick demo login/i.test(s.textContent || ''));
      const demoButtons = Array.from(document.querySelectorAll('button[aria-label^="Sign in as demo"]'));
      const img = document.querySelector('img[alt="EduAssign Pro workspace preview"]');

      return {
        headerLogo: r(logo),
        registerLink: r(registerLink),
        h1: h1 ? { text: h1.textContent, ...r(h1) } : null,
        subtitle: subtitle ? { text: subtitle.textContent, ...r(subtitle) } : null,
        emailInput: r(emailLabel ? emailLabel.parentElement.querySelector('input') : null),
        passwordInput: r(passwordLabel ? passwordLabel.parentElement.querySelector('input') : null),
        eyeButton: r(eyeBtn),
        signInButton: signIn ? { text: signIn.textContent.trim(), ...r(signIn) } : null,
        quickDemoLabel: r(quickLabel),
        demoButtons: demoButtons.map(b => ({ label: b.getAttribute('aria-label'), ...r(b) })),
        illustration: img ? { found: true, ...r(img), aspect: +(img.getBoundingClientRect().width / img.getBoundingClientRect().height).toFixed(3) } : { found: false },
      };
    });

    report.push({ viewport: v.name, shot, metrics });
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})();
