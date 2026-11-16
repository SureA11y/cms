// The sidebar app on a page of its own, with a stand-in for Contentful's App
// SDK backed by the test space's real data (through the Content Management
// API). It lets the app run end to end without Contentful's web app, which
// needs a person's login. Not shipped.
import { mount } from '../../packages/contentful/src/app.js';
import { ensureReviewType } from '../../packages/contentful/src/reviews.js';

const params = new URLSearchParams(location.search);
const SPACE = params.get('space') || 'ug0epb7hrk42';
const ENTRY = params.get('entry') || 'surea11yTestArticle';
const base = `https://api.contentful.com/spaces/${SPACE}/environments/master`;

async function call(method, path, body, headers = {}) {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/vnd.contentful.management.v1+json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = r.status === 204 ? {} : await r.json();
  if (!r.ok) throw Object.assign(new Error(json.message || r.statusText), { status: r.status });
  return json;
}

// The parts of the App SDK's `cma` client the app uses.
const cma = {
  asset: { get: ({ assetId }) => call('GET', `/assets/${assetId}`) },
  entry: {
    get: ({ entryId }) => call('GET', `/entries/${entryId}`),
    update: ({ entryId }, e) =>
      call(
        'PUT',
        `/entries/${entryId}`,
        { fields: e.fields },
        { 'X-Contentful-Version': String(e.sys.version) }
      ),
    createWithId: ({ contentTypeId, entryId }, e) =>
      call(
        'PUT',
        `/entries/${entryId}`,
        { fields: e.fields },
        { 'X-Contentful-Content-Type': contentTypeId }
      )
  },
  contentType: {
    get: ({ contentTypeId }) => call('GET', `/content_types/${contentTypeId}`),
    createWithId: ({ contentTypeId }, ct) => call('PUT', `/content_types/${contentTypeId}`, ct),
    publish: ({ contentTypeId }, ct) =>
      call('PUT', `/content_types/${contentTypeId}/published`, undefined, {
        'X-Contentful-Version': String(ct.sys.version)
      })
  }
};

const [entry, contentType] = await Promise.all([
  call('GET', `/entries/${ENTRY}`),
  call('GET', `/content_types/article`)
]);
await ensureReviewType(cma);

const listeners = [];
const fields = {};
for (const f of contentType.fields) {
  fields[f.id] = {
    getValue: (locale) => entry.fields[f.id] && entry.fields[f.id][locale],
    setValue: (value, locale = 'en-US') => {
      entry.fields[f.id] = { ...(entry.fields[f.id] || {}), [locale]: value };
      for (const fn of listeners) fn(value);
    },
    onValueChanged: (locale, fn) => {
      listeners.push(fn);
      return () => {};
    }
  };
}

window.opened = [];
const sdk = {
  // The web app's language, as Contentful gives it (?lang=es-ES on the test page).
  uiLanguageLocale: params.get('lang') || 'en-US',
  locales: { default: 'en-US' },
  ids: { space: SPACE, entry: ENTRY },
  user: { firstName: 'Test', lastName: 'Editor', sys: { id: 'test-editor' } },
  contentType,
  entry: { fields },
  cma,
  navigator: { openAsset: (id) => window.opened.push(id) },
  window: { startAutoResizer() {} }
};
window.app = mount(sdk, document.getElementById('app'));
window.sdk = sdk;
