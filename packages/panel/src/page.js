// Checking a whole page as visitors get it: the theme, the menus and the
// author's content together, for people who can edit that content. Each
// finding says whether it is in the author's content or in the theme.
//
// The page itself is never changed: findings point at elements by the
// engine's selector, and no reference to the page is kept between checks.

import { toFindings } from './findings.js';
import { readOutline, pathSelector } from './outline.js';

/**
 * Loads the engine into `doc` once (a <script> per URL, in order).
 * Resolves when `window.a11ycore` is there.
 */
export function loadEngine(doc, urls) {
  const win = doc.defaultView;
  if (win.a11ycore) return Promise.resolve(win.a11ycore);
  return loadScripts(
    doc,
    urls,
    () => !!win.a11ycore,
    'The accessibility engine did not load.'
  ).then(() => win.a11ycore);
}

/**
 * Loads scripts into `doc`, in order, unless `done()` says they are there.
 * Rejects if one fails to load, or, with `failure` as the message, if
 * `done()` is still false after.
 */
export function loadScripts(doc, urls, done = null, failure = 'A script did not load.') {
  if (done && done()) return Promise.resolve();
  return urls
    .filter(Boolean)
    .reduce(
      (chain, url) =>
        chain.then(
          () =>
            new Promise((resolve, reject) => {
              const script = doc.createElement('script');
              script.src = url;
              script.async = false;
              script.onload = resolve;
              script.onerror = () => reject(new Error(`Could not load ${url}`));
              doc.head.append(script);
            })
        ),
      Promise.resolve()
    )
    .then(() => {
      if (done && !done()) throw new Error(failure);
    });
}

/**
 * Checks the page in `doc`. Options:
 * - contentSelector: where the author's content is (the first match).
 * - excludeSelectors: what to leave out (the checker's own interface, the
 *   site's admin bar).
 * - profile, packs, locale, messages, runOnly: as for the engine.
 * - engineOptions: more of the engine's options (`topLevelDocument`).
 * - labels: { content, theme }: the tag each finding gets.
 *
 * Returns { findings, outline, result, scanMs }: `outline` is the page's
 * headings and images (readOutline). Each finding's `itemId` is its
 * selector, so a host can find the element again; `outside` is true for
 * findings outside the author's content. Where the element is decides, not
 * the rule: a theme rule's finding on an element inside the content (a box
 * whose fixed height was set in the editor) is the author's.
 */
export function scanPage(
  doc,
  {
    contentSelector = '',
    excludeSelectors = [],
    profile = 'cms-page',
    packs = [],
    locale = 'en',
    messages,
    runOnly = null,
    engineOptions: extra = null,
    labels = { content: 'Your content', theme: 'Theme or template' }
  } = {}
) {
  const win = doc.defaultView;
  const engineOptions = {
    ...(extra || {}),
    profile,
    packs,
    locale,
    excludeSelectors,
    output: { detail: 'findings' }
  };
  if (messages) engineOptions.messages = messages;
  const t0 = win.performance.now();
  const result = win.a11ycore.runa11yCoreInPage(win.location.href, 'html', engineOptions, runOnly);
  const scanMs = win.performance.now() - t0;
  const content = contentSelector ? first(doc, contentSelector) : null;
  const excluded = (el) =>
    excludeSelectors.some((sel) => {
      try {
        return !!el.closest(sel);
      } catch {
        return false;
      }
    });
  const findings = toFindings(result, null)
    .filter((f) => {
      // A rule that missed the exclusions still never reports on them.
      const el = f.selector ? first(doc, f.selector) : null;
      return !(el && excluded(el));
    })
    .map((f) => {
      const found = f.selector ? first(doc, f.selector) : null;
      // A finding about the whole page (its title, its language) has nothing
      // on screen to show.
      const element = found && isShown(doc, found) ? found : null;
      const inContent = !!(element && content && content.contains(element));
      return Object.assign(f, {
        itemId: element ? f.selector : null,
        outside: !inContent,
        itemLabel: inContent ? labels.content : labels.theme
      });
    });
  // The author's content first, then the theme; groups first within each.
  findings.sort((a, b) => Number(a.outside) - Number(b.outside));
  // The page's headings and images, the theme's included, each marked
  // inside or outside the author's content.
  const outline = readOutline(doc.body, {
    findings,
    itemOf: (el) => pathSelector(el),
    skip: excluded,
    outside: (el) => !(content && content.contains(el))
  });
  return { findings, outline, result, scanMs, skippedPacks: result.skippedPacks || [] };
}

function isShown(doc, el) {
  if (el === doc.documentElement || el === doc.body || (doc.head && doc.head.contains(el)))
    return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
}

function first(doc, selector) {
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

/**
 * Checks the page at `url` laid out at a phone's width, for WCAG 1.4.10
 * (Reflow): the page is loaded again in a hidden frame `width` CSS pixels
 * wide (320, the width 1.4.10 names), the engine is loaded into it, and
 * `reflow-horizontal-scroll` runs there, told the frame is the page. The
 * frame is removed after. Options as for scanPage, with `engineUrls`, the
 * engine's scripts, and `timeoutMs` for the page to load.
 *
 * Returns what scanPage returns. Each finding's `itemId` is its selector,
 * which finds the same element in the page as shown, since it is the same
 * page.
 */
export async function scanPageAtWidth(
  hostDoc,
  { url, width = 320, height = 640, engineUrls = [], timeoutMs = 30000, ...options } = {}
) {
  const win = hostDoc.defaultView;
  const frame = hostDoc.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('inert', '');
  frame.title = 'SureA11y';
  frame.setAttribute('data-surea11y-frame', '');
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${Number(width) || 320}px;height:${Number(height) || 640}px;border:0;visibility:hidden;pointer-events:none;`;
  let timer = null;
  try {
    const loaded = new Promise((resolve, reject) => {
      frame.addEventListener('load', resolve, { once: true });
      timer = win.setTimeout(
        () => reject(new Error('The page did not load at phone width.')),
        timeoutMs
      );
    });
    frame.src = url;
    hostDoc.body.append(frame);
    await loaded;
    const doc = frame.contentDocument;
    if (!doc || !doc.body) throw new Error('The page at phone width could not be read.');
    // Measure the page as it settles: its fonts change the width of text.
    if (doc.fonts && doc.fonts.ready) {
      await Promise.race([
        doc.fonts.ready,
        new Promise((resolve) => win.setTimeout(resolve, 3000))
      ]);
    }
    await loadEngine(doc, engineUrls);
    return scanPage(doc, {
      ...options,
      runOnly: { includeRuleIds: ['reflow-horizontal-scroll'] },
      engineOptions: { topLevelDocument: true }
    });
  } finally {
    if (timer) win.clearTimeout(timer);
    frame.remove();
  }
}
