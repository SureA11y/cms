'use strict';

/**
 * @check cms-link-to-document
 * @summary Links to documents say what they open, and the documents are checked too
 * @applicability
 *   Links (`a[href]`, `area[href]`) whose address path ends in a document
 *   extension (.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .odt, .ods,
 *   .odp, .rtf, .epub), the query and fragment left out, or whose `type`
 *   attribute names such a format.
 * @expectation
 *   The link, or the text of the paragraph, list item or cell it sits in,
 *   says what kind of file it opens, so a reader isn't sent into another
 *   application unwarned; and the document meets the same requirements as
 *   the page, which a scan of the page can't check. Best practice: WCAG
 *   doesn't require the format to be named, and the document is outside
 *   the page.
 * @reason-codes
 *   - `DOCUMENT_LINK_FORMAT_UNSTATED` (cantTell): neither the link nor the
 *     text around it names the file's format.
 *   - `DOCUMENT_LINK` (cantTell): the format is named; the document itself
 *     still needs a check of its own.
 */

const id = 'cms-link-to-document';


const meta = {
  title: 'Links to documents say what they open',
  description:
    'Lists links to PDF, Office and other document files, asking that the link say what kind of file it opens and that the document be checked on its own.',
  i18n: {
    titleKey: 'cmsLinkToDocument_title',
    descriptionKey: 'cmsLinkToDocument_description'
  },
  tags: ['cms', 'links', 'best-practice', 'atomic', 'manual'],
  wcagSc: [],
  defaultSeverity: 'minor',
  type: 'manual',
  defaultConfidence: 'medium',
  reasonCodes: ['DOCUMENT_LINK_FORMAT_UNSTATED', 'DOCUMENT_LINK'],
  review: {
    DOCUMENT_LINK_FORMAT_UNSTATED: {
      steps: [
        'Find the link the report names and read its text, and the sentence, list item or cell around it.',
        'Check whether that text says what kind of file the link opens, such as "(PDF, 2 MB)".',
        'Open the document and check it with a tool made for its format, as you would the page.'
      ],
      passWhen:
        'The text names the file type, and the document is accessible on its own: tagged headings, text alternatives for images, a reading order that makes sense.',
      failWhen:
        'Nothing says the link opens a document, so readers are sent into another application unwarned (best practice), or the document itself is not accessible.'
    },
    DOCUMENT_LINK: {
      steps: [
        'Find the link the report names and open the document it leads to.',
        'Check the document with a tool made for its format, as you would the page.'
      ],
      passWhen:
        'The document is accessible on its own: tagged headings, text alternatives for images, a reading order that makes sense.',
      failWhen:
        'The document is not accessible, though the page that links to it may be (best practice: the document must meet the same requirements as the page).'
    }
  }
};

