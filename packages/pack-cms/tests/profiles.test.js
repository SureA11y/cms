'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runa11yCoreOnHtml } = require('@surea11y/core/testing');
const pack = require('..');

const PAGE = `<!doctype html><html lang="en"><head><title>Home</title></head><body>
  <main>
    <h1>News</h1>
    <p><strong>Opening hours</strong></p>
    <p>Monday to Friday, from nine to five.</p>
    <p>For the 2026 pricing sheet, <a href="/prices">click here</a>.</p>
    <p><a href="/files/report.pdf">Annual report</a></p>
    <img src="IMG_1234.png" alt="IMG_1234.png">
  </main>
</body></html>`;

const scan = (profile) => runa11yCoreOnHtml(PAGE, { engineOptions: { packs: [pack], profile } });
const ran = (result) => result.checksResults.map((c) => c.ruleId);
const check = (result, id) => result.checksResults.find((c) => c.ruleId === id);

test('the content profile: WCAG 2.2 A and AA about content, best practice, the pack rule', () => {
  const result = scan('cms-content');
  assert.equal(result.engine.profile, 'cms-content');
  const ids = ran(result);
  for (const id of [
    'img-alt-present',
    'img-alt-quality',
    'p-as-heading',
    'td-has-header',
    'link-name-quality',
    'link-name-quality-link-only',
    'heading-order',
    'cms-link-to-document'
  ]) {
    assert.ok(ids.includes(id), `${id} runs`);
  }
  for (const id of ['text-spacing-content-loss', 'css-focus-indicator-suppressed', 'region', 'page-title-present']) {
    assert.ok(!ids.includes(id), `${id}, a theme rule, does not run`);
  }
  assert.equal(check(result, 'cms-link-to-document').outcome, 'cantTell');
  assert.equal(check(result, 'link-name-quality-link-only').outcome, 'cantTell');
  assert.equal(check(result, 'p-as-heading').occurrences[0].data.details.reasonCode, 'BOLD_SHORT_PARAGRAPH');
});

test('the theme profile runs the theme rules and none about content', () => {
  const ids = ran(scan('cms-theme'));
  for (const id of ['text-spacing-content-loss', 'region', 'page-title-present']) {
    assert.ok(ids.includes(id), `${id} runs`);
  }
  for (const id of ['img-alt-present', 'p-as-heading', 'link-name-quality']) {
    assert.ok(!ids.includes(id), `${id} does not run`);
  }
});

test('every rule the pack names exists in core or in the pack', () => {
  const { getChecksCatalog } = require('@surea11y/core');
  const known = new Set([...getChecksCatalog().map((r) => r.ruleId), ...pack.rules.map((r) => r.id)]);
  const named = [
    ...Object.values(pack.profiles).flatMap((p) => [...(p.rules || []), ...((p.exclude && p.exclude.rules) || [])]),
    ...pack.rollups.flatMap((r) => r.checksIds)
  ];
  assert.deepEqual(named.filter((id) => !known.has(id)), []);
});

test('the content and theme profiles share no rule', () => {
  const content = new Set(ran(scan('cms-content')));
  const shared = ran(scan('cms-theme')).filter((id) => content.has(id) && !id.startsWith('cms-'));
  assert.deepEqual(shared, []);
});

test('the page profile runs both the content and the theme rules', () => {
  const ids = ran(scan('cms-page'));
  for (const id of ['img-alt-quality', 'p-as-heading', 'link-name-quality-link-only', 'cms-link-to-document', 'heading-order', 'region', 'page-title-present', 'text-spacing-content-loss']) {
    assert.ok(ids.includes(id), `${id} runs`);
  }
});
