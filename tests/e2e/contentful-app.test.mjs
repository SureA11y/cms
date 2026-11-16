// The Contentful sidebar app on its test page (dev/contentful), with a
// stand-in for the App SDK backed by the test space's real data: findings
// named by field, no Show (an app can't move the form), the image's
// description opened from its card, an answer kept in the space, "Hide for
// me" kept after a reload, and a new check after an edit.
//
// Runs when CONTENTFUL_APP_URL is set (the test page, for example
// http://localhost:3336); skipped otherwise. It needs the space's content
// management token: CONTENTFUL_TOKEN, or a proxy that adds it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { api, ENTRY, seed } from '../../dev/contentful/seed.mjs';

const { CONTENTFUL_APP_URL, CHROMIUM, HTTPS_PROXY } = process.env;
const skip = !CONTENTFUL_APP_URL && 'CONTENTFUL_APP_URL is not set';
const REVIEW = `sa11y-${ENTRY}`;

function removeReview() {
  const r = api('GET', `entries/${REVIEW}`);
  if (r.sys && r.sys.version)
    api('DELETE', `entries/${REVIEW}`, undefined, {
      'X-Contentful-Version': String(r.sys.version)
    });
}

async function openApp(page) {
  await page.goto(CONTENTFUL_APP_URL);
  await page.waitForFunction(
    () => document.querySelector('surea11y-results')?.state === 'done',
    null,
    {
      timeout: 60000
    }
  );
  return page.locator('surea11y-results');
}

const cards = (page) =>
  page.evaluate(() =>
    document.querySelector('surea11y-results').cards.map((c) => ({
      rule: c.ruleId,
      label: c.itemLabel,
      settled: c.settled
    }))
  );

