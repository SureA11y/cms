import test from 'node:test';
import assert from 'node:assert/strict';
import './locales.js';
import { installDom } from './dom.js';

installDom();
const { defineResultsElement } = await import('../src/ui/results-element.js');
defineResultsElement();

const findings = [
  {
    key: 'a',
    ruleId: 'heading-empty',
    group: 'problem',
    summary: 'This heading is empty.',
    hint: 'Type the heading text.',
    itemId: 'b1',
    itemLabel: 'Heading'
  },
  {
    key: 'b1',
    ruleId: 'td-has-header',
    reasonCode: 'T',
    group: 'likely',
    summary: 'This table has no header cells.',
    hint: 'Turn on its header row.',
    itemId: 'b2',
    itemLabel: 'Table'
  },
  {
    key: 'b2',
    ruleId: 'td-has-header',
    reasonCode: 'T',
    group: 'likely',
    summary: 'This table has no header cells.',
    hint: 'Turn on its header row.',
    itemId: 'b5',
    itemLabel: 'Table'
  },
  {
    key: 'c',
    ruleId: 'p-as-heading',
    group: 'review',
    summary: '<img src=x onerror=alert(1)>',
    hint: '',
    itemId: 'b3',
    itemLabel: 'Paragraph'
  },
  { key: 'd', ruleId: 'x', group: 'review', summary: 'Outside', itemId: null }
];

function make(list = findings) {
  const el = document.createElement('surea11y-results');
  document.body.append(el);
  if (list) el.findings = list;
  return el;
}
const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const $$ = (el, sel) => [...el.shadowRoot.querySelectorAll(sel)];
const button = (el, text) =>
  $$(el, 'button').find((b) => b.textContent === text || b.getAttribute('aria-label') === text);

test('tiles count places per group, with a word each, and the live region says the totals', () => {
  const el = make();
  const tiles = $$(el, '.tile');
  assert.deepEqual(
    tiles.map((t) => t.textContent),
    ['1To fix', '2Likely problems', '2Need a person', '0Probably fine']
  );
  assert.equal(
    $(el, '[role="status"]').textContent,
    '1 to fix, 2 likely, 2 to review, 0 probably fine.'
  );
  el.remove();
});

test('the same finding in two places is one card with "2 places"', () => {
  const el = make();
  const cards = $$(el, 'li.card');
  assert.equal(cards.length, 4);
  const table = cards.find((c) => c.textContent.includes('table'));
  assert.deepEqual(
    [...table.querySelectorAll('.tag')].map((t) => t.textContent),
    ['Table', '2 places']
  );
  el.remove();
});

test('a tile filters the list, and shows its state', () => {
  const el = make();
  const likely = $$(el, '.tile')[1];
  likely.click();
  assert.equal($$(el, '.tile')[1].getAttribute('aria-pressed'), 'true');
  assert.deepEqual(
    $$(el, 'section').map((s) => s.dataset.group),
    ['likely']
  );
  assert.match($(el, '.filter').textContent, /Showing only:Likely problems/);
  button(el, 'Show all').click();
  assert.deepEqual(
    $$(el, 'section').map((s) => s.dataset.group),
    ['problem', 'likely', 'review']
  );
  el.remove();
});

test('groups fold and unfold with a disclosure button', () => {
  const el = make();
  const toggle = $(el, 'section[data-group="likely"] .group-toggle');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  toggle.click();
  const again = $(el, 'section[data-group="likely"] .group-toggle');
  assert.equal(again.getAttribute('aria-expanded'), 'false');
  assert.equal($(el, 'section[data-group="likely"] ul'), null);
  el.remove();
});

test('content text is shown as text, never as HTML', () => {
  const el = make();
  assert.equal($(el, 'img'), null);
  assert.ok($$(el, '.summary').some((p) => p.textContent.includes('onerror')));
  el.remove();
});

test('"How to fix" opens the advice on request', () => {
  const el = make();
  assert.equal($(el, '.hint'), null);
  const how = $$(el, 'button').find((b) => b.textContent === 'How to fix');
  assert.equal(how.getAttribute('aria-expanded'), 'false');
  how.click();
  assert.match($(el, '.hint').textContent, /Type the heading text/);
  el.remove();
});

