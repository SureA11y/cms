// The test website's article page in preview mode: Contentful's live
// preview package (live updates, inspector mode tags), and a probe that
// reports whether this frame and the SureA11y app's frame can reach each
// other on Contentful's page. Not shipped.
import { ContentfulLivePreview } from '@contentful/live-preview';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import data from './data.json';

const LOCALE = 'en-US';
ContentfulLivePreview.init({ locale: LOCALE, enableInspectorMode: true, enableLiveUpdates: true });

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
ContentfulLivePreview.subscribe({ data, locale: LOCALE, callback: render });

// --- The probe ---------------------------------------------------------
const log = [];
const out = document.getElementById('probe');
function show() {
  out.textContent =
    `This frame: ${self.origin}. Frames on the page: ${count()}. ` +
    (log.length ? log.join(' · ') : 'No word from the SureA11y app yet.');
}
function frames(win, list = []) {
  for (let i = 0; i < win.frames.length; i += 1) {
    const f = win.frames[i];
    list.push(f);
    try {
      frames(f, list);
    } catch {
      /* not reachable */
    }
  }
  return list;
}
// Contentful's page: the one framing this preview (live preview), or the
// one that opened it in a new tab.
const host = () => (window.top !== window ? window.top : window.opener);
function count() {
  try {
    const h = host();
    if (!h) return 'none (no Contentful page framed or opened this one)';
    return `${frames(h).length} (${window.top !== window ? 'framed' : 'opened in a new tab'})`;
  } catch (e) {
    return `unknown (${e.name})`;
  }
}
function hello() {
  try {
    const h = host();
    if (h)
      for (const f of frames(h))
        if (f !== window) f.postMessage({ surea11y: 'hello', from: 'preview' }, '*');
  } catch (e) {
    log.push(`Could not list frames: ${e.name}`);
  }
  show();
}
window.addEventListener('message', (event) => {
  const m = event.data;
  if (!m || typeof m !== 'object' || !m.surea11y || m.from === 'preview') return;
  if (m.surea11y === 'hello' && event.source)
    event.source.postMessage({ surea11y: 'hi', from: 'preview' }, '*');
  const line = `${m.surea11y === 'hello' ? 'App asked' : 'App answered'} from ${event.origin}`;
  if (!log.includes(line)) log.push(line);
  show();
});
hello();
setInterval(hello, 3000);
