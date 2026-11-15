// End-to-end tests of the evidence trail: a save by hand records the check
// with the answers given so far, a save that changes nothing records
// nothing, the page check records too, and the record downloads as CSV and
// EARL. Same set-up as wordpress-editor.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM, POST_TYPICAL = '9' } = process.env;
const skip = !WP_URL && 'WP_URL is not set';

let browser;
test.before(async () => {
  if (skip) return;
  browser = await chromium.launch({ executablePath: CHROMIUM });
});
test.after(async () => {
  if (browser) await browser.close();
});

async function login() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true
  });
  const page = await context.newPage();
  await page.goto(`${WP_URL}/wp-login.php`);
  await page.fill('#user_login', WP_USER);
  await page.fill('#user_pass', WP_PASS);
  await Promise.all([
    page.waitForURL(/wp-admin/, { waitUntil: 'commit' }),
    page.click('#wp-submit')
  ]);
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

/** Saves by hand and waits for the record it makes, or skips. */
async function save(page) {
  await page.evaluate(() => {
    window.surea11yLastRecord = null;
    return window.wp.data.dispatch('core/editor').savePost();
  });
  await page.waitForFunction(() => window.surea11yLastRecord, null, { timeout: 30000 });
  return page.evaluate(() => window.surea11yLastRecord.added);
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

test(
  'a save records the check with its answers, once; it downloads as CSV and EARL',
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
    await editor(page);
    await save(page);
    assert.equal(await save(page), false, 'a save that changes nothing records nothing');

    // An answer, then a save: a new record, with the answer in it.
    const card = page
      .locator('surea11y-results')
      .locator('li.card', { hasText: 'This bold line comes before plain text' });
    await card.getByRole('button', { name: 'Check it' }).click();
    await card.locator('ol.steps li').first().waitFor();
    await card.getByLabel('Note (optional)').fill('A lead-in, not a title.');
    await card.getByRole('button', { name: "Yes, it's fine" }).click();
    await page.waitForFunction(async (p) => {
      const r = await window.wp.apiFetch({ path: `/surea11y/v1/reviews/${p}` });
      return Object.keys(r.reviews).length > 0;
    }, POST_TYPICAL);
    assert.equal(await save(page), true, 'the answer makes the record new');

    const panel = page.locator('.surea11y-evidence');
    assert.match(
      await panel.textContent(),
      /Last recorded .+ by .+: \d+ to fix, \d+ likely problems, \d+ needing a person\./
    );

    // CSV: a header, a row per place, and the answer with its note.
    const [csvFile] = await Promise.all([
      page.waitForEvent('download'),
      panel.getByRole('button', { name: 'Download as CSV' }).click()
    ]);
    assert.match(csvFile.suggestedFilename(), /^accessibility-.+\.csv$/);
    const csv = await (
      await csvFile.createReadStream()
    )
      .toArray()
      .then((c) => Buffer.concat(c).toString('utf8'));
    assert.equal(csv.charCodeAt(0), 0xfeff, 'a byte order mark, so spreadsheets read UTF-8');
    const lines = csv.trim().split('\r\n');
    assert.match(lines[0], /^"Recorded on \(UTC\)","Recorded by","Where"/);
    // Every record is in the file, oldest first: look at the latest.
    const latest = lines[lines.length - 1].split('","')[0];
    const answered = lines.filter(
      (l) => l.startsWith(latest) && l.includes('"p-as-heading"') && l.includes('"It\'s fine"')
    );
    assert.ok(answered.length > 0, 'the answer is in the record');
    assert.ok(
      answered.every((l) => l.includes('"1.3.1 (A)"') && l.includes('"A lead-in, not a title."'))
    );

    // EARL: the checker's assertions and the person's.
    const [earlFile] = await Promise.all([
      page.waitForEvent('download'),
      panel.getByRole('button', { name: 'Download as EARL' }).click()
    ]);
    const earl = JSON.parse(
      await (
        await earlFile.createReadStream()
      )
        .toArray()
        .then((c) => Buffer.concat(c).toString('utf8'))
    );
    const assertions = earl['@graph'][0].assertions;
    assert.ok(
      assertions.some(
        (a) =>
          a.mode === 'earl:automatic' && a.test.isPartOf?.includes('WCAG2:info-and-relationships')
      )
    );
    const manual = assertions.filter((a) => a.mode === 'earl:manual');
    assert.ok(
      manual.length > 0 &&
        manual.every((a) => a.result.outcome === 'earl:passed' && a.assertedBy.name)
    );
  }
);

test('a check of the page is recorded too', { skip }, async () => {
  const { context, page } = await login();
  await page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
  await page.locator('#wp-admin-bar-surea11y > a').click();
  await page.waitForFunction(() => window.surea11yLastRecord, null, { timeout: 60000 });
  const records = await page.evaluate(async (p) => {
    const cfg = JSON.parse(document.getElementById('surea11y-config').textContent);
    const root = cfg.restRoot.replace(/\/$/, '');
    const r = await fetch(root + `/surea11y/v1/evidence/${p}`, {
      headers: { 'X-WP-Nonce': cfg.restNonce }
    });
    return (await r.json()).records;
  }, POST_TYPICAL);
  assert.ok(
    records.some((r) => r.source === 'page'),
    'a record of the page'
  );
  await context.close();
});
