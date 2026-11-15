import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom.js';

installDom('<!doctype html><html><body><div id="b1"></div><div id="b2"></div></body></html>');
const { createMarkers } = await import('../src/ui/markers.js');

const card = (key, group, itemIds, extra = {}) => ({
  key,
  group,
  summary: `Summary ${key}`,
  marked: false,
  places: itemIds.map((itemId, i) => ({ key: `${key}${i}`, itemId })),
  ...extra
});

function make(onPick = () => {}) {
  return createMarkers(document, { anchorFor: (id) => document.getElementById(id), onPick });
}
const buttons = (m) => [...m.host.shadowRoot.querySelectorAll('button')];

test('one marker per place, hidden from the tab order and from assistive technology', () => {
  const m = make();
  m.update([card('a', 'problem', ['b1']), card('t', 'likely', ['b1', 'b2'])], null);
  const list = buttons(m);
  assert.equal(list.length, 3);
  assert.ok(list.every((b) => b.tabIndex === -1));
  assert.equal(m.host.getAttribute('aria-hidden'), 'true');
  assert.deepEqual(
    list.map((b) => b.dataset.group),
    ['problem', 'likely', 'likely']
  );
  m.destroy();
});

test('a click picks the finding and place; the current one is marked', () => {
  const picks = [];
  const m = make((key, place) => picks.push([key, place]));
  m.update([card('t', 'likely', ['b1', 'b2'])], { cardKey: 't', place: 1 });
  const list = buttons(m);
  assert.equal(list[1].dataset.current, 'true');
  list[1].click();
  assert.deepEqual(picks, [['t', 1]]);
  m.destroy();
});

test('marked cards and places outside the content get no marker', () => {
  const m = make();
  m.update([card('a', 'review', ['b1'], { marked: true }), card('o', 'review', [null])], null);
  assert.equal(buttons(m).length, 0);
  m.destroy();
});

test('more than three on one item fold into "+N"', () => {
  const m = make();
  m.update(
    ['a', 'b', 'c', 'd', 'e'].map((k) => card(k, 'review', ['b1'])),
    null
  );
  const list = buttons(m);
  assert.equal(list.length, 3);
  assert.equal(list[2].textContent, '+3');
  m.destroy();
});

test('markers sit outside the content, and leave nothing behind', () => {
  const m = make();
  m.update([card('a', 'problem', ['b1'])], null);
  assert.equal(document.getElementById('b1').children.length, 0);
  m.destroy();
  assert.equal(document.querySelector('[data-surea11y-markers]'), null);
});

test('with outline, the place last shown gets a frame', () => {
  const m = createMarkers(document, {
    anchorFor: (id) => document.getElementById(id),
    onPick() {},
    outline: true
  });
  m.update([card('t', 'likely', ['b1', 'b2'])], { cardKey: 't', place: 1 });
  assert.equal(m.host.shadowRoot.querySelectorAll('.outline').length, 1);
  m.update([card('t', 'likely', ['b1', 'b2'])], null);
  assert.equal(m.host.shadowRoot.querySelectorAll('.outline').length, 0);
  m.destroy();
});
