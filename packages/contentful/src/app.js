// The sidebar app: the panel as a section of the entry's sidebar, under
// Publish. It checks the entry's fields as the editor writes (unsaved edits
// too), names each finding's field, and keeps everyone's answers in the
// space.
//
// `mount(sdk, root)` takes the App SDK object, so it can also run with a
// stand-in for tests. Nothing is sent anywhere: the check runs in a hidden
// frame inside the app's own frame.

import {
  createSandbox,
  createScheduler,
  defineResultsElement,
  hasContent,
  messagesFor,
  uiStrings
} from '@surea11y/panel';
import { entryItems, linkedAssets } from './content.js';
import { PACK } from '../dist/pack.js';
import { loadAnswers, saveAnswer, removeAnswers, loadHidden, saveHidden } from './reviews.js';
import { engineLocaleUrls, loadPanelWords, pickLocale, questionLoader, WORDS } from './language.js';
import { mergeFindings } from './merge.js';
import { previewOriginsOf } from './origins.js';
import { assetFieldsOf } from './content.js';
import { MESSAGE_SOURCE, VERSION, framesIn } from './preview-protocol.js';

// The fields are checked without the website's styles, so colours can't be.
const LEFT_OUT = ['contrast-minimum', 'contrast-computable', 'link-in-text-block'];

const blobUrl = (text) => URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));

let sandbox = null;
async function sandboxFor(doc, lang) {
  if (!sandbox) {
    const engine = (await import('../dist/engine.js')).default;
    sandbox = createSandbox(doc, {
      engineUrl: blobUrl(engine),
      localeUrls: await engineLocaleUrls(lang),
      scriptOrigins: ['blob:'],
      lang
    });
  }
  return sandbox;
}

/** The asset fields the check needs, in a locale, from a CMA asset. */
function assetIn(asset, locale) {
  const f = (asset && asset.fields) || {};
  const pick = (v) => (v && typeof v === 'object' ? (v[locale] ?? Object.values(v)[0]) : v);
  return { title: pick(f.title), description: pick(f.description), file: pick(f.file) };
}

/**
 * Options, for the editor tab: `canShow` and `onShow(itemId, field)` when the
 * host can show a place (the tab draws the form itself); `onResults(findings,
 * fieldOf, { page })` after each check, for the lines under fields;
 * `preview`, to check the live preview's page with the fields when the site
 * runs the preview script and its address is set on the configuration
 * screen.
 */
