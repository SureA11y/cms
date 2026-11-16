import test from 'node:test';
import assert from 'node:assert/strict';
import { documentItems, imageSize, isImage } from '../src/content.js';
import { pathToString, stringToPath } from '../src/paths.js';

const span = (text, marks = []) => ({ _type: 'span', _key: `s-${text}`, text, marks });
const block = (key, style, text, extra = {}) => ({
  _type: 'block',
  _key: key,
  style,
  markDefs: [],
  children: [span(text)],
  ...extra
});

const schema = {
  name: 'article',
  fields: [
    { name: 'title', type: { name: 'string', jsonType: 'string' } },
    { name: 'mainImage', title: 'Main image', type: { name: 'image', jsonType: 'object' } },
    { name: 'body', title: 'Body', type: { name: 'array', jsonType: 'array' } }
  ]
};

const article = {
  _id: 'drafts.a1',
  _type: 'article',
  title: 'Opening hours over the holidays',
  body: [
    block('k1', 'h2', 'From 23 December'),
    {
      _type: 'block',
      _key: 'k2',
      style: 'normal',
      markDefs: [{ _key: 'l1', _type: 'link', href: 'https://library.example/branches' }],
      children: [
        span('All branches close at 15:00. For the full list, '),
        span('click here', ['l1'])
      ]
    },
    block('k3', 'h4', "Children's library"),
    block('k4', 'normal', 'Monday', { listItem: 'bullet', level: 1 }),
    block('k5', 'normal', 'Tuesday', { listItem: 'bullet', level: 1 }),
    { _type: 'image', _key: 'k6', asset: { _ref: 'image-abc-1200x800-jpg' } },
    { _type: 'table', _key: 'k7', rows: [{ _key: 'r1', cells: ['Branch', '24 Dec'] }] },
    { _type: 'youtube', _key: 'k8', url: 'https://example.com/v' }
  ],
  // Out of the form's order on purpose: the schema's order wins.
  mainImage: { _type: 'image', alt: 'IMG_2041.jpg', asset: { _ref: 'image-def-1600x900-png' } }
};

test('paths: to and from the strings Sanity writes', () => {
  const path = ['body', { _key: 'k"1' }, 'children', 0, 'text'];
  const text = pathToString(path);
  assert.equal(text, 'body[_key=="k\\"1"].children[0].text');
  assert.deepEqual(stringToPath(text), path);
  assert.equal(pathToString(['mainImage']), 'mainImage');
});

test('a document becomes items in the form order, one per block, each named by its field', () => {
  const { items, labels, order } = documentItems(article, schema);
  assert.deepEqual(order, [
    'mainImage',
    'body[_key=="k1"]',
    'body[_key=="k2"]',
    'body[_key=="k3"]',
    'body[_key=="k4"]',
    'body[_key=="k6"]',
    'body[_key=="k7"]'
  ]);
  assert.equal(labels.mainImage, 'Main image');
  assert.equal(labels['body[_key=="k1"]'], 'Body: Heading 2');
  assert.equal(labels['body[_key=="k4"]'], 'Body: List');
  assert.equal(labels['body[_key=="k7"]'], 'Body: Table');
  const html = Object.fromEntries(items.map((i) => [i.id, i.html]));
  assert.equal(html['body[_key=="k1"]'], '<h2>From 23 December</h2>');
  assert.match(
    html['body[_key=="k2"]'],
    /<a href="https:\/\/library\.example\/branches">click here<\/a>/
  );
  assert.equal(html['body[_key=="k4"]'], '<ul><li>Monday</li><li>Tuesday</li></ul>', 'one list');
  assert.equal(
    html['body[_key=="k7"]'],
    '<table><tbody><tr><td>Branch</td><td>24 Dec</td></tr></tbody></table>'
  );
  assert.ok(!items.some((i) => /Opening hours/.test(i.html)), 'the title is left to the page');
  assert.ok(!items.some((i) => i.id === 'body[_key=="k8"]'), 'unknown blocks are left out');
});

test('images: alternative text, none, or empty for decoration, and their size', () => {
  const { items } = documentItems(article, schema, {
    imageUrl: (v) => `https://cdn.example/${v.asset._ref}`
  });
  const html = Object.fromEntries(items.map((i) => [i.id, i.html]));
  assert.equal(
    html.mainImage,
    '<img src="https://cdn.example/image-def-1600x900-png" alt="IMG_2041.jpg" width="1600" height="900">'
  );
  assert.equal(
    html['body[_key=="k6"]'],
    '<img src="https://cdn.example/image-abc-1200x800-jpg" width="1200" height="800">',
    'no alternative text: no alt'
  );
  const decorative = documentItems({
    hero: { _type: 'image', alt: '', asset: { _ref: 'image-x-10x10-gif' } }
  });
  assert.match(decorative.items[0].html, / alt=""/);
  const other = documentItems(
    { hero: { _type: 'image', description: 'A map', asset: { _ref: 'image-x-10x10-gif' } } },
    null,
    { altFields: ['description'] }
  );
  assert.match(other.items[0].html, / alt="A map"/);
  assert.deepEqual(imageSize({ asset: { _ref: 'image-abc-1200x800-jpg' } }), {
    width: 1200,
    height: 800
  });
  assert.equal(imageSize({ asset: { _ref: 'file-abc-pdf' } }), null);
  assert.ok(
    isImage({ _type: 'figure', asset: { _ref: 'image-a-1x1-png' } }),
    'a custom image type'
  );
});

test('text from the document is escaped, never read as HTML', () => {
  const doc = {
    body: [block('k1', 'normal', '<img src=x onerror=alert(1)>')],
    hero: { _type: 'image', alt: '"><script>x</script>', asset: { _ref: 'image-a-1x1-png' } }
  };
  const { items } = documentItems(doc);
  for (const item of items) {
    assert.doesNotMatch(item.html, /<script|<img src=x/, item.id);
  }
});

test('nested fields: sections of a page builder keep their whole path', () => {
  const page = {
    sections: [
      { _type: 'textSection', _key: 's1', body: [block('b1', 'h2', 'Visit us')] },
      {
        _type: 'heroSection',
        _key: 's2',
        image: { _type: 'image', asset: { _ref: 'image-a-2x2-png' } }
      }
    ]
  };
  const { order, labels } = documentItems(page);
  assert.deepEqual(order, ['sections[_key=="s1"].body[_key=="b1"]', 'sections[_key=="s2"].image']);
  assert.equal(labels['sections[_key=="s1"].body[_key=="b1"]'], 'Sections: Heading 2');
});

test('an empty or missing document has no items', () => {
  assert.deepEqual(documentItems(null).items, []);
  assert.deepEqual(documentItems({ title: 'Only a title' }).items, []);
});
