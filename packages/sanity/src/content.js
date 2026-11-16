// A Sanity document as the published page would have its content: each
// Portable Text block and each image becomes an item ({ id, html }) whose id
// is its field path, in the order the form shows them. The panel renders the
// items one after another in its sandbox and checks them together, so
// heading order and the like are read across the whole document.
//
// Left out: strings (title, slug, SEO), numbers, dates, references. The
// website decides how those appear, so only the page can check them.

import { toHTML, escapeHTML } from '@portabletext/to-html';
import { pathToString } from './paths.js';

/** Where an image's alternative text is kept, tried in order. */
export const ALT_FIELDS = ['alt', 'altText', 'alternativeText'];

const LABELS = {
  normal: 'Paragraph',
  blockquote: 'Quote',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  list: 'List',
  image: 'Image',
  table: 'Table'
};

const isBlock = (v) => v && typeof v === 'object' && v._type === 'block';
const isPortableText = (v) => Array.isArray(v) && v.some(isBlock);
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** An image value: Sanity's own `image` type, or any object with an image asset. */
export function isImage(value) {
  if (!isObject(value)) return false;
  if (value._type === 'image') return true;
  const ref = value.asset && value.asset._ref;
  return typeof ref === 'string' && ref.startsWith('image-');
}

/**
 * The size an image asset was uploaded at, from its id
 * (`image-<hash>-1200x800-jpg`), or null.
 */
export function imageSize(value) {
  const ref = value && value.asset && value.asset._ref;
  const m = typeof ref === 'string' && /-(\d+)x(\d+)-[a-z0-9]+$/i.exec(ref);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

function altOf(value, altFields) {
  for (const name of altFields) {
    if (typeof value[name] === 'string') return value[name];
  }
  return undefined;
}

/**
 * An image as an <img>. No alternative text field gives no `alt`, which is a
 * problem to fix; an empty one gives `alt=""`, an image marked as decoration.
 */
function imageHtml(value, { altFields, imageUrl }) {
  const alt = altOf(value, altFields);
  const size = imageSize(value);
  const src = (imageUrl && imageUrl(value)) || '';
  return (
    `<img src="${escapeHTML(src)}"` +
    (alt === undefined ? '' : ` alt="${escapeHTML(alt)}"`) +
    (size ? ` width="${size.width}" height="${size.height}"` : '') +
    '>'
  );
}

/** A table from Sanity's table plugin: rows of cells, no header cells. */
function tableHtml(value) {
  const rows = Array.isArray(value.rows) ? value.rows : [];
  if (!rows.length) return '';
  const body = rows
    .map(
      (row) =>
        '<tr>' +
        (Array.isArray(row.cells) ? row.cells : [])
          .map((cell) => `<td>${escapeHTML(String(cell ?? ''))}</td>`)
          .join('') +
        '</tr>'
    )
    .join('');
  return `<table><tbody>${body}</tbody></table>`;
}

function renderBlocks(blocks, options) {
  return toHTML(blocks, {
    onMissingComponent: false,
    components: {
      types: {
        image: ({ value }) => imageHtml(value, options),
        table: ({ value }) => tableHtml(value)
      },
      unknownType: ({ value }) => (isImage(value) ? imageHtml(value, options) : '')
    }
  });
}

function titleOf(field) {
  if (!field) return '';
  if (field.type && field.type.title && field.type.title !== field.type.name && !field.title)
    return field.type.title;
  if (field.title) return field.title;
  const name = String(field.name || '');
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/** The fields of an object type, in the form's order, or the value's own keys. */
function fieldsOf(type, value) {
  if (type && Array.isArray(type.fields) && type.fields.length) return type.fields;
  return Object.keys(value || {})
    .filter((k) => !k.startsWith('_'))
    .map((name) => ({ name }));
}

/**
 * The checkable items of a Sanity document.
 *
 * - `doc`: the document's value, as the form has it (unsaved edits too).
 * - `schemaType`: its schema type, for the fields' order and titles; without
 *   it, the value's own keys and names are used.
 * - `altFields`: where images keep their alternative text.
 * - `imageUrl(value)`: an image's address, for the check's <img src>.
 *
 * Returns `{ items, labels, order }`: `items` as the panel's sandbox takes
 * them; `labels` by item id ("Body: Table", "Main image"); `order`, the ids
 * in the form's order.
 */
export function documentItems(doc, schemaType = null, { altFields = ALT_FIELDS, imageUrl } = {}) {
  const options = { altFields, imageUrl };
  const items = [];
  const labels = {};

  const add = (path, html, label) => {
    if (!html) return;
    const id = pathToString(path);
    items.push({ id, html });
    labels[id] = label;
  };

  function portableText(blocks, path, fieldTitle) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!isObject(block)) continue;
      const at = [...path, typeof block._key === 'string' ? { _key: block._key } : i];
      if (isBlock(block) && block.listItem) {
        // A run of list items is one list.
        let end = i;
        while (end + 1 < blocks.length && isBlock(blocks[end + 1]) && blocks[end + 1].listItem)
          end++;
        add(at, renderBlocks(blocks.slice(i, end + 1), options), `${fieldTitle}: ${LABELS.list}`);
        i = end;
        continue;
      }
      const kind = isBlock(block)
        ? LABELS[block.style || 'normal'] || LABELS.normal
        : isImage(block)
          ? LABELS.image
          : LABELS[block._type] || '';
      add(at, renderBlocks([block], options), kind ? `${fieldTitle}: ${kind}` : fieldTitle);
    }
  }

  function walk(value, type, path, fieldTitle) {
    if (isPortableText(value)) return portableText(value, path, fieldTitle);
    if (isImage(value)) return add(path, imageHtml(value, options), fieldTitle);
    if (Array.isArray(value)) {
      value.forEach((member, i) => {
        if (!isObject(member)) return;
        const memberType =
          type && Array.isArray(type.of)
            ? type.of.find((t) => t.name === member._type) || null
            : null;
        const at = [...path, typeof member._key === 'string' ? { _key: member._key } : i];
        walk(member, memberType && (memberType.type || memberType), at, fieldTitle);
      });
      return;
    }
    if (!isObject(value)) return;
    for (const field of fieldsOf(type, value)) {
      const v = value[field.name];
      if (v === undefined || v === null) continue;
      const fieldType = field.type || null;
      walk(v, fieldType, [...path, field.name], fieldTitle ? fieldTitle : titleOf(field));
    }
  }

  for (const field of fieldsOf(schemaType, doc)) {
    const value = doc ? doc[field.name] : undefined;
    if (value === undefined || value === null) continue;
    walk(value, field.type || null, [field.name], titleOf(field));
  }
  return { items, labels, order: items.map((i) => i.id) };
}
