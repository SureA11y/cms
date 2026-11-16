import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';
import { entryItems, linkedAssets } from '../src/content.js';

const text = (value) => ({ nodeType: 'text', value, marks: [], data: {} });
const block = (nodeType, ...content) => ({ nodeType, data: {}, content });
const link = (id) => ({ sys: { type: 'Link', linkType: 'Asset', id } });

const fields = [
  { id: 'title', name: 'Title', type: 'Symbol' },
  { id: 'mainImage', name: 'Main image', type: 'Link', linkType: 'Asset' },
  { id: 'body', name: 'Body', type: 'RichText' }
];
const assets = {
  hero: {
    title: 'Hero',
    description: 'IMG_2041.jpg',
    file: {
      url: '//images.ctfassets.net/s/hero/x/hero.png',
      contentType: 'image/png',
      details: { image: { width: 640, height: 360 } }
    }
  },
  plan: {
    title: 'Plan',
    description: '',
    file: { url: '//images.ctfassets.net/s/plan/y/plan.png', contentType: 'image/png' }
  },
  pdf: {
    title: 'Prices',
    file: { url: '//assets.ctfassets.net/s/pdf/z/prices.pdf', contentType: 'application/pdf' }
  }
};
const values = {
  title: 'Opening hours over the holidays',
  mainImage: link('hero'),
  body: block(
    BLOCKS.DOCUMENT,
    block(BLOCKS.HEADING_2, text('From 23 December')),
    block(
      BLOCKS.PARAGRAPH,
      text('For the full list of branches, '),
      {
        nodeType: INLINES.HYPERLINK,
        data: { uri: 'https://library.example/branches' },
        content: [text('click here')]
      },
      text('. Prices: '),
      { nodeType: INLINES.ASSET_HYPERLINK, data: { target: link('pdf') }, content: [text('PDF')] }
    ),
    block(BLOCKS.HEADING_4, text("Children's library")),
    block(BLOCKS.UL_LIST, block(BLOCKS.LIST_ITEM, block(BLOCKS.PARAGRAPH, text('Monday')))),
    { nodeType: BLOCKS.EMBEDDED_ASSET, data: { target: link('plan') }, content: [] },
    block(
      BLOCKS.TABLE,
      block(BLOCKS.TABLE_ROW, block(BLOCKS.TABLE_CELL, block(BLOCKS.PARAGRAPH, text('Branch'))))
    ),
    {
      nodeType: BLOCKS.EMBEDDED_ENTRY,
      data: { target: { sys: { type: 'Link', linkType: 'Entry', id: 'e1' } } },
      content: []
    }
  )
};

test('an entry becomes items in the content type order, one per block, each named by its field', () => {
  const { items, labels, fields: fieldOf, order } = entryItems(values, fields, assets);
  assert.deepEqual(order, [
    'mainImage',
    'body#0',
    'body#1',
    'body#2',
    'body#3',
    'body#4',
    'body#5'
  ]);
  assert.equal(labels.mainImage, 'Main image');
  assert.equal(labels['body#2'], 'Body: Heading 4');
  assert.equal(labels['body#5'], 'Body: Table');
  assert.equal(fieldOf['body#2'], 'body');
  const html = Object.fromEntries(items.map((i) => [i.id, i.html]));
  assert.equal(html['body#0'], '<h2>From 23 December</h2>');
  assert.match(html['body#1'], /<a href="https:\/\/library\.example\/branches">click here<\/a>/);
  assert.match(
    html['body#1'],
    /<a href="https:\/\/assets\.ctfassets\.net\/s\/pdf\/z\/prices\.pdf">PDF<\/a>/,
    'a link to a file goes to the file'
  );
  assert.equal(html['body#3'], '<ul><li><p>Monday</p></li></ul>');
  assert.match(html['body#5'], /^<table>/);
  assert.ok(!items.some((i) => /Opening hours/.test(i.html)), 'the title is left to the page');
});

test('images: the description is the alternative text; none means no alt', () => {
  const { items } = entryItems(values, fields, assets);
  const html = Object.fromEntries(items.map((i) => [i.id, i.html]));
  assert.equal(
    html.mainImage,
    '<img src="https://images.ctfassets.net/s/hero/x/hero.png" alt="IMG_2041.jpg" width="640" height="360">'
  );
  assert.equal(
    html['body#4'],
    '<img src="https://images.ctfassets.net/s/plan/y/plan.png">',
    'an empty description: no alt'
  );
});

test('text from the entry is escaped, never read as HTML', () => {
  const evil = {
    body: block(BLOCKS.DOCUMENT, block(BLOCKS.PARAGRAPH, text('<img src=x onerror=alert(1)>'))),
    mainImage: link('bad')
  };
  const { items } = entryItems(evil, null, {
    bad: {
      description: '"><script>x</script>',
      file: { url: '//x/y.png', contentType: 'image/png' }
    }
  });
  for (const item of items) assert.doesNotMatch(item.html, /<script|<img src=x/, item.id);
});

test('the assets an entry links to, for fetching before a check', () => {
  assert.deepEqual(linkedAssets(values).sort(), ['hero', 'pdf', 'plan']);
  assert.deepEqual(entryItems({}, fields, {}).items, []);
});