test('"Show" asks the host, marks the card in words, and steps through its places', () => {
  const el = make();
  const seen = [];
  el.addEventListener('surea11y-show', (e) => seen.push(e.detail.itemId));
  const tableCard = () => $$(el, 'li.card').find((c) => c.textContent.includes('table'));
  tableCard().querySelector('.show').click();
  assert.equal(tableCard().getAttribute('aria-current'), 'true');
  assert.equal(
    tableCard().querySelector('.current-label').textContent,
    'Shown in the content, place 1 of 2'
  );
  assert.equal(tableCard().querySelector('.show').textContent, 'Show next place');
  tableCard().querySelector('.show').click();
  assert.deepEqual(seen, ['b2', 'b5']);
  assert.equal(
    el.shadowRoot.activeElement,
    tableCard().querySelector('.show'),
    'focus stays on the button'
  );
  el.remove();
});

test('the arrows go through every place in the content, and say where they are', () => {
  const el = make();
  const seen = [];
  el.addEventListener('surea11y-show', (e) => seen.push(e.detail.itemId));
  assert.equal($(el, '.nav-label').textContent, '4 to look at');
  for (let i = 0; i < 5; i++) button(el, 'Next finding').click();
  assert.deepEqual(seen, ['b1', 'b2', 'b5', 'b3', 'b1']);
  assert.equal($(el, '.nav-label').textContent, '1 of 4');
  button(el, 'Previous finding').click();
  assert.equal(seen.at(-1), 'b3');
  assert.equal(el.shadowRoot.activeElement.getAttribute('aria-label'), 'Previous finding');
  el.remove();
});

test('a finding outside the content says so, with nothing to show', () => {
  const el = make();
  const outside = $$(el, 'li.card').find((c) => c.textContent.includes('Outside'));
  assert.equal(outside.querySelector('.show'), null);
  assert.match(outside.textContent, /template or theme/);
  el.remove();
});

test('"Hide for me" moves a card out of the counts, and Undo brings it back', () => {
  const el = make();
  const events = [];
  el.addEventListener('surea11y-mark', (e) => events.push(e.detail));
  const tableCard = $$(el, 'li.card').find((c) => c.textContent.includes('table'));
  [...tableCard.querySelectorAll('button')].find((b) => b.textContent === 'Hide for me').click();
  assert.deepEqual(events[0], { keys: ['b1', 'b2'], fine: true });
  assert.equal($$(el, '.tile')[1].textContent, '0Likely problems');
  const marked = $(el, 'section[data-group="marked"] .group-toggle');
  assert.equal(marked.textContent, 'Hidden by you (1)');
  assert.equal(
    el.shadowRoot.activeElement.dataset.focus,
    'group:marked',
    'its group emptied: focus goes to where the card went'
  );
  marked.click();
  $$(el, 'section[data-group="marked"] button')
    .find((b) => b.textContent === 'Undo')
    .click();
  assert.deepEqual(events[1], { keys: ['b1', 'b2'], fine: false });
  assert.equal($$(el, '.tile')[1].textContent, '2Likely problems');
  assert.deepEqual(el.marked, []);
  el.remove();
});

test('marks set by the host are honoured; problems cannot be marked fine', () => {
  const el = make(null);
  el.marked = ['c'];
  el.findings = findings;
  assert.equal($$(el, '.tile')[2].textContent, '1Need a person');
  const problem = $$(el, 'li.card')[0];
  assert.ok(![...problem.querySelectorAll('button')].some((b) => b.textContent === 'Hide for me'));
  el.remove();
});

test('checking is not announced, and the last results stay; the outcome is announced', () => {
  const el = make();
  el.state = 'scanning';
  assert.equal($(el, '.busy').hidden, false);
  assert.equal($$(el, 'li.card').length, 4, 'the list stays while checking');
  el.findings = [];
  assert.equal($(el, '.busy').hidden, true);
  assert.equal($(el, '[role="status"]').textContent, 'Nothing to fix or review in this content.');
  el.remove();
});

