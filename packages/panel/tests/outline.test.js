import test from 'node:test';
import assert from 'node:assert/strict';
import './locales.js';
import { installDom } from './dom.js';

installDom();
const { readOutline, pathSelector } = await import('../src/outline.js');
const { renderItems } = await import('../src/sandbox.js');
const { defineResultsElement } = await import('../src/ui/results-element.js');
defineResultsElement();

function content(items) {
  const main = document.createElement('main');
  main.id = 'c';
  document.body.replaceChildren(main);
  renderItems(main, items);
  return main;
}

test('headings in order, with their level, text and block', () => {
  const main = content([
    { id: 'b1', html: '<h2>Intro</h2>' },
    { id: 'b2', html: '<div><h4>Deep <img src="x.png" alt="logo"></h4></div>' },
    {
      id: 'b3',
      html: '<h3></h3><h3 hidden>Hidden</h3><div role="heading" aria-level="5">Fake</div>'
    }
  ]);
  const { headings } = readOutline(main);
  assert.deepEqual(
    headings.map((h) => [h.level, h.text, h.itemId]),
    [
      [2, 'Intro', 'b1'],
      [4, 'Deep logo', 'b2'],
      [3, '', 'b3'],
      [5, 'Fake', 'b3']
    ]
  );
});

test('images say what a screen reader says: text, decorative, or nothing', () => {
  const main = content([
    {
      id: 'i1',
      html: '<figure><img src="/up/dog%20park.jpg?w=300" alt="A dog in a park"></figure>'
    },
    { id: 'i2', html: '<img src="a.png" alt="">' },
    { id: 'i3', html: '<img src="b.png">' },
    { id: 'i4', html: '<svg role="img"><title>Chart</title></svg>' }
  ]);
  const { images } = readOutline(main);
  assert.deepEqual(
    images.map((i) => [i.alt, i.decorative, i.src, i.itemId]),
    [
      ['A dog in a park', false, 'dog park.jpg', 'i1'],
      ['', true, 'a.png', 'i2'],
      [null, false, 'b.png', 'i3'],
      ['Chart', false, '', 'i4']
    ]
  );
});

test('an entry is flagged only where the engine reported on that element', () => {
  const main = content([{ id: 'b1', html: '<h2>One</h2><h2>Two</h2>' }]);
  const findings = [
    { key: 'k1', group: 'review', selector: 'main#c > h2:nth-of-type(2)' },
    { key: 'k2', group: 'problem', selector: 'main#c > h2:nth-of-type(2)' }
  ];
  const { headings } = readOutline(main, { findings });
  assert.deepEqual(
    headings.map((h) => [h.keys, h.group]),
    [
      [[], null],
      [['k1', 'k2'], 'problem']
    ]
  );
});

test('pathSelector finds the element again', () => {
  content([{ id: 'b1', html: '<section><p>a</p><p><img src="z.png" alt="z"></p></section>' }]);
  const img = document.querySelector('img');
  assert.equal(document.querySelector(pathSelector(img)), img);
});

test('the list offers Findings, Headings and Images, and Show names the block', () => {
  const el = document.createElement('surea11y-results');
  document.body.append(el);
  el.findings = [];
  const $$ = (sel) => [...el.shadowRoot.querySelectorAll(sel)];
  assert.equal($$('.views').length, 0, 'no views without an outline');
  el.outline = {
    headings: [
      { level: 2, text: 'Intro', itemId: 'b1', keys: [], group: null },
      { level: 4, text: '', itemId: 'b2', keys: ['k'], group: 'problem' }
    ],
    images: [{ alt: null, decorative: false, src: 'b.png', itemId: 'i3', keys: [], group: null }]
  };
  const views = $$('.views button');
  assert.deepEqual(
    views.map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
    [
      ['Findings', 'true'],
      ['Headings (2)', 'false'],
      ['Images (1)', 'false']
    ]
  );
  views[1].click();
  assert.equal(el.view, 'headings');
  assert.equal(
    el.shadowRoot.activeElement.textContent,
    'Headings (2)',
    'focus stays on the pressed view'
  );
  const entries = $$('section[data-view="headings"] li');
  assert.equal(entries.length, 2);
  assert.match(entries[0].textContent, /Level 2: Intro/);
  assert.match(entries[1].textContent, /\(empty heading\).*To fix/);
  let shown = null;
  el.addEventListener('surea11y-show', (e) => (shown = e.detail.itemId));
  entries[1].querySelector('button').click();
  assert.equal(shown, 'b2');
  $$('.views button')[2].click();
  assert.match($$('section[data-view="images"] li')[0].textContent, /No text alternative.*b\.png/);
  el.remove();
});
