// Phase 0: where the sandbox scan spends its time, rule by rule (long post).
// Usage: node profile-rules.mjs <site> <node_modules>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const [site, pwDir] = process.argv.slice(2);
const { chromium } = createRequire(pwDir + '/')('playwright-core');
const posts = JSON.parse(fs.readFileSync(new URL('./results/posts.json', import.meta.url)));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-proxy-server'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(site + '/wp-login.php');
await page.fill('#user_login', 'admin'); await page.fill('#user_pass', 'labpass123');
await Promise.all([page.waitForNavigation(), page.click('#wp-submit')]);
await page.goto(`${site}/wp-admin/post.php?post=${posts.long}&action=edit`);
await page.waitForFunction(() => window.__sureSandbox && document.querySelector('iframe[name="editor-canvas"]')?.contentDocument?.querySelector('.is-root-container [data-block]'), null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => __sureSandbox.scan());
const prof = await page.evaluate(() => {
  const f = document.querySelector('iframe[title="SureA11y sandbox"]');
  const w = f.contentWindow;
  const t0 = performance.now();
  const r = w.a11ycore.runa11yCoreInPage(location.href, '#sa11y-content', { perfStats: true, profileRules: true }, null);
  const total = performance.now() - t0;
  const ps = r.perfStats || {};
  const rules = ps.rules || ps.ruleTimings || ps.perRule || null;
  return { total: Math.round(total), keys: Object.keys(ps), warmUpMs: ps.warmUpMs, rules };
});
let list = [];
if (Array.isArray(prof.rules)) list = prof.rules.map((x) => [x.ruleId || x.id, x.ms ?? x.durationMs ?? x.time]);
else if (prof.rules) list = Object.entries(prof.rules).map(([k, v]) => [k, typeof v === 'number' ? v : (v.ms ?? v.durationMs ?? v.time)]);
list.sort((a, b) => b[1] - a[1]);
const sum = list.reduce((a, x) => a + (x[1] || 0), 0);
console.log('total', prof.total, 'ms; warm-up', prof.warmUpMs, 'ms; rules timed', list.length, 'sum', Math.round(sum), 'ms; perfStats keys', prof.keys.join(','));
console.log(list.slice(0, 15).map((x) => x[0] + ' ' + Math.round(x[1])).join('\n'));
fs.writeFileSync(new URL('./results/raw/profile-long.json', import.meta.url), JSON.stringify({ total: prof.total, warmUpMs: prof.warmUpMs, rules: list }, null, 2));
await browser.close();