test('an error reads as a plain sentence, with Try again and the detail behind a disclosure', () => {
  const el = make(null);
  let retried = 0;
  el.addEventListener('surea11y-retry', () => retried++);
  el.error = 'The accessibility engine did not load in the sandbox.';
  const status = $(el, '[role="status"]').textContent;
  assert.equal(status, "The check didn't finish.");
  assert.doesNotMatch($(el, '.state-text').textContent, /engine|sandbox/);
  const details = $(el, 'details');
  assert.equal(details.hidden, false);
  assert.equal(details.querySelector('summary').textContent, 'Details for your administrator');
  assert.match(details.textContent, /sandbox/);
  button(el, 'Try again').click();
  assert.equal(retried, 1);
  el.findings = [];
  assert.equal(details.hidden, true, 'the detail goes once a check succeeds');
  el.remove();
});

test('empty content says there is nothing to check yet, not that it is clean', () => {
  const el = make(null);
  el.empty = true;
  el.findings = [];
  assert.equal($(el, '[role="status"]').textContent, 'Nothing to check yet');
  el.empty = false;
  el.findings = [];
  assert.equal($(el, '[role="status"]').textContent, 'Nothing to fix or review in this content.');
  el.remove();
});

test('focus stays on the same control after a rescan, and the shown card stays shown', () => {
  const el = make();
  const show = () =>
    $$(el, 'li.card')
      .find((c) => c.textContent.includes('table'))
      .querySelector('.show');
  show().click();
  el.findings = findings.slice();
  assert.equal(el.shadowRoot.activeElement, show());
  assert.ok(show().closest('li').getAttribute('aria-current'));
  el.findings = findings.filter((f) => f.ruleId !== 'td-has-header');
  assert.equal($(el, '[aria-current]'), null, 'gone when the finding is fixed');
  assert.ok(el.shadowRoot.activeElement, 'focus stays in the panel');
  el.remove();
});

test('the look comes from tokens a site can override', () => {
  const el = make();
  const css = $(el, 'style').textContent;
  assert.match(css, /--sa11y-radius: 6px/);
  assert.match(css, /border-radius: var\(--sa11y-radius\)/);
  assert.doesNotMatch(
    css.split('}').slice(1).join('}'),
    /#[0-9a-f]{6}/i,
    'no colour outside the tokens'
  );
  el.remove();
});

test('Spanish', () => {
  const el = make(null);
  el.locale = 'es';
  el.findings = findings;
  assert.equal($$(el, 'li .show')[0].textContent, 'Mostrar');
  assert.equal($$(el, '.tile')[0].textContent, '1Por corregir');
  el.remove();
});

test("the host's own actions become buttons on the card, named by their label and described by the finding", () => {
  const el = make(null);
  const ran = [];
  el.actionsFor = (card) =>
    card.ruleId === 'td-has-header'
      ? [{ id: 'headers', label: 'Open the header setting', run: (c) => ran.push(c.key) }]
      : [];
  el.findings = findings;
  const table = $$(el, 'li.card').find((c) => c.textContent.includes('table'));
  const button = [...table.querySelectorAll('button')].find(
    (b) => b.textContent === 'Open the header setting'
  );
  assert.ok(button);
  assert.equal(
    el.shadowRoot.getElementById(button.getAttribute('aria-describedby')).textContent,
    'This table has no header cells.'
  );
  button.click();
  assert.equal(ran.length, 1);
  const others = $$(el, 'li.card').filter((c) => c !== table);
  assert.ok(!others.some((c) => c.textContent.includes('Open the header setting')));
  el.remove();
});

