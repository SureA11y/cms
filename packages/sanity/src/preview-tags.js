// Reading Sanity's preview tags: which element of the page holds which
// document's field. Pure DOM work, kept apart from the check itself so it
// can be tested without the engine.

import { vercelStegaDecode, vercelStegaSplit } from '@vercel/stega';

const TEXT_ATTRIBUTES = ['alt', 'title', 'aria-label', 'aria-description', 'placeholder'];

/**
 * A field from one of Sanity's tags: a stega payload's address
 * (`…/intent/edit/id=a1;type=article;path=body[_key=="k1"].children…`) or a
 * `data-sanity` value (`id=a1;type=article;path=mainImage;base=…`).
 * Returns { id, type, path } or null.
 */
export function parseSanityTag(text) {
  if (!text) return null;
  let s = String(text);
  try {
    s = decodeURIComponent(s);
  } catch {
    // keep as written
  }
  const part = (name) => {
    const m = new RegExp(`(?:^|[;/?&])${name}=([^;&?]*)`).exec(s);
    return m ? m[1] : '';
  };
  const id = part('id');
  const path = part('path');
  if (!id || !path) return null;
  return { id, type: part('type'), path };
}

/** A block of Portable Text is named by its block, not the span inside it. */
export function blockPath(path) {
  const m = /^(.*?\[_key=="[^"]+"\])\.children\b/.exec(path);
  return m ? m[1] : path;
}

/** The field a stega-tagged string belongs to, or null. */
function fieldOfString(value) {
  const { encoded } = vercelStegaSplit(value);
  if (!encoded) return null;
  try {
    const data = vercelStegaDecode(encoded);
    return data && data.href ? parseSanityTag(data.href) : null;
  } catch {
    return null;
  }
}

/**
 * Takes Sanity's hidden characters out of the page, noting which element
 * belongs to which field. Returns { fields: Map(element → field), restore }.
 */
export function untag(doc) {
  const fields = new Map();
  const changed = [];
  const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const field = fieldOfString(node.data);
    if (!field) continue;
    if (node.parentElement && !fields.has(node.parentElement))
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
    const tag = el.getAttribute('data-sanity');
    if (tag && !fields.has(el)) {
      const field = parseSanityTag(tag);
      if (field) fields.set(el, field);
    }
    for (const name of TEXT_ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (!value) continue;
      const field = fieldOfString(value);
      if (!field) continue;
      if (!fields.has(el)) fields.set(el, field);
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

/**
 * The field of an element: its own tag, its nearest tagged ancestor's, or,
 * for an element whose text is all inside it (a table, a list), the field
 * of the content it holds, when that is one document's.
 */
export function fieldOf(el, fields) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    if (fields.has(node)) return fields.get(node);
  }
  let found = null;
  for (const [node, field] of fields) {
    if (!el.contains(node)) continue;
    if (found && found.id !== field.id) return null;
    if (!found || field.path.length < found.path.length) found = field;
  }
  return found;
}
