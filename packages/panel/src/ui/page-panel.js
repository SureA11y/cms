// A panel at the side of a page, for checking the page itself (a preview or
// a published page) without leaving it. It is not a dialog: the page stays
// usable beside it. Opening it moves focus to its heading; Escape or Close
// closes it and returns focus to whatever opened it.

import { tokenCss } from './tokens.js';
import { uiStrings } from '../messages/ui.js';

const STYLE = `
${tokenCss()}
:host { all: initial; }
.panel {
  position: fixed; z-index: 100000; right: 0; bottom: 0;
  top: var(--surea11y-top, 0px);
  width: 380px; max-width: calc(100vw - 16px);
  display: flex; flex-direction: column;
  background: var(--sa11y-surface); color: var(--sa11y-text);
  border-left: 1px solid var(--sa11y-border);
  box-shadow: -4px 0 16px rgba(0, 0, 0, .12);
  font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
}
.panel[hidden] { display: none; }
.header { display: flex; align-items: center; justify-content: space-between; gap: var(--sa11y-space-2); min-height: 48px; padding: 0 var(--sa11y-space-2) 0 var(--sa11y-space-4); border-bottom: 1px solid var(--sa11y-border); }
h2 { margin: 0; font-size: 13px; font-weight: 600; }
h2:focus { outline: none; }
h2:focus-visible { outline: var(--sa11y-focus-width) solid var(--sa11y-focus); outline-offset: 2px; }
.close { width: var(--sa11y-button-height); height: var(--sa11y-button-height); display: flex; align-items: center; justify-content: center; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; border-radius: var(--sa11y-radius-small); }
.close:focus-visible { outline: var(--sa11y-focus-width) solid var(--sa11y-focus); }
.body { flex-grow: 1; overflow-y: auto; padding: var(--sa11y-space-4); }
.footer { display: flex; flex-direction: column; gap: var(--sa11y-space-2); padding: var(--sa11y-space-3) var(--sa11y-space-4); border-top: 1px solid var(--sa11y-border); }
.footer[hidden] { display: none; }
.footer p { margin: 0; color: var(--sa11y-text-muted); }
.footer button { align-self: flex-start; min-height: var(--sa11y-button-height); padding: 0 var(--sa11y-space-3); border-radius: var(--sa11y-radius-small); border: 1px solid var(--sa11y-accent); background: var(--sa11y-surface); color: var(--sa11y-accent); font: inherit; cursor: pointer; }
.footer button:focus-visible { outline: var(--sa11y-focus-width) solid var(--sa11y-focus); outline-offset: 2px; }
.footer button[aria-disabled="true"] { cursor: default; opacity: .7; }
@media (forced-colors: active) { .panel { border-left-color: CanvasText; } }
`;

/**
 * Creates the panel in `doc` (hidden). `title` is its heading; the returned
 * `body` is where the results go, and `footer`, below them, where the host
 * can add its own controls (hidden until it has some).
 * Returns { host, body, footer, open(opener), close(), isOpen() }.
 */
export function createPagePanel(doc, { title, locale = 'en', onClose = () => {} } = {}) {
  const t = uiStrings(locale);
  const host = doc.createElement('div');
  host.setAttribute('data-surea11y-panel', '');
  const root = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = STYLE;

  const panel = doc.createElement('section');
  panel.className = 'panel';
  panel.hidden = true;
  const id = 'surea11y-page-panel-title';
  panel.setAttribute('aria-labelledby', id);
  const header = doc.createElement('div');
  header.className = 'header';
  const heading = doc.createElement('h2');
  heading.id = id;
  heading.tabIndex = -1;
  heading.textContent = title || t.panelLabel;
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.setAttribute('aria-label', t.close);
  close.append(closeIcon(doc));
  header.append(heading, close);
  const body = doc.createElement('div');
  body.className = 'body';
  const footer = doc.createElement('div');
  footer.className = 'footer';
  footer.hidden = true;
  new doc.defaultView.MutationObserver(() => {
    footer.hidden = !footer.childElementCount;
  }).observe(footer, { childList: true });
  panel.append(header, body, footer);
  root.append(style, panel);
  doc.body.append(host);

  let opener = null;
  function open(from) {
    opener = from || doc.activeElement;
    // Below the site's admin bar, when there is one.
    const bar = doc.getElementById('wpadminbar');
    host.style.setProperty(
      '--surea11y-top',
      bar ? `${bar.getBoundingClientRect().bottom}px` : '0px'
    );
    panel.hidden = false;
    heading.focus();
  }
  function hide() {
    if (panel.hidden) return;
    panel.hidden = true;
    onClose();
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
  }
  close.addEventListener('click', hide);
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      hide();
    }
  });

  return { host, body, footer, open, close: hide, isOpen: () => !panel.hidden };
}

function closeIcon(doc) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(ns, 'svg');
  for (const [k, v] of Object.entries({
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 1.8,
    'aria-hidden': 'true',
    focusable: 'false'
  }))
    svg.setAttribute(k, String(v));
  const p = doc.createElementNS(ns, 'path');
  p.setAttribute('d', 'M6 6l12 12M18 6 6 18');
  svg.append(p);
  return svg;
}
