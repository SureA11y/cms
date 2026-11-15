// Whether there is anything to check: an empty post shouldn't read as a
// clean one, and checking nothing shouldn't load the engine.

// Elements that only hold or space out text. Anything else (a heading, an
// image, a table, a link, an embed) is content, even when it has no text:
// an empty heading is itself something to fix.
const HOLDERS = new Set(['P', 'DIV', 'SPAN', 'BR']);

/**
 * True when at least one item has text, or an element other than a plain
 * text holder. `doc` parses the HTML inertly, in a <template>.
 */
export function hasContent(items, doc = globalThis.document) {
  for (const item of items || []) {
    const html = item && item.html;
    if (!html || !html.trim()) continue;
    const template = doc.createElement('template');
    template.innerHTML = html;
    const fragment = template.content;
    if (fragment.textContent.trim()) return true;
    for (const el of fragment.querySelectorAll('*')) {
      if (!HOLDERS.has(el.tagName)) return true;
    }
  }
  return false;
}
