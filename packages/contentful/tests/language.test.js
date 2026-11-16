import test from 'node:test';
import assert from 'node:assert/strict';
import { pickLocale } from '../src/language-pick.js';

test("the person's language: Contentful's, else the browser's, else English", () => {
  assert.equal(pickLocale('es-ES', 'de-DE'), 'es');
  assert.equal(pickLocale(undefined, 'de-DE'), 'de');
  assert.equal(pickLocale('pt-BR', 'fr'), 'fr', 'a language the panel lacks: the next one');
  assert.equal(pickLocale('pt-BR'), 'en');
  assert.equal(pickLocale('ja_JP'), 'ja');
});
