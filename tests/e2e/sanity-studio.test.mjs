// The Sanity plugin in a real Studio (dev/sanity-studio), on the test
// project: the header button's count, the side panel's findings named by
// field, the line under a field, Show framing the field, an answer saved in
// the project, and "Hide for me" kept after a reload.
//
// Runs when SANITY_STUDIO_URL is set (the dev Studio, for example
// http://localhost:3333); skipped otherwise. The Studio needs to be logged
// in: SANITY_TOKEN, or an environment whose proxy adds the token.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { seed, api, article, DATASET } from '../../dev/sanity-studio/seed.mjs';

const { SANITY_STUDIO_URL, CHROMIUM, HTTPS_PROXY, SANITY_TOKEN } = process.env;
const skip = !SANITY_STUDIO_URL && 'SANITY_STUDIO_URL is not set';
const REVIEW_ID = `surea11y.review.${article._id}`;

async function studio(browser, colorScheme = 'light') {
  const context = await browser.newContext({
    ignoreHTTPSErrors: !!HTTPS_PROXY,
    viewport: { width: 1440, height: 1000 },
    colorScheme
  });
  // Live updates as one short reply each, not a held-open stream. Through a
  // proxy the browser has six connections per host, and the Studio's
  // streams would take them all; the test needs no live updates.
  await context.route(/\/(data\/listen|bundles\/mine\/listen)\//, (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: 'retry: 60000\n\nevent: welcome\ndata: {"listenerName":"test"}\n\n'
    })
  );
  if (SANITY_TOKEN) {
    await context.addInitScript((token) => {
      localStorage.setItem(
        '__studio_auth_token_1tmgxdtl',
        JSON.stringify({ token, time: new Date().toISOString() })
      );
    }, SANITY_TOKEN);
  }
  const page = await context.newPage();
  return { context, page };
}

async function openArticle(page) {
  await page.goto(`${SANITY_STUDIO_URL}/structure/article;${article._id}`);
  await page.getByText('Main image').first().waitFor({ timeout: 60000 });
  for (const name of ['Got it', "Don't show again for this session"]) {
    const b = page.getByRole('button', { name });
    if (await b.count())
      await b
        .first()
        .click()
        .catch(() => {});
  }
}

async function openPanel(page) {
  await page
    .getByRole('button', { name: /^Accessibility/ })
    .first()
    .click();
  await page.waitForFunction(
    () => document.querySelector('surea11y-results')?.state === 'done',
    null,
    {
      timeout: 30000
    }
  );
  return page.locator('surea11y-results');
}

/** The review document of the test article, or null. */
function reviewDoc() {
  const out = JSON.parse(api('GET', `data/doc/${DATASET}/${REVIEW_ID}`) || '{}');
  return (out.documents || [])[0] || null;
}
const removeReviews = () =>
  api(
    'POST',
    `data/mutate/${DATASET}`,
    JSON.stringify({ mutations: [{ delete: { id: REVIEW_ID } }] })
  );

