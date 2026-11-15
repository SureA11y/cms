// End-to-end tests of the checker in the Site Editor: a template is rendered
// on the server and checked, without the findings a template alone would
// give (a second main region, no page title); problems added to a template
// part, unsaved, are found and named by their own block; and only people
// who can edit templates may render them. Needs a block theme (Twenty
// Twenty-Five); same set-up as wordpress-editor.test.mjs. Nothing is saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { siteContext, logIn } from './site.mjs';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM } = process.env;
const skip = !WP_URL && 'WP_URL is not set';
const THEME = process.env.WP_THEME || 'twentytwentyfive';
const EDITOR = {
  username: 'surea11y-editor',
  password: 'Surea11y-editor-pass-1',
  name: 'Eda Editor'
};

let browser;
test.before(async () => {
  if (skip) return;
  browser = await chromium.launch({ executablePath: CHROMIUM });
});
test.after(async () => {
  if (browser) await browser.close();
});

async function login(user = WP_USER, pass = WP_PASS) {
  const context = await siteContext(browser, { viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await logIn(page, user, pass);
  return { context, page };
}

/** Opens a template or template part in the Site Editor, with the sidebar's check done. */
async function siteEditor(page, path) {
  await page.goto(`${WP_URL}/wp-admin/site-editor.php?p=${encodeURIComponent(path)}&canvas=edit`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForFunction(
    () => window.wp?.data?.select('core/block-editor')?.getBlocks().length > 0,
    null,
    { timeout: 60000 }
  );
  await page.evaluate(() => {
    for (const key of ['welcomeGuide', 'welcomeGuideTemplate', 'welcomeGuidePage'])
      try {
        window.wp.data.dispatch('core/preferences').set('core/edit-site', key, false);
      } catch {}
  });
  if (!(await page.locator('surea11y-results').count())) {
    await page.getByRole('button', { name: 'Accessibility', exact: true }).first().click();
  }
  await page.waitForFunction(
    () => document.querySelector('surea11y-results')?.state === 'done',
    null,
    { timeout: 60000 }
  );
}

const findings = (page) =>
  page.evaluate(() =>
    document.querySelector('surea11y-results').findings.map((f) => ({
      ruleId: f.ruleId,
      group: f.group,
      itemId: f.itemId,
      itemLabel: f.itemLabel
    }))
  );

test(
  'a template is rendered and checked, without the findings of a template alone',
  { skip },
  async () => {
    const { context, page } = await login();
    await siteEditor(page, `/wp_template/${THEME}//page`);
    const scan = await page.evaluate(() => window.surea11yLastScan);
    assert.equal(scan.template, true, 'checked as a template');
    const ids = (await findings(page)).map((f) => f.ruleId);
    for (const rule of [
      'landmark-main-is-top-level',
      'landmark-no-duplicate-main',
      'page-title-present',
      'skip-link'
    ])
      assert.ok(!ids.includes(rule), `no ${rule}: the template's own main, and a page's parts`);
    await context.close();
  }
);

test(
  'problems added to a template part, unsaved, are found on their own blocks',
  { skip },
  async () => {
    const { context, page } = await login();
    await siteEditor(page, `/wp_template_part/${THEME}//header`);
    const planted = await page.evaluate(() => {
      const editor = window.wp.data.select('core/block-editor');
      const group = editor.getBlocks()[0];
      const at = editor.getBlocks(group.clientId).length;
      const image = window.wp.blocks.createBlock('core/image', {
        url: '/wp-includes/images/w-logo-blue.png',
        alt: 'IMG_2041.jpg'
      });
      const text = window.wp.blocks.createBlock('core/paragraph', {
        content: 'Open every day',
        style: { color: { text: '#c8c8c8' } }
      });
      window.wp.data
        .dispatch('core/block-editor')
        .insertBlocks([image, text], at, group.clientId, false);
      return { image: image.clientId, text: text.clientId };
    });
    await page.waitForFunction(
      (ids) => {
        const el = document.querySelector('surea11y-results');
        return (
          el.state === 'done' &&
          el.findings.some((f) => f.itemId === ids.image) &&
          el.findings.some((f) => f.itemId === ids.text)
        );
      },
      planted,
      { timeout: 30000 }
    );
    const all = await findings(page);
    const onImage = all.filter((f) => f.itemId === planted.image);
    const onText = all.filter((f) => f.itemId === planted.text);
    assert.ok(onImage.some((f) => f.ruleId === 'img-alt-quality' && f.itemLabel === 'Image'));
    assert.ok(onText.some((f) => f.ruleId === 'contrast-minimum' && f.group === 'problem'));
    // Leave without saving.
    page.on('dialog', (d) => d.accept());
    await context.close();
  }
);

test('only people who can edit templates may render them', { skip }, async () => {
  const admin = await login();
  await admin.page.goto(`${WP_URL}/wp-admin/post-new.php`, { waitUntil: 'domcontentloaded' });
  await admin.page.waitForFunction(() => window.wp && window.wp.apiFetch);
  await admin.page.evaluate(async (u) => {
    const found = await window.wp.apiFetch({
      path: `/wp/v2/users?search=${u.username}&context=edit`
    });
    if (!found.length)
      await window.wp.apiFetch({
        path: '/wp/v2/users',
        method: 'POST',
        data: {
          username: u.username,
          password: u.password,
          email: `${u.username}@example.invalid`,
          name: u.name,
          roles: ['editor']
        }
      });
  }, EDITOR);
  const render = (page) =>
    page.evaluate(async () => {
      try {
        await window.wp.apiFetch({
          path: '/surea11y/v1/render',
          method: 'POST',
          data: { items: [{ id: 'a1', markup: '<!-- wp:site-title /-->' }] }
        });
        return 200;
      } catch (e) {
        return e.data && e.data.status;
      }
    });
  assert.equal(await render(admin.page), 200, 'an administrator may');
  await admin.context.close();

  const editor = await login(EDITOR.username, EDITOR.password);
  await editor.page.goto(`${WP_URL}/wp-admin/post-new.php`, { waitUntil: 'domcontentloaded' });
  await editor.page.waitForFunction(() => window.wp && window.wp.apiFetch);
  assert.equal(await render(editor.page), 403, 'an editor, who cannot edit templates, may not');
  await editor.context.close();
});