export function mount(
  sdk,
  root,
  {
    doc = root.ownerDocument,
    canShow = false,
    onShow = null,
    onResults = null,
    preview = false
  } = {}
) {
  const locale = sdk.locales.default;
  const entryId = sdk.ids.entry;
  // The person's language: Contentful's, else the browser's, else English.
  const wanted = pickLocale(
    sdk.uiLanguageLocale,
    doc.defaultView && doc.defaultView.navigator && doc.defaultView.navigator.language
  );
  let lang = 'en';
  const languageReady = loadPanelWords(wanted).then((l) => {
    lang = l;
    results.locale = l;
    results.questionFor = questionLoader(doc, l);
  });
  const t = uiStrings('en');
  const fields = (sdk.contentType.fields || []).map((f) => ({
    id: f.id,
    name: f.name,
    disabled: f.disabled,
    omitted: f.omitted
  }));
  const assets = {};
  let labels = {};
  let fieldOf = {};
  let ownFieldOf = {};
  let own = []; // the fields' findings
  let page = null; // the preview page's results, while it answers
  let onPreview = {}; // finding key → where it is on the preview page
  let previewState = null; // null, 'checking' (the page answered) or 'error'
  let previewError = '';
  const names = Object.fromEntries(fields.map((f) => [f.id, f.name]));

  defineResultsElement();
  const results = doc.createElement('surea11y-results');
  results.setAttribute('heading-level', '2');
  results.site = 'website';
  // An app can't move Contentful's form to a field: cards name the field.
  results.canShow = canShow;
  results.canReview = true;
  results.reviewer =
    (sdk.user && `${sdk.user.firstName || ''} ${sdk.user.lastName || ''}`.trim()) || '';
  root.append(results);

  const userId = sdk.user && sdk.user.sys && sdk.user.sys.id;
  results.marked = loadHidden(sdk.ids.space, userId, entryId);

  const values = () =>
    Object.fromEntries(
      fields.map((f) => [
        f.id,
        sdk.entry.fields[f.id] ? sdk.entry.fields[f.id].getValue(locale) : undefined
      ])
    );

  async function fetchAssets(v) {
    const missing = linkedAssets(v).filter((id) => !(id in assets));
    await Promise.all(
      missing.map((id) =>
        sdk.cma.asset
          .get({ assetId: id })
          .then((a) => {
            assets[id] = assetIn(a, locale);
          })
          .catch(() => {
            assets[id] = null; // gone, or not allowed: left out
          })
      )
    );
  }

  const tell = () =>
    onResults &&
    onResults(results.findings, fieldOf, {
      page: !!page,
      previewState: page ? 'done' : previewState,
      previewError
    });

  /** The fields' findings and the preview page's, as one list. */
  function merge() {
    const words = uiStrings(lang);
    const out = mergeFindings(entryId, own, page, {
      labels,
      fieldOf: ownFieldOf,
      names,
      assetFields: assetFieldsOf(values()),
      websiteLabel: words.websiteDesign,
      pageLabel: words.onPage
    });
    fieldOf = out.fieldOf;
    onPreview = out.preview;
    results.findings = out.findings;
    tell();
  }

  async function check() {
    await languageReady;
    const v = values();
    await fetchAssets(v);
    const out = entryItems(v, fields, assets);
    labels = out.labels;
    ownFieldOf = out.fields;
    fieldOf = out.fields;
    if (!hasContent(out.items)) {
      own = [];
      if (page) {
        results.empty = false;
        merge();
      } else {
        results.empty = true;
        results.findings = [];
      }
      return;
    }
    results.state = 'scanning';
    try {
      const box = await sandboxFor(doc, lang);
      const scan = await box.scan(out.items, {
        profile: 'cms-content',
        packs: [PACK],
        locale: lang,
        messages: messagesFor(lang),
        runOnly: { excludeRuleIds: LEFT_OUT },
        withOutline: true
      });
      results.empty = false;
      results.outline = scan.outline;
      own = scan.findings.map((f) => ({ ...f, itemLabel: labels[f.itemId] || '' }));
      merge();
    } catch (error) {
      results.error = error && error.message ? error.message : String(error);
    }
  }

  const scheduler = createScheduler(check, { delay: 1000 });
  const stops = fields
    .filter((f) => sdk.entry.fields[f.id])
    .map((f) => sdk.entry.fields[f.id].onValueChanged(locale, () => scheduler.changed()));

  // Answers, shared in the space.
  languageReady
    .then(() => loadAnswers(sdk.cma, entryId, locale, lang))
    .then((answers) => {
      results.reviews = answers;
    })
    .catch(() => {});

  // The host's own action: an image's alternative text is its description,
  // edited on the asset.
  results.actionsFor = (card) => {
    const field = card.places[0] && fieldOf[card.places[0].itemId];
    const value = field ? values()[field] : null;
    const assetIdOf = (v) => v && v.sys && v.sys.linkType === 'Asset' && v.sys.id;
    const id = assetIdOf(value);
    if (card.ruleId && card.ruleId.startsWith('img-alt') && id) {
      return [
        {
          id: 'description',
          label: (WORDS[lang] || WORDS.en).editDescription,
          run: () => sdk.navigator.openAsset(id, { slideIn: true })
        }
      ];
    }
    return [];
  };

  results.addEventListener('surea11y-mark', () => {
    saveHidden(sdk.ids.space, userId, entryId, results.marked);
  });
  results.addEventListener('surea11y-review', (event) => {
    const { keys, note, answer } = event.detail;
    saveAnswer(
      sdk.cma,
      entryId,
      keys,
      { answer, note, by: results.reviewer, byId: userId || '' },
      locale
    ).catch((error) => {
      results.error = error && error.message ? error.message : String(error);
    });
  });
  results.addEventListener('surea11y-reopen', (event) => {
    removeAnswers(sdk.cma, entryId, event.detail.keys, locale).catch(() => {});
  });
  results.addEventListener('surea11y-retry', () => scheduler.now());
  results.addEventListener('surea11y-show', (event) => {
    const itemId = event.detail && event.detail.itemId;
    if (!itemId) return;
    const finding = event.detail.finding;
    // Only on the preview page (the website's design, or the page alone).
    if (itemId.startsWith('preview:')) {
      showOnPreview(itemId.slice('preview:'.length));
      return;
    }
    // Content: the form moves to the field, and the preview to the place.
    if (finding && onPreview[finding.key]) showOnPreview(onPreview[finding.key]);
    if (onShow) onShow(itemId, fieldOf[itemId]);
  });
  // Hidden and answered findings change what the lines under fields show.
  results.addEventListener('surea11y-mark', tell);
  results.addEventListener('surea11y-review', tell);
  results.addEventListener('surea11y-reopen', tell);

  // The live preview's page, when the site runs the preview script.
  const win = doc.defaultView;
  const origins = preview ? previewOriginsOf(sdk) : [];
  function showOnPreview(selector) {
    if (!page || !selector) return;
    page.source.postMessage(
      { source: MESSAGE_SOURCE, version: VERSION, type: 'show', selector },
      page.origin
    );
  }
  function hello() {
    // The preview closed or moved away: back to the fields alone.
    if ((page || previewState) && previewSource && previewSource.closed) {
      page = null;
      previewState = null;
      previewSource = null;
      merge();
    }
    let frames;
    try {
      frames = framesIn(win.top);
    } catch {
      return;
    }
    for (const f of frames) {
      if (f === win) continue;
      for (const origin of origins) {
        try {
          f.postMessage(
            { source: MESSAGE_SOURCE, version: VERSION, type: 'hello', entryId },
            origin
          );
        } catch {
          // a frame that went away
        }
      }
    }
  }
  const onMessage = (event) => {
    if (!origins.includes(event.origin) || !event.source) return;
    const data = event.data;
    if (!data || data.source !== MESSAGE_SOURCE || data.version !== VERSION) return;
    previewSource = event.source;
    if (data.type === 'ready') {
      if (!page) {
        previewState = 'checking';
        tell();
      }
      return;
    }
    if (data.type === 'error') {
      previewState = 'error';
      previewError = typeof data.message === 'string' ? data.message.slice(0, 300) : '';
      page = null;
      merge();
      return;
    }
    if (data.type !== 'results' || !Array.isArray(data.findings)) return;
    previewState = null;
    previewError = '';
    page = {
      source: event.source,
      origin: event.origin,
      tagged: !!data.tagged,
      findings: data.findings.filter(
        (f) => f && typeof f.key === 'string' && typeof f.group === 'string'
      )
    };
    if (results.state !== 'scanning') {
      results.empty = false;
      merge();
    }
  };
  let helloTimer = null;
  let previewSource = null;
  if (origins.length && win) {
    win.addEventListener('message', onMessage);
    hello();
    helloTimer = win.setInterval(hello, 3000);
  }

  if (sdk.window && sdk.window.startAutoResizer) sdk.window.startAutoResizer();
  scheduler.now();

  return {
    results,
    stop() {
      for (const s of stops) if (typeof s === 'function') s();
      scheduler.cancel();
      if (helloTimer) win.clearInterval(helloTimer);
      if (win) win.removeEventListener('message', onMessage);
      results.remove();
    },
    t
  };
}
