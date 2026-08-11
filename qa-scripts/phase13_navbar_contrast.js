// Phase 13 — Navbar contrast fix verification.
//
// Asserts the navbar reads as a solid black surface with bright white type
// across all viewports and in both the top and scrolled states. Captures
// screenshots and reports the resolved computed background-color + text-color
// for the header, brand, nav links, and CTAs.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP_HOST = 'http://localhost:3000';
const RESULT_FILE = path.join(__dirname, 'results', 'phase13_navbar.json');
const SHOTS_DIR = path.join(__dirname, 'screenshots', 'phase13_navbar');
fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
];

function getChannels(cssColor) {
  // Returns [r, g, b, a] in 0-255 / 0-1 range, or null if the input is a
  // named color we can't reliably classify. Handles `rgb()` / `rgba()` and
  // Tailwind 4's `oklab()` / `oklch()` serializations for solid colors.
  if (!cssColor) return null;
  const s = cssColor.trim();
  const lower = s.toLowerCase();
  if (lower === 'transparent' || lower === 'none') return null;

  let m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
    return [parts[0], parts[1], parts[2], parts.length === 4 ? parts[3] : 1];
  }
  m = s.match(/^oklab\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const L = parseFloat(parts[0]); // 0-1
    const a = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    if (!Number.isFinite(L) || !Number.isFinite(a) || !Number.isFinite(b)) return null;
    // Map lightness → grayscale approximation. Tailwind white resolves to
    // L≈1 with negligible chroma; anything with L >= 0.95 and tiny chroma is
    // treated as "white-ish" and anything with L <= 0.02 as "black-ish".
    // We do NOT try to recover the exact sRGB triple — only the lightness
    // is reliable from OKLab without more math.
    return {
      oklab: true,
      L,
      chroma: Math.sqrt(a * a + b * b),
      alpha: parts.length === 4 ? parseFloat(parts[3]) : 1,
    };
  }
  m = s.match(/^oklch\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const L = parseFloat(parts[0]);
    return {
      oklab: true,
      L,
      chroma: Math.abs(parseFloat(parts[1]) || 0),
      alpha: parts.length === 4 ? parseFloat(parts[3]) : 1,
    };
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  return null;
}

function isBlackish(cssColor) {
  const c = getChannels(cssColor);
  if (!c) return false;
  if (Array.isArray(c)) return c[0] <= 4 && c[1] <= 4 && c[2] <= 4 && c[3] >= 0.98;
  // oklab
  return c.L <= 0.02 && c.chroma <= 0.05 && (c.alpha ?? 1) >= 0.98;
}

function isWhitish(cssColor, min = 240) {
  const c = getChannels(cssColor);
  if (!c) return false;
  if (Array.isArray(c)) return c[0] >= min && c[1] >= min && c[2] >= min;
  // oklab with very high lightness is white
  return c.L >= 0.95 && c.chroma <= 0.05;
}

function isNearWhiteBorder(cssColor) {
  // For borders we accept white OR translucent white (alpha < 1). A border
  // like `border-white/25` resolves to oklab(1 … / 0.25), which still
  // visually reads as a light hairline.
  const c = getChannels(cssColor);
  if (!c) return false;
  if (Array.isArray(c)) {
    return c[0] >= 220 && c[1] >= 220 && c[2] >= 220;
  }
  // oklab border: allow any alpha but require high lightness
  return c.L >= 0.9 && c.chroma <= 0.1;
}

