// Phase 0 measurements in a real Chromium against a local WordPress with the
// probe plugin active. Usage:
//   node measure.mjs <site url> <playwright-core folder> [cpu slowdown]
// Writes results/raw/<timestamp>.json and prints a summary.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const [site, pwDir, slow = '1'] = process.argv.slice(2);
const require = createRequire(pwDir + '/');
const { chromium } = require('playwright-core');
const posts = JSON.parse(fs.readFileSync(new URL('./results/posts.json', import.meta.url)));
const CONTRAST = ['contrast-computable', 'contrast-enhanced', 'contrast-minimum'];
const LIVE_PAGE = ['css-hidden-focus', 'aria-hidden-focus', 'iframe-focusable-content', 'text-spacing-content-loss', 'focus-not-obscured-minimum', 'focus-not-obscured-enhanced'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(slow) });

await page.goto(site + '/wp-login.php');
await page.fill('#user_login', 'admin');
await page.fill('#user_pass', 'labpass123');
await Promise.all([page.waitForNavigation(), page.click('#wp-submit')]);

const out = { site, cpuSlowdown: Number(slow), when: new Date().toISOString(), bundle: null, editor: {}, front: {} };

// Bundle cost on its own: fetch once, then evaluate it cold in fresh pages.
{
  const p = await context.newPage();
  const c = await context.newCDPSession(p);
  await c.send('Emulation.setCPUThrottlingRate', { rate: Number(slow) });
  const evals = [];
  for (let i = 0; i < 3; i++) {
    await p.goto(site + '/wp-content/plugins/surea11y-probe/blank.html');
    evals.push(await p.evaluate(async () => {
      const text = await (await fetch('vendor/surea11y.browser.js')).text();
      const t0 = performance.now();
      (0, eval)(text);
      return Math.round(performance.now() - t0);
    }));
  }
  out.bundle = { evalMs: evals };
  await p.close();
}

async function canvasFrame() {
  await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 60000 });
  const frame = page.frame({ name: 'editor-canvas' });
  await frame.waitForFunction(() => window.__sureProbe && document.querySelector('.is-root-container [data-block]'), null, { timeout: 60000 });
  return frame;
}

for (const [name, id] of Object.entries(posts)) {
  // Editor
  const t0 = Date.now();
  await page.goto(`${site}/wp-admin/post.php?post=${id}&action=edit`);
  await page.evaluate(() => { try { wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false); } catch (e) {} });
  const frame = await canvasFrame();
  await frame.waitForTimeout(1500); // let the editor settle
  const scope = '.is-root-container';
  const e = { editorReadyMs: Date.now() - t0 };
  e.elements = await frame.evaluate((s) => __sureProbe.elementCount(s), scope);
  e.resources = await frame.evaluate(() => __sureProbe.resources());
  e.all = await frame.evaluate((s) => __sureProbe.measure({ scope: s, runs: 5 }), scope);
  e.noContrast = await frame.evaluate(([s, x]) => __sureProbe.measure({ scope: s, runs: 5, excludeRuleIds: x }), [scope, CONTRAST]);
  e.noContrastNoLivePage = await frame.evaluate(([s, x]) => __sureProbe.measure({ scope: s, runs: 5, excludeRuleIds: x }), [scope, CONTRAST.concat(LIVE_PAGE)]);
  e.compact = await frame.evaluate((s) => __sureProbe.measure({ scope: s, runs: 2, compact: true }), scope);
  e.spanish = await frame.evaluate((s) => __sureProbe.measure({ scope: s, runs: 2, locale: 'es' }), scope);
  e.howToCheck = await frame.evaluate((s) => __sureProbe.howToCheck({ scope: s }), scope);
  out.editor[name] = e;

  // Front end, logged in
  await page.goto(`${site}/?p=${id}`);
  await page.waitForFunction(() => window.__sureProbe);
  const fscope = '.wp-block-post-content';
  const f = {};
  f.elementsContent = await page.evaluate((s) => __sureProbe.elementCount(s), fscope);
  f.elementsPage = await page.evaluate(() => __sureProbe.elementCount(null));
  f.scoped = await page.evaluate((s) => __sureProbe.measure({ scope: s, runs: 3 }), fscope);
  f.wholePage = await page.evaluate((s) => __sureProbe.measure({ runs: 3, scope: null }), fscope);
  // attribute whole-page findings against the content area
  f.wholePageAttribution = await page.evaluate((s) => {
    const r = window.a11ycore.runa11yCoreInPage(location.href, null, { locale: 'en' }, null);
    const scopeEl = document.querySelector(s); const tally = { content: 0, template: 0 };
    r.checksResults.forEach((c) => (c.occurrences || []).forEach((o) => {
      if (!['fail', 'cantTell'].includes(o.occurrenceOutcome || c.outcome)) return;
      let el = null; try { el = document.querySelector(o.selector); } catch (x) {}
      tally[el && scopeEl && scopeEl.contains(el) ? 'content' : 'template']++;
    }));
    return tally;
  }, fscope);
  out.front[name] = f;
  console.log(name, 'editor', e.elements, 'el, first', e.all.firstMs, 'ms, median', e.all.medianMs, 'ms, no contrast', e.noContrast.medianMs, 'ms; front scoped', f.scoped.medianMs, 'ms, whole', f.wholePage.medianMs, 'ms');
}

fs.mkdirSync(new URL('./results/raw/', import.meta.url), { recursive: true });
const file = new URL(`./results/raw/cpu${slow}x-${out.when.replace(/[:.]/g, '-')}.json`, import.meta.url);
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log('bundle eval ms', out.bundle.evalMs.join(', '), '->', file.pathname);
await browser.close();
