import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { vercelStegaCombine } from '@vercel/stega';
import { parseSanityTag, blockPath, untag, fieldOf } from '../src/preview-tags.js';
import { mergeFindings, nearestItem } from '../src/merge.js';

// Text as Sanity's client writes it in preview: the visible text, then
// hidden characters with the address of the field in the Studio.
const tagged = (text, path, id = 'a1') =>
  vercelStegaCombine(
    text,
    {
      origin: 'sanity.io',
      href: `/intent/edit/mode=presentation;id=${id};type=article;path=${encodeURIComponent(path)}?baseUrl=http://localhost:3333`
    },
    false
  );

test('a tag names the document and the field, without the address after it', () => {
  assert.deepEqual(
    parseSanityTag(
      '/intent/edit/id=a1;type=article;path=mainImage.alt?baseUrl=http://localhost:3333'
    ),
    { id: 'a1', type: 'article', path: 'mainImage.alt' }
  );
  assert.deepEqual(parseSanityTag('id=a1;type=article;path=body[_key=="k1"];base=x'), {
    id: 'a1',
    type: 'article',
    path: 'body[_key=="k1"]'
  });
  assert.equal(parseSanityTag('nothing here'), null);
  assert.equal(blockPath('body[_key=="k1"].children[_key=="s1"].text'), 'body[_key=="k1"]');
  assert.equal(blockPath('mainImage.alt'), 'mainImage.alt');
});

test('the hidden characters are taken out for the check and put back after', () => {
  const dom = new JSDOM('<body><main></main><footer>© City Library</footer></body>');
  const doc = dom.window.document;
  const title = tagged('Opening hours', 'title');
  const alt = tagged('IMG_2041.jpg', 'mainImage.alt');
  const main = doc.querySelector('main');
  main.innerHTML = '<h1></h1><img src="x.png"><table><tr><td></td></tr></table>';
  main.querySelector('h1').textContent = title;
  main.querySelector('img').setAttribute('alt', alt);
  main.querySelector('td').textContent = tagged(
    'Branch',
    'body[_key=="k5"].rows[_key=="r1"].cells[0]'
  );
  const { fields, restore } = untag(doc);
  // During the check: clean text, and each element knows its field.
  assert.equal(main.querySelector('h1').textContent, 'Opening hours');
  assert.equal(main.querySelector('img').getAttribute('alt'), 'IMG_2041.jpg');
  assert.equal(fieldOf(main.querySelector('h1'), fields).path, 'title');
  assert.equal(fieldOf(main.querySelector('img'), fields).path, 'mainImage.alt');
  // A table has no tag of its own: it takes the field of what it holds.
  assert.equal(fieldOf(main.querySelector('table'), fields).id, 'a1');
  // The website's own parts have none.
  assert.equal(fieldOf(doc.querySelector('footer'), fields), null);
  restore();
  assert.equal(main.querySelector('h1').textContent, title, 'tags back for Sanity');
  assert.equal(main.querySelector('img').getAttribute('alt'), alt);
});

test('field and page findings become one list; whose each is, and where on the page', () => {
  const field = [
    { key: 'heading|h4', group: 'likely', itemId: 'body[_key=="k3"]', itemLabel: 'Body: Heading 4' }
  ];
  const page = {
    findings: [
      // The same problem, found on the page too: listed once.
      {
        key: 'heading|h4',
        group: 'likely',
        selector: 'main > h4',
        field: { id: 'drafts.a1', path: 'body[_key=="k3"]' }
      },
      // Only the page sees it: content in the title.
      { key: 'title|h1', group: 'review', selector: 'h1', field: { id: 'a1', path: 'title' } },
      // The website's design.
      { key: 'contrast|p', group: 'problem', selector: '.byline', field: null },
      // Another document's content (the site's settings): not this one's.
      { key: 'nav|a', group: 'review', selector: 'nav a', field: { id: 'settings', path: 'menu' } }
    ]
  };
  const out = mergeFindings('a1', field, page, {
    labels: { 'body[_key="k3"]': 'Body: Heading 4' },
    fields: { 'body[_key=="k3"]': 'body' },
    titles: { title: 'Title' }
  });
  assert.deepEqual(
    out.findings.map((f) => [f.key, f.itemId, f.itemLabel, !!f.outside]),
    [
      ['heading|h4', 'body[_key=="k3"]', 'Body: Heading 4', false],
      ['title|h1', 'title', 'Title', false],
      ['contrast|p', 'preview:.byline', 'Website design', true]
    ]
  );
  assert.equal(out.preview['heading|h4'], 'main > h4', 'Show also finds it on the page');
  assert.equal(out.fields.title, 'title', 'a line can show under the title');
  assert.deepEqual(
    mergeFindings('a1', field, null).findings,
    field,
    'no preview: the fields alone'
  );
  assert.equal(
    nearestItem('body[_key=="k5"].rows[_key=="r1"]', ['body', 'body[_key=="k5"]']),
    'body[_key=="k5"]'
  );
});
