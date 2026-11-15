import test from 'node:test';
import assert from 'node:assert/strict';
import { toCards, countPlaces } from '../src/cards.js';

const f = (key, group, summary, itemId, extra = {}) => ({ key, group, ruleId: 'r-' + summary, reasonCode: 'X', summary, itemId, ...extra });

test('the same message in two places is one card with two places', () => {
  const cards = toCards([
    f('a', 'likely', 'This table has no header cells.', 'b1', { itemLabel: 'Table' }),
    f('b', 'likely', 'This table has no header cells.', 'b4', { itemLabel: 'Table' }),
    f('c', 'likely', 'Other.', 'b2')
  ]);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards[0].places.map((p) => p.itemId), ['b1', 'b4']);
  assert.equal(cards[0].itemLabel, 'Table');
});

test('different messages stay apart; groups come in order', () => {
  const cards = toCards([f('a', 'review', 'One.', 'b1'), f('b', 'problem', 'Two.', 'b2'), f('c', 'review', 'Three.', 'b1')]);
  assert.deepEqual(cards.map((c) => c.summary), ['Two.', 'One.', 'Three.']);
});

test('a card is marked when all its places are, and leaves the counts', () => {
  const findings = [f('a', 'review', 'Same.', 'b1'), f('b', 'review', 'Same.', 'b2'), f('c', 'problem', 'Fix.', 'b3')];
  assert.equal(toCards(findings, ['a'])[1].marked, false);
  const cards = toCards(findings, new Set(['a', 'b']));
  assert.equal(cards[1].marked, true);
  assert.deepEqual(countPlaces(cards), { problem: 1, likely: 0, review: 0, 'probably-fine': 0 });
});

test('mixed block types give no single label; outside content is noted', () => {
  const cards = toCards([f('a', 'review', 'S.', 'b1', { itemLabel: 'Paragraph' }), f('b', 'review', 'S.', 'b2', { itemLabel: 'List' }), f('c', 'review', 'T.', null)]);
  assert.equal(cards[0].itemLabel, '');
  assert.equal(cards[1].inContent, false);
});
