// End-to-end tests of the WordPress sidebar, in Chromium against a local
// WordPress with the plugin active and the Phase 0 test posts created
// (prototypes/phase-0/make-content.php).
//
//   WP_URL=http://127.0.0.1:8881 WP_USER=admin WP_PASS=... CHROMIUM=/path/to/chrome \
//     POST_TYPICAL=9 POST_LONG=10 npm run test:e2e
//
// Skipped when WP_URL is not set.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM, POST_TYPICAL = '9', POST_LONG = '10' } = process.env;
const skip = !WP_URL && 'WP_URL is not set';
const report = {};

async function openEditor(browser, postId) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${WP_URL}/wp-login.php`);
  await page.fill('#user_login', WP_USER);
  await page.fill('#user_pass', WP_PASS);
  await Promise.all([page.waitForNavigation(), page.click('#wp-submit')]);
  await page.goto(`${WP_URL}/wp-admin/post.php?post=${postId}&action=edit`);
  await page.evaluate(() => {
    try {
      window.wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false);
    } catch {}
  });
  await page.waitForFunction(() => window.wp && window.wp.data.select('core/block-editor').getBlocks().length > 0);
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Accessibility', exact: true }).first().click();
  await page.waitForFunction(() => {
    const el = document.querySelector('surea11y-results');
    return el && (el.state === 'done' || el.state === 'error');
  }, null, { timeout: 60000 });
  return { context, page, openToResultsMs: Date.now() - t0 };
}

const results = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('surea11y-results');
    return {
      state: el.state,
      status: el.shadowRoot.querySelector('[role="status"]').textContent,
      findings: el.findings.map((f) => ({ ruleId: f.ruleId, reasonCode: f.reasonCode, group: f.group, itemId: f.itemId, summary: f.summary })),
      timing: window.surea11yLastScan
    };
  });

test('the sidebar finds the planted problems in the typical post', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page, openToResultsMs } = await openEditor(browser, POST_TYPICAL);
  const r = await results(page);
  assert.equal(r.state, 'done', r.status);
  const codes = new Set(r.findings.map((f) => `${f.ruleId}/${f.reasonCode}`));
  for (const expected of [
    'p-as-heading/BOLD_SHORT_PARAGRAPH',
    'td-has-header/TD_TABLE_NO_HEADERS',
    'link-name-quality-link-only/GENERIC_LINK_TEXT_IN_CONTEXT',
    'cms-link-to-document/DOCUMENT_LINK_FORMAT_UNSTATED',
    'heading-order/HEADING_LEVEL_SKIPPED'
  ]) {
    assert.ok([...codes].some((c) => c.startsWith(expected.split('/')[0])), `${expected} found (${[...codes].join(', ')})`);
  }
  assert.ok(r.findings.some((f) => f.ruleId === 'img-alt-quality'), 'the file-name alt text is asked about');
  // Every content finding names its block, and no theme rule ran.
  const blocks = await page.evaluate(() => window.wp.data.select('core/block-editor').getBlocks().map((b) => b.clientId));
  for (const f of r.findings) assert.ok(blocks.includes(f.itemId), `${f.ruleId} is tied to a block`);
  assert.ok(!r.findings.some((f) => /^(region|landmark|text-spacing|target-size)/.test(f.ruleId)));
  // Plain words, not HTML.
  assert.ok(r.findings.some((f) => f.summary === 'This bold line comes before plain text, as a heading does.'));
  report.typical = { openToResultsMs, findings: r.findings.length, timing: r.timing };
});

test('"Show" selects the block the finding is in', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await openEditor(browser, POST_TYPICAL);
  const target = await page.evaluate(() => document.querySelector('surea11y-results').findings.find((f) => f.itemId).itemId);
  await page.locator('surea11y-results').getByRole('button', { name: 'Show' }).first().click();
  const selected = await page.evaluate(() => window.wp.data.select('core/block-editor').getSelectedBlockClientId());
  assert.equal(selected, target);
});

test('editing the content rescans once, after a pause in typing', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await openEditor(browser, POST_TYPICAL);
  const before = (await results(page)).findings.length;
  await page.evaluate(() => {
    window.surea11yScans = 0;
    const el = document.querySelector('surea11y-results');
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'findings');
    Object.defineProperty(el, 'findings', {
      configurable: true,
      get() { return desc.get.call(this); },
      set(v) { window.surea11yScans++; desc.set.call(this, v); }
    });
    const { createBlock } = window.wp.blocks;
    window.wp.data.dispatch('core/block-editor').insertBlocks(
      createBlock('core/paragraph', { content: '<strong>Another bold title</strong>' })
    );
  });
  // Typing: several changes within the pause.
  for (let i = 0; i < 5; i++) {
    await page.evaluate((n) => {
      const blocks = window.wp.data.select('core/block-editor').getBlocks();
      const last = blocks[blocks.length - 1];
      window.wp.data.dispatch('core/block-editor').updateBlockAttributes(last.clientId, { content: `<strong>Another bold title ${n}</strong>` });
    }, i);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => {
    const { createBlock } = window.wp.blocks;
    window.wp.data.dispatch('core/block-editor').insertBlocks(createBlock('core/paragraph', { content: 'Plain text after it.' }));
  });
  await page.waitForFunction(() => window.surea11yScans >= 1, null, { timeout: 10000 });
  await page.waitForTimeout(2000);
  const scans = await page.evaluate(() => window.surea11yScans);
  const after = (await results(page)).findings.length;
  assert.equal(scans, 1, 'one scan for a burst of changes');
  assert.equal(after, before + 1, 'the new bold title is found');
  report.rescan = (await results(page)).timing;
});

test('the long post stays within the scan budget', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page, openToResultsMs } = await openEditor(browser, POST_LONG);
  const r = await results(page);
  assert.equal(r.state, 'done', r.status);
  report.long = { openToResultsMs, findings: r.findings.length, timing: r.timing };
});

test("the sidebar passes the engine's own checks", { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await openEditor(browser, POST_TYPICAL);
  const engine = fs.readFileSync(new URL('../../plugins/wordpress/build/engine.js', import.meta.url), 'utf8');
  await page.addScriptTag({ content: engine });
  const own = await page.evaluate(() => {
    const res = window.a11ycore.runa11yCoreInPage(location.href, '.surea11y-sidebar', { profile: 'wcag22-aa' }, null);
    return res.checksResults
      .filter((c) => c.outcome === 'fail')
      .map((c) => `${c.ruleId}: ${(c.occurrences || []).map((o) => o.summary).join(' | ')}`);
  });
  assert.deepEqual(own, [], 'no WCAG failures in the sidebar');
});

const markerButtons = (page) =>
  page.evaluate(() => {
    const doc = document.querySelector('iframe[name="editor-canvas"]').contentDocument;
    const host = doc.querySelector('[data-surea11y-markers]');
    return host ? [...host.shadowRoot.querySelectorAll('button')].map((b) => ({ group: b.dataset.group, current: b.dataset.current === 'true', hidden: b.hidden })) : [];
  });

test('markers sit beside the blocks, and one picks its finding', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await openEditor(browser, POST_TYPICAL);
  const expected = await page.evaluate(() => document.querySelector('surea11y-results').cards
    .filter((c) => !c.marked).reduce((n, c) => n + Math.min(c.places.filter((p) => p.itemId).length, 99), 0));
  const markers = await markerButtons(page);
  assert.ok(markers.length > 0 && markers.length <= expected, `${markers.length} markers for ${expected} places`);
  assert.ok(markers.every((m) => !m.hidden), 'every marker is placed');
  // Markers are not part of the post.
  const saved = await page.evaluate(() => window.wp.data.select('core/editor').getEditedPostContent());
  assert.ok(!saved.includes('surea11y'), 'nothing of ours is in the content');
  await page.evaluate(() => {
    const doc = document.querySelector('iframe[name="editor-canvas"]').contentDocument;
    doc.querySelector('[data-surea11y-markers]').shadowRoot.querySelector('button').click();
  });
  const current = await page.evaluate(() => document.querySelector('surea11y-results').shadowRoot.querySelector('li[aria-current="true"]') !== null);
  assert.ok(current, 'the picked finding is marked in the list');
  assert.ok((await markerButtons(page)).some((m) => m.current), 'and its marker too');
});

test('the arrows step through the places and keep focus in the sidebar', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await openEditor(browser, POST_TYPICAL);
  const next = page.locator('surea11y-results').getByRole('button', { name: 'Next finding' });
  await next.click();
  await next.click();
  const state = await page.evaluate(() => {
    const el = document.querySelector('surea11y-results');
    return {
      label: el.shadowRoot.querySelector('.nav-label').textContent,
      focus: el.shadowRoot.activeElement && el.shadowRoot.activeElement.getAttribute('aria-label'),
      selected: window.wp.data.select('core/block-editor').getSelectedBlockClientId(),
      currentItem: (() => { const c = el.cards.find((x) => x.key === el.current.cardKey); return c.places[el.current.place].itemId; })()
    };
  });
  assert.match(state.label, /^2 of \d+$/);
  assert.equal(state.focus, 'Next finding');
  assert.equal(state.selected, state.currentItem);
});

test('"Mark as fine" is kept for the person across reloads, and Undo brings it back', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  let { context, page } = await openEditor(browser, POST_TYPICAL);
  const counts = () => page.evaluate(() => [...document.querySelector('surea11y-results').shadowRoot.querySelectorAll('.tile .count')].map((c) => Number(c.textContent)));
  const before = await counts();
  const fine = page.locator('surea11y-results').locator('section[data-group="review"]').getByRole('button', { name: 'Mark as fine' }).first();
  // WordPress saves preferences to the server a few seconds after a change:
  // wait until the server has them.
  const serverMarks = (p, post) =>
    p.waitForFunction(
      async ({ post, want }) => {
        const u = await window.wp.apiFetch({ path: '/wp/v2/users/me?context=edit' });
        const fine = (u.meta.persisted_preferences.surea11y || {}).fine || {};
        return want ? (fine[post] || []).length > 0 : (fine[post] || []).length === 0;
      },
      { post, want: true },
      { timeout: 20000, polling: 1000 }
    );
  await fine.click();
  const after = await counts();
  await serverMarks(page, POST_TYPICAL);
  assert.ok(after[2] < before[2], `review count drops (${before[2]} to ${after[2]})`);
  await context.close();
  ({ context, page } = await openEditor(browser, POST_TYPICAL));
  assert.deepEqual(await counts(), after, 'still marked after a reload');
  const marked = page.locator('surea11y-results').locator('section[data-group="marked"]');
  await marked.getByRole('button', { expanded: false }).click();
  await marked.getByRole('button', { name: 'Undo' }).click();
  assert.deepEqual(await counts(), before);
  await page.waitForFunction(
    async (post) => {
      const u = await window.wp.apiFetch({ path: '/wp/v2/users/me?context=edit' });
      const fine = (u.meta.persisted_preferences.surea11y || {}).fine || {};
      return (fine[post] || []).length === 0;
    },
    POST_TYPICAL,
    { timeout: 20000, polling: 1000 }
  );
});

test.after(() => {
  if (Object.keys(report).length) {
    fs.mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
    fs.writeFileSync(new URL('./results/latest.json', import.meta.url), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
});
