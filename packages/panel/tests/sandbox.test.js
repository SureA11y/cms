import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderItems, sandboxPolicy, scriptSources } from '../src/sandbox.js';

test('items are rendered as siblings, each top-level element marked with its id', () => {
  const doc = new JSDOM('<main></main>').window.document;
  const main = doc.querySelector('main');
  renderItems(main, [
    { id: 'a', html: '<p><strong>Opening hours</strong></p>' },
    { id: 'b"x', html: '<p>Monday to Friday.</p>\n<ul><li>Note</li></ul>' }
  ]);
  const els = [...main.children];
  assert.deepEqual(
    els.map((e) => [e.localName, e.getAttribute('data-surea11y-item')]),
    [
      ['p', 'a'],
      ['p', 'b"x'],
      ['ul', 'b"x']
    ]
  );
  assert.equal(
    els[0].nextElementSibling,
    els[1],
    'a bold line and the paragraph after it are siblings'
  );
});

test('rendering runs no script in the content', () => {
  const dom = new JSDOM('<main></main>', { runScripts: 'dangerously' });
  const main = dom.window.document.querySelector('main');
  dom.window.ran = false;
  renderItems(main, [{ id: 'a', html: '<script>window.ran = true</script><p>x</p>' }]);
  assert.equal(dom.window.ran, false);
});

test("the sandbox's policy blocks inline scripts, frames and requests", () => {
  const policy = sandboxPolicy(['https://example.test']);
  assert.match(policy, /default-src 'none'/);
  assert.match(policy, /script-src https:\/\/example\.test(;|$)/);
  assert.doesNotMatch(policy, /script-src[^;]*unsafe-inline/);
  assert.match(policy, /frame-src 'none'/);
  assert.match(policy, /connect-src 'none'/);
});

test('scripts are allowed by their own address, not the whole site', () => {
  const sources = scriptSources(
    [
      'https://example.test/wp-content/plugins/surea11y/build/engine.js?ver=1',
      '/wp-content/plugins/surea11y/build/engine.i18n.es.js?ver=1'
    ],
    'https://example.test/wp-admin/post.php'
  );
  assert.deepEqual(sources, [
    'https://example.test/wp-content/plugins/surea11y/build/engine.js',
    'https://example.test/wp-content/plugins/surea11y/build/engine.i18n.es.js'
  ]);
  assert.match(
    sandboxPolicy(sources),
    /script-src https:\/\/example\.test\/wp-content\/plugins\/surea11y\/build\/engine\.js /
  );
});
