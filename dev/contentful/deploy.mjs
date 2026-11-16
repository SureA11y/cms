// Puts the app in the test space as a private app, hosted by Contentful:
// the app's definition in the organization, the build uploaded as its
// bundle, the app installed in the space, its content type for answers,
// and its panel in the Article sidebar under Publish. Run after
// `npm run build` at the root and in packages/contentful. Not shipped.
//
// Sends through curl, which uses the environment's proxy; a proxy that adds
// the token (for api.contentful.com and upload.contentful.com) is enough,
// or set CONTENTFUL_TOKEN.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { SPACE, ENV } from './seed.mjs';

const ORG = '034YLveCnxINBHvOoa6gTV';
const NAME = 'SureA11y (test)';
const build = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../packages/contentful/build'
);

function curl(method, url, { body, file, headers = {} } = {}) {
  const args = ['-s', '-X', method];
  if (process.env.CONTENTFUL_TOKEN)
    args.push('-H', `Authorization: Bearer ${process.env.CONTENTFUL_TOKEN}`);
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
  if (body !== undefined)
    args.push(
      '-H',
      'Content-Type: application/vnd.contentful.management.v1+json',
      '--data-binary',
      JSON.stringify(body)
    );
  if (file) args.push('-H', 'Content-Type: application/octet-stream', '--data-binary', `@${file}`);
  args.push(url);
  const out = execFileSync('curl', args, { encoding: 'utf8' });
  const json = out ? JSON.parse(out) : {};
  if (json.sys && json.sys.type === 'Error')
    throw new Error(`${method} ${url}: ${json.message} ${JSON.stringify(json.details || '')}`);
  return json;
}
const org = (p) => `https://api.contentful.com/organizations/${ORG}/${p}`;
const env = (p) => `https://api.contentful.com/spaces/${SPACE}/environments/${ENV}/${p}`;

// 1. The app's definition: where it shows (sidebar, configuration screen).
let def = (curl('GET', org('app_definitions')).items || []).find((d) => d.name === NAME);
const locations = [{ location: 'entry-sidebar' }, { location: 'app-config' }];
if (!def)
  def = curl('POST', org('app_definitions'), {
    body: { name: NAME, locations, src: 'https://localhost:1' }
  });
console.log('definition', def.sys.id);

// 2. The build, zipped and uploaded, becomes the definition's bundle.
const zip = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sa11y-')), 'app.zip');
execFileSync('zip', ['-qr', zip, '.'], { cwd: build });
const upload = curl('POST', `https://upload.contentful.com/organizations/${ORG}/app_uploads`, {
  file: zip
});
const bundle = curl('POST', org(`app_definitions/${def.sys.id}/app_bundles`), {
  body: {
    upload: { sys: { type: 'Link', linkType: 'AppUpload', id: upload.sys.id } },
    comment: 'Test build'
  }
});
console.log('bundle', bundle.sys.id);
const current = curl('GET', org(`app_definitions/${def.sys.id}`));
const { src: _src, ...rest } = current;
curl('PUT', org(`app_definitions/${def.sys.id}`), {
  body: {
    ...rest,
    locations,
    bundle: { sys: { type: 'Link', linkType: 'AppBundle', id: bundle.sys.id } }
  },
  headers: { 'X-Contentful-Version': String(current.sys.version) }
});

// 3. Installed in the space.
curl('PUT', env(`app_installations/${def.sys.id}`), { body: { parameters: {} } });

// 4. Its content type for answers (what its configuration screen does).
const reviewType = 'surea11yReview';
const existing = execFileSync('curl', ['-s', env(`content_types/${reviewType}`)], {
  encoding: 'utf8'
});
if (JSON.parse(existing).sys.type === 'Error') {
  const ct = curl('PUT', env(`content_types/${reviewType}`), {
    body: {
      name: 'Accessibility answers',
      description:
        'Kept by SureA11y: what people answered about accessibility findings. Never published.',
      displayField: 'entryId',
      fields: [
        { id: 'entryId', name: 'Entry', type: 'Symbol', required: true },
        { id: 'answers', name: 'Answers', type: 'Object' }
      ]
    }
  });
  curl('PUT', env(`content_types/${reviewType}/published`), {
    headers: { 'X-Contentful-Version': String(ct.sys.version) }
  });
}

// 5. The panel in the Article sidebar, under Publish.
const ei = curl('GET', env('content_types/article/editor_interface'));
const builtin = (id) => ({ widgetId: id, widgetNamespace: 'sidebar-builtin' });
const sidebar = (
  ei.sidebar || [
    builtin('publication-widget'),
    builtin('content-preview-widget'),
    builtin('incoming-links-widget'),
    builtin('translation-widget'),
    builtin('versions-widget')
  ]
).filter((w) => w.widgetId !== def.sys.id);
sidebar.splice(1, 0, { widgetId: def.sys.id, widgetNamespace: 'app' });
curl('PUT', env('content_types/article/editor_interface'), {
  body: {
    controls: ei.controls,
    sidebar,
    editors: ei.editors,
    editorLayout: ei.editorLayout,
    groupControls: ei.groupControls
  },
  headers: { 'X-Contentful-Version': String(ei.sys.version) }
});
console.log(`installed: https://app.contentful.com/spaces/${SPACE}/entries/surea11yTestArticle`);
