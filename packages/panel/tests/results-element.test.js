import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom.js';

installDom();
const { defineResultsElement } = await import('../src/ui/results-element.js');
defineResultsElement();

const findings = [
  { key: 'a', ruleId: 'img-alt-present', group: 'problem', summary: 'This image has no alternative text.', hint: 'Describe it.', itemId: 'b1' },
  { key: 'b', ruleId: 'p-as-heading', group: 'review', summary: '<img src=x onerror=alert(1)>', hint: '', itemId: 'b2' },
  { key: 'c', ruleId: 'x', group: 'review', summary: 'Outside', itemId: null }
];

function make() {
  const el = document.createElement('surea11y-results');
  document.body.append(el);
  return el;
}

test('findings are listed under a heading per group, with a status', () => {
  const el = make();
  el.findings = findings;
  const root = el.shadowRoot;
  assert.deepEqual([...root.querySelectorAll('h3')].map((h) => h.textContent), ['To fix (1)', 'Needs a person (2)']);
  assert.equal(root.querySelector('[role="status"]').textContent, '1 to fix, 0 likely, 2 to review, 0 probably fine.');
  assert.equal(root.querySelectorAll('li').length, 3);
  el.remove();
});

test("content text is shown as text, never as HTML", () => {
  const el = make();
  el.findings = findings;
  assert.equal(el.shadowRoot.querySelector('img'), null);
  assert.ok([...el.shadowRoot.querySelectorAll('.summary')].some((p) => p.textContent.includes('onerror')));
  el.remove();
});

test('"Show" is named by its label and described by the finding, and asks the host', () => {
  const el = make();
  el.findings = findings;
  const button = el.shadowRoot.querySelector('li .show');
  assert.equal(button.textContent, 'Show');
  const described = el.shadowRoot.getElementById(button.getAttribute('aria-describedby'));
  assert.equal(described.textContent, findings[0].summary);
  let detail = null;
  el.addEventListener('surea11y-show', (e) => { detail = e.detail; });
  button.click();
  assert.equal(detail.itemId, 'b1');
  el.remove();
});

test('a finding outside the content says so, with nothing to show', () => {
  const el = make();
  el.findings = findings;
  const last = el.shadowRoot.querySelectorAll('li')[2];
  assert.equal(last.querySelector('.show'), null);
  assert.match(last.textContent, /template or theme/);
  el.remove();
});

test('"Next finding" goes through the findings in the content, and moves focus', () => {
  const el = make();
  el.findings = findings;
  const seen = [];
  el.addEventListener('surea11y-show', (e) => seen.push(e.detail.itemId));
  el.showNext(); el.showNext(); el.showNext();
  assert.deepEqual(seen, ['b1', 'b2', 'b1']);
  assert.equal(el.shadowRoot.activeElement.className, 'show');
  el.remove();
});

test('scanning is not announced; the outcome is', () => {
  const el = make();
  el.state = 'scanning';
  const root = el.shadowRoot;
  assert.equal(root.querySelector('.busy').hidden, false);
  assert.equal(root.querySelector('[role="status"]').textContent, '');
  el.findings = [];
  assert.equal(root.querySelector('.busy').hidden, true);
  assert.equal(root.querySelector('[role="status"]').textContent, 'Nothing to fix or review in this content.');
  el.remove();
});

test('focus stays on the same finding after a rescan', () => {
  const el = make();
  el.findings = findings;
  el.shadowRoot.querySelectorAll('li .show')[1].focus();
  el.findings = findings.slice();
  assert.equal(el.shadowRoot.activeElement.closest('li').dataset.key, 'b');
  el.remove();
});

test('Spanish', () => {
  const el = make();
  el.locale = 'es';
  el.findings = findings;
  assert.equal(el.shadowRoot.querySelector('li .show').textContent, 'Mostrar');
  el.remove();
});

test('an error reads as a plain sentence, with the detail behind a disclosure', () => {
  const el = make();
  el.error = 'The accessibility engine did not load in the sandbox.';
  const root = el.shadowRoot;
  const status = root.querySelector('[role="status"]').textContent;
  assert.match(status, /Reload the page/);
  assert.doesNotMatch(status, /engine|sandbox/);
  const details = root.querySelector('details');
  assert.equal(details.hidden, false);
  assert.equal(details.querySelector('summary').textContent, 'Details for your administrator');
  assert.match(details.textContent, /sandbox/);
  el.findings = [];
  assert.equal(details.hidden, true, 'the detail goes once a check succeeds');
  el.remove();
});

test('empty content says there is nothing to check yet, not that it is clean', () => {
  const el = make();
  el.empty = true;
  el.findings = [];
  assert.match(el.shadowRoot.querySelector('[role="status"]').textContent, /Nothing to check yet/);
  el.empty = false;
  el.findings = [];
  assert.equal(el.shadowRoot.querySelector('[role="status"]').textContent, 'Nothing to fix or review in this content.');
  el.remove();
});

test('the finding last shown is marked, by words and not colour alone, and stays marked after a rescan', () => {
  const el = make();
  el.findings = findings;
  const buttons = el.shadowRoot.querySelectorAll('li .show');
  buttons[1].click();
  let current = el.shadowRoot.querySelectorAll('li[aria-current="true"]');
  assert.equal(current.length, 1);
  assert.equal(current[0].dataset.key, 'b');
  assert.equal(current[0].querySelector('.current-label').textContent, 'Shown in the content');
  el.shadowRoot.querySelectorAll('li .show')[0].click();
  current = el.shadowRoot.querySelectorAll('li[aria-current="true"]');
  assert.deepEqual([...current].map((li) => li.dataset.key), ['a']);
  el.findings = findings.slice();
  assert.equal(el.shadowRoot.querySelector('li[aria-current="true"]').dataset.key, 'a');
  el.findings = findings.slice(1);
  assert.equal(el.shadowRoot.querySelector('li[aria-current="true"]'), null, 'gone when the finding is fixed');
  el.remove();
});
