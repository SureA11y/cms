// A small website with Sanity's live preview: it renders the test article
// as a page, with the hidden field tags (stega) Sanity's client adds in
// preview, and turns the accessibility check on.
import { createClient } from '@sanity/client';
import { toHTML, escapeHTML } from '@portabletext/to-html';
import { enableVisualEditing } from '@sanity/visual-editing';
import { enableSureA11yPreview } from '../../packages/sanity/src/preview.js';

const STUDIO = new URLSearchParams(location.search).get('studio') || 'http://localhost:3333';
const client = createClient({
  projectId: '1tmgxdtl',
  dataset: 'development',
  apiVersion: '2025-02-19',
  useCdn: false,
  perspective: 'drafts',
  stega: { enabled: true, studioUrl: STUDIO }
});

const imageUrl = (ref) => {
  const m = /^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/.exec(ref || '');
  return m ? `https://cdn.sanity.io/images/1tmgxdtl/development/${m[1]}-${m[2]}.${m[3]}?w=1200&auto=format` : '';
};

async function render() {
  const id = new URLSearchParams(location.search).get('id') || 'surea11y-test-article';
  const doc = await client.fetch('*[_id == $id][0]{title, mainImage, body}', { id });
  if (!doc) return;
  const body = toHTML(doc.body || [], {
    components: {
      types: {
        image: ({ value }) => `<img src="${escapeHTML(imageUrl(value.asset && value.asset._ref))}" alt="${escapeHTML(value.alt || '')}">`,
        table: ({ value }) =>
          `<table>${(value.rows || []).map((r) => `<tr>${(r.cells || []).map((c) => `<td>${escapeHTML(c)}</td>`).join('')}</tr>`).join('')}</table>`
      }
    }
  });
  const hero = doc.mainImage
    ? `<img class="hero" src="${escapeHTML(imageUrl(doc.mainImage.asset && doc.mainImage.asset._ref))}" alt="${escapeHTML(doc.mainImage.alt || '')}">`
    : '';
  document.getElementById('article').innerHTML =
    `<h1>${escapeHTML(doc.title || '')}</h1>${hero}${body}<p class="byline">Updated by the web team</p>`;
}

await render();
// Sanity's own visual editing, as a site using the live preview has it.
enableVisualEditing();
enableSureA11yPreview({ studioOrigin: STUDIO });
