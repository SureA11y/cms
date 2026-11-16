// The field and preview-page findings as one list. Kept apart from the app
// so it can be tested without a browser.

/**
 * A page finding that the fields also have (same key) is listed once, from
 * the fields, and remembers where it is on the page. The rest:
 * - in this entry's content (its tag names this entry, or an asset this
 *   entry links): named by its field;
 * - in another entry's content: left out (that entry has its own check);
 * - untagged, on a page that has tags: the website's design;
 * - on a page with no tags at all: "On the page", since it may be content
 *   the fields don't show (the title, a linked entry).
 * Returns { findings, fieldOf, preview: { key → selector } }.
 */
export function mergeFindings(
  entryId,
  field,
  page,
  {
    labels = {},
    fieldOf = {},
    names = {},
    assetFields = {},
    websiteLabel = 'Website design',
    pageLabel = 'On the page'
  } = {}
) {
  const preview = {};
  const allFields = { ...fieldOf };
  if (!page) return { findings: field, fieldOf: allFields, preview };
  const keys = new Set(field.map((f) => f.key));
  const extra = [];
  for (const p of page.findings || []) {
    const tag = p.field;
    let fieldId = null;
    if (tag && tag.entryId) {
      if (tag.entryId !== entryId) continue; // another entry's content
      fieldId = tag.fieldId || null;
    } else if (tag && tag.assetId) {
      fieldId = assetFields[tag.assetId] || null;
      if (!fieldId) continue; // an asset this entry doesn't use here
    }
    if (p.selector) preview[p.key] = p.selector;
    if (keys.has(p.key)) continue;
    const at = p.selector ? `preview:${p.selector}` : null;
    if (tag) {
      const itemId = fieldId || at;
      if (fieldId && !allFields[fieldId]) allFields[fieldId] = fieldId;
      extra.push({
        ...p,
        itemId,
        outside: false,
        itemLabel: (fieldId && (labels[fieldId] || names[fieldId])) || fieldId || pageLabel
      });
    } else if (page.tagged) {
      extra.push({ ...p, itemId: at, outside: true, itemLabel: websiteLabel });
    } else {
      extra.push({ ...p, itemId: at, outside: false, itemLabel: pageLabel });
    }
  }
  return { findings: [...field, ...extra], fieldOf: allFields, preview };
}
