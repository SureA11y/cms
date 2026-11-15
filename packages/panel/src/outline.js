// The content's headings and images, as lists an author can read through:
// the outline a screen-reader user moves by, and what each image says to
// someone who can't see it. Nothing is judged here: an entry is flagged only
// when the engine reported on that element, so the views never disagree with
// the findings.

import { ITEM_ATTRIBUTE } from './findings.js';

const HEADINGS = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
const IMAGES = 'img, [role="img"], input[type="image"]';

/**
 * Reads the headings and images inside `root`, in document order.
 *
 * - `findings`: the scan's findings for the same document; an entry gets the
 *   keys and the most serious group of those on its element.
 * - `itemOf(el)`: the id a host shows an element by (a block id in the
 *   editor, a selector on a page); by default the content item the sandbox
 *   tagged it with.
 * - `skip(el)`: elements to leave out (the checker's own interface).
 * - `outside(el)`: true for elements outside the author's content.
 *
 * Returns { headings: [{ level, text, itemId, outside, keys, group }],
 *           images: [{ alt, decorative, src, itemId, outside, keys, group }] }.
 * `alt` is null when the image has no text alternative at all.
 */
export function readOutline(
  root,
  { findings = [], itemOf = taggedItem, skip = () => false, outside = () => false } = {}
) {
  const out = { headings: [], images: [] };
  if (!root || !root.querySelectorAll) return out;
  const doc = root.ownerDocument || root;
  const byElement = findingsByElement(doc, findings);
  const flags = (el) => {
    const list = byElement.get(el) || [];
    return { keys: list.map((f) => f.key), group: worstGroup(list) };
  };
  for (const el of root.querySelectorAll(HEADINGS)) {
    if (skip(el) || hidden(el)) continue;
    const role = el.getAttribute('role');
    const level =
      role === 'heading'
        ? Number(el.getAttribute('aria-level')) || 2
        : Number(el.tagName.slice(1)) || 2;
    out.headings.push({
      level,
      text: textOf(el),
      itemId: itemOf(el),
      outside: !!outside(el),
      ...flags(el)
    });
  }
  for (const el of root.querySelectorAll(IMAGES)) {
    if (skip(el) || hidden(el)) continue;
    const alt = altOf(el);
    out.images.push({
      alt,
      decorative: alt === '',
      src: srcOf(el),
      itemId: itemOf(el),
      outside: !!outside(el),
      ...flags(el)
    });
  }
  return out;
}

/** The content item the sandbox tagged an element with. */
function taggedItem(el) {
  const item = el.closest(`[${ITEM_ATTRIBUTE}]`);
  return item ? item.getAttribute(ITEM_ATTRIBUTE) : null;
}

const GROUP_RANK = ['problem', 'likely', 'review', 'probably-fine'];
function worstGroup(list) {
  let best = null;
  for (const f of list) {
    if (best === null || GROUP_RANK.indexOf(f.group) < GROUP_RANK.indexOf(best)) best = f.group;
  }
  return best;
}

function findingsByElement(doc, findings) {
  const map = new Map();
  for (const f of findings || []) {
    if (!f.selector) continue;
    let el;
    try {
      el = doc.querySelector(f.selector);
    } catch {
      continue;
    }
    if (!el) continue;
    if (!map.has(el)) map.set(el, []);
    map.get(el).push(f);
  }
  return map;
}

/** Hidden from everyone: not in the outline a screen reader gives. */
function hidden(el) {
  if (el.closest('[hidden], [aria-hidden="true"]')) return true;
  const view = el.ownerDocument.defaultView;
  if (!view || !view.getComputedStyle) return false;
  const style = view.getComputedStyle(el);
  return style.display === 'none' || style.visibility === 'hidden';
}

/** The text a heading reads as, alternative text of images included. */
function textOf(el) {
  const label = el.getAttribute('aria-label');
  if (label && label.trim()) return clean(label);
  let text = '';
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) text += child.nodeValue;
      else if (child.nodeType === 1) {
        if (child.getAttribute('aria-hidden') === 'true') continue;
        if (child.tagName === 'IMG') text += ` ${child.getAttribute('alt') || ''} `;
        else walk(child);
      }
    }
  };
  walk(el);
  return clean(text);
}

/** What the image says: aria-labelledby, aria-label, then alt. Null for nothing at all. */
function altOf(el) {
  const doc = el.ownerDocument;
  const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
  if (ids.length) {
    const text = clean(ids.map((id) => (doc.getElementById(id) || {}).textContent || '').join(' '));
    if (text) return text;
  }
  const label = el.getAttribute('aria-label');
  if (label && label.trim()) return clean(label);
  if (el.getAttribute('role') === 'presentation' || el.getAttribute('role') === 'none') return '';
  if (el.hasAttribute('alt')) return clean(el.getAttribute('alt'));
  if (el.tagName === 'svg' || el.tagName === 'SVG') {
    const title = el.querySelector('title');
    if (title && title.textContent.trim()) return clean(title.textContent);
  }
  return null;
}

/** The image's file name, for telling images apart. */
function srcOf(el) {
  const src = el.getAttribute('src') || '';
  const path = src.replace(/[?#].*$/, '');
  return decodeSafe(path.slice(path.lastIndexOf('/') + 1));
}

function decodeSafe(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function clean(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A selector that finds `el` again in its document, for hosts that show an
 * element by selector (a page, where there are no content items).
 */
export function pathSelector(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
    if (
      node.id &&
      /^[A-Za-z][\w-]*$/.test(node.id) &&
      node.ownerDocument.querySelectorAll(`#${node.id}`).length === 1
    ) {
      parts.unshift(`#${node.id}`);
      break;
    }
    const tag = node.tagName.toLowerCase();
    let n = 1;
    for (let s = node.previousElementSibling; s; s = s.previousElementSibling)
      if (s.tagName === node.tagName) n++;
    parts.unshift(`${tag}:nth-of-type(${n})`);
    node = node.parentElement;
  }
  return parts.join(' > ');
}