function runInPage(ctx) {
  const { helpers, rule } = ctx;
  const { dom } = helpers;

  const FORMAT_WORDS = {
    pdf: ['pdf'],
    doc: ['doc', 'word'],
    docx: ['docx', 'doc', 'word'],
    xls: ['xls', 'excel', 'spreadsheet', 'hoja de cálculo'],
    xlsx: ['xlsx', 'xls', 'excel', 'spreadsheet', 'hoja de cálculo'],
    ppt: ['ppt', 'powerpoint', 'presentation', 'presentación'],
    pptx: ['pptx', 'ppt', 'powerpoint', 'presentation', 'presentación'],
    odt: ['odt', 'opendocument'],
    ods: ['ods', 'opendocument'],
    odp: ['odp', 'opendocument'],
    rtf: ['rtf'],
    epub: ['epub', 'e-book', 'ebook']
  };
  const MIME = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.oasis.opendocument.text': 'odt',
    'application/vnd.oasis.opendocument.spreadsheet': 'ods',
    'application/vnd.oasis.opendocument.presentation': 'odp',
    'application/rtf': 'rtf',
    'application/epub+zip': 'epub'
  };
  const CONTEXT_TAGS = new Set(['p', 'li', 'td', 'th', 'dd', 'dt', 'figcaption', 'caption']);

  // The document format the link leads to, '' when it leads to none.
  function formatOf(el) {
    const type = String(dom.getAttribute(el, 'type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (MIME[type]) return MIME[type];
    const raw = String(dom.getAttribute(el, 'href') || '').trim();
    if (!raw || /^(javascript|mailto|tel|data):/i.test(raw)) return '';
    let pathname = raw;
    try {
      pathname = new URL(raw, 'https://x.invalid/').pathname;
    } catch {
      pathname = raw.split(/[?#]/)[0];
    }
    let decoded = pathname;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {}
    const m = /\.([a-z0-9]{2,5})$/i.exec(decoded);
    const ext = m ? m[1].toLowerCase() : '';
    return Object.prototype.hasOwnProperty.call(FORMAT_WORDS, ext) ? ext : '';
  }

  function mentions(text, format) {
    const t = ` ${String(text || '').toLowerCase()} `;
    return FORMAT_WORDS[format].some((w) => {
      const i = t.indexOf(w);
      if (i < 0) return false;
      const before = t[i - 1];
      const after = t[i + w.length];
      return !/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after);
    });
  }

  // The text of the nearest paragraph, list item or cell the link sits in.
  function contextText(el) {
    for (let n = dom.parentElement(el), steps = 0; n && steps < 50; steps++) {
      const tag = String(dom.localName(n) || '').toLowerCase();
      if (CONTEXT_TAGS.has(tag)) return String(dom.textContent(n) || '');
      if (tag === 'body' || tag === 'main' || tag === 'article' || tag === 'section') return '';
      n = dom.parentElement(n);
    }
    return '';
  }

  const occurrences = [];
  for (const el of helpers.queryAllSmart('a[href], area[href]')) {
    const format = formatOf(el);
    if (!format) continue;
    const elig = helpers.isAccTreeEligible ? helpers.isAccTreeEligible(el, ctx) : true;
    if (elig && typeof elig === 'object' && elig.eligible === false) continue;
    const info = helpers.getNameFromContentInfo ? helpers.getNameFromContentInfo(el, ctx) : null;
    const name = info && typeof info.value === 'string' ? info.value : String(dom.textContent(el) || '');
    const stated =
      mentions(name, format) ||
      mentions(dom.getAttribute(el, 'title'), format) ||
      mentions(contextText(el), format);
    const fmt = format.toUpperCase();
    occurrences.push(
      helpers.reportOccurrence(
        el,
        stated
          ? {
              summary: `This link opens a ${fmt} document.`,
              hint: 'Check that the document is accessible on its own, as the page is.',
              i18n: {
                summaryKey: 'cmsLinkToDocument_summary_document',
                hintKey: 'cmsLinkToDocument_hint_document',
                params: { format: fmt }
              },
              data: { details: { reasonCode: 'DOCUMENT_LINK', format } }
            }
          : {
              summary: `This link opens a ${fmt} document, but nothing says so.`,
              hint: 'Say the file type next to the link text, such as "Annual report (PDF, 2 MB)", and check that the document is accessible on its own.',
              i18n: {
                summaryKey: 'cmsLinkToDocument_summary_unstated',
                hintKey: 'cmsLinkToDocument_hint_unstated',
                params: { format: fmt }
              },
              data: { details: { reasonCode: 'DOCUMENT_LINK_FORMAT_UNSTATED', format } }
            }
      )
    );
  }

  if (!occurrences.length) {
    return { ruleId: rule.ruleId, outcome: 'notApplicable', severity: 'minor', occurrences: [] };
  }
  return { ruleId: rule.ruleId, outcome: 'cantTell', severity: rule.defaultSeverity, occurrences };
}

module.exports = { id, meta, runInPage };
