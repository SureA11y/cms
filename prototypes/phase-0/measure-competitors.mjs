// Phase 0: other checkers on the same posts, one active at a time.
// Usage: node measure-competitors.mjs <site> <node_modules> <wordpress dir> [cpu slowdown]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const [site, pwDir, wpDir, slow = '1'] = process.argv.slice(2);
const { chromium } = createRequire(pwDir + '/')('playwright-core');
const posts = JSON.parse(fs.readFileSync(new URL('./results/posts.json', import.meta.url)));
const sw = (plugin) => execFileSync('php', [new URL('./switch-plugin.php', import.meta.url).pathname, wpDir, plugin]).toString().trim();
const php = (code) => execFileSync('php', ['-r', `require "${wpDir}/wp-load.php"; ${code}`]).toString();

// Collects results and main-thread cost in every frame, from the first byte.
const INIT = () => {
  window.__comp = { events: [], longTaskMs: 0, longTasks: 0 };
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__comp.longTaskMs += e.duration; window.__comp.longTasks++; })).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
  const keep = (tool, list, extra) => window.__comp.events.push(Object.assign({ tool, at: performance.now(), items: list.map((r) => ({ test: r.test, type: r.type || (r.developer ? 'developer' : ''), tag: r.element && r.element.tagName })) }, extra || {}));
  document.addEventListener('ed11yResults', (e) => keep('editoria11y', e.detail.results || [], { userAction: e.detail.userAction }));
  document.addEventListener('sa11y-check-complete', (e) => keep('sa11y', e.detail.results || [], { reportedTime: e.detail.time }));
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-proxy-server'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(INIT);
const page = await context.newPage();
await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: Number(slow) });
await page.goto(site + '/wp-login.php');
await page.fill('#user_login', 'admin'); await page.fill('#user_pass', 'labpass123');
await Promise.all([page.waitForNavigation(), page.click('#wp-submit')]);

const pluginBytes = (dir) => page.evaluate((d) => {
  const all = [];
  const collect = (w) => { try { w.performance.getEntriesByType('resource').forEach((r) => { if (r.name.includes('/plugins/' + d + '/')) all.push(r.encodedBodySize || 0); }); } catch (e) {} };
  collect(window); document.querySelectorAll('iframe').forEach((f) => collect(f.contentWindow));
  return { files: all.length, bytes: all.reduce((a, b) => a + b, 0) };
}, dir);
const gather = () => page.evaluate(() => {
  const out = { events: [], longTaskMs: 0, longTasks: 0 };
  const add = (w) => { try { if (!w.__comp) return; out.events.push(...w.__comp.events); out.longTaskMs += w.__comp.longTaskMs; out.longTasks += w.__comp.longTasks; } catch (e) {} };
  add(window); document.querySelectorAll('iframe').forEach((f) => add(f.contentWindow));
  return out;
});
const tally = (items) => items.reduce((m, i) => { const k = i.test + (i.type ? ' [' + i.type + ']' : ''); m[k] = (m[k] || 0) + 1; return m; }, {});

