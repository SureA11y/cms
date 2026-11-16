import test from 'node:test';
import assert from 'node:assert/strict';
import { vercelStegaCombine } from '@vercel/stega';
import { parseOrigins, previewOriginsOf } from '../src/origins.js';
import { assetFieldsOf } from '../src/content.js';
import { mergeFindings } from '../src/merge.js';
import { parseContentfulHref } from '../src/preview-tags.js';

test('preview addresses: origins only, https or this machine', () => {
  assert.deepEqual(
    parseOrigins(
      'https://preview.example.com/news\nhttp://example.com, not an address\nhttp://localhost:3000 https://preview.example.com'
    ),
    ['https://preview.example.com', 'http://localhost:3000']
  );
  assert.deepEqual(
    previewOriginsOf({ parameters: { installation: { previewOrigins: ['https://a.example/'] } } }),
    ['https://a.example']
  );
  assert.deepEqual(previewOriginsOf({ parameters: {} }), []);
});

test("Content Source Maps' addresses name the entry and field", () => {
  assert.deepEqual(
    parseContentfulHref(
      'https://app.contentful.com/spaces/s1/environments/master/entries/e1/?focusedField=body&focusedLocale=en-US'
    ),
    { entryId: 'e1', fieldId: 'body' }
  );
  assert.deepEqual(parseContentfulHref('https://app.contentful.com/spaces/s1/assets/a1'), {
    assetId: 'a1',
    fieldId: ''
  });
  assert.equal(parseContentfulHref('https://example.com/'), null);
  // The payload as the hidden characters carry it decodes to the same.
  const tagged = vercelStegaCombine('Title', {
    origin: 'contentful.com',
    href: 'https://app.contentful.com/spaces/s1/entries/e1?focusedField=title'
  });
  assert.notEqual(tagged, 'Title');
});

test('which field links each asset', () => {
  const link = (id) => ({ sys: { type: 'Link', linkType: 'Asset', id } });
  assert.deepEqual(
    assetFieldsOf({
      title: 'x',
      mainImage: link('a1'),
      gallery: [link('a2')],
      body: {
        nodeType: 'document',
        content: [{ nodeType: 'embedded-asset-block', data: { target: link('a3') }, content: [] }]
      }
    }),
    { a1: 'mainImage', a2: 'gallery', a3: 'body' }
  );
});

test('the fields and the preview page as one list', () => {
  const own = [{ key: 'k1', group: 'likely', itemId: 'body#2', itemLabel: 'Body: Heading 4' }];
  const page = {
    tagged: true,
    findings: [
      // Also in the fields: listed once, remembering where it is on the page.
      { key: 'k1', group: 'likely', selector: 'h4', field: { entryId: 'e1', fieldId: 'body' } },
      // Only on the page, in this entry's title.
      { key: 'k2', group: 'problem', selector: 'h1', field: { entryId: 'e1', fieldId: 'title' } },
      // Another entry's content: left out.
      { key: 'k3', group: 'problem', selector: 'nav a', field: { entryId: 'e2', fieldId: 'x' } },
      // An asset this entry uses: its field.
      { key: 'k4', group: 'likely', selector: 'img', field: { assetId: 'a1', fieldId: '' } },
      // Not tagged, on a tagged page: the website's design.
      { key: 'k5', group: 'problem', selector: 'p.credit', field: null }
    ]
  };
  const out = mergeFindings('e1', own, page, {
    labels: { 'body#2': 'Body: Heading 4' },
    fieldOf: { 'body#2': 'body' },
    names: { title: 'Title', mainImage: 'Main image' },
    assetFields: { a1: 'mainImage' }
  });
  assert.deepEqual(
    out.findings.map((f) => [f.key, f.itemId, f.itemLabel, !!f.outside]),
    [
      ['k1', 'body#2', 'Body: Heading 4', false],
      ['k2', 'title', 'Title', false],
      ['k4', 'mainImage', 'Main image', false],
      ['k5', 'preview:p.credit', 'Website design', true]
    ]
  );
  assert.deepEqual(out.preview, { k1: 'h4', k2: 'h1', k4: 'img', k5: 'p.credit' });
  assert.equal(out.fieldOf.title, 'title');
  // A page with no tags: what only the page has is "On the page".
  const bare = mergeFindings('e1', own, {
    tagged: false,
    findings: [{ key: 'k5', group: 'problem', selector: 'p.credit', field: null }]
  });
  assert.deepEqual(
    bare.findings.map((f) => [f.itemLabel, !!f.outside]),
    [
      ['Body: Heading 4', false],
      ['On the page', false]
    ]
  );
  // Without the page: the fields alone.
  assert.deepEqual(mergeFindings('e1', own, null).findings, own);
});
