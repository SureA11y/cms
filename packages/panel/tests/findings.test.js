import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { toFindings, groupOf, countByGroup, sortFindings, findingKey, ITEM_ATTRIBUTE } from '../src/findings.js';

const doc = new JSDOM(`<main>
  <div ${ITEM_ATTRIBUTE}="block-a"><p id="p1"><strong>Opening hours</strong></p></div>
  <div ${ITEM_ATTRIBUTE}="block-b"><table id="t1"><tr><td>a</td></tr></table></div>
</main><footer id="foot"></footer>`).window.document;

const result = {
  checksResults: [
    { ruleId: 'p-as-heading', title: 'T1', outcome: 'cantTell', severity: 'minor', occurrences: [
      { selector: '#p1', html: '<p id="p1">', summary: 'Bold line', hint: 'Make it a heading',
        data: { details: { reasonCode: 'BOLD_SHORT_PARAGRAPH' } } }] },
    { ruleId: 'td-has-header', title: 'T2', outcome: 'cantTell', severity: 'serious', occurrences: [
      { selector: '#t1', html: '<table id="t1">', summary: 'No headers', lean: { toward: 'fail' },
        data: { details: { reasonCode: 'TD_TABLE_NO_HEADERS' } } }] },
    { ruleId: 'img-alt-present', title: 'T3', outcome: 'fail', severity: 'critical', occurrences: [
      { selector: '#foot', html: '<footer>', summary: 'No alt', data: { details: {} } }] },
    { ruleId: 'manual-review', outcome: 'cantTell', occurrences: [{ selector: 'html', html: '' }] },
    { ruleId: 'region', outcome: 'pass', occurrences: [] }
  ]
};

test('groups follow the outcome and the lean', () => {
  assert.equal(groupOf('fail'), 'problem');
  assert.equal(groupOf('cantTell', { toward: 'fail' }), 'likely');
  assert.equal(groupOf('cantTell', { toward: 'pass' }), 'probably-fine');
  assert.equal(groupOf('cantTell'), 'review');
});

test('findings are tied to their content item, grouped and sorted', () => {
  const findings = toFindings(result, doc);
  assert.deepEqual(
    findings.map((f) => [f.ruleId, f.group, f.itemId]),
    [
      ['img-alt-present', 'problem', null],
      ['td-has-header', 'likely', 'block-b'],
      ['p-as-heading', 'review', 'block-a']
    ]
  );
  assert.equal(findings[2].key, findingKey('p-as-heading', 'BOLD_SHORT_PARAGRAPH', '<p id="p1">'));
  assert.deepEqual(countByGroup(findings), { problem: 1, likely: 1, review: 1, 'probably-fine': 0 });
});

test('within a group, findings follow the content order', () => {
  const f = (id, item) => ({ key: id, group: 'review', itemId: item });
  const sorted = sortFindings([f('x', 'b'), f('y', 'a'), f('z', null)], ['a', 'b']);
  assert.deepEqual(sorted.map((x) => x.key), ['y', 'x', 'z']);
});

test('a selector that does not resolve leaves the finding unattributed', () => {
  const r = { checksResults: [{ ruleId: 'x', outcome: 'fail', occurrences: [{ selector: '#nope', html: '' }] }] };
  assert.equal(toFindings(r, doc)[0].itemId, null);
  assert.deepEqual(toFindings(null, doc), []);
});

test("a finding's identity doesn't change with the item id, which changes between sessions", () => {
  const result = (id) => ({
    checksResults: [
      {
        ruleId: 'p-as-heading',
        outcome: 'cantTell',
        occurrences: [{ selector: 'p', html: `<p data-surea11y-item="${id}" class="x"><strong>Opening times</strong></p>`, data: { details: { reasonCode: 'BOLD_SHORT_PARAGRAPH' } } }]
      }
    ]
  });
  const [a] = toFindings(result('client-1'), null);
  const [b] = toFindings(result('client-2'), null);
  assert.equal(a.key, b.key);
  assert.equal(a.html, '<p class="x"><strong>Opening times</strong></p>');
});
