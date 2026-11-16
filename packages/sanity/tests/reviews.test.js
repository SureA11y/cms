import test from 'node:test';
import assert from 'node:assert/strict';
import { entryKey, reviewDocumentId, reviewsFrom } from '../src/reviews.js';
import { publishedId } from '../src/paths.js';

test('answers are kept in one private document per checked document', () => {
  assert.equal(publishedId('drafts.a1'), 'a1');
  assert.equal(publishedId('versions.rABC.a1'), 'a1');
  assert.equal(reviewDocumentId('drafts.a1'), 'surea11y.review.a1');
  assert.match(reviewDocumentId('a1'), /\./, 'a dot keeps it out of public reads');
});

test('entry keys are short, plain and stable', () => {
  const key = 'link-name-quality-link-only|GENERIC|a||/branches||click here';
  assert.equal(entryKey(key), entryKey(key));
  assert.notEqual(entryKey(key), entryKey(`${key}!`));
  assert.match(entryKey(key), /^[a-z0-9]+$/);
});

test('answers from the document as the panel takes them, odd values made safe', () => {
  const out = reviewsFrom(
    {
      answers: [
        {
          key: 'a',
          answer: 'fail',
          note: 'Needs headers',
          by: 'Ana',
          when: '2026-11-16T10:00:00Z'
        },
        { key: 'b', answer: 'something else', when: 'not a date' },
        { answer: 'pass' },
        null
      ]
    },
    'en'
  );
  assert.deepEqual(Object.keys(out), ['a', 'b']);
  assert.equal(out.a.answer, 'fail');
  assert.equal(out.a.by, 'Ana');
  assert.equal(out.a.note, 'Needs headers');
  assert.ok(out.a.when.length > 0);
  assert.equal(out.b.answer, 'pass', 'an unknown answer counts as fine, as before answers');
  assert.deepEqual(reviewsFrom(null), {});
});
