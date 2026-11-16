// A Contentful entry as the published page would have its content: each
// top-level block of a Rich Text field and each image in a Media field
// becomes an item ({ id, html }) named by its field, in the order the
// content type lists its fields. The panel renders the items one after
// another in its sandbox and checks them together, so heading order and
// the like are read across the whole entry.
//
// Left out: short and long text fields (titles, slugs, summaries), numbers,
// dates, references. The website decides how those appear, so only the
// page can check them.
//
// Item ids: the field id for a Media field ("mainImage"), and the field id
// and the block's position for a block of Rich Text ("body#3").

import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';

const LABELS = {
  [BLOCKS.PARAGRAPH]: 'Paragraph',
  [BLOCKS.HEADING_1]: 'Heading 1',
  [BLOCKS.HEADING_2]: 'Heading 2',
  [BLOCKS.HEADING_3]: 'Heading 3',
  [BLOCKS.HEADING_4]: 'Heading 4',
  [BLOCKS.HEADING_5]: 'Heading 5',
  [BLOCKS.HEADING_6]: 'Heading 6',
  [BLOCKS.UL_LIST]: 'List',
  [BLOCKS.OL_LIST]: 'List',
  [BLOCKS.QUOTE]: 'Quote',
  [BLOCKS.TABLE]: 'Table',
  [BLOCKS.EMBEDDED_ASSET]: 'Image',
  [BLOCKS.HR]: 'Divider'
};

const escape = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** An asset's address with the protocol it lacks (`//images.ctfassets.net/…`). */
function assetUrl(asset) {
  const url = asset && asset.file && asset.file.url;
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

const isImage = (asset) =>
  !!(asset && asset.file && String(asset.file.contentType || '').startsWith('image/'));

/**
 * An image asset as an <img>. Its alternative text is the asset's
 * description, set once in Media; with none, the <img> has no `alt`, which
 * is a problem to fix there.
 */
function imageHtml(asset) {
  const size = asset.file && asset.file.details && asset.file.details.image;
  const alt =
    typeof asset.description === 'string' && asset.description.trim() ? asset.description : null;
  return (
    `<img src="${escape(assetUrl(asset))}"` +
    (alt === null ? '' : ` alt="${escape(alt)}"`) +
    (size && size.width ? ` width="${size.width}" height="${size.height}"` : '') +
    '>'
  );
}

function renderBlock(node, assets) {
  return documentToHtmlString(
    { nodeType: BLOCKS.DOCUMENT, data: {}, content: [node] },
    {
      renderNode: {
        [BLOCKS.EMBEDDED_ASSET]: (n) => {
          const asset =
            assets[n.data && n.data.target && n.data.target.sys && n.data.target.sys.id];
          return isImage(asset) ? imageHtml(asset) : '';
        },
        [BLOCKS.EMBEDDED_ENTRY]: () => '',
        [BLOCKS.EMBEDDED_RESOURCE]: () => '',
        [INLINES.EMBEDDED_ENTRY]: () => '',
        [INLINES.EMBEDDED_RESOURCE]: () => '',
        // A link to an entry goes to a page the website makes: its address
        // is unknown here, but the link and its text are checked.
        [INLINES.ENTRY_HYPERLINK]: (n, next) => `<a href="#">${next(n.content)}</a>`,
        // A link to a file (a PDF, say) goes to the file.
        [INLINES.ASSET_HYPERLINK]: (n, next) => {
          const asset =
            assets[n.data && n.data.target && n.data.target.sys && n.data.target.sys.id];
          return `<a href="${escape(assetUrl(asset) || '#')}">${next(n.content)}</a>`;
        }
      }
    }
  );
}

const isRichText = (v) => v && typeof v === 'object' && v.nodeType === BLOCKS.DOCUMENT;
const assetId = (v) =>
  v && v.sys && v.sys.type === 'Link' && v.sys.linkType === 'Asset' ? v.sys.id : null;

/**
 * The checkable items of an entry.
 *
 * - `values`: field id → value, in one locale (as the App SDK gives them,
 *   unsaved edits too).
 * - `fields`: the content type's fields, in their order ({ id, name }).
 * - `assets`: asset id → { title, description, file } in that locale, for
 *   the images and files the entry links to.
 *
 * Returns { items, labels, fields, order }: `labels` by item id ("Body:
 * Heading 2", "Main image"); `fields` by item id, the field id it is in.
 */
export function entryItems(values, fields = null, assets = {}) {
  const items = [];
  const labels = {};
  const fieldOf = {};
  const list =
    Array.isArray(fields) && fields.length
      ? fields
      : Object.keys(values || {}).map((id) => ({ id, name: id }));
  const add = (id, html, label, field) => {
    if (!html) return;
    items.push({ id, html });
    labels[id] = label;
    fieldOf[id] = field;
  };
  for (const field of list) {
    if (field.disabled || field.omitted) continue;
    const value = values ? values[field.id] : undefined;
    if (value === undefined || value === null) continue;
    const name = field.name || field.id;
    if (isRichText(value)) {
      (value.content || []).forEach((node, i) => {
        const kind = LABELS[node.nodeType];
        add(
          `${field.id}#${i}`,
          renderBlock(node, assets),
          kind ? `${name}: ${kind}` : name,
          field.id
        );
      });
      continue;
    }
    const linked = Array.isArray(value) ? value.map(assetId) : [assetId(value)];
    linked.forEach((id, i) => {
      const asset = id && assets[id];
      if (!isImage(asset)) return;
      add(Array.isArray(value) ? `${field.id}#${i}` : field.id, imageHtml(asset), name, field.id);
    });
  }
  return { items, labels, fields: fieldOf, order: items.map((i) => i.id) };
}

/** The ids of the assets an entry links to, to fetch before checking it. */
export function linkedAssets(values) {
  const ids = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    const id = assetId(v) || (v.data && v.data.target && assetId(v.data.target));
    if (id) ids.add(id);
    for (const child of Array.isArray(v) ? v : Object.values(v)) walk(child);
  };
  walk(values);
  return [...ids];
}

/** Which field links each asset, from the entry's values (Media and Rich Text). */
export function assetFieldsOf(values) {
  const out = {};
  const walk = (node, fieldId) => {
    if (!node || typeof node !== 'object') return;
    const target = node.data && node.data.target;
    if (target && target.sys && target.sys.linkType === 'Asset') out[target.sys.id] = fieldId;
    for (const child of node.content || []) walk(child, fieldId);
  };
  for (const [fieldId, v] of Object.entries(values)) {
    for (const item of Array.isArray(v) ? v : [v]) {
      if (item && item.sys && item.sys.linkType === 'Asset') out[item.sys.id] = fieldId;
      else if (item && item.nodeType === 'document') walk(item, fieldId);
    }
  }
  return out;
}
