// Phase 0: the sandbox approach. Usage: node measure-sandbox.mjs <site> <node_modules> [cpu slowdown]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const [site, pwDir, slow = '1'] = process.argv.slice(2);
const { chromium } = createRequire(pwDir + '/')('playwright-core');
const posts = JSON.parse(fs.readFileSync(new URL('./results/posts.json', import.meta.url)));
const CONTRAST = ['contrast-computable', 'contrast-enhanced', 'contrast-minimum'];
// Rules that judge the theme's CSS or layout rather than what the author wrote.
const THEME_LEVEL = ['text-spacing-content-loss', 'css-focus-indicator-suppressed', 'css-hidden-focus', 'focus-not-obscured-minimum', 'focus-not-obscured-enhanced', 'target-size-minimum', 'target-size-enhanced', 'identical-iframes-same-purpose', 'css-orientation-lock', 'aria-hidden-focus', 'iframe-focusable-content'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: Number(slow) });
await page.goto(site + '/wp-login.php');
await page.fill('#user_login', 'admin'); await page.fill('#user_pass', 'labpass123');
await Promise.all([page.waitForNavigation(), page.click('#wp-submit')]);
const out = { cpuSlowdown: Number(slow), when: new Date().toISOString(), sandbox: {} };
for (const [name, id] of Object.entries(posts)) {
  await page.goto(`${site}/wp-admin/post.php?post=${id}&action=edit`);
  await page.waitForFunction(() => window.__sureSandbox && wp.data.select('core/block-editor').getBlocks().length && document.querySelector('iframe[name="editor-canvas"]')?.contentDocument?.querySelector('.is-root-container [data-block]'), null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const first = await page.evaluate(() => __sureSandbox.scan());
  const warm = [];
  for (let i = 0; i < 4; i++) warm.push(await page.evaluate(() => __sureSandbox.scan()));
  const noContrast = await page.evaluate((x) => __sureSandbox.scan({ excludeRuleIds: x }), CONTRAST);
  const contentOnly = []; for (let i = 0; i < 3; i++) contentOnly.push(await page.evaluate((x) => __sureSandbox.scan({ excludeRuleIds: x }), THEME_LEVEL));
  const contentNoContrast = []; for (let i = 0; i < 3; i++) contentNoContrast.push(await page.evaluate((x) => __sureSandbox.scan({ excludeRuleIds: x }), THEME_LEVEL.concat(CONTRAST)));
  // An edit, then a rescan: type into the first paragraph.
  const frame = page.frame({ name: 'editor-canvas' });
  await frame.click('.is-root-container p');
  const typeStart = Date.now();
  await page.keyboard.type(' Edited text.', { delay: 20 });
  const typeMs = Date.now() - typeStart;
  const afterEdit = await page.evaluate(() => __sureSandbox.scan());
  const focusKept = await frame.evaluate(() => document.activeElement && document.activeElement.isContentEditable);
  out.sandbox[name] = { first, warmTotals: warm.map((w) => w.totalMs), warmScan: warm.map((w) => w.scanMs), last: warm[3], noContrast, contentOnly: contentOnly.map((x) => x.totalMs), contentOnlyByRule: contentOnly[0].byRule, contentNoContrast: contentNoContrast.map((x) => x.totalMs), afterEdit: { totalMs: afterEdit.totalMs, counts: afterEdit.counts }, typeMs, focusKeptInEditor: focusKept };
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(name, 'sandbox: setup', first.setupMs, 'ms; first total', first.totalMs, 'ms; warm total median', med(warm.map((w) => w.totalMs)), 'ms (serialize', warm[3].serializeMs, 'render', warm[3].renderMs, 'scan', warm[3].scanMs, '); no contrast', noContrast.totalMs, 'ms; elements', first.elements, '; mapped', first.mappedToBlock, '/', first.mappedToBlock + first.unmapped, '; focus kept', focusKept);
  console.log('   content-only', contentOnly.map((x) => x.totalMs).join(','), 'ms; content-only without contrast', contentNoContrast.map((x) => x.totalMs).join(','), 'ms; same findings:', JSON.stringify(contentOnly[0].byRule) === JSON.stringify(first.byRule));
}
const file = new URL(`./results/raw/sandbox-cpu${slow}x-${out.when.replace(/[:.]/g, '-')}.json`, import.meta.url);
fs.writeFileSync(file, JSON.stringify(out, null, 2));
await browser.close();