const out = { cpuSlowdown: Number(slow), when: new Date().toISOString(), tools: {} };
const tools = [
  { name: 'editoria11y', plugin: 'editoria11y-wp/editoria11y.php', dir: 'editoria11y-wp', front: true, editor: true },
  { name: 'sa11y', plugin: 'sa11y-wp/sa11y-wp.php', dir: 'sa11y-wp', front: true, editor: false },
  { name: 'equalize', plugin: 'accessibility-checker/accessibility-checker.php', dir: 'accessibility-checker', front: false, editor: true, onSave: true },
  { name: 'none', plugin: 'none', dir: 'none', front: false, editor: true },
  { name: 'surea11y-probe', plugin: 'surea11y-probe/surea11y-probe.php', dir: 'surea11y-probe', front: false, editor: true },
].filter((t) => !process.env.TOOLS || process.env.TOOLS.split(',').includes(t.name));
for (const t of tools) {
  console.log(t.plugin === 'none' ? sw('none') || 'no checker active' : sw(t.plugin));
  await page.goto(site + '/wp-admin/'); // lets plugins run their admin setup
  out.tools[t.name] = {};
  for (const [name, id] of Object.entries(posts)) {
    const r = {};
    if (t.front) {
      const t0 = Date.now();
      await page.goto(`${site}/?p=${id}`);
      await page.waitForFunction(() => window.__comp && window.__comp.events.length, null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const g = await gather();
      const ev = g.events[g.events.length - 1];
      r.front = { msToResults: ev ? Math.round(ev.at) : null, reportedTime: ev && ev.reportedTime, wallMs: Date.now() - t0, longTaskMs: Math.round(g.longTaskMs), events: g.events.length, items: ev ? ev.items.length : 0, byTest: ev ? tally(ev.items) : {}, assets: await pluginBytes(t.dir) };
    }
    if (t.editor) {
      await page.goto(`${site}/wp-admin/post.php?post=${id}&action=edit`);
      await page.evaluate(() => { try { wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false); } catch (e) {} });
      await page.waitForSelector('iframe[name="editor-canvas"]', { timeout: 60000 });
      const frame = page.frame({ name: 'editor-canvas' });
      await frame.waitForSelector('.is-root-container [data-block]', { timeout: 60000 });
      await page.waitForTimeout(4000);
      let g = await gather();
      r.editorOpen = { events: g.events.length, longTaskMs: Math.round(g.longTaskMs), items: g.events.length ? g.events[g.events.length - 1].items.length : 0, byTest: g.events.length ? tally(g.events[g.events.length - 1].items) : {}, assets: await pluginBytes(t.dir) };
      // Type, then measure how long typing takes and what the checker reports.
      await frame.click('.is-root-container p');
      const before = g.events.length;
      const ts = Date.now();
      await page.keyboard.type(' Edited.', { delay: 20 });
      r.typeMs = Date.now() - ts;
      await page.waitForTimeout(3000);
      g = await gather();
      r.afterTyping = { newEvents: g.events.length - before };
      if (t.onSave) {
        php(`global $wpdb; $wpdb->query("DELETE FROM {$wpdb->prefix}accessibility_checker WHERE postid=${id}");`);
        const s0 = Date.now();
        await page.keyboard.press('Control+s');
        let rows = 0;
        for (let i = 0; i < 60 && !rows; i++) { await page.waitForTimeout(500); rows = Number(php(`global $wpdb; echo (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}accessibility_checker WHERE postid=${id}");`)); }
        await page.waitForTimeout(2000);
        const list = JSON.parse(php(`global $wpdb; echo wp_json_encode($wpdb->get_results("SELECT rule, ruletype, landmark FROM {$wpdb->prefix}accessibility_checker WHERE postid=${id}"));`));
        g = await gather();
        r.onSave = { msToStored: Date.now() - s0, rows: list.length, longTaskMs: Math.round(g.longTaskMs), byTest: list.reduce((m, x) => { const k = x.rule + ' [' + x.ruletype + (x.landmark ? ', ' + x.landmark : '') + ']'; m[k] = (m[k] || 0) + 1; return m; }, {}) };
      }
    }
    out.tools[t.name][name] = r;
    console.log(t.name, name, JSON.stringify({ front: r.front && { ms: r.front.msToResults, items: r.front.items, longTaskMs: r.front.longTaskMs }, editor: r.editorOpen && { items: r.editorOpen.items, longTaskMs: r.editorOpen.longTaskMs }, typeMs: r.typeMs, afterTyping: r.afterTyping, onSave: r.onSave && { ms: r.onSave.msToStored, rows: r.onSave.rows } }));
  }
}
console.log(sw('surea11y-probe/surea11y-probe.php'));
const file = new URL(`./results/raw/competitors-cpu${slow}x-${out.when.replace(/[:.]/g, '-')}.json`, import.meta.url);
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log('->', file.pathname);
await browser.close();
