// The field and preview-page findings as one list. Kept apart from the
// checker so it can be tested without a browser.

import { publishedId } from './paths.js';

/** The item a page finding belongs to: the longest item id its path starts with. */
export function nearestItem(path, itemIds) {
  let best = '';
  for (const id of itemIds) {
    if (
      (path === id || path.startsWith(`${id}.`) || path.startsWith(`${id}[`)) &&
      id.length > best.length
    )
      best = id;
  }
  return best;
}

/**
 * The field and preview findings as one list: a finding on the page that
 * the fields also have (same key) is listed once, from the fields, and
 * remembers where it is on the page. Page findings in this document's
 * content name their field; the rest are the website's design.
 */
export function mergeFindings(
  id,
  field,
  page,
  { labels = {}, fields = {}, titles = {}, websiteLabel = 'Website design' } = {}
) {
  const preview = {};
  const allFields = { ...fields };
  if (!page) return { findings: field, fields: allFields, preview };
  const keys = new Set(field.map((f) => f.key));
  const itemIds = Object.keys(labels);
  const extra = [];
  for (const p of page.findings || []) {
    if (p.field && publishedId(p.field.id) !== id) continue; // another document's content
    if (p.selector) preview[p.key] = p.selector;
    if (keys.has(p.key)) continue;
    if (p.field) {
      const item = nearestItem(p.field.path, itemIds);
      const top = p.field.path.split(/[.[]/)[0];
      const itemId = item || top;
      if (!allFields[itemId]) allFields[itemId] = item ? fields[item] : top;
      extra.push({ ...p, itemId, outside: false, itemLabel: labels[itemId] || titles[top] || top });
    } else {
      extra.push({
        ...p,
        itemId: p.selector ? `preview:${p.selector}` : null,
        outside: true,
        itemLabel: websiteLabel
      });
    }
  }
  return { findings: [...field, ...extra], fields: allFields, preview };
}
