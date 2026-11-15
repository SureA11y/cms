// The sandbox: a hidden frame where content is rendered and scanned, away
// from the editor's own markup (Phase 0 showed scanning the editor reports
// the editor, not the author). The engine is loaded only here, and only when
// the first scan needs it.

import { ITEM_ATTRIBUTE, toFindings, sortFindings } from './findings.js';

const CONTENT_ID = 'surea11y-content';

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * The sandbox's own Content Security Policy. The content is the author's,
 * rendered inside an admin page: inline handlers (`onerror`), `javascript:`
 * URLs and frames must not run, and nothing may be fetched that the editor
 * hasn't already loaded from the site or its media. Scripts come only from
 * where the engine is served.
 */
export function sandboxPolicy(scriptOrigins = ["'self'"]) {
  return [
    "default-src 'none'",
    `script-src ${scriptOrigins.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "img-src 'self' https: http: data: blob:",
    "media-src 'self' https: http: blob:",
    "frame-src 'none'",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'"
  ].join('; ');
}

/**
 * Renders content items into `container`, in order, as the published page
 * has them: no wrapper between them, so a bold line and the paragraph after
 * it stay siblings. Each item's own top-level elements are marked with its
 * id instead. The HTML is parsed in an inert <template>, which runs nothing.
 */
export function renderItems(container, items) {
  const doc = container.ownerDocument;
  container.textContent = '';
  for (const item of items) {
    const template = doc.createElement('template');
    template.innerHTML = item.html || '';
    for (const node of template.content.childNodes) {
      if (node.nodeType === 1) node.setAttribute(ITEM_ATTRIBUTE, item.id);
    }
    container.append(template.content);
  }
}

/**
 * Creates a sandbox in `hostDocument`.
 *
 * - `engineUrl`: the browser bundle with the CMS pack (built by
 *   `buildBrowserBundle`), and `localeUrls`, an object of locale side files.
 * - `styles`: the style sheets' HTML (`<link>` and `<style>`) the content is
 *   drawn with, such as the editor canvas's.
 * - `bodyClass`, `lang`, `dir`, `width`: how the content is laid out.
 */
export function createSandbox(hostDocument, options) {
  const {
    engineUrl,
    localeUrls = {},
    styles = '',
    bodyClass = '',
    lang = 'en',
    dir = 'ltr',
    width = 800
  } = options;
  const frame = hostDocument.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('inert', '');
  frame.title = 'SureA11y';
  frame.className = 'surea11y-sandbox';
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${Number(width) || 800}px;height:900px;border:0;visibility:hidden;pointer-events:none;`;
  const scriptUrls = [engineUrl, ...Object.values(localeUrls)].filter(Boolean);
  const origins = [
    ...new Set(
      scriptUrls.map((u) => {
        try {
          return new URL(u, hostDocument.baseURI).origin;
        } catch {
          return "'self'";
        }
      })
    )
  ];
  const scripts = scriptUrls
    .map((src) => `<script src="${escapeAttr(src)}"></script>`)
    .join('');
  frame.srcdoc =
    '<!doctype html>' +
    `<html lang="${escapeAttr(lang)}" dir="${escapeAttr(dir)}"><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(sandboxPolicy(origins))}">` +
    `<title>SureA11y</title>${styles}${scripts}</head>` +
    `<body class="${escapeAttr(bodyClass)}"><main id="${CONTENT_ID}"></main></body></html>`;

  const ready = new Promise((resolve, reject) => {
    frame.addEventListener(
      'load',
      () => {
        const win = frame.contentWindow;
        if (win && win.a11ycore) resolve(win);
        else reject(new Error('The accessibility engine did not load in the sandbox.'));
      },
      { once: true }
    );
  });
  hostDocument.body.appendChild(frame);

  return {
    frame,
    ready,

    /**
     * Renders `items` ([{ id, html }]) and scans them. Returns the findings,
     * the raw result and how long each step took, in milliseconds.
     */
    async scan(items, { profile = 'cms-content', packs = [], locale = 'en', messages } = {}) {
      const win = await ready;
      const doc = win.document;
      const t0 = win.performance.now();
      const main = doc.getElementById(CONTENT_ID);
      renderItems(main, items);
      const t1 = win.performance.now();
      const engineOptions = { profile, packs, locale, output: { detail: 'findings' } };
      if (messages) engineOptions.messages = messages;
      const result = win.a11ycore.runa11yCoreInPage(win.location.href, `#${CONTENT_ID}`, engineOptions, null);
      const t2 = win.performance.now();
      const findings = sortFindings(toFindings(result, doc), items.map((i) => i.id));
      return {
        findings,
        result,
        skippedPacks: result.skippedPacks || (result.engine && result.engine.skippedPacks) || [],
        timing: { renderMs: t1 - t0, scanMs: t2 - t1 }
      };
    },

    destroy() {
      frame.remove();
    }
  };
}
