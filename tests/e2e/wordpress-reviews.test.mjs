// End-to-end tests of shared reviews, permissions and settings: a review
// made by one person is seen by another, in the editor and on the page;
// who may review is a setting; rules can be turned off; the background
// check can be turned off; the settings page passes the engine's checks.
// Same set-up as wordpress-editor.test.mjs. A second user, an Editor, is
// made for the tests and removed after.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM, POST_TYPICAL = '9' } = process.env;
const skip = !WP_URL && 'WP_URL is not set';
const EDITOR = { username: 'surea11y-editor', password: 'Surea11y-editor-pass-1', name: 'Eda Editor' };

let browser;
test.before(async () => {
  if (skip) return;
  browser = await chromium.launch({ executablePath: CHROMIUM });
});
test.after(async () => {
  if (browser) await browser.close();
});

async function login(user = WP_USER, pass = WP_PASS) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${WP_URL}/wp-login.php`);
  await page.fill('#user_login', user);
  await page.fill('#user_pass', pass);
  await Promise.all([page.waitForURL(/wp-admin/, { waitUntil: 'commit' }), page.click('#wp-submit')]);
  return { context, page };
}

async function editor(page, post = POST_TYPICAL, { open = true } = {}) {
  await page.goto(`${WP_URL}/wp-admin/post.php?post=${post}&action=edit`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.wp && window.wp.data && window.wp.data.select('core/block-editor').getBlocks().length > 0);
  await page.evaluate(() => {
    try {
      window.wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false);
    } catch {}
  });
  // A new user gets WordPress's welcome guide, a moment after the editor
  // loads: close it as a person would.
  const guide = page.locator('.components-modal__frame').getByRole('button', { name: 'Close' });
  for (let i = 0; i < 15 && !(await guide.count()); i++) await page.waitForTimeout(200);
  if (await guide.count()) await guide.first().click();
  // Another test user may hold the post's edit lock: take over (a link that
  // reloads the editor).
  const takeOver = page.getByText('Take over', { exact: true });
  if (await takeOver.count()) {
    await Promise.all([page.waitForURL(/get-post-lock|post\.php/), takeOver.first().click()]);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.wp && window.wp.data && window.wp.data.select('core/block-editor').getBlocks().length > 0);
  }
  if (open) {
    if (!(await page.locator('surea11y-results').count())) await page.getByRole('button', { name: 'Accessibility', exact: true }).first().click();
    await page.waitForFunction(() => document.querySelector('surea11y-results')?.state === 'done', null, { timeout: 30000 });
  }
}

/** Changes settings on the settings page, as an administrator would. */
async function setSettings(page, change) {
  await page.goto(`${WP_URL}/wp-admin/options-general.php?page=surea11y`);
  await change(page);
  await Promise.all([page.waitForURL(/settings-updated=true/), page.getByRole('button', { name: 'Save Changes' }).click()]);
}

async function resetSettings(page) {
  await setSettings(page, async (p) => {
    await p.getByLabel('Who sees the checker').selectOption('edit_posts');
    await p.getByLabel('Who can review findings').selectOption('publish_posts');
    await p.getByLabel('Check while the sidebar is closed').check();
    for (const box of await p.locator('ul.surea11y-rules input[type="checkbox"]').all()) await box.check();
  });
}

/** The editor user, made through the REST API from an admin's editor page. */
async function ensureEditorUser(page) {
  return page.evaluate(async (u) => {
    const found = await window.wp.apiFetch({ path: `/wp/v2/users?search=${u.username}&context=edit` });
    if (found.length) return found[0].id;
    const made = await window.wp.apiFetch({
      path: '/wp/v2/users',
      method: 'POST',
      data: { username: u.username, password: u.password, email: `${u.username}@example.invalid`, name: u.name, roles: ['editor'] }
    });
    return made.id;
  }, EDITOR);
}

/** Clears a post's reviews, so each test starts from none. */
async function clearReviews(page, post) {
  await page.evaluate(async (p) => {
    const r = await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}` });
    const keys = Object.keys(r.reviews);
    if (keys.length) await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}`, method: 'DELETE', data: { keys } });
  }, post);
}

const reviewsOf = (page, post) =>
  page.evaluate((p) => window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}` }).then((r) => r.reviews), post);

