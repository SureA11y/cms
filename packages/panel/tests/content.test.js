import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom.js';

installDom();
const { hasContent } = await import('../src/content.js');

test('no items, or only empty paragraphs, is no content', () => {
  assert.equal(hasContent([]), false);
  assert.equal(
    hasContent([
      { id: 'a', html: '' },
      { id: 'b', html: '<p></p>' },
      { id: 'c', html: '<p> <br> </p>' }
    ]),
    false
  );
});

test('text, media, and empty headings are content', () => {
  assert.equal(hasContent([{ id: 'a', html: '<p>Hello</p>' }]), true);
  assert.equal(hasContent([{ id: 'a', html: '<figure><img src="x.png"></figure>' }]), true);
  assert.equal(
    hasContent([{ id: 'a', html: '<h2></h2>' }]),
    true,
    'an empty heading is something to fix'
  );
});

test('parsing runs no script', () => {
  globalThis.ran = false;
  hasContent([{ id: 'a', html: '<img src=x onerror="globalThis.ran=true">' }]);
  assert.equal(globalThis.ran, false);
});
