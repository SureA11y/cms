// Reading Contentful's preview tags: which element of the page holds which
// entry's field. Two kinds, both optional for a site:
// - the inspector mode attributes (`data-contentful-entry-id`,
//   `data-contentful-field-id`, `data-contentful-asset-id`), on all plans;
// - Content Source Maps: hidden characters in text (Premium plans), whose
//   payload holds an address in Contentful's web app.
// Pure DOM work, kept apart from the check so it can be tested without the
// engine.

import { vercelStegaDecode, vercelStegaSplit } from '@vercel/stega';

const TEXT_ATTRIBUTES = ['alt', 'title', 'aria-label', 'aria-description', 'placeholder'];

/**
 * A field from an address in Contentful's web app, such as
 * `…/entries/abc?focusedField=body&focusedLocale=en-US`. Returns
 * { entryId, fieldId } (or { assetId }) or null.
 */
export function parseContentfulHref(href) {
  if (!href) return null;
  let url;
  try {
    url = new URL(String(href), 'https://app.contentful.com');
  } catch {
    return null;
  }
  const entry = /\/entries\/([^/?#]+)/.exec(url.pathname);
  if (entry) return { entryId: entry[1], fieldId: url.searchParams.get('focusedField') || '' };
  const asset = /\/assets\/([^/?#]+)/.exec(url.pathname);
  if (asset) return { assetId: asset[1], fieldId: '' };
  return null;
}

/** The field a string with hidden characters belongs to, or null. */
function fieldOfString(value) {
  const { encoded } = vercelStegaSplit(value);
  if (!encoded) return null;
  try {
    const data = vercelStegaDecode(encoded);
    return data && data.href ? parseContentfulHref(data.href) : null;
  } catch {
    return null;
  }
}

/** The field an element's inspector mode attributes name, or null. */
export function fieldOfAttributes(el) {
  const entryId = el.getAttribute('data-contentful-entry-id');
  const assetId = el.getAttribute('data-contentful-asset-id');
  const fieldId = el.getAttribute('data-contentful-field-id') || '';
  if (entryId) return { entryId, fieldId };
  if (assetId) return { assetId, fieldId };
  return null;
}

/**
 * Takes the hidden characters out of the page, noting which element belongs
 * to which field, and reads the inspector mode attributes. Returns
 * { fields: Map(element → field), restore }.
 */
export function untag(doc) {
  const fields = new Map();
  const changed = [];
  const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!vercelStegaSplit(node.data).encoded) continue;
    const field = fieldOfString(node.data);
    if (field && node.parentElement && !fields.has(node.parentElement))
      fields.set(node.parentElement, field);
    changed.push(() => {
      const original = node.data;
      node.data = vercelStegaSplit(original).cleaned;
      return () => {
        node.data = original;
      };
    });
  }
  for (const el of doc.body.querySelectorAll('*')) {
    const tagged = fieldOfAttributes(el);
    // The attributes name the element itself: they come first.
    if (tagged) fields.set(el, tagged);
    for (const name of TEXT_ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (!value || !vercelStegaSplit(value).encoded) continue;
      const field = fieldOfString(value);
      if (field && !fields.has(el)) fields.set(el, field);
      changed.push(() => {
        el.setAttribute(name, vercelStegaSplit(value).cleaned);
        return () => el.setAttribute(name, value);
      });
    }
  }
  const undo = changed.map((change) => change());
  return {
    fields,
    restore() {
      for (const u of undo.reverse()) u();
    }
  };
}

const owner = (f) => f.entryId || `asset:${f.assetId}`;

/**
 * The field of an element: its own tag, its nearest tagged ancestor's, or,
 * for an element whose text is all inside it (a table, a list), the field
 * of the content it holds, when that is one field.
 */
export function fieldOf(el, fields) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    if (fields.has(node)) return fields.get(node);
  }
  let found = null;
  for (const [node, field] of fields) {
    if (!el.contains(node)) continue;
    if (found && (owner(found) !== owner(field) || found.fieldId !== field.fieldId)) return null;
    found = field;
  }
  return found;
}