async function inspect(page, viewport) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${APP_HOST}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(800);

  // ---- TOP STATE ----
  const top = await page.evaluate(() => {
    const h = document.querySelector('header');
    if (!h) return null;
    const cs = getComputedStyle(h);
    const data = {
      bg: cs.backgroundColor,
      color: cs.color,
      borderBottom: cs.borderBottomColor,
      navLinks: [],
    };
    const links = h.querySelectorAll('nav a');
    links.forEach((a) => {
      const ac = getComputedStyle(a);
      data.navLinks.push({ text: a.textContent.trim(), color: ac.color });
    });
    const brand = h.querySelector('a[aria-label="EduAssign Pro home"] span:nth-of-type(2)');
    if (brand) data.brand = { text: brand.textContent.trim(), color: getComputedStyle(brand).color };
    const cta = Array.from(h.querySelectorAll('a')).find((a) => /get started/i.test(a.textContent));
    if (cta) {
      const ccs = getComputedStyle(cta);
      data.ctaGetStarted = { bg: ccs.backgroundColor, color: ccs.color };
    }
    const signIn = Array.from(h.querySelectorAll('a')).find((a) => /sign in/i.test(a.textContent));
    if (signIn) {
      const scs = getComputedStyle(signIn);
      data.signIn = { bg: scs.backgroundColor, color: scs.color, border: scs.borderColor };
    }
    return data;
  });

  await page.screenshot({ path: path.join(SHOTS_DIR, `${viewport.name}_top.png`), clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, 220) } });

  // ---- SCROLLED STATE ----
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(450);
  const scrolled = await page.evaluate(() => {
    const h = document.querySelector('header');
    if (!h) return null;
    const cs = getComputedStyle(h);
    const data = { bg: cs.backgroundColor, color: cs.color, borderBottom: cs.borderBottomColor };
    const cta = Array.from(h.querySelectorAll('a')).find((a) => /get started/i.test(a.textContent));
    if (cta) {
      const ccs = getComputedStyle(cta);
      data.ctaGetStarted = { bg: ccs.backgroundColor, color: ccs.color };
    }
    const signIn = Array.from(h.querySelectorAll('a')).find((a) => /sign in/i.test(a.textContent));
    if (signIn) {
      const scs = getComputedStyle(signIn);
      data.signIn = { bg: scs.backgroundColor, color: scs.color, border: scs.borderColor };
    }
    return data;
  });
  await page.screenshot({ path: path.join(SHOTS_DIR, `${viewport.name}_scrolled.png`), clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, 220) } });

  // ---- HOVER STATE (desktop only) ----
  let hover = null;
  if (viewport.width >= 1024) {
    const firstLink = await page.$('header nav a');
    if (firstLink) {
      await firstLink.hover();
      await page.waitForTimeout(150);
      hover = await page.evaluate(() => {
        const link = document.querySelector('header nav a');
        return link ? { text: link.textContent.trim(), color: getComputedStyle(link).color } : null;
      });
    }
  }

  // ---- HORIZONTAL OVERFLOW ----
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  return {
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    errors,
    top,
    scrolled,
    hover,
    overflow: {
      scrollWidth: overflow.scrollWidth,
      clientWidth: overflow.clientWidth,
      hasOverflow: overflow.scrollWidth > overflow.clientWidth + 1,
    },
  };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];
  for (const v of VIEWPORTS) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await inspect(page, v));
  }
  await browser.close();

  let allPass = true;
  for (const r of results) {
    if (!r.top || !r.scrolled) {
      console.log(`[${r.viewport}] FAIL — header not found`);
      allPass = false;
      continue;
    }
    const topBlack = isBlackish(r.top.bg);
    const topBrandWhite = r.top.brand && isWhitish(r.top.brand.color);
    const topLinksWhite = (r.top.navLinks || []).every((l) => isWhitish(l.color));
    const topCtaWhiteBg = r.top.ctaGetStarted && isWhitish(r.top.ctaGetStarted.bg);
    const topCtaBlackText = r.top.ctaGetStarted && isBlackish(r.top.ctaGetStarted.color);
    const signInBlackBg = r.top.signIn && isBlackish(r.top.signIn.bg);
    const signInWhiteText = r.top.signIn && isWhitish(r.top.signIn.color);
    const signInBorderWhite = r.top.signIn && isNearWhiteBorder(r.top.signIn.border);

    const scrolledBlack = isBlackish(r.scrolled.bg);
    const scrolledCtaWhiteBg = r.scrolled.ctaGetStarted && isWhitish(r.scrolled.ctaGetStarted.bg);
    const scrolledCtaBlackText = r.scrolled.ctaGetStarted && isBlackish(r.scrolled.ctaGetStarted.color);

    const noOverflow = !r.overflow.hasOverflow;
    const noErrors = r.errors.length === 0;

    const pass =
      topBlack && topBrandWhite && topLinksWhite && topCtaWhiteBg && topCtaBlackText &&
      signInBlackBg && signInWhiteText && signInBorderWhite &&
      scrolledBlack && scrolledCtaWhiteBg && scrolledCtaBlackText &&
      noOverflow && noErrors;

    if (!pass) allPass = false;
    console.log(
      `[${r.viewport}] ${pass ? 'PASS' : 'FAIL'} ` +
      `topBg=${r.top.bg} brandColor=${r.top.brand && r.top.brand.color} ` +
      `linksWhite=${topLinksWhite} ` +
      `ctaBg=${r.top.ctaGetStarted && r.top.ctaGetStarted.bg} ` +
      `signInBg=${r.top.signIn && r.top.signIn.bg} border=${r.top.signIn && r.top.signIn.border} ` +
      `scrolledBg=${r.scrolled.bg} ` +
      `overflow=${r.overflow.hasOverflow ? 'YES' : 'no'} ` +
      `errors=${r.errors.length}`,
    );
    if (r.errors.length) console.log('  errors:', r.errors);
  }

  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${RESULT_FILE}`);
  process.exit(allPass ? 0 : 1);
})();