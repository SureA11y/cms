// One checker per open document: it checks the document's fields after the
// editor pauses, keeps the last results, and tells whoever listens (the side
// panel, the lines under fields, the header button's count). Nothing here
// knows React or the Studio: the plugin feeds it the document's value and
// its schema type, and reads the results back.
//
// The check runs in a hidden sandbox frame in this browser window. Nothing
// is sent anywhere.

import {
  createSandbox,
  createScheduler,
  hasContent,
  messagesFor,
  countPlaces,
  toCards
} from '@surea11y/panel';
import { documentItems, ALT_FIELDS } from './content.js';
import { publishedId } from './paths.js';

export { publishedId };

// The fields are checked without the website's styles, so colours can't be.
const LEFT_OUT = ['contrast-minimum', 'contrast-computable', 'link-in-text-block'];

/**
 * An image's address on Sanity's image CDN, from its asset id
 * (`image-<hash>-<w>x<h>-<ext>`), so the check's <img> shows the real file.
 */
export function imageUrlFor(projectId, dataset) {
  return (value) => {
    const ref = value && value.asset && value.asset._ref;
    const m = typeof ref === 'string' && /^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i.exec(ref);
    if (!m || !projectId || !dataset) return '';
    return `https://cdn.sanity.io/images/${encodeURIComponent(projectId)}/${encodeURIComponent(dataset)}/${m[1]}-${m[2]}.${m[3]}`;
  };
}

/** A script's text as a blob: address the sandbox can load. */
function blobUrl(text) {
  return URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
}

// Listed one by one, so a bundler can find each file.
const ENGINE_LOCALES = {
  es: () => import('../dist/engine.i18n.es.js'),
  de: () => import('../dist/engine.i18n.de.js'),
  fr: () => import('../dist/engine.i18n.fr.js'),
  ja: () => import('../dist/engine.i18n.ja.js')
};

let sandboxPromise = null;
/**
 * One sandbox for the whole Studio window, made when the first check needs
 * it. The engine (about 200 KB compressed) is imported only then, in a file
 * of its own, so a Studio that never checks never loads it.
 */
function sharedSandbox(locale) {
  if (!sandboxPromise) {
    sandboxPromise = (async () => {
      const engine = (await import('../dist/engine.js')).default;
      const localeUrls = {};
      if (locale && ENGINE_LOCALES[locale]) {
        try {
          const side = (await ENGINE_LOCALES[locale]()).default;
          localeUrls[locale] = blobUrl(side);
        } catch {
          // A language the engine has no messages in: English.
        }
      }
      return createSandbox(document, {
        engineUrl: blobUrl(engine),
        localeUrls,
        scriptOrigins: ['blob:'],
        lang: locale || 'en'
      });
    })().catch((error) => {
      sandboxPromise = null; // try again on the next check
      throw error;
    });
  }
  return sandboxPromise;
}

const checkers = new Map();

/**
 * The checker for a document (by its published id), made on first use.
 * `options`: { locale, projectId, dataset, altFields }.
 */
export function checkerFor(documentId, options = {}) {
  const id = publishedId(documentId);
  let checker = checkers.get(id);
  if (!checker) {
    checker = createChecker(id, options);
    checkers.set(id, checker);
  }
  return checker;
}

function createChecker(id, { locale = 'en', projectId, dataset, altFields = ALT_FIELDS } = {}) {
  const listeners = new Set();
  let value = null;
  let schemaType = null;
  let watching = 0;
  const imageUrl = imageUrlFor(projectId, dataset);

  const checker = {
    id,
    state: 'idle',
    empty: false,
    error: '',
    findings: [],
    outline: null,
    /** Item id → the field it is in ('body' for a block of the body). */
    fields: {},
    /** Finding key → { by, when, note, answer }: everyone's answers. */
    reviews: {},
    /** Finding keys this person hid. */
    marked: [],
    /** The item last shown, so its field can be framed. */
    current: null,

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    notify() {
      for (const fn of [...listeners]) fn(checker);
    },

    /** The document changed (or was opened): check it after a pause. */
    update(nextValue, nextSchemaType) {
      const first = value === null;
      if (nextValue === value && nextSchemaType === schemaType) return;
      value = nextValue;
      schemaType = nextSchemaType;
      if (first) scheduler.now();
      else scheduler.changed();
    },

    /** A view is open: checks follow changes faster. Returns a stop function. */
    watch() {
      watching++;
      if (checker.state === 'idle' && value) scheduler.now();
      return () => {
        watching--;
      };
    },

    retry() {
      scheduler.now();
    },

    /** How many places are left to look at, as the tiles count them. */
    openCount() {
      const counts = countPlaces(toCards(checker.findings, checker.marked, checker.reviews));
      return Object.values(counts).reduce((a, b) => a + b, 0);
    },

    /** The open findings in a field, most serious first. */
    findingsIn(fieldPath) {
      const settled = new Set(
        toCards(checker.findings, checker.marked, checker.reviews)
          .filter((c) => c.settled)
          .flatMap((c) => c.places.map((p) => p.key))
      );
      return checker.findings.filter(
        (f) => f.itemId && checker.fields[f.itemId] === fieldPath && !settled.has(f.key)
      );
    }
  };

  async function scan() {
    if (!value) return;
    const { items, labels, fields } = documentItems(value, schemaType, { altFields, imageUrl });
    if (!hasContent(items)) {
      Object.assign(checker, {
        state: 'done',
        empty: true,
        findings: [],
        outline: null,
        error: '',
        fields
      });
      checker.notify();
      return;
    }
    checker.state = 'scanning';
    checker.notify();
    try {
      const sandbox = await sharedSandbox(locale);
      const out = await sandbox.scan(items, {
        profile: 'cms-content',
        locale,
        messages: messagesFor(locale),
        runOnly: { excludeRuleIds: LEFT_OUT },
        withOutline: true
      });
      Object.assign(checker, {
        state: 'done',
        empty: false,
        error: '',
        outline: out.outline,
        fields,
        findings: out.findings.map((f) => ({ ...f, itemLabel: labels[f.itemId] || '' }))
      });
    } catch (error) {
      Object.assign(checker, {
        state: 'error',
        error: error && error.message ? error.message : String(error)
      });
    }
    checker.notify();
  }

  const scheduler = createScheduler(scan, { delay: () => (watching ? 1000 : 3000) });
  return checker;
}
