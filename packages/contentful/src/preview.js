// The preview script: a site adds it to its preview (draft) mode, next to
// Contentful's live preview package, and it checks the page as visitors get
// it.
//
//   import { enableSureA11yPreview } from '@surea11y/contentful/preview';
//   if (draftMode) enableSureA11yPreview();
//
// It answers the SureA11y editor tab beside Contentful's live preview: the
// tab says hello to the frames on Contentful's page, and the script sends
// its results to that frame only, through the browser (postMessage), never
// to a server. It names each problem's field from inspector mode's
// `data-contentful-*` attributes or from Content Source Maps' hidden
// characters, which it takes out of the page while checking and puts back
// in the same step.

import { loadEngine, messagesFor, scanPage } from '@surea11y/panel';
import { PACK } from '../dist/pack.js';
import { fieldOf, untag } from './preview-tags.js';
import { MESSAGE_SOURCE, VERSION } from './preview-protocol.js';

export { parseContentfulHref, untag, fieldOf } from './preview-tags.js';
export { MESSAGE_SOURCE };

// Apps hosted by Contentful are served from addresses like
// https://<id>.ctfcloud.net (seen on the test space).
const HOSTED_APP = /^https:\/\/[a-z0-9-]+\.ctfcloud\.net$/;

/**
 * Checks the page in `doc` and returns plain findings, each with its `field`
 * ({ entryId, fieldId } or { assetId }) when it is in content, else null.
 * `tagged` says whether the page carries any of Contentful's tags.
 */
export function checkPreview(doc, { locale = 'en', excludeSelectors = [] } = {}) {
  const { fields, restore } = untag(doc);
  let out;
  try {
    out = scanPage(doc, {
      profile: 'cms-page',
      packs: [PACK],
      locale,
      messages: messagesFor(locale),
      excludeSelectors: ['[data-surea11y-marker]', ...excludeSelectors]
    });
  } finally {
    restore();
  }
  const findings = out.findings.map((f) => {
    const el = f.itemId ? doc.querySelector(f.itemId) : null;
    const field = el ? fieldOf(el, fields) : null;
    return { ...JSON.parse(JSON.stringify(f)), selector: f.itemId || null, field };
  });
  const entries = [...new Set([...fields.values()].map((f) => f.entryId).filter(Boolean))];
  return { findings, entries, tagged: fields.size > 0, scanMs: out.scanMs };
}

/**
 * Turns the check on in a preview. Options: `appOrigins` (addresses the
 * SureA11y app may be served from, besides Contentful's own app hosting),
 * `engineUrl` (where the engine file is served; by default it is bundled
 * with this script), `locale`, `delay` (ms after the last change).
 */
export function enableSureA11yPreview({
  appOrigins = [],
  engineUrl,
  locale = 'en',
  delay = 1000
} = {}) {
  const doc = document;
  if (window.top === window) return () => {}; // not inside Contentful: nothing to do
  const allowed = new Set(appOrigins.map((o) => new URL(o).origin));
  const trusted = (origin) => allowed.has(origin) || HOSTED_APP.test(origin);
  let app = null; // { source, origin }: the tab that said hello
  let timer = null;
  let stopped = false;
  let engine = null;

  async function engineReady() {
    if (!engine) {
      let url = engineUrl;
      if (!url) {
        const text = (await import('../dist/engine.js')).default;
        url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      }
      engine = loadEngine(doc, [url]);
    }
    return engine;
  }

  const send = (message) =>
    app &&
    app.source.postMessage({ source: MESSAGE_SOURCE, version: VERSION, ...message }, app.origin);

  async function run() {
    if (stopped || !app) return;
    try {
      await engineReady();
      observer.disconnect(); // our own change of the page is not a change
      const { findings, entries, tagged, scanMs } = checkPreview(doc, { locale });
      send({ type: 'results', url: doc.location.href, entries, tagged, findings, scanMs });
    } catch (error) {
      send({ type: 'error', message: String((error && error.message) || error) });
    } finally {
      if (!stopped)
        observer.observe(doc.body, {
          subtree: true,
          childList: true,
          characterData: true,
          // Not `style`: showing a place outlines it, which is no change.
          attributeFilter: [
            'alt',
            'src',
            'href',
            'title',
            'aria-label',
            'class',
            'lang',
            'role',
            'data-contentful-entry-id',
            'data-contentful-field-id'
          ]
        });
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };
  const observer = new MutationObserver(schedule);

  const onMessage = (event) => {
    const data = event.data;
    if (!data || data.source !== MESSAGE_SOURCE || data.version !== VERSION) return;
    if (!event.source || !trusted(event.origin)) return;
    if (data.type === 'hello') {
      // A tab (new, or reloaded) asks: it gets the results from now on.
      if (!app || app.source !== event.source) {
        app = { source: event.source, origin: event.origin };
        send({ type: 'ready' }); // heard: the tab can say the page is being checked
        schedule();
      }
      return;
    }
    if (!app || event.source !== app.source) return;
    if (data.type === 'check') schedule();
    if (data.type === 'show' && typeof data.selector === 'string') show(doc, data.selector);
  };
  window.addEventListener('message', onMessage);
  return () => {
    stopped = true;
    clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener('message', onMessage);
  };
}

/** Scrolls to a place and outlines it for a moment. */
function show(doc, selector) {
  let el = null;
  try {
    el = doc.querySelector(selector);
  } catch {
    el = null;
  }
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const before = el.style.outline;
  const offset = el.style.outlineOffset;
  el.style.outline = '3px solid #1d5fa6';
  el.style.outlineOffset = '3px';
  setTimeout(() => {
    el.style.outline = before;
    el.style.outlineOffset = offset;
  }, 2000);
}
