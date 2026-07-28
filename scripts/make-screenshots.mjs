// Captures App Store 6.5" screenshots (1242x2688 = 414x896 @3x) from the
// running expo web server on :8094 using headless Chrome.
// Run: node scripts/make-screenshots.mjs   (start-web.cmd must be up)
//
// Flag note: iOS draws 🇺🇸 from its own colour emoji font, but Windows has no
// glyphs for regional-indicator pairs and Chrome here cannot rasterise a
// colour-bitmap font either — flags come out as "US" or as nothing at all. So
// just before each capture we swap those glyphs for Twemoji SVGs. The shipped
// app is untouched; this only makes the capture look like the device does.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'screenshots', '6.5');
const SVG_DIR = join(root, 'node_modules/@discordapp/twemoji/dist/svg');
mkdirSync(OUT, { recursive: true });

const URL = 'http://localhost:8094';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const RATE_HOSTS = ['open.er-api.com', 'cdn.jsdelivr.net'];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--force-color-profile=srgb', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 3 });
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'dark' },
]);

// Screenshot 05 needs the app to fail its rate fetch; the others must not.
let offline = false;
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (offline && RATE_HOSTS.some((h) => req.url().includes(h))) req.abort();
  else req.continue();
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Matches a leaf element holding exactly one emoji (flag pair or single). */
const EMOJI_ONLY = '^(?:[\\u{1F1E6}-\\u{1F1FF}]{2}|[\\u{1F300}-\\u{1FAFF}])$';

/**
 * Replace emoji glyphs in the page with Twemoji SVG images.
 * Must run last before a capture: any React re-render undoes it.
 */
async function substituteEmoji() {
  const needed = await page.evaluate((pattern) => {
    const re = new RegExp(pattern, 'u');
    const found = new Set();
    for (const el of document.querySelectorAll('div, span')) {
      if (el.children.length) continue;
      const text = el.textContent ?? '';
      if (re.test(text)) found.add(text);
    }
    return [...found];
  }, EMOJI_ONLY);

  const map = {};
  for (const emoji of needed) {
    const hex = [...emoji]
      .map((c) => c.codePointAt(0).toString(16))
      .join('-');
    const file = join(SVG_DIR, `${hex}.svg`);
    if (!existsSync(file)) {
      console.warn(`  no twemoji svg for ${hex}`);
      continue;
    }
    map[emoji] =
      'data:image/svg+xml;base64,' + readFileSync(file).toString('base64');
  }

  const replaced = await page.evaluate(
    (m, pattern) => {
      const re = new RegExp(pattern, 'u');
      let n = 0;
      for (const el of document.querySelectorAll('div, span')) {
        if (el.children.length) continue;
        const text = el.textContent ?? '';
        if (!re.test(text) || !m[text]) continue;
        const size = parseFloat(getComputedStyle(el).fontSize) || 26;
        const img = document.createElement('img');
        img.src = m[text];
        img.style.width = `${size}px`;
        img.style.height = `${size}px`;
        img.style.display = 'block';
        el.textContent = '';
        el.appendChild(img);
        n++;
      }
      return n;
    },
    map,
    EMOJI_ONLY
  );

  if (replaced === 0) throw new Error('no emoji were substituted');

  // Chrome paints a focus ring on whatever we last clicked; iOS does not.
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    const style = document.createElement('style');
    style.textContent = '*, *:focus, *:focus-visible { outline: none !important; }';
    document.head.appendChild(style);
  });

  await wait(250); // let the inline SVGs decode
  return replaced;
}

/** Seed the app's stored state, reload, and wait for it to settle. */
async function load({ codes, active, expr, keepRates = true }) {
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(
    (prefs, keep) => {
      const rates = localStorage.getItem('cc.rates.v1');
      localStorage.clear();
      if (keep && rates) localStorage.setItem('cc.rates.v1', rates);
      localStorage.setItem('cc.prefs.v1', JSON.stringify(prefs));
    },
    { codes, active, expr },
    keepRates
  );
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => document.body.innerText.includes('Add currency'),
    { timeout: 30000 }
  );
  await wait(1400); // rate fetch + layout settle
}

async function press(label) {
  await page.evaluate((l) => {
    const el = document.querySelector(`[aria-label="${l}"]`);
    if (!el) throw new Error('no element for ' + l);
    const o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }, label);
}

async function shot(name) {
  const n = await substituteEmoji();
  await page.screenshot({ path: join(OUT, name) });
  console.log(`${name} (${n} flags)`);
}

// 01 — the pitch: one amount, five currencies, all live at once
await load({ codes: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'], active: 'USD', expr: '100' });
await shot('01-main.png');

// 02 — the calculator running inside the amount field
await load({ codes: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'], active: 'USD', expr: '48.50×3' });
await shot('02-calc.png');

// 03 — searching the full currency list
await load({ codes: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'], active: 'USD', expr: '100' });
await press('Add a currency');
await wait(900);
await page.evaluate(() => {
  const input = document.querySelector('input');
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  setter.call(input, 'dollar');
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(900);
await shot('03-picker.png');

// 04 — a long, real traveller's list
await load({
  codes: ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'THB', 'AUD', 'MXN', 'INR'],
  active: 'EUR',
  expr: '250',
});
await shot('04-many.png');

// 05 — offline: cached/bundled rates keep working with no signal
offline = true;
await load({
  codes: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'],
  active: 'USD',
  expr: '100',
  keepRates: false,
});
await wait(1200);
await shot('05-offline.png');

await browser.close();
console.log('done ->', OUT);
