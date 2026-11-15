// The editor wording for "Check it" (src/messages/review.<locale>.json)
// replaces core's steps, or gives the CMS pack's rule its translations. It is
// held to core: every set it replaces exists there, with the values its
// placeholders name, and every language rewords the same sets in full.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LOCALES = ['en', 'es', 'de', 'fr', 'ja'];
const read = (locale) =>
  JSON.parse(
    fs.readFileSync(new URL(`../src/messages/review.${locale}.json`, import.meta.url), 'utf8')
  );
const ours = Object.fromEntries(LOCALES.map((l) => [l, read(l)]));
const coreEn = require('@surea11y/core/review/en');
const pack = require('../../pack-cms');

const setOf = (key) => key.replace(/_(step\d+|pass|fail)$/, '');
const placeholders = (text) =>
  [...String(text).matchAll(/\{\{(\w+)(?:\|[^}]*)?\}\}/g)].map((m) => m[1]).sort();

// The pack's own steps, by the keys core's would have.
const packKeys = {};
for (const rule of pack.rules) {
  const prefix = rule.meta.i18n.titleKey.replace(/_title$/, '');
  for (const [code, r] of Object.entries(rule.meta.review || {})) {
    r.steps.forEach((s, i) => (packKeys[`${prefix}_review_${code}_step${i + 1}`] = s));
    packKeys[`${prefix}_review_${code}_pass`] = r.passWhen;
    packKeys[`${prefix}_review_${code}_fail`] = r.failWhen;
  }
}

test('every set reworded is one core gives steps for, or one of the pack rule', () => {
  for (const set of new Set(Object.keys(ours.en).map(setOf))) {
    assert.ok(`${set}_step1` in coreEn, `${set} is in core's dictionary`);
  }
  for (const l of LOCALES.slice(1)) {
    for (const set of new Set(Object.keys(ours[l]).map(setOf))) {
      assert.ok(`${set}_step1` in coreEn || `${set}_step1` in packKeys, `${l}: ${set}`);
    }
  }
});

test('each set is whole: steps from 1 with none missing, and both results', () => {
  for (const l of LOCALES) {
    const sets = {};
    for (const k of Object.keys(ours[l]))
      (sets[setOf(k)] ||= []).push(k.slice(setOf(k).length + 1));
    for (const [set, parts] of Object.entries(sets)) {
      const steps = parts
        .filter((p) => p.startsWith('step'))
        .map((p) => Number(p.slice(4)))
        .sort((a, b) => a - b);
      assert.ok(parts.includes('pass') && parts.includes('fail'), `${l}: ${set} has pass and fail`);
      assert.ok(steps.length >= 1 && steps.length <= 6, `${l}: ${set} has 1 to 6 steps`);
      assert.deepEqual(
        steps,
        steps.map((_, i) => i + 1),
        `${l}: ${set} numbers its steps from 1`
      );
    }
  }
});

test('every language rewords the same sets with the same keys; the pack rule is translated', () => {
  const en = Object.keys(ours.en).sort();
  const withPack = [...en, ...Object.keys(packKeys)].sort();
  for (const l of LOCALES.slice(1)) assert.deepEqual(Object.keys(ours[l]).sort(), withPack, l);
});

test('placeholders are the ones core uses for that set, the same in every language', () => {
  for (const [key, text] of Object.entries(ours.en)) {
    const used = placeholders(text);
    if (!used.length) continue;
    const coreNames = new Set(
      Object.entries(coreEn)
        .filter(([k]) => setOf(k) === setOf(key))
        .flatMap(([, v]) => placeholders(v))
    );
    for (const name of used) assert.ok(coreNames.has(name), `${key}: {{${name}}} is one of core's`);
  }
  for (const l of LOCALES.slice(1)) {
    for (const [key, text] of Object.entries(ours[l])) {
      const en = key in ours.en ? ours.en[key] : packKeys[key];
      assert.deepEqual(placeholders(text), placeholders(en), `${l}: ${key}`);
    }
  }
});

test('no step sends an editor to the developer tools or to markup', () => {
  for (const l of LOCALES) {
    for (const [key, text] of Object.entries(ours[l])) {
      assert.doesNotMatch(text, /developer tools|Accessibility pane|<\w+>|role="/i, `${l}: ${key}`);
    }
  }
});
