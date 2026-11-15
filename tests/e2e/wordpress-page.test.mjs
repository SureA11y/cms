// End-to-end tests of what SureA11y adds outside the sidebar: the count on
// the toolbar button, the pre-publish line, and the page checker on
// published pages and previews. Same set-up as wordpress-editor.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM, POST_TYPICAL = '9' } = process.env;
const skip = !WP_URL && 'WP_URL is not set';

async function login(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${WP_URL}/wp-login.php`);
  await page.fill('#user_login', WP_USER);
  await page.fill('#user_pass', WP_PASS);
  await Promise.all([page.waitForURL(/wp-admin/, { waitUntil: 'commit' }), page.click('#wp-submit')]);
  return { context, page };
}

async function editor(page, path) {
  await page.goto(`${WP_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.wp && window.wp.data && window.wp.data.select('core/block-editor').getBlocks);
  await page.evaluate(() => {
    try {
      window.wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false);
    } catch {}
  });
}

/** A draft with planted problems, made through the REST API; removed after. */
async function makeDraft(page) {
  return page.evaluate(async () => {
    const content = [
      '<!-- wp:paragraph --><p><strong>Opening times</strong></p><!-- /wp:paragraph -->',
      '<!-- wp:paragraph --><p>We open every day.</p><!-- /wp:paragraph -->',
      '<!-- wp:paragraph --><p>For the price list, <a href="https://example.org/prices.pdf">click here</a>.</p><!-- /wp:paragraph -->',
      '<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Skipped</h4><!-- /wp:heading -->'
    ].join('\n\n');
    const post = await window.wp.apiFetch({ path: '/wp/v2/posts', method: 'POST', data: { title: 'SureA11y draft', content, status: 'draft' } });
    return post.id;
  });
}
const removePost = (page, id) =>
  page.evaluate((i) => window.wp.apiFetch({ path: `/wp/v2/posts/${i}?force=true`, method: 'DELETE' }), id).catch(() => {});

test('the toolbar button shows what to fix or confirm, without opening the sidebar', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  const t0 = Date.now();
  await editor(page, `/wp-admin/post.php?post=${POST_TYPICAL}&action=edit`);
  await page.waitForSelector('.surea11y-badge', { timeout: 20000 });
  const badgeAfterMs = Date.now() - t0;
  const badge = Number(await page.textContent('.surea11y-badge'));
  assert.equal(await page.locator('surea11y-results').count(), 0, 'the sidebar is closed');
  await page.getByRole('button', { name: 'Accessibility', exact: true }).first().click();
  await page.waitForFunction(() => document.querySelector('surea11y-results')?.state === 'done');
  const tiles = await page.evaluate(() => [...document.querySelector('surea11y-results').shadowRoot.querySelectorAll('.tile .count')].map((c) => Number(c.textContent)));
  assert.equal(badge, tiles[0] + tiles[1], 'the count is "to fix" plus "likely"');
  console.log(JSON.stringify({ badgeAfterMs }));
});

test('the pre-publish checks show the counts, never block, and open the sidebar', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const { page } = await login(browser);
  await editor(page, '/wp-admin/post-new.php');
  const id = await makeDraft(page);
  t.after(async () => {
    await editor(page, '/wp-admin/post-new.php').catch(() => {});
    await removePost(page, id);
    await browser.close();
  });
  await editor(page, `/wp-admin/post.php?post=${id}&action=edit`);
  await page.getByRole('button', { name: 'Publish', exact: true }).first().click();
  const panel = page.locator('.surea11y-prepublish');
  await panel.waitFor();
  const status = panel.locator('[role="status"]');
  await page.waitForFunction(() => !/Checking/.test(document.querySelector('.surea11y-prepublish [role="status"]')?.textContent || 'Checking'));
  assert.match(await status.textContent(), /^To fix: \d+\. Likely problems to confirm: \d+\. Need a person: \d+\.$/);
  assert.match(await panel.textContent(), /This doesn't stop you publishing\./);
  // Publishing stays possible: the final Publish button is enabled.
  assert.ok(await page.locator('.editor-post-publish-panel__header-publish-button button, .editor-post-publish-panel__header-publish-button').first().isEnabled());
  await panel.getByRole('button', { name: 'Review in the Accessibility panel' }).click();
  await page.waitForFunction(() => document.querySelector('surea11y-results')?.state === 'done');
  assert.equal(await page.locator('.editor-post-publish-panel').count(), 0, 'the publish panel closed');
});