test(
  'the side panel, the lines under fields, Show, answers and Hide for me',
  { skip },
  async (t) => {
    seed();
    removeReviews();
    const browser = await chromium.launch({
      executablePath: CHROMIUM,
      ...(HTTPS_PROXY ? { proxy: { server: HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {})
    });
    t.after(() => {
      removeReviews();
      return browser.close();
    });
    const { page } = await studio(browser);
    await openArticle(page);

    // The header button counts what is left to look at, before the panel opens.
    await page.getByRole('button', { name: 'Accessibility (4)' }).waitFor({ timeout: 30000 });

    const started = Date.now();
    const results = await openPanel(page);
    const cards = await page.evaluate(() =>
      document.querySelector('surea11y-results').cards.map((c) => [c.ruleId, c.itemLabel])
    );
    assert.deepEqual(
      new Set(cards.map((c) => c[1])),
      new Set(['Main image', 'Body: Heading 4', 'Body: Paragraph', 'Body: Table'])
    );
    t.diagnostic(`panel ready ${Date.now() - started} ms after opening`);

    // The line under the main image says what is wrong, and opens the panel.
    const line = page.locator('.surea11y-field-line', { hasText: 'file name' });
    assert.equal(await line.count(), 1, 'a line under the main image');
    assert.ok((await page.locator('.surea11y-field-line').count()) >= 2, 'and one under the body');

    // Our own interface passes the engine's checks: the panel, its setting
    // and the lines under fields.
    await page.addScriptTag({
      content: fs.readFileSync('plugins/wordpress/build/engine.js', 'utf8')
    });
    const own = await page.evaluate(() => {
      const failures = [];
      for (const sel of ['[data-surea11y-inspector]', '.surea11y-field-line']) {
        const r = window.a11ycore.runa11yCoreInPage(
          location.href,
          sel,
          { profile: 'wcag22-aa' },
          null
        );
        for (const c of r.checksResults)
          if (c.outcome === 'fail') failures.push(`${sel} ${c.ruleId}`);
      }
      return failures;
    });
    assert.deepEqual(own, [], 'no failures in our own interface');

    // Show frames the field the finding is in.
    await results
      .locator('li.card', { hasText: 'skipping a level' })
      .getByRole('button', { name: 'Show' })
      .click();
    await page.locator('.surea11y-field-current').waitFor({ timeout: 5000 });

    // An answer goes to the project, in the private review document.
    const linkCard = results.locator('li.card', { hasText: 'click here' });
    await linkCard.getByRole('button', { name: 'Check it' }).click();
    await linkCard.getByRole('button', { name: "Yes, it's fine" }).click();
    let saved = null;
    for (let i = 0; i < 20 && !saved; i++) {
      await page.waitForTimeout(500);
      saved = reviewDoc();
    }
    assert.ok(saved, 'the review document exists');
    assert.equal(saved.answers.length, 1);
    assert.equal(saved.answers[0].answer, 'pass');
    assert.match(saved.answers[0].key, /^link-name-quality/);

    // Hide for me, kept for this person after a reload; the answer too.
    await results
      .locator('li.card', { hasText: 'header cells' })
      .getByRole('button', { name: 'Hide for me' })
      .click();
    await page.reload();
    await openArticle(page);
    await page.getByRole('button', { name: 'Accessibility (2)' }).waitFor({ timeout: 30000 });
  }
);

test(
  "in a dark Studio, the panel and the lines take the Studio's own dark colours",
  { skip },
  async (t) => {
    seed();
    removeReviews();
    const browser = await chromium.launch({
      executablePath: CHROMIUM,
      ...(HTTPS_PROXY ? { proxy: { server: HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {})
    });
    t.after(() => browser.close());
    const { page } = await studio(browser, 'dark');
    await openArticle(page);
    await openPanel(page);
    const colours = await page.evaluate(() => {
      const el = document.querySelector('surea11y-results');
      const host = getComputedStyle(el);
      const card = getComputedStyle(el.shadowRoot.querySelector('li.card'));
      const line = getComputedStyle(document.querySelector('.surea11y-field-line'));
      return {
        studio: host.getPropertyValue('--card-bg-color').trim(),
        surface: card.backgroundColor,
        text: card.color,
        line: line.backgroundColor,
        lineText: line.color
      };
    });
    assert.equal(colours.studio, '#13141b', 'the Studio is dark');
    assert.equal(colours.surface, 'rgb(19, 20, 27)', "cards on the Studio's own background");
    assert.equal(colours.text, 'rgb(228, 229, 233)', "in the Studio's own text colour");
    assert.equal(colours.line, 'rgb(58, 45, 25)', 'the line on the dark tint of its group');
    assert.equal(colours.lineText, 'rgb(228, 229, 233)');
    // And the engine finds nothing in our interface, dark.
    await page.addScriptTag({
      content: fs.readFileSync('plugins/wordpress/build/engine.js', 'utf8')
    });
    const own = await page.evaluate(() => {
      const failures = [];
      for (const sel of ['[data-surea11y-inspector]', '.surea11y-field-line']) {
        const r = window.a11ycore.runa11yCoreInPage(
          location.href,
          sel,
          { profile: 'wcag22-aa' },
          null
        );
        for (const c of r.checksResults)
          if (c.outcome === 'fail') failures.push(`${sel} ${c.ruleId}`);
      }
      return failures;
    });
    assert.deepEqual(own, []);
  }
);
