// The preview script: a site adds it to its preview (draft) mode, next to
// Sanity's own visual editing, and it checks the page as visitors get it.
//
//   import { enableSureA11yPreview } from '@surea11y/sanity/preview';
//   if (draftMode) enableSureA11yPreview({ studioOrigin: 'https://example.sanity.studio' });
//
// It names each problem's field from the tags Sanity's preview already puts
// on the page: hidden characters in text (stega) and `data-sanity`
// attributes. Those characters are taken out of the page while it is
// checked and put back at once, in the same step, so the check reads the
// text as visitors get it and Sanity's own overlays are untouched. The
// results go to the Studio's side panel through the browser (postMessage to
// the Studio's window only), never to a server.

import { loadEngine, messagesFor, scanPage } from '@surea11y/panel';
import { PACK } from '../dist/pack.js';
import { blockPath, fieldOf, untag } from './preview-tags.js';

export { parseSanityTag, blockPath, untag } from './preview-tags.js';

import { MESSAGE_SOURCE, VERSION } from './preview-protocol.js';

export { MESSAGE_SOURCE };
/**
 * Checks the page in `doc` and returns plain findings, each with its
 * `field` ({ id, type, path }) when it is in a document's content, or
 * `outside: true` when it is in the website's design.
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
      excludeSelectors: ['sanity-visual-editing', '[data-surea11y-marker]', ...excludeSelectors]
    });
  } finally {
    restore();
  }
  const findings = out.findings.map((f) => {
    const el = f.itemId ? doc.querySelector(f.itemId) : null;
    const field = el ? fieldOf(el, fields) : null;
    const plain = JSON.parse(JSON.stringify(f));
    return {
      ...plain,
      selector: f.itemId || null,
      field: field ? { ...field, path: blockPath(field.path) } : null,
      outside: !field
    };
  });
  const documents = [...new Set([...fields.values()].map((f) => f.id))];
  return { findings, documents, scanMs: out.scanMs };
}

/**
 * Turns the check on in a preview: loads the engine, checks the page when
 * it settles and after each change, and sends the results to the Studio.
 * Options: `studioOrigin` (the Studio's address; required unless the page
 * is framed by a Studio on the same origin), `engineUrl` (where the engine
 * file is served; by default it is bundled with this script), `locale`,
 * `delay` (ms after the last change).
 */
export function enableSureA11yPreview({
  studioOrigin,
  engineUrl,
  locale = 'en',
  delay = 1000
} = {}) {
  const doc = document;
  const target = window.parent && window.parent !== window ? window.parent : null;
  if (!target) return () => {}; // not in the Studio's preview: nothing to do
  const origin = studioOrigin || doc.location.origin;
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

  async function run() {
    if (stopped) return;
    try {
      await engineReady();
      observer.disconnect(); // our own change of the page is not a change
      const { findings, documents, scanMs } = checkPreview(doc, { locale });
      target.postMessage(
        {
          source: MESSAGE_SOURCE,
          version: VERSION,
          type: 'results',
          url: doc.location.href,
          documents,
          findings,
          scanMs
        },
        origin
      );
    } catch (error) {
      target.postMessage(
        {
          source: MESSAGE_SOURCE,
          version: VERSION,
          type: 'error',
          message: String((error && error.message) || error)
        },
        origin
      );
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
            'data-sanity',
            'lang',
            'role'
          ]
        });
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };
  const observer = new MutationObserver(schedule);

  // The Studio asks to show a place, or to check again.
  const onMessage = (event) => {
    if (event.source !== target || event.origin !== origin) return;
    const data = event.data;
    if (!data || data.source !== MESSAGE_SOURCE) return;
    if (data.type === 'check') schedule();
    if (data.type === 'show' && typeof data.selector === 'string') show(doc, data.selector);
  };
  window.addEventListener('message', onMessage);
  schedule();
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
