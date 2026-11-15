// End-to-end tests of the editor's deeper checks: contrast run apart for
// the author's colours, findings named by their own inner block, settings
// opened from a finding, and marks that survive a reload on any element.
// Same set-up as wordpress-editor.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM, POST_TYPICAL = '9' } = process.env;
const skip = !WP_URL && 'WP_URL is not set';
const report = {};

async function login(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${WP_URL}/wp-login.php`);
  await page.fill('#user_login', WP_USER);
  await page.fill('#user_pass', WP_PASS);
  await Promise.all([page.waitForURL(/wp-admin/, { waitUntil: 'commit' }), page.click('#wp-submit')]);
  return { context, page };
}

async function editor(page, path, { open = true } = {}) {
  await page.goto(`${WP_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.wp && window.wp.data && window.wp.data.select('core/block-editor').getBlocks);
  await page.evaluate(() => {
    try {
      window.wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false);
    } catch {}
  });
  if (open) await openSidebar(page);
}

async function openSidebar(page) {
  if (!(await page.locator('surea11y-results').count())) {
    await page.getByRole('button', { name: 'Accessibility', exact: true }).first().click();
  }
  await waitDone(page);
}

const waitDone = (page) =>
  page.waitForFunction(() => document.querySelector('surea11y-results')?.state === 'done', null, { timeout: 30000 });

/** Waits for the check after an edit: the next scan's timing replaces the last. */
async function checkAfterEdit(page, edit) {
  await page.evaluate(() => {
    window.__lastScan = window.surea11yLastScan;
  });
  await page.evaluate(edit);
  await page.waitForFunction(() => window.surea11yLastScan !== window.__lastScan, null, { timeout: 15000 });
  await waitDone(page);
  return page.evaluate(() => ({
    timing: window.surea11yLastScan,
    findings: document.querySelector('surea11y-results').findings.map((f) => ({ ruleId: f.ruleId, itemId: f.itemId, label: f.itemLabel }))
  }));
}

test('contrast runs only for the author\'s colours, and only when they change', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  await editor(page, '/wp-admin/post-new.php');
  // A plain paragraph: no contrast check at all.
  let r = await checkAfterEdit(page, () => {
    const { createBlock } = window.wp.blocks;
    window.wp.data.dispatch('core/block-editor').insertBlocks(createBlock('core/paragraph', { content: 'Plain text.' }));
  });
  assert.equal(r.timing.contrastRan, false);
  assert.equal(r.timing.coloured, 0);
  // Pale text on white, chosen by the author: found.
  r = await checkAfterEdit(page, () => {
    const { createBlock } = window.wp.blocks;
    window.wp.data
      .dispatch('core/block-editor')
      .insertBlocks(createBlock('core/paragraph', { content: 'Pale text.', style: { color: { text: '#cccccc', background: '#ffffff' } } }));
  });
  assert.equal(r.timing.contrastRan, true);
  assert.ok(r.findings.some((f) => f.ruleId === 'contrast-minimum'), 'the pale text is found');
  assert.ok(!r.findings.some((f) => f.ruleId === 'contrast-enhanced'), 'no AAA rule joins in');
  report.contrastMs = Math.round(r.timing.contrastMs);
  // Editing another block: the contrast finding stays, without a new contrast check.
  r = await checkAfterEdit(page, () => {
    const blocks = window.wp.data.select('core/block-editor').getBlocks();
    window.wp.data.dispatch('core/block-editor').updateBlockAttributes(blocks[0].clientId, { content: 'Plain text, edited.' });
  });
  assert.equal(r.timing.contrastRan, false);
  assert.ok(r.findings.some((f) => f.ruleId === 'contrast-minimum'), 'still listed');
});

