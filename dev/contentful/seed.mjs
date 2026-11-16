// Puts the test article in the test space (the maintainer's): a content
// type "article", an image whose description is a file name, and an entry
// with a heading that skips a level, a "click here" link and a table
// without header cells. Run: node seed.mjs. Not shipped.
//
// Sends through curl, which uses the environment's proxy; a proxy that adds
// the token is enough, or set CONTENTFUL_TOKEN.
import { execFileSync } from 'node:child_process';

export const SPACE = 'ug0epb7hrk42';
export const ENV = 'master';
export const ENTRY = 'surea11yTestArticle';
const ASSET = 'surea11yHero';
const LOCALE = 'en-US';
// A public image Contentful fetches: the Sanity test image.
const IMAGE_URL =
  'https://cdn.sanity.io/images/1tmgxdtl/development/2e89e74ff33d2e4856699a3a1c15f8eb8ab9d7d4-640x360.png';

export function api(method, path, body, headers = {}) {
  const args = ['-s', '-X', method, '-H', 'Content-Type: application/vnd.contentful.management.v1+json'];
  if (process.env.CONTENTFUL_TOKEN) args.push('-H', `Authorization: Bearer ${process.env.CONTENTFUL_TOKEN}`);
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
  if (body !== undefined) args.push('--data-binary', JSON.stringify(body));
  args.push(`https://api.contentful.com/spaces/${SPACE}/environments/${ENV}/${path}`);
  const out = execFileSync('curl', args, { encoding: 'utf8' });
  return out ? JSON.parse(out) : {};
}

const version = (path) => (api('GET', path).sys || {}).version;
function put(path, body, extra = {}) {
  const v = version(path);
  const out = api('PUT', path, body, { ...(v ? { 'X-Contentful-Version': String(v) } : {}), ...extra });
  if (out.sys && out.sys.type === 'Error') throw new Error(`${path}: ${out.message}`);
  return out;
}
const publish = (path) => {
  const v = version(path);
  return api('PUT', `${path}/published`, undefined, { 'X-Contentful-Version': String(v) });
};

const text = (value) => ({ nodeType: 'text', value, marks: [], data: {} });
const node = (nodeType, content, data = {}) => ({ nodeType, data, content });
const p = (...c) => node('paragraph', c);

export function seed() {
  put('content_types/article', {
    name: 'Article',
    displayField: 'title',
    fields: [
      { id: 'title', name: 'Title', type: 'Symbol', required: true },
      { id: 'mainImage', name: 'Main image', type: 'Link', linkType: 'Asset' },
      { id: 'body', name: 'Body', type: 'RichText' }
    ]
  });
  publish('content_types/article');

  if (!version(`assets/${ASSET}`)) {
    put(`assets/${ASSET}`, {
      fields: {
        title: { [LOCALE]: 'Hero' },
        description: { [LOCALE]: 'IMG_2041.jpg' },
        file: { [LOCALE]: { contentType: 'image/png', fileName: 'IMG_2041.png', upload: IMAGE_URL } }
      }
    });
    api('PUT', `assets/${ASSET}/files/${LOCALE}/process`, undefined, {
      'X-Contentful-Version': String(version(`assets/${ASSET}`))
    });
    for (let i = 0; i < 20; i++) {
      const a = api('GET', `assets/${ASSET}`);
      if (a.fields && a.fields.file && a.fields.file[LOCALE].url) break;
      execFileSync('sleep', ['1']);
    }
    publish(`assets/${ASSET}`);
  }

  const link = { sys: { type: 'Link', linkType: 'Asset', id: ASSET } };
  put(`entries/${ENTRY}`, {
    fields: {
      title: { [LOCALE]: 'Opening hours over the holidays' },
      mainImage: { [LOCALE]: link },
      body: {
        [LOCALE]: node('document', [
          node('heading-2', [text('From 23 December')]),
          p(
            text('All branches close at 15:00. For the full list of branches, '),
            node('hyperlink', [text('click here')], { uri: 'https://library.example/branches' }),
            text('.')
          ),
          node('heading-4', [text("Children's library")]),
          p(text('The reading room stays open until 17:00.')),
          node('table', [
            node('table-row', [node('table-cell', [p(text('Branch'))]), node('table-cell', [p(text('24 Dec'))])]),
            node('table-row', [node('table-cell', [p(text('Central'))]), node('table-cell', [p(text('10–14'))])])
          ])
        ])
      }
    }
  }, { 'X-Contentful-Content-Type': 'article' });
  return api('GET', `entries/${ENTRY}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const e = seed();
  console.log(e.sys.id, 'version', e.sys.version, Object.keys(e.fields));
}
