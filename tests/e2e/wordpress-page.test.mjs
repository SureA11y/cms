// End-to-end tests of what SureA11y adds outside the sidebar: the count on
// the toolbar button, the pre-publish line, and the page checker on
// published pages and previews. Same set-up as wordpress-editor.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { siteContext, logIn } from './site.mjs';

const { WP_URL, WP_USER = 'admin', WP_PASS = '', CHROMIUM, POST_TYPICAL = '9' } = process.env;
const skip = !WP_URL && 'WP_URL is not set';

async function login(browser) {
  const context = await siteContext(browser, { viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await logIn(page, WP_USER, WP_PASS);
  return { context, page };
}

async function editor(page, path) {
  await page.goto(`${WP_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.wp && window.wp.data && window.wp.data.select('core/block-editor').getBlocks
  );
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
    const post = await window.wp.apiFetch({
      path: '/wp/v2/posts',
      method: 'POST',
      data: { title: 'SureA11y draft', content, status: 'draft' }
    });
    return post.id;
  });
}
const removePost = (page, id) =>
  page
    .evaluate(
      (i) => window.wp.apiFetch({ path: `/wp/v2/posts/${i}?force=true`, method: 'DELETE' }),
      id
    )
    .catch(() => {});

test(
  'the toolbar button shows what to fix or confirm, without opening the sidebar',
  { skip },
  async (t) => {
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
    const tiles = await page.evaluate(() =>
      [
        ...document.querySelector('surea11y-results').shadowRoot.querySelectorAll('.tile .count')
      ].map((c) => Number(c.textContent))
    );
    assert.equal(badge, tiles[0] + tiles[1], 'the count is "to fix" plus "likely"');
    console.log(JSON.stringify({ badgeAfterMs }));
  }
);

test(
  'the pre-publish checks show the counts, never block, and open the sidebar',
  { skip },
  async (t) => {
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
    await page.waitForFunction(
      () =>
        !/Checking/.test(
          document.querySelector('.surea11y-prepublish [role="status"]')?.textContent || 'Checking'
        )
    );
    assert.match(
      await status.textContent(),
      /^To fix: \d+\. Likely problems to confirm: \d+\. Need a person: \d+\.$/
    );
    assert.match(await panel.textContent(), /This doesn't stop you publishing\./);
    // Publishing stays possible: the final Publish button is enabled.
    assert.ok(
      await page
        .locator(
          '.editor-post-publish-panel__header-publish-button button, .editor-post-publish-panel__header-publish-button'
        )
        .first()
        .isEnabled()
    );
    await panel.getByRole('button', { name: 'Review in the Accessibility panel' }).click();
    await page.waitForFunction(() => document.querySelector('surea11y-results')?.state === 'done');
    assert.equal(
      await page.locator('.editor-post-publish-panel').count(),
      0,
      'the publish panel closed'
    );
  }
);

test(
  'the page checker: in the toolbar on a published page, content and theme told apart',
  { skip },
  async (t) => {
    const browser = await chromium.launch({ executablePath: CHROMIUM });
    t.after(() => browser.close());
    const { page } = await login(browser);
    await page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
    const engineBefore = await page.evaluate(() => !!window.a11ycore);
    assert.equal(engineBefore, false, 'the engine loads only when asked');
    const item = page.locator('#wp-admin-bar-surea11y > a');
    await item.click();
    await page.waitForFunction(
      () => {
        const el = document
          .querySelector('[data-surea11y-panel]')
          ?.shadowRoot.querySelector('surea11y-results');
        return el && (el.state === 'done' || el.state === 'error');
      },
      null,
      { timeout: 60000 }
    );
    const r = await page.evaluate(() => {
      const el = document
        .querySelector('[data-surea11y-panel]')
        .shadowRoot.querySelector('surea11y-results');
      return {
        state: el.state,
        focus: document.querySelector('[data-surea11y-panel]').shadowRoot.activeElement?.tagName,
        findings: el.findings.map((f) => ({
          ruleId: f.ruleId,
          outside: f.outside,
          label: f.itemLabel
        })),
        scanMs: window.surea11yLastPageScan.scanMs,
        edit: !!el.shadowRoot.querySelector('a.edit'),
        checkIt: [...el.shadowRoot.querySelectorAll('button')].some(
          (b) => b.textContent === 'Check it'
        ),
        hide: [...el.shadowRoot.querySelectorAll('button')].some(
          (b) => b.textContent === 'Hide for me'
        )
      };
    });
    assert.equal(r.state, 'done');
    assert.equal(r.focus, 'H2', 'focus moves to the panel heading');
    assert.ok(
      r.findings.some((f) => !f.outside && f.ruleId === 'p-as-heading'),
      'content findings are found'
    );
    assert.ok(
      r.findings.every((f) => f.label === (f.outside ? 'Theme or template' : 'Your content'))
    );
    assert.ok(r.edit, 'content cards link to the editor');
    assert.equal(r.checkIt, true, 'questions can be answered on the page');
    assert.equal(r.hide, true, 'and findings hidden for oneself');
    // Show scrolls to the element and frames it.
    await page.evaluate(() =>
      document
        .querySelector('[data-surea11y-panel]')
        .shadowRoot.querySelector('surea11y-results')
        .shadowRoot.querySelector('.show')
        .click()
    );
    const framed = await page.evaluate(
      () =>
        !!document
          .querySelector('[data-surea11y-markers]')
          .shadowRoot.querySelector('.outline:not([hidden])')
    );
    assert.ok(framed, 'the place shown is framed');
    // Escape closes it and puts focus back on the toolbar item.
    await page.keyboard.press('Escape');
    assert.equal(
      await page.evaluate(() => document.activeElement.closest('#wp-admin-bar-surea11y') !== null),
      true
    );
    assert.equal(
      await page.locator('[data-surea11y-markers]').count(),
      0,
      'the markers go with it'
    );
    console.log(
      JSON.stringify({
        pageScanMs: Math.round(r.scanMs),
        findings: r.findings.length,
        theme: r.findings.filter((f) => f.outside).length
      })
    );
  }
);

/** Shows again every finding this person hid on a post, so a test starts from none. */
async function clearHidden(page, post) {
  await page.evaluate(async (p) => {
    const cfg = JSON.parse(document.getElementById('surea11y-config').textContent);
    const root = cfg.restRoot.replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.restNonce };
    const me = await (
      await fetch(
        root.includes('rest_route=')
          ? `${root}/wp/v2/users/me&context=edit`
          : `${root}/wp/v2/users/me?context=edit`,
        { headers }
      )
    ).json();
    const keys = ((me.meta.persisted_preferences.surea11y || {}).fine || {})[p] || [];
    if (keys.length)
      await fetch(root + cfg.hiddenPath, {
        method: 'POST',
        headers,
        body: JSON.stringify({ keys, hidden: false })
      });
  }, post);
}

/** Opens the page checker and waits for its results. */
async function pageChecker(page, post, { clear = false } = {}) {
  await page.goto(`${WP_URL}/?p=${post}`);
  if (clear) {
    await clearHidden(page, post);
    await page.reload();
  }
  await page.locator('#wp-admin-bar-surea11y > a').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-surea11y-panel]')?.shadowRoot.querySelector('surea11y-results')
        ?.state === 'done',
    null,
    { timeout: 60000 }
  );
  return page.locator('[data-surea11y-panel] surea11y-results');
}

test('"Hide for me" on the page is the same as in the editor', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  const results = await pageChecker(page, POST_TYPICAL, { clear: true });
  const card = results.locator('li.card', { hasText: 'This bold line comes before plain text' });
  await card.getByRole('button', { name: 'Hide for me' }).click();
  await page.waitForFunction(
    async (p) => {
      const cfg = JSON.parse(document.getElementById('surea11y-config').textContent);
      const root = cfg.restRoot.replace(/\/$/, '');
      const url = root.includes('rest_route=')
        ? `${root}/wp/v2/users/me&context=edit`
        : `${root}/wp/v2/users/me?context=edit`;
      const r = await fetch(url, { headers: { 'X-WP-Nonce': cfg.restNonce } });
      const u = await r.json();
      return (((u.meta.persisted_preferences.surea11y || {}).fine || {})[p] || []).some((k) =>
        k.startsWith('p-as-heading|')
      );
    },
    POST_TYPICAL,
    { timeout: 10000 }
  );
  // In the editor, it is hidden too.
  await editor(page, `/wp-admin/post.php?post=${POST_TYPICAL}&action=edit`);
  if (!(await page.locator('surea11y-results').count()))
    await page.getByRole('button', { name: 'Accessibility', exact: true }).first().click();
  await page.waitForFunction(
    () => document.querySelector('surea11y-results')?.state === 'done',
    null,
    { timeout: 30000 }
  );
  const marked = await page.evaluate(() =>
    document
      .querySelector('surea11y-results')
      .cards.filter((c) => c.marked)
      .map((c) => c.ruleId)
  );
  assert.ok(marked.includes('p-as-heading'), 'hidden in the editor as well');
  // Undo, on the page.
  const again = await pageChecker(page, POST_TYPICAL);
  const section = again.locator('section[data-group="marked"]');
  await section.getByRole('button', { expanded: false }).click();
  await section.getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction(
    async (p) => {
      const cfg = JSON.parse(document.getElementById('surea11y-config').textContent);
      const root = cfg.restRoot.replace(/\/$/, '');
      const url = root.includes('rest_route=')
        ? `${root}/wp/v2/users/me&context=edit`
        : `${root}/wp/v2/users/me?context=edit`;
      const r = await fetch(url, { headers: { 'X-WP-Nonce': cfg.restNonce } });
      const u = await r.json();
      return !(((u.meta.persisted_preferences.surea11y || {}).fine || {})[p] || []).length;
    },
    POST_TYPICAL,
    { timeout: 10000 }
  );
});

test('"Edit in the editor" opens the editor on that finding', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  const results = await pageChecker(page, POST_TYPICAL, { clear: true });
  const card = results.locator('li.card', { hasText: 'This bold line comes before plain text' });
  const href = await card.getByRole('link', { name: 'Edit in the editor' }).getAttribute('href');
  assert.match(href, /[?&]surea11y-finding=[0-9a-z]+$/);
  await card.getByRole('link', { name: 'Edit in the editor' }).click();
  await page.waitForURL(/post\.php/);
  await page.waitForFunction(() => document.querySelector('surea11y-results')?.current, null, {
    timeout: 30000
  });
  const shown = await page.evaluate(() => {
    const el = document.querySelector('surea11y-results');
    const card = el.cards.find((c) => c.key === el.current.cardKey);
    return {
      ruleId: card.ruleId,
      selected: window.wp.data.select('core/block-editor').getSelectedBlock()?.name,
      url: location.search
    };
  });
  assert.equal(shown.ruleId, 'p-as-heading');
  assert.equal(shown.selected, 'core/paragraph');
  assert.doesNotMatch(shown.url, /surea11y-finding/, 'a reload does not do it again');
});

test(
  '"Check at phone width" checks the page at 320 pixels wide, on demand',
  { skip },
  async (t) => {
    const browser = await chromium.launch({ executablePath: CHROMIUM });
    t.after(() => browser.close());
    const { page } = await login(browser);
    const results = await pageChecker(page, POST_TYPICAL, { clear: true });
    const panel = page.locator('[data-surea11y-panel]');
    // Nothing runs at phone width until asked: it loads the page again.
    assert.equal(await page.evaluate(() => window.surea11yLastPhoneScan === undefined), true);
    const before = await results.evaluate((el) => el.findings.length);
    await panel.getByRole('button', { name: 'Check at phone width' }).click();
    await page.waitForFunction(() => window.surea11yLastPhoneScan, null, { timeout: 60000 });
    assert.match(
      await panel.locator('.footer [role="status"]').textContent(),
      /^Checked at phone width \(320 pixels\): \d+ found\.$/
    );
    const reflow = await results.evaluate((el) =>
      el.findings
        .filter((f) => f.ruleId === 'reflow-horizontal-scroll')
        .map((f) => ({ code: f.reasonCode, label: f.itemLabel, itemId: f.itemId }))
    );
    // The typical post has a long address that can't wrap: the author's content.
    assert.ok(
      reflow.some((f) => f.code === 'HORIZONTAL_SCROLL' && f.label === 'Your content'),
      JSON.stringify(reflow)
    );
    assert.equal(
      await results.evaluate((el) => el.findings.length),
      before + reflow.length,
      'added to the page findings'
    );
    // Show finds the same element in the page as shown.
    assert.ok(await page.evaluate((sel) => !!document.querySelector(sel), reflow[0].itemId));
    assert.equal(
      await page.locator('iframe[data-surea11y-frame]').count(),
      0,
      'the frame is removed'
    );
  }
);

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
  await page.waitForFunction(
    () =>
      document.querySelector('[data-surea11y-panel]')?.shadowRoot.querySelector('surea11y-results')
        ?.state === 'done',
    null,
    { timeout: 60000 }
  );
  const ids = await page.evaluate(() =>
    document
      .querySelector('[data-surea11y-panel]')
      .shadowRoot.querySelector('surea11y-results')
      .findings.filter((f) => !f.outside)
      .map((f) => f.ruleId)
  );
  for (const id of [
    'p-as-heading',
    'link-name-quality-link-only',
    'cms-link-to-document',
    'heading-order'
  ]) {
    assert.ok(ids.includes(id), `${id} found in the draft's content`);
  }
});

test("the page panel passes the engine's own checks", { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const { page } = await login(browser);
  await page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
  await page.locator('#wp-admin-bar-surea11y > a').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-surea11y-panel]')?.shadowRoot.querySelector('surea11y-results')
        ?.state === 'done',
    null,
    { timeout: 60000 }
  );
  const own = await page.evaluate(() => {
    const res = window.a11ycore.runa11yCoreInPage(
      location.href,
      '[data-surea11y-panel]',
      { profile: 'wcag22-aa' },
      null
    );
    return res.checksResults
      .filter((c) => c.outcome === 'fail')
      .map((c) => `${c.ruleId}: ${(c.occurrences || []).map((o) => o.summary).join(' | ')}`);
  });
  assert.deepEqual(own, []);
});

test('visitors get nothing: no script, no toolbar item, no engine', { skip }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  t.after(() => browser.close());
  const context = await siteContext(browser);
  const page = await context.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(`${WP_URL}/?p=${POST_TYPICAL}`);
  assert.equal(
    await page
      .locator('#surea11y-config, [data-surea11y-launcher], #wp-admin-bar-surea11y')
      .count(),
    0
  );
  assert.deepEqual(
    requests.filter((u) => /surea11y/.test(u)),
    []
  );
});
