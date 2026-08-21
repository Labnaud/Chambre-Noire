// Regenerates docs/screenshots from synthetic demo data. Every bean, roaster
// and shot in demo-seed.mjs is invented; no real logbook data is involved.
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/demo-screenshots.mjs
//
// Needs Playwright's chromium, which is intentionally not a dependency of this
// project: install it outside the repo when you need to refresh the images.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { seed } from './demo-seed.mjs';

const APP_URL = 'http://127.0.0.1:4173/';
const OUT = process.argv[2] ?? 'docs/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const captured = [];

async function newPage(width, height, theme) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  ! pageerror:', e.message));
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.evaluate(({ data, theme }) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(data)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    if (theme) localStorage.setItem('chambre-noire-theme', theme);
  }, { data: seed, theme });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  return { ctx, page };
}

async function snapEl(page, selector, name) {
  const el = page.locator(selector).first();
  if (!(await el.count())) { console.log(`  ? no element ${selector}`); return; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const file = path.join(OUT, `${name}.png`);
  await el.screenshot({ path: file });
  captured.push(name);
  console.log(`  ${name}.png (${(fs.statSync(file).size / 1024).toFixed(0)} kB, element)`);
}

async function snap(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  captured.push(name);
  console.log(`  ${name}.png (${(fs.statSync(file).size / 1024).toFixed(0)} kB)`);
}

// Put a bean in the form so Smart Barista renders guidance instead of its
// empty state -- the guidance is the point of the panel.
async function selectBean(page, name) {
  const input = page.locator('#shot-bean-name');
  await input.fill(name);
  await input.press('Tab');
  // Dismiss the autocomplete list, which otherwise covers the panel below it.
  await page.locator('h1').first().click();
  await page.waitForTimeout(900);
}

{
  const { ctx, page } = await newPage(1360, 1040);
  await selectBean(page, 'Kirinyaga AB');
  await snap(page, 'dashboard');
  await snapEl(page, '.smart-barista', 'smart-barista');

  const expand = page.locator('button[title="Expand shot history"]');
  if (await expand.count()) {
    await expand.first().click();
    await page.waitForTimeout(1000);
    const row = page.locator('.modal-overlay .history-item__review').first();
    if (await row.count()) { await row.click(); await page.waitForTimeout(800); }
    await snap(page, 'shot-history');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  } else console.log('  ? expand button not found');

  for (const [title, name] of [
    ['Manage Bean Library', 'bean-library'],
    ['V60 brew protocols', 'brew-protocols'],
    ['View Statistics', 'stats'],
    ['Caffeine Tracker', 'caffeine'],
  ]) {
    const btn = page.locator(`button[title="${title}"]`);
    if (!(await btn.count())) { console.log(`  ? no button "${title}"`); continue; }
    await btn.first().click();
    await page.waitForTimeout(900);
    await snap(page, name);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  await ctx.close();
}

{
  const { ctx, page } = await newPage(1360, 1040, 'light');
  await selectBean(page, 'Guji Highland');
  await snap(page, 'theme-light');
  await ctx.close();
}

{
  const { ctx, page } = await newPage(390, 844);
  await snap(page, 'mobile');
  await ctx.close();
}

await browser.close();
console.log(`\n${captured.length} screenshots -> ${OUT}`);
