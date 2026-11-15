// Each rule's title for editors (src/messages/rule-titles.<locale>.json),
// shown on a CMS's settings and overview pages in place of core's titles,
// which are written for developers. Every language titles the same rules,
// every rule a check can run has one, and none names markup.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOCALES = ['en', 'es', 'de', 'fr', 'ja'];
const read = (locale) =>
  JSON.parse(
    fs.readFileSync(new URL(`../src/messages/rule-titles.${locale}.json`, import.meta.url), 'utf8')
  );
const titles = Object.fromEntries(LOCALES.map((l) => [l, read(l)]));
const { getChecksCatalog } = require('@surea11y/core');
const pack = require('../../pack-cms');
const known = new Set(getChecksCatalog({ packs: [pack] }).map((r) => r.ruleId));

test('every language titles the same rules, none empty', () => {
  const en = Object.keys(titles.en).sort();
  for (const locale of LOCALES) {
    assert.deepEqual(Object.keys(titles[locale]).sort(), en, locale);
    for (const [id, text] of Object.entries(titles[locale]))
      assert.ok(text.trim(), `${locale} ${id} is empty`);
  }
});

test("every title is for a rule core or the pack has, and the pack's profiles are covered", () => {
  for (const id of Object.keys(titles.en)) assert.ok(known.has(id), `${id} is not a rule`);
  const { runa11yCoreOnHtml } = require('@surea11y/core/testing');
  const page =
    '<!doctype html><html lang="en"><head><title>t</title></head><body><p>t</p></body></html>';
  const run = runa11yCoreOnHtml(page, { engineOptions: { packs: [pack], profile: 'cms-page' } });
  const missing = run.checksResults
    .map((c) => c.ruleId)
    .filter((id) => id !== 'manual-review' && !titles.en[id]);
  assert.deepEqual(missing, []);
});

test('no title names markup: no angle brackets, no attribute syntax', () => {
  for (const locale of LOCALES)
    for (const [id, text] of Object.entries(titles[locale]))
      assert.doesNotMatch(text, /[<>]|=\s*"|aria-\w/, `${locale} ${id}: ${text}`);
});
