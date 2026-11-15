// End-to-end tests of the site overview (Dashboard → Accessibility): it
// lists a checked post with its counts, the problems found on it, and an
// answer given since the check, which moves the place to "To fix"; and the
// page passes the engine's own checks. Same set-up as
// wordpress-editor.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { siteContext, logIn } from './site.mjs';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM, POST_TYPICAL = '9' } = process.env;
const skip = !WP_URL && 'WP_URL is not set';
const OVERVIEW = `${WP_URL}/wp-admin/index.php?page=surea11y-overview`;

let browser;
test.before(async () => {
  if (skip) return;
  browser = await chromium.launch({ executablePath: CHROMIUM });
});
test.after(async () => {
  if (browser) await browser.close();
});

async function login() {
  const context = await siteContext(browser, { viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await logIn(page, WP_USER, WP_PASS);
  return { context, page };
}

async function editor(page) {
  await page.goto(`${WP_URL}/wp-admin/post.php?post=${POST_TYPICAL}&action=edit`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForFunction(
    () =>
      window.wp &&
      window.wp.data &&
      window.wp.data.select('core/block-editor').getBlocks().length > 0
  );
  await page.evaluate(() => {
    try {
      window.wp.data.dispatch('core/preferences').set('core/edit-post', 'welcomeGuide', false);
    } catch {}
  });
  if (!(await page.locator('surea11y-results').count())) {
    await page.getByRole('button', { name: 'Accessibility', exact: true }).first().click();
  }
  await page.waitForFunction(
    () => document.querySelector('surea11y-results')?.state === 'done',
    null,
    { timeout: 30000 }
  );
}

const clearReviews = (page) =>
  page.evaluate(async (p) => {
    const r = await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}` });
    const keys = Object.keys(r.reviews);
    if (keys.length)
      await window.wp.apiFetch({
        path: `/surea11y/v1/reviews/${p}`,
        method: 'DELETE',
        data: { keys }
      });
  }, POST_TYPICAL);

/** The cells of the overview's table under a heading, row by row. */
const table = (page, heading) =>
  page.evaluate((heading) => {
    const h = [...document.querySelectorAll('.wrap h2')].find((e) => e.textContent === heading);
    const t = h && document.querySelector(`table[aria-labelledby="${h.id}"]`);
    return t
      ? [...t.tBodies[0].rows].map((r) => [...r.cells].map((c) => c.innerText.trim()))
      : null;
  }, heading);

test(
  'the overview lists a checked post, its problems and the latest answer',
  { skip },
  async (t) => {
    const { context, page } = await login();
    await editor(page);
    await clearReviews(page);
    t.after(async () => {
      // Whatever happened, leave no answer behind for the other tests.
      await clearReviews(page).catch(() => {});
      await context.close();
    });
    const title = await page.evaluate(() =>
      window.wp.data.select('core/editor').getEditedPostAttribute('title')
    );
    // A save by hand records the check, if it changed since the last.
    await page.evaluate(() => window.wp.data.dispatch('core/editor').savePost());
    await page.waitForFunction(() => !window.wp.data.select('core/editor').isSavingPost());

    await page.goto(OVERVIEW);
    await page.getByRole('heading', { level: 1, name: 'Accessibility overview' }).waitFor();
    const before = (await table(page, 'Pages with the most to fix')).find((r) =>
      r[0].startsWith(title)
    );
    assert.ok(before, 'the checked post is listed');
    const problems = await table(page, 'Problems found most often');
    const bold = problems.find((r) => r[0].includes('p-as-heading'));
    assert.ok(bold, 'a problem found on it is listed');
    assert.equal(bold[1], '1.3.1 (A)');
    assert.equal(bold[2], 'Content of each page');

    // An answer of "it's a problem": the place moves to To fix, and the
    // answer is listed with its note.
    await editor(page);
    const card = page
      .locator('surea11y-results')
      .locator('li.card', { hasText: 'This bold line comes before plain text' });
    await card.getByRole('button', { name: 'Check it' }).click();
    await card.locator('ol.steps li').first().waitFor();
    await card.getByLabel('Note (optional)').fill('Should be a heading.');
    await card.getByRole('button', { name: "No, it's a problem" }).click();
    await page.waitForFunction(async (p) => {
      const r = await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}` });
      return Object.keys(r.reviews).length > 0;
    }, POST_TYPICAL);

    await page.goto(OVERVIEW);
    const after = (await table(page, 'Pages with the most to fix')).find((r) =>
      r[0].startsWith(title)
    );
    // A card answers every place it groups: one or more.
    assert.ok(Number(after[1]) > Number(before[1]), 'more to fix');
    const answers = await table(page, 'Latest answers');
    const mine = answers.find((r) => r[5] === 'Should be a heading.');
    assert.ok(mine, 'the answer is listed with its note');
    assert.ok(mine[1].startsWith(title));
    assert.equal(mine[3], "It's a problem");
  }
);

test("the overview passes the engine's own checks", { skip }, async () => {
  const { context, page } = await login();
  await page.goto(OVERVIEW);
  const engine = fs.readFileSync(
    new URL('../../plugins/wordpress/build/engine.js', import.meta.url),
    'utf8'
  );
  await page.addScriptTag({ content: engine });
  const own = await page.evaluate(() => {
    const res = window.a11ycore.runa11yCoreInPage(
      location.href,
      '.wrap',
      { profile: 'wcag22-aa' },
      null
    );
    return res.checksResults
      .filter((c) => c.outcome === 'fail')
      .map((c) => `${c.ruleId}: ${(c.occurrences || []).map((o) => o.summary).join(' | ')}`);
  });
  assert.deepEqual(own, []);
  await context.close();
});
