// The test website's article page in preview mode: Contentful's live
// preview package (live updates, inspector mode tags) and the SureA11y
// preview script. Not shipped.
import { ContentfulLivePreview } from '@contentful/live-preview';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { enableSureA11yPreview } from '@surea11y/contentful/preview';
import data from './data.json';

const LOCALE = 'en-US';
// Outside Contentful (the local test page) the package refuses to start;
// the page still renders, with its tags.
let live = true;
try {
  ContentfulLivePreview.init({
    locale: LOCALE,
    enableInspectorMode: true,
    enableLiveUpdates: true
  });
} catch {
  live = false;
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
const tags = (fieldId) =>
  Object.entries(ContentfulLivePreview.getProps({ entryId: data.sys.id, fieldId, locale: LOCALE }))
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');

function render(entry) {
  const f = entry.fields || {};
  const img = f.mainImage && f.mainImage.fields;
  const url = img && img.file && img.file.url;
  document.getElementById('article').innerHTML = `
    ${url ? `<img src="${esc(url.startsWith('//') ? 'https:' + url : url)}?w=960" alt="${esc(img.description)}"${tags('mainImage')}>` : ''}
    <h1${tags('title')}>${esc(f.title)}</h1>
    <div${tags('body')}>${f.body ? documentToHtmlString(f.body) : ''}</div>`;
}
render(data);
if (live) ContentfulLivePreview.subscribe({ data, locale: LOCALE, callback: render });

// The SureA11y app's address, besides Contentful's own app hosting: the
// test page (dev/contentful) passes its own as ?app=.
const app = new URLSearchParams(location.search).get('app');
enableSureA11yPreview({ appOrigins: app ? [app] : [] });
