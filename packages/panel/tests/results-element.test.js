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

test('a marker shows its card from any view, filter or folded group', () => {
  const el = make();
  el.outline = { headings: [{ level: 2, text: 'Intro', itemId: 'b9' }], images: [] };
  const card = (key) => el.cards.find((c) => c.places.some((p) => p.key === key));
  const currentGroup = () => $(el, '.card[aria-current="true"]').closest('section').dataset.group;

  // From the headings view: back to the findings, the card current.
  el.view = 'headings';
  assert.equal($(el, 'section[data-group]'), null);
  el.showPlace(card('c').key);
  assert.equal(el.view, 'findings');
  assert.equal(currentGroup(), 'review');

  // A filter that hides its group is cleared.
  $$(el, '.tile')[1].click();
  el.showPlace(card('a').key);
  assert.deepEqual(
    $$(el, 'section').map((s) => s.dataset.group),
    ['problem', 'likely', 'review']
  );
  assert.equal(currentGroup(), 'problem');

  // A folded group unfolds.
  $(el, 'section[data-group="likely"] .group-toggle').click();
  assert.equal($(el, 'section[data-group="likely"] ul'), null);
  el.showPlace(card('b1').key);
  assert.equal(currentGroup(), 'likely');
  el.remove();
});

test('"Probably fine" starts folded, with its count on its tile; a tile opens it', () => {
  const el = make([
    ...findings,
    {
      key: 'pf',
      ruleId: 'img-alt-quality',
      group: 'probably-fine',
      summary: 'Probably fine.',
      itemId: 'b8'
    }
  ]);
  const toggle = $(el, 'section[data-group="probably-fine"] .group-toggle');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal($(el, 'section[data-group="probably-fine"] ul'), null);
  assert.match($$(el, '.tile')[3].textContent, /^1/);
  $$(el, '.tile')[3].click();
  assert.ok($(el, 'section[data-group="probably-fine"] ul'));
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

const tableCard = (el) => $$(el, 'li.card').find((c) => c.textContent.includes('table'));
const buttonIn = (node, text) =>
  [...node.querySelectorAll('button')].find((b) => b.textContent === text);
const QUESTION = {
  steps: ['Find the table.', 'Read its first row.'],
  passWhen: 'The first row labels the columns.',
  failWhen: 'Nothing labels the columns.'
};

test('an uncertain card offers Show, Check it and Hide for me; a problem card How to fix', () => {
  const el = make(null);
  el.canReview = true;
  el.findings = findings;
  assert.deepEqual(
    [...tableCard(el).querySelectorAll('button')].map((b) => b.textContent),
    ['Show', 'Check it', 'Hide for me']
  );
  const problem = $(el, 'section[data-group="problem"] li.card');
  assert.deepEqual(
    [...problem.querySelectorAll('button')].map((b) => b.textContent),
    ['Show', 'How to fix']
  );
  el.remove();
});

test('"Check it" shows what to do, the steps and what fine and a problem look like, from the host', async () => {
  const el = make(null);
  el.canReview = true;
  const asked = [];
  el.questionFor = (card) => {
    asked.push(card.ruleId);
    return Promise.resolve(QUESTION);
  };
  el.findings = findings;
  const check = buttonIn(tableCard(el), 'Check it');
  assert.equal(check.getAttribute('aria-expanded'), 'false');
  check.click();
  assert.equal(buttonIn(tableCard(el), 'Check it').getAttribute('aria-expanded'), 'true');
  assert.match(tableCard(el).textContent, /Loading the steps…/);
  await new Promise((r) => setTimeout(r, 0));
  const card = tableCard(el);
  assert.deepEqual(asked, ['td-has-header'], 'asked once');
  assert.match(card.querySelector('.hint').textContent, /Turn on its header row/);
  assert.deepEqual(
    [...card.querySelectorAll('ol.steps li')].map((li) => li.textContent),
    QUESTION.steps
  );
  const yes = buttonIn(card, "Yes, it's fine");
  const no = buttonIn(card, "No, it's a problem");
  assert.equal(
    el.shadowRoot.getElementById(yes.getAttribute('aria-describedby')).textContent,
    "It's fine when: The first row labels the columns."
  );
  assert.equal(
    el.shadowRoot.getElementById(no.getAttribute('aria-describedby')).textContent,
    "It's a problem when: Nothing labels the columns."
  );
  assert.ok(buttonIn(card, 'Not sure'));
  // Escape closes it, and focus goes back to Check it.
  card
    .querySelector('.question')
    .dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(tableCard(el).querySelector('.question'), null);
  assert.equal(el.shadowRoot.activeElement.textContent, 'Check it');
  el.remove();
});

test('"Yes" is a shared review with the note, and can be reopened', async () => {
  const el = make(null);
  el.canReview = true;
  el.reviewer = 'Ana';
  el.questionFor = () => Promise.resolve(QUESTION);
  el.findings = findings;
  const events = [];
  el.addEventListener('surea11y-review', (e) => events.push(['review', e.detail]));
  el.addEventListener('surea11y-reopen', (e) => events.push(['reopen', e.detail]));
  buttonIn(tableCard(el), 'Check it').click();
  await new Promise((r) => setTimeout(r, 0));
  const note = tableCard(el).querySelector('textarea');
  assert.equal(
    el.shadowRoot.querySelector(`label[for="${note.id}"]`).textContent,
    'Note (optional)'
  );
  note.value = 'Layout table for the price list.';
  buttonIn(tableCard(el), "Yes, it's fine").click();
  assert.deepEqual(events[0], [
    'review',
    { keys: ['b1', 'b2'], note: 'Layout table for the price list.', answer: 'pass' }
  ]);
  assert.equal($$(el, '.tile')[1].textContent, '0Likely problems', 'out of the counts');
  const reviewed = $(el, 'section[data-group="reviewed"] .group-toggle');
  assert.equal(reviewed.textContent, 'Reviewed, fine (1)');
  reviewed.click();
  const card = $(el, 'section[data-group="reviewed"] li.card');
  assert.match(card.querySelector('.review-meta').textContent, /^Ana reviewed it on /);
  assert.equal(card.querySelector('.note').textContent, 'Layout table for the price list.');
  buttonIn(card, 'Reopen').click();
  assert.deepEqual(events[1], ['reopen', { keys: ['b1', 'b2'] }]);
  assert.equal($$(el, '.tile')[1].textContent, '2Likely problems');
  el.remove();
});

test('"No" makes it one to fix, saying who confirmed it; Reopen puts it back', async () => {
  const el = make(null);
  el.canReview = true;
  el.reviewer = 'Ana';
  el.questionFor = () => Promise.resolve(QUESTION);
  el.findings = findings;
  buttonIn(tableCard(el), 'Check it').click();
  await new Promise((r) => setTimeout(r, 0));
  buttonIn(tableCard(el), "No, it's a problem").click();
  assert.equal($$(el, '.tile')[0].textContent, '3To fix', 'counted with the problems');
  assert.equal($$(el, '.tile')[1].textContent, '0Likely problems');
  const card = $$(el, 'section[data-group="problem"] li.card').find((c) =>
    c.textContent.includes('table')
  );
  assert.match(
    card.querySelector('.review-meta').textContent,
    /^Ana confirmed it is a problem on /
  );
  assert.ok(buttonIn(card, 'How to fix'), 'a problem to fix');
  buttonIn(card, 'Reopen').click();
  assert.equal($$(el, '.tile')[1].textContent, '2Likely problems', 'back in its own group');
  el.remove();
});

test('"Not sure" leaves it open and says so; a host can set answers', async () => {
  const el = make(null);
  el.canReview = true;
  el.reviewer = 'Ana';
  el.findings = findings;
  buttonIn(tableCard(el), 'Check it').click();
  await new Promise((r) => setTimeout(r, 0));
  buttonIn(tableCard(el), 'Not sure').click();
  assert.equal($$(el, '.tile')[1].textContent, '2Likely problems', 'still to look at');
  assert.match(tableCard(el).querySelector('.review-meta').textContent, /^Ana wasn't sure, on /);
  assert.equal(el.shadowRoot.activeElement.textContent, 'Check it');
  el.remove();

  const set = make(null);
  set.reviews = { c: { by: 'Ben', when: '14 Nov 2026', note: '', answer: 'fail' } };
  set.findings = findings;
  const confirmed = $$(set, 'section[data-group="problem"] li.card').find((c) =>
    c.textContent.includes('onerror')
  );
  assert.equal(
    confirmed.querySelector('.review-meta').textContent,
    'Ben confirmed it is a problem on 14 Nov 2026.'
  );
  set.remove();
});

test('reviews set by the host show who and when; without permission there is no answer or reopen', () => {
  const el = make(null);
  el.reviews = { c: { by: 'Ben', when: '14 Nov 2026', note: '' } };
  el.findings = findings;
  assert.equal($$(el, '.tile')[2].textContent, '1Need a person');
  $(el, 'section[data-group="reviewed"] .group-toggle').click();
  const card = $(el, 'section[data-group="reviewed"] li.card');
  assert.equal(card.querySelector('.review-meta').textContent, 'Ben reviewed it on 14 Nov 2026.');
  assert.equal(card.querySelector('.note'), null);
  assert.ok(!buttonIn(card, 'Reopen'));
  // The steps still show, without the answers.
  buttonIn(tableCard(el), 'Check it').click();
  assert.ok(tableCard(el).querySelector('.question'));
  assert.ok(!buttonIn(tableCard(el), "Yes, it's fine"));
  el.remove();
});

test('a host that cannot show a place gets no Show buttons and no arrows', () => {
  const el = make();
  assert.ok($$(el, 'button').some((b) => b.textContent === 'Show'));
  el.canShow = false;
  assert.ok(!$$(el, 'button').some((b) => b.textContent === 'Show'));
  assert.equal($$(el, '.nav').length, 0);
  assert.ok($$(el, 'li.card').length > 0, 'the cards stay');
  el.remove();
});

test('a finding worded for editors keeps its markup and CSS for a developer, closed at first', () => {
  const worded = {
    key: 'r1',
    ruleId: 'resize-text-content-loss',
    reasonCode: 'TEXT_CLIPPED_AT_640',
    group: 'likely',
    summary: 'When the page is zoomed to 200%, part of the text is cut off.',
    hint: 'Remove the fixed height.',
    messageKey: 'resizeTextContentLoss_summary_clipped',
    html: '<div class="card">Opening times</div>',
    values: { clipCss: 'height: 40px; overflow: hidden' },
    itemId: 'b1'
  };
  const plain = { ...worded, key: 'r2', summary: 'Core words.', messageKey: 'coreOnly_summary' };
  const el = make([worded, plain]);
  const toggles = $$(el, 'button.dev-toggle');
  assert.equal(toggles.length, 1, "only the card the panel words; core's own words name them");
  const toggle = toggles[0];
  assert.equal(toggle.textContent, 'For your developer');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal($(el, '.dev'), null);
  toggle.click();
  const open = $(el, 'button.dev-toggle');
  assert.equal(open.getAttribute('aria-expanded'), 'true');
  const box = el.shadowRoot.getElementById(open.getAttribute('aria-controls'));
  assert.ok(box, 'the button controls the part it opens');
  const text = box.textContent;
  assert.match(text, /Rule: resize-text-content-loss/);
  assert.match(text, /Markup: <div class="card">Opening times<\/div>/);
  assert.match(text, /CSS: height: 40px; overflow: hidden/);
  assert.equal(box.querySelector('div div'), null, 'markup is shown as text');
  assert.equal(el.shadowRoot.activeElement, open, 'focus stays on the button');
  open.click();
  assert.equal($(el, '.dev'), null);
  el.remove();
});