test('the page checker: in the toolbar on a published page, content and theme told apart', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  await page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
  const engineBefore = await page.evaluate(() => !!window.a11ycore);
  assert.equal(engineBefore, false, 'the engine loads only when asked');
  const item = page.locator('#wp-admin-bar-surea11y > a');
  await item.click();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-surea11y-panel]')?.shadowRoot.querySelector('surea11y-results');
    return el && (el.state === 'done' || el.state === 'error');
  }, null, { timeout: 60000 });
  const r = await page.evaluate(() => {
    const el = document.querySelector('[data-surea11y-panel]').shadowRoot.querySelector('surea11y-results');
    return {
      state: el.state,
      focus: document.querySelector('[data-surea11y-panel]').shadowRoot.activeElement?.tagName,
      findings: el.findings.map((f) => ({ ruleId: f.ruleId, outside: f.outside, label: f.itemLabel })),
      scanMs: window.surea11yLastPageScan.scanMs,
      edit: !!el.shadowRoot.querySelector('a.edit'),
      fine: [...el.shadowRoot.querySelectorAll('button')].some((b) => b.textContent === 'Mark as fine')
    };
  });
  assert.equal(r.state, 'done');
  assert.equal(r.focus, 'H2', 'focus moves to the panel heading');
  assert.ok(r.findings.some((f) => !f.outside && f.ruleId === 'p-as-heading'), 'content findings are found');
  assert.ok(r.findings.every((f) => f.label === (f.outside ? 'Theme or template' : 'Your content')));
  assert.ok(r.edit, 'content cards link to the editor');
  assert.equal(r.fine, false, 'marks are made in the editor');
  // Show scrolls to the element and frames it.
  await page.evaluate(() => document.querySelector('[data-surea11y-panel]').shadowRoot.querySelector('surea11y-results').shadowRoot.querySelector('.show').click());
  const framed = await page.evaluate(() => !!document.querySelector('[data-surea11y-markers]').shadowRoot.querySelector('.outline:not([hidden])'));
  assert.ok(framed, 'the place shown is framed');
  // Escape closes it and puts focus back on the toolbar item.
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.closest('#wp-admin-bar-surea11y') !== null), true);
  assert.equal(await page.locator('[data-surea11y-markers]').count(), 0, 'the markers go with it');
  console.log(JSON.stringify({ pageScanMs: Math.round(r.scanMs), findings: r.findings.length, theme: r.findings.filter((f) => f.outside).length }));
});

test('the page checker works on a preview of a draft', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const { page } = await login(browser);
  await editor(page, '/wp-admin/post-new.php');
  const id = await makeDraft(page);
  t.after(async () => {
    await editor(page, '/wp-admin/post-new.php').catch(() => {});
    await removePost(page, id);
    await browser.close();
  });
  await page.goto(`${WP_URL}/?p=${id}&preview=true`);
  await page.locator('#wp-admin-bar-surea11y > a').click();
  await page.waitForFunction(() => document.querySelector('[data-surea11y-panel]')?.shadowRoot.querySelector('surea11y-results')?.state === 'done', null, { timeout: 60000 });
  const ids = await page.evaluate(() => document.querySelector('[data-surea11y-panel]').shadowRoot.querySelector('surea11y-results').findings.filter((f) => !f.outside).map((f) => f.ruleId));
  for (const id of ['p-as-heading', 'link-name-quality-link-only', 'cms-link-to-document', 'heading-order']) {
    assert.ok(ids.includes(id), `${id} found in the draft's content`);
  }
});

test("the page panel passes the engine's own checks", { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  await page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
  await page.locator('#wp-admin-bar-surea11y > a').click();
  await page.waitForFunction(() => document.querySelector('[data-surea11y-panel]')?.shadowRoot.querySelector('surea11y-results')?.state === 'done', null, { timeout: 60000 });
  const own = await page.evaluate(() => {
    const res = window.a11ycore.runa11yCoreInPage(location.href, '[data-surea11y-panel]', { profile: 'wcag22-aa' }, null);
    return res.checksResults.filter((c) => c.outcome === 'fail').map((c) => `${c.ruleId}: ${(c.occurrences || []).map((o) => o.summary).join(' | ')}`);
  });
  assert.deepEqual(own, []);
});

test('visitors get nothing: no script, no toolbar item, no engine', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
  assert.equal(await page.locator('#surea11y-config, [data-surea11y-launcher], #wp-admin-bar-surea11y').count(), 0);
  assert.deepEqual(requests.filter((u) => /surea11y/.test(u)), []);
});