test('a finding inside a group or columns names its own block, and Show selects it', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  await editor(page, '/wp-admin/post-new.php');
  const ids = await page.evaluate(() => {
    const { createBlock } = window.wp.blocks;
    const img = createBlock('core/image', { url: '/wp-content/uploads/x.png', alt: 'IMG_1234.png' });
    const group = createBlock('core/group', {}, [
      createBlock('core/columns', {}, [createBlock('core/column', {}, [img]), createBlock('core/column', {}, [createBlock('core/paragraph', { content: 'Beside it.' })])])
    ]);
    window.wp.data.dispatch('core/block-editor').insertBlocks(group);
    return { img: img.clientId, group: group.clientId };
  });
  await page.waitForFunction((id) => document.querySelector('surea11y-results')?.findings.some((f) => f.itemId === id), ids.img, { timeout: 15000 });
  const finding = await page.evaluate((id) => {
    const f = document.querySelector('surea11y-results').findings.find((x) => x.itemId === id);
    return { ruleId: f.ruleId, label: f.itemLabel, html: f.html };
  }, ids.img);
  assert.equal(finding.label, 'Image');
  assert.doesNotMatch(finding.html, /data-surea11y-item/, 'the tag is not part of the finding');
  await page.locator('surea11y-results').locator('li.card', { hasText: 'IMG_1234.png' }).getByRole('button', { name: 'Show' }).click();
  assert.equal(await page.evaluate(() => window.wp.data.select('core/block-editor').getSelectedBlockClientId()), ids.img);
  // Nothing of the checker in what is saved.
  const saved = await page.evaluate(() => window.wp.data.select('core/editor').getEditedPostContent());
  assert.doesNotMatch(saved, /surea11y/);
});

test('a finding opens the setting that fixes it, with focus on the field', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  for (const [action, expected] of [
    ['Edit the alternative text', { tag: 'TEXTAREA', label: 'Alternative text', block: 'core/image' }],
    ['Open the header setting', { tag: 'INPUT', label: 'Header section', block: 'core/table' }]
  ]) {
    await editor(page, `/wp-admin/post.php?post=${POST_TYPICAL}&action=edit`);
    await page.locator('surea11y-results').getByRole('button', { name: action }).first().click();
    await page.waitForFunction((tag) => document.activeElement && document.activeElement.tagName === tag, expected.tag, { timeout: 5000 });
    const r = await page.evaluate(() => {
      const a = document.activeElement;
      return {
        tag: a.tagName,
        label: (a.id && document.querySelector(`label[for="${a.id}"]`)?.textContent.trim()) || '',
        block: window.wp.data.select('core/block-editor').getSelectedBlock()?.name
      };
    });
    assert.deepEqual(r, expected, action);
  }
});

test('"Mark as fine" on a whole block survives a reload: the item id is not part of a finding', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  let { context, page } = await login(browser);
  await editor(page, `/wp-admin/post.php?post=${POST_TYPICAL}&action=edit`);
  const counts = () => page.evaluate(() => [...document.querySelector('surea11y-results').shadowRoot.querySelectorAll('.tile .count')].map((c) => Number(c.textContent)));
  const serverMarks = (want) =>
    page.waitForFunction(
      async ({ post, want }) => {
        const u = await window.wp.apiFetch({ path: '/wp/v2/users/me?context=edit' });
        const fine = (u.meta.persisted_preferences.surea11y || {}).fine || {};
        return want ? (fine[post] || []).length > 0 : (fine[post] || []).length === 0;
      },
      { post: POST_TYPICAL, want },
      { timeout: 20000, polling: 1000 }
    );
  const before = await counts();
  // The bold-line finding is on the <p> itself, the block's own element.
  const card = page.locator('surea11y-results').locator('li.card', { hasText: 'This bold line comes before plain text' });
  await card.getByRole('button', { name: 'Mark as fine' }).click();
  const after = await counts();
  assert.ok(after[2] < before[2]);
  await serverMarks(true);
  await context.close();
  ({ context, page } = await login(browser));
  await editor(page, `/wp-admin/post.php?post=${POST_TYPICAL}&action=edit`);
  assert.deepEqual(await counts(), after, 'still marked after a reload, with new block ids');
  const marked = page.locator('surea11y-results').locator('section[data-group="marked"]');
  await marked.getByRole('button', { expanded: false }).click();
  await marked.getByRole('button', { name: 'Undo' }).click();
  assert.deepEqual(await counts(), before);
  await serverMarks(false);
});

test.after(() => {
  if (Object.keys(report).length) console.log(JSON.stringify(report));
});