test('a review with a note is shared: another person sees who, when and the note, in the editor and on the page', { skip }, async () => {
  const admin = await login();
  await editor(admin.page, POST_TYPICAL, { open: false });
  await clearReviews(admin.page, POST_TYPICAL);
  await editor(admin.page);
  const userId = await ensureEditorUser(admin.page);
  // Review the bold line, with a note.
  const card = admin.page.locator('surea11y-results').locator('li.card', { hasText: 'This bold line comes before plain text' });
  await card.getByRole('button', { name: "Reviewed, it's fine" }).click();
  await admin.page.locator('surea11y-results').getByLabel('Note (optional)').fill('A styled lead-in, not a heading.');
  await admin.page.locator('surea11y-results').getByRole('button', { name: 'Save review' }).click();
  await admin.page.waitForFunction(async (p) => {
    const r = await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}` });
    return Object.keys(r.reviews).length > 0;
  }, POST_TYPICAL);
  const stored = await reviewsOf(admin.page, POST_TYPICAL);
  const [key] = Object.keys(stored);
  assert.match(key, /^p-as-heading\|/);
  assert.equal(stored[key].note, 'A styled lead-in, not a heading.');

  // The editor user sees it, in the editor.
  const eda = await login(EDITOR.username, EDITOR.password);
  await editor(eda.page);
  const reviewed = eda.page.locator('surea11y-results').locator('section[data-group="reviewed"]');
  await reviewed.getByRole('button', { expanded: false }).click();
  const seen = reviewed.locator('li.card', { hasText: 'This bold line comes before plain text' });
  await assert.doesNotReject(seen.waitFor());
  assert.match(await seen.locator('.review-meta').textContent(), /reviewed it on/);
  assert.equal(await seen.locator('.note').textContent(), 'A styled lead-in, not a heading.');
  // And on the page.
  await eda.page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
  await eda.page.locator('#wp-admin-bar-surea11y > a').click();
  await eda.page.waitForFunction(() => document.querySelector('[data-surea11y-panel]')?.shadowRoot.querySelector('surea11y-results')?.state === 'done', null, { timeout: 60000 });
  const onPage = await eda.page.evaluate(() => {
    const el = document.querySelector('[data-surea11y-panel]').shadowRoot.querySelector('surea11y-results');
    return el.cards.filter((c) => c.review).map((c) => c.ruleId);
  });
  assert.ok(onPage.includes('p-as-heading'), 'the same review applies on the published page');
  await eda.context.close();

  // Reopen, as the admin.
  await editor(admin.page);
  const sec = admin.page.locator('surea11y-results').locator('section[data-group="reviewed"]');
  await sec.getByRole('button', { expanded: false }).click();
  await sec.getByRole('button', { name: 'Reopen' }).first().click();
  await admin.page.waitForFunction(async (p) => {
    const r = await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}` });
    return Object.keys(r.reviews).length === 0;
  }, POST_TYPICAL);
  assert.ok(userId > 0);
  await admin.context.close();
});

test('who may review is a setting, and the site enforces it', { skip }, async () => {
  const admin = await login();
  await editor(admin.page, POST_TYPICAL, { open: false });
  await ensureEditorUser(admin.page);
  await setSettings(admin.page, (p) => p.getByLabel('Who can review findings').selectOption('manage_options'));
  try {
    const eda = await login(EDITOR.username, EDITOR.password);
    await editor(eda.page);
    const buttons = await eda.page.locator('surea11y-results').getByRole('button', { name: "Reviewed, it's fine" }).count();
    assert.equal(buttons, 0, 'no review button for an Editor');
    assert.ok((await eda.page.locator('surea11y-results').getByRole('button', { name: 'Hide for me' }).count()) > 0, 'hiding for oneself stays');
    const status = await eda.page.evaluate(async (p) => {
      try {
        await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}`, method: 'POST', data: { keys: ['x|y'], note: '' } });
        return 200;
      } catch (e) {
        return e.data ? e.data.status : 0;
      }
    }, POST_TYPICAL);
    assert.equal(status, 403, 'the site refuses a review from someone without the capability');
    await eda.context.close();
  } finally {
    await resetSettings(admin.page);
    await admin.context.close();
  }
});

test('a rule turned off in Settings is not checked', { skip }, async () => {
  const admin = await login();
  await setSettings(admin.page, (p) => p.getByLabel('Text styled to look like a heading should probably be a real heading').uncheck());
  try {
    await editor(admin.page);
    const ids = await admin.page.evaluate(() => document.querySelector('surea11y-results').findings.map((f) => f.ruleId));
    assert.ok(!ids.includes('p-as-heading'));
    assert.ok(ids.includes('td-has-header'), 'the others still are');
  } finally {
    await resetSettings(admin.page);
    await admin.context.close();
  }
});

test('without the background check, nothing runs until the sidebar opens', { skip }, async () => {
  const admin = await login();
  await setSettings(admin.page, (p) => p.getByLabel('Check while the sidebar is closed').uncheck());
  try {
    await editor(admin.page, POST_TYPICAL, { open: false });
    await admin.page.waitForTimeout(7000);
    assert.equal(await admin.page.locator('.surea11y-badge').count(), 0, 'no count: nothing was checked');
    assert.equal(await admin.page.evaluate(() => window.surea11yLastScan === undefined), true);
    await editor(admin.page);
    assert.ok(await admin.page.evaluate(() => document.querySelector('surea11y-results').findings.length > 0), 'opening the sidebar checks');
  } finally {
    await resetSettings(admin.page);
    await admin.context.close();
  }
});

test("the settings page passes the engine's own checks", { skip }, async () => {
  const admin = await login();
  await admin.page.goto(`${WP_URL}/wp-admin/options-general.php?page=surea11y`);
  const engine = fs.readFileSync(new URL('../../plugins/wordpress/build/engine.js', import.meta.url), 'utf8');
  await admin.page.addScriptTag({ content: engine });
  const own = await admin.page.evaluate(() => {
    const res = window.a11ycore.runa11yCoreInPage(location.href, '.wrap', { profile: 'wcag22-aa' }, null);
    return res.checksResults.filter((c) => c.outcome === 'fail').map((c) => `${c.ruleId}: ${(c.occurrences || []).map((o) => o.summary).join(' | ')}`);
  });
  assert.deepEqual(own, []);
  await admin.context.close();
});