test(
  'the sidebar app: fields named, no Show, the image opened, answers kept, Hide for me, edits',
  { skip },
  async (t) => {
    seed();
    removeReview();
    const browser = await chromium.launch({
      executablePath: CHROMIUM,
      ...(HTTPS_PROXY ? { proxy: { server: HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {})
    });
    t.after(() => {
      removeReview();
      return browser.close();
    });
    const context = await browser.newContext({
      ignoreHTTPSErrors: !!HTTPS_PROXY,
      viewport: { width: 400, height: 1200 }
    });
    const page = await context.newPage();
    const results = await openApp(page);

    assert.deepEqual(
      new Set((await cards(page)).map((c) => c.label)),
      new Set(['Main image', 'Body: Heading 4', 'Body: Paragraph', 'Body: Table'])
    );
    assert.equal(
      await results.getByRole('button', { name: 'Show' }).count(),
      0,
      'no Show: an app cannot move the form'
    );

    // The image's alternative text is its description, on the asset.
    await results.getByRole('button', { name: "Edit the image's description" }).click();
    assert.deepEqual(await page.evaluate(() => window.opened), ['surea11yHero']);

    // An answer goes to the space, in the app's own (never published) entry.
    const linkCard = results.locator('li.card', { hasText: 'click here' });
    await linkCard.getByRole('button', { name: 'Check it' }).click();
    await linkCard.getByRole('button', { name: "Yes, it's fine" }).click();
    let saved = null;
    for (let i = 0; i < 20 && !saved; i++) {
      await page.waitForTimeout(500);
      const r = api('GET', `entries/${REVIEW}`);
      saved = r.fields && r.fields.answers && r.fields.answers['en-US'];
    }
    assert.ok(saved, 'the answers entry exists');
    const [key] = Object.keys(saved);
    assert.match(key, /^link-name-quality/);
    assert.equal(saved[key].answer, 'pass');
    assert.equal(saved[key].by, 'Test Editor');

    // Hide for me, kept after a reload; the answer too.
    await results
      .locator('li.card', { hasText: 'skipping a level' })
      .getByRole('button', { name: 'Hide for me' })
      .click();
    await openApp(page);
    await page.waitForFunction(
      () => document.querySelector('surea11y-results').cards.filter((c) => c.settled).length === 2,
      null,
      { timeout: 10000 }
    );

    // An edit is checked again: a level 3 heading no longer skips a level.
    await page.evaluate(() => {
      const body = structuredClone(window.sdk.entry.fields.body.getValue('en-US'));
      body.content[2].nodeType = 'heading-3';
      window.sdk.entry.fields.body.setValue(body);
    });
    await page.waitForFunction(
      () =>
        !document.querySelector('surea11y-results').cards.some((c) => c.ruleId === 'heading-order'),
      null,
      { timeout: 10000 }
    );
  }
);

test(
  "in the person's language: Contentful set to Spanish, the panel, the engine and the steps in Spanish",
  { skip },
  async (t) => {
    seed();
    removeReview();
    const browser = await chromium.launch({
      executablePath: CHROMIUM,
      ...(HTTPS_PROXY ? { proxy: { server: HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {})
    });
    t.after(() => browser.close());
    const context = await browser.newContext({
      ignoreHTTPSErrors: !!HTTPS_PROXY,
      viewport: { width: 400, height: 1200 }
    });
    const page = await context.newPage();
    await page.goto(`${CONTENTFUL_APP_URL}/?lang=es-ES`);
    await page.waitForFunction(
      () => document.querySelector('surea11y-results')?.state === 'done',
      null,
      {
        timeout: 60000
      }
    );
    const results = page.locator('surea11y-results');
    await results.getByRole('button', { name: /^Hallazgos/ }).waitFor();
    assert.equal(
      await results.getByRole('button', { name: 'Editar la descripción de la imagen' }).count(),
      1
    );
    // The engine's own message, in Spanish.
    const summaries = await page.evaluate(() =>
      document.querySelector('surea11y-results').cards.map((c) => c.summary)
    );
    assert.ok(
      summaries.some((s) => /imagen/i.test(s)),
      `Spanish summaries: ${summaries.join(' / ')}`
    );
    // How to check, in Spanish.
    const card = results.locator('li.card', { hasText: 'click here' });
    await card.getByRole('button', { name: 'Comprobarlo' }).click();
    await card.getByText('Cómo comprobarlo').waitFor({ timeout: 10000 });
  }
);

test(
  "the editor tab: Contentful's own field editors, lines under fields, Show moving to the field",
  { skip },
  async (t) => {
    seed();
    removeReview();
    const browser = await chromium.launch({
      executablePath: CHROMIUM,
      ...(HTTPS_PROXY ? { proxy: { server: HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {})
    });
    t.after(() => browser.close());
    const context = await browser.newContext({
      ignoreHTTPSErrors: !!HTTPS_PROXY,
      viewport: { width: 1280, height: 1000 }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${CONTENTFUL_APP_URL}/?view=tab`);
    await page.waitForFunction(
      () => document.querySelector('surea11y-results')?.state === 'done',
      null,
      {
        timeout: 60000
      }
    );
    // Every field, drawn with Contentful's editors, the entry's text in them.
    assert.equal(await page.locator('[data-field]').count(), 3);
    assert.equal(
      await page.locator('[data-field="title"] input').inputValue(),
      'Opening hours over the holidays'
    );
    await page
      .locator('[data-field="body"] [contenteditable="true"]')
      .getByText("Children's library")
      .waitFor();
    // A line under each field with a finding.
    await page
      .locator('[data-field="mainImage"] .surea11y-field-line', { hasText: 'file name' })
      .waitFor();
    await page.locator('[data-field="body"] .surea11y-field-line').waitFor();
    // Show frames the field and puts the cursor in it.
    await page
      .locator('surea11y-results li.card', { hasText: 'skipping a level' })
      .getByRole('button', { name: 'Show' })
      .click();
    await page.locator('.surea11y-field-current[data-field="body"]').waitFor({ timeout: 5000 });
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('[data-field="body"]')));
    assert.deepEqual(errors, []);
  }
);

test(
  'the editor tab beside the live preview: one view at a time, Show and Details moving between them',
  { skip },
  async (t) => {
    seed();
    removeReview();
    const browser = await chromium.launch({
      executablePath: CHROMIUM,
      ...(HTTPS_PROXY ? { proxy: { server: HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {})
    });
    t.after(() => browser.close());
    const context = await browser.newContext({
      ignoreHTTPSErrors: !!HTTPS_PROXY,
      // About the width Contentful gives the tab beside its live preview.
      viewport: { width: 600, height: 1000 }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${CONTENTFUL_APP_URL}/?view=tab`);
    await page.waitForFunction(
      () => document.querySelector('surea11y-results')?.state === 'done',
      null,
      { timeout: 60000 }
    );
    const sw = page.getByRole('group', { name: 'Fields or accessibility' });
    const fieldsBtn = sw.getByRole('button', { name: /^Fields/ });
    const findingsBtn = sw.getByRole('button', { name: /^Accessibility/ });
    // The panel first; the form hidden, not removed.
    assert.equal(await findingsBtn.getAttribute('aria-pressed'), 'true');
    assert.ok(!(await page.locator('[data-surea11y-form]').isVisible()));
    assert.match(await fieldsBtn.innerText(), /2/);
    // Show switches to the fields, frames the field and puts the cursor in it.
    await page
      .locator('surea11y-results li.card', { hasText: 'skipping a level' })
      .getByRole('button', { name: 'Show' })
      .click();
    await page.locator('.surea11y-field-current[data-field="body"]').waitFor({ timeout: 5000 });
    assert.equal(await fieldsBtn.getAttribute('aria-pressed'), 'true');
    assert.ok(!(await page.locator('[data-surea11y-inspector]').isVisible()));
    await page.waitForFunction(() => !!document.activeElement.closest('[data-field="body"]'));
    // Details on a line goes back to the panel.
    await page
      .locator('[data-field="mainImage"] .surea11y-field-line')
      .getByRole('button', { name: 'Details' })
      .click();
    assert.equal(await findingsBtn.getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('[data-surea11y-inspector]').isVisible());
    assert.deepEqual(errors, []);
  }
);
