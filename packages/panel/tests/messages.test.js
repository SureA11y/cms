import test from 'node:test';
import assert from 'node:assert/strict';
import './locales.js';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { MESSAGES, messagesFor } from '../src/messages/index.js';
import { UI } from '../src/messages/ui.js';

const require = createRequire(import.meta.url);
// core's English dictionary, read from the installed package.
const coreDir = path.dirname(require.resolve('@surea11y/core/package.json'));
const coreEn = JSON.parse(fs.readFileSync(path.join(coreDir, 'src/i18n/en.json'), 'utf8'));
const packEn = require('../../pack-cms/i18n/en.json');

test('every message replaces a key that core or the pack has', () => {
  const known = new Set([...Object.keys(coreEn), ...Object.keys(packEn)]);
  for (const key of Object.keys(MESSAGES.en))
    assert.ok(known.has(key), `${key} is a key core or the pack has`);
});

test('every locale has the same keys and placeholders as English', () => {
  const ph = (s) =>
    [...String(s).matchAll(/\{\{(\w+)\}\}/g)]
      .map((m) => m[1])
      .sort()
      .join(',');
  for (const [locale, dict] of Object.entries(MESSAGES)) {
    assert.deepEqual(Object.keys(dict).sort(), Object.keys(MESSAGES.en).sort(), locale);
    for (const [k, v] of Object.entries(dict))
      assert.equal(ph(v), ph(MESSAGES.en[k]), `${locale} ${k}`);
  }
  // The panel's own words: the same keys, nested groups included, and placeholders, in every locale.
  const flat = (o, p = '') =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object' ? flat(v, p + k + '.') : [[p + k, v]]
    );
  const en = Object.fromEntries(flat(UI.en));
  for (const locale of ['es', 'de', 'fr', 'ja']) {
    const dict = Object.fromEntries(flat(UI[locale]));
    assert.deepEqual(Object.keys(dict).sort(), Object.keys(en).sort(), `UI ${locale}`);
    for (const [k, v] of Object.entries(dict)) assert.equal(ph(v), ph(en[k]), `UI ${locale} ${k}`);
  }
});

test('a scan gets English and the locale asked for', () => {
  assert.deepEqual(Object.keys(messagesFor('es-ES')).sort(), ['en', 'es']);
  assert.deepEqual(Object.keys(messagesFor('de')).sort(), ['de', 'en']);
  assert.deepEqual(Object.keys(messagesFor('ja-JP')).sort(), ['en', 'ja']);
  assert.deepEqual(Object.keys(messagesFor('it')), ['en']);
});

test('messages name what an author edits, not HTML', () => {
  for (const [key, text] of Object.entries(MESSAGES.en)) {
    assert.doesNotMatch(text, /<\w+>|attribute|aria-|role=/i, key);
  }
});

test('a language added later is used once added, and English stays the fallback', async () => {
  const { uiStrings } = await import('../src/messages/ui.js');
  assert.equal(uiStrings('it').show, 'Show');
  assert.equal(uiStrings('de').show, 'Zeigen');
  assert.equal(uiStrings('ja-JP').show, '表示');
});