test('"Reviewed, it\'s fine" takes an optional note, is shared, and can be reopened', () => {
  const el = make(null);
  el.canReview = true;
  el.reviewer = 'Ana';
  el.findings = findings;
  const events = [];
  el.addEventListener('surea11y-review', (e) => events.push(['review', e.detail]));
  el.addEventListener('surea11y-reopen', (e) => events.push(['reopen', e.detail]));
  const table = () => $$(el, 'li.card').find((c) => c.textContent.includes('table'));
  [...table().querySelectorAll('button')].find((b) => b.textContent === 'More').click();
  [...table().querySelectorAll('button')]
    .find((b) => b.textContent === "Reviewed, it's fine")
    .click();
  // The form: a labelled note, focused, with Save and Cancel.
  const note = table().querySelector('textarea');
  assert.equal(el.shadowRoot.activeElement, note);
  assert.equal(
    el.shadowRoot.querySelector(`label[for="${note.id}"]`).textContent,
    'Note (optional)'
  );
  note.value = 'Layout table for the price list.';
  [...table().querySelectorAll('button')].find((b) => b.textContent === 'Save review').click();
  assert.deepEqual(events[0], [
    'review',
    { keys: ['b1', 'b2'], note: 'Layout table for the price list.' }
  ]);
  assert.equal($$(el, '.tile')[1].textContent, '0Likely problems', 'out of the counts');
  const reviewed = $(el, 'section[data-group="reviewed"] .group-toggle');
  assert.equal(reviewed.textContent, 'Reviewed, fine (1)');
  reviewed.click();
  const card = $(el, 'section[data-group="reviewed"] li.card');
  assert.match(card.querySelector('.review-meta').textContent, /^Ana reviewed it on /);
  assert.equal(card.querySelector('.note').textContent, 'Layout table for the price list.');
  [...card.querySelectorAll('button')].find((b) => b.textContent === 'Reopen').click();
  assert.deepEqual(events[1], ['reopen', { keys: ['b1', 'b2'] }]);
  assert.equal($$(el, '.tile')[1].textContent, '2Likely problems');
  el.remove();
});

test('reviews set by the host show who and when; without permission there is no review or reopen', () => {
  const el = make(null);
  el.reviews = { c: { by: 'Ben', when: '14 Nov 2026', note: '' } };
  el.findings = findings;
  assert.equal($$(el, '.tile')[2].textContent, '1Need a person');
  $(el, 'section[data-group="reviewed"] .group-toggle').click();
  const card = $(el, 'section[data-group="reviewed"] li.card');
  assert.equal(card.querySelector('.review-meta').textContent, 'Ben reviewed it on 14 Nov 2026.');
  assert.equal(card.querySelector('.note'), null);
  assert.ok(![...card.querySelectorAll('button')].some((b) => b.textContent === 'Reopen'));
  assert.ok(!$$(el, 'button').some((b) => b.textContent === "Reviewed, it's fine"));
  el.remove();
});

test('with both review and hide, they sit behind "More", a disclosure', () => {
  const el = make(null);
  el.canReview = true;
  el.findings = findings;
  const table = () => $$(el, 'li.card').find((c) => c.textContent.includes('table'));
  const names = () => [...table().querySelectorAll('button')].map((b) => b.textContent);
  assert.deepEqual(names(), ['Show', 'How to fix', 'More']);
  const more = () => [...table().querySelectorAll('button')].find((b) => b.textContent === 'More');
  assert.equal(more().getAttribute('aria-expanded'), 'false');
  more().click();
  assert.equal(more().getAttribute('aria-expanded'), 'true');
  assert.equal(el.shadowRoot.activeElement, more(), 'focus stays on More');
  const row = el.shadowRoot.getElementById(more().getAttribute('aria-controls'));
  assert.deepEqual(
    [...row.querySelectorAll('button')].map((b) => b.textContent),
    ["Reviewed, it's fine", 'Hide for me']
  );
  el.remove();
  // With only one of them, it is shown at once.
  const solo = make();
  const card = $$(solo, 'li.card').find((c) => c.textContent.includes('table'));
  assert.deepEqual(
    [...card.querySelectorAll('button')].map((b) => b.textContent),
    ['Show', 'How to fix', 'Hide for me']
  );
  solo.remove();
});

test('Escape closes the review form, and focus goes back to its button', () => {
  const el = make(null);
  el.canReview = true;
  el.findings = findings;
  const table = () => $$(el, 'li.card').find((c) => c.textContent.includes('table'));
  [...table().querySelectorAll('button')].find((b) => b.textContent === 'More').click();
  [...table().querySelectorAll('button')]
    .find((b) => b.textContent === "Reviewed, it's fine")
    .click();
  table()
    .querySelector('textarea')
    .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(table().querySelector('textarea'), null);
  assert.equal(el.shadowRoot.activeElement.textContent, "Reviewed, it's fine");
  el.remove();
});
