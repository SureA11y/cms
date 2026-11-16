// The Studio plugin: an "Accessibility" side panel next to the form (a
// document inspector, opened from the document's header with a count), a
// line under each field with a finding, and the check behind both, which
// runs while the document is open.
//
// Written with React.createElement rather than JSX, so the package needs no
// build step of its own.

import {
  createElement as h,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react';
import {
  definePlugin,
  defineDocumentInspector,
  useClient,
  useCurrentLocale,
  useCurrentUser,
  useDataset,
  useFormValue,
  useProjectId
} from 'sanity';
import { DocumentInspectorHeader, useDocumentPane } from 'sanity/structure';
import {
  addLocale,
  createQuestionLoader,
  defineResultsElement,
  fill,
  uiStrings
} from '@surea11y/panel';
import { checkerFor } from './checker.js';
import { pathToString, stringToPath } from './paths.js';
import { connectReviews, loadHidden, removeAnswers, saveAnswer, saveHidden } from './reviews.js';
import { ALT_FIELDS } from './content.js';

export const INSPECTOR_NAME = 'surea11y';
const API_VERSION = '2025-02-19';
const LOCALES = ['en', 'es', 'de', 'fr', 'ja'];

let settings = { altFields: ALT_FIELDS, fieldLines: true };

/** The Studio's language, as one the panel speaks (English otherwise). */
function useLocale() {
  const id = String((useCurrentLocale() || {}).id || 'en')
    .toLowerCase()
    .split('-')[0];
  return LOCALES.includes(id) ? id : 'en';
}

// Listed one by one, so a bundler can find each file.
const PANEL_LOCALES = {
  es: () => import('@surea11y/panel/src/messages/locale.es.js'),
  de: () => import('@surea11y/panel/src/messages/locale.de.js'),
  fr: () => import('@surea11y/panel/src/messages/locale.fr.js'),
  ja: () => import('@surea11y/panel/src/messages/locale.ja.js')
};
const REVIEWS = {
  en: () => import('../dist/review.en.js'),
  es: () => import('../dist/review.es.js'),
  de: () => import('../dist/review.de.js'),
  fr: () => import('../dist/review.fr.js'),
  ja: () => import('../dist/review.ja.js')
};

const loadedLocales = new Set(['en']);
/** The panel's words and messages in a language, loaded the first time. */
function useLocaleWords(locale) {
  const [ready, setReady] = useState(loadedLocales.has(locale));
  useEffect(() => {
    if (loadedLocales.has(locale)) return undefined;
    let live = true;
    PANEL_LOCALES[locale]()
      .then((m) => {
        addLocale(locale, m.default);
        loadedLocales.add(locale);
        if (live) setReady(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [locale]);
  return ready ? locale : 'en';
}

/** The checker for the open document, and a re-render when it changes. */
function useChecker(documentId) {
  const projectId = useProjectId();
  const dataset = useDataset();
  const locale = useLocale();
  const checker = useMemo(
    () =>
      documentId
        ? checkerFor(documentId, { locale, projectId, dataset, altFields: settings.altFields })
        : null,
    [documentId, locale, projectId, dataset]
  );
  const subscribe = useMemo(
    () => (fn) => (checker ? checker.subscribe(() => fn()) : () => {}),
    [checker]
  );
  const version = useRef(0);
  const last = useRef(null);
  useSyncExternalStore(subscribe, () => {
    if (!checker) return 0;
    const snap = `${checker.state}|${checker.findings.length}|${checker.current}|${Object.keys(checker.reviews).length}|${checker.marked.length}|${checker.openCount()}`;
    if (snap !== last.current) {
      last.current = snap;
      version.current++;
    }
    return version.current;
  });
  return checker;
}

const fieldLinesKey = 'surea11y:field-lines';
function fieldLinesOn() {
  if (!settings.fieldLines) return false;
  try {
    return localStorage.getItem(fieldLinesKey) !== 'off';
  } catch {
    return true;
  }
}

// ---- The check behind the form -------------------------------------------

/**
 * The document's root input: it feeds the checker the document's value as
 * the form has it (unsaved edits too), and keeps the answers in step.
 */
function RootInput(props) {
  const isRoot = Array.isArray(props.path) && props.path.length === 0;
  if (!isRoot) return props.renderDefault(props);
  return h(DocumentCheck, props);
}

function DocumentCheck(props) {
  const isRoot = true;
  const value = props.value;
  const documentId = value && value._id ? value._id : null;
  const checker = useChecker(documentId);
  const client = useClient({ apiVersion: API_VERSION });
  const projectId = useProjectId();
  const dataset = useDataset();
  const user = useCurrentUser();
  const locale = useLocale();

  useEffect(() => {
    if (checker && isRoot) checker.update(value, props.schemaType);
  }, [checker, isRoot, value, props.schemaType]);

  useEffect(() => {
    if (!checker) return undefined;
    checker.marked = loadHidden(projectId, dataset, user && user.id, checker.id);
    return connectReviews(checker, client, locale);
  }, [checker, client, projectId, dataset, user, locale]);

  return props.renderDefault(props);
}

// ---- The line under a field ----------------------------------------------

function FieldLine(props) {
  const documentId = useFormValue(['_id']);
  const checker = useChecker(typeof documentId === 'string' ? documentId : null);
  const locale = useLocaleWords(useLocale());
  let pane = null;
  try {
    pane = useDocumentPane();
  } catch {
    pane = null; // a form outside a document pane: no panel to open
  }
  const field = pathToString(props.path || []);
  const open = checker && fieldLinesOn() ? checker.findingsIn(field) : [];
  const current = checker && checker.current && checker.fields[checker.current] === field;
  const t = uiStrings(locale);
  const rendered = props.renderDefault(props);
  if (!open.length && !current) return rendered;

  const order = ['problem', 'likely', 'review', 'probably-fine'];
  const first = [...open].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))[0];
  const children = [rendered];
  if (first) {
    const more = open.length - 1;
    children.push(
      h(
        'div',
        {
          key: 'surea11y',
          className: 'surea11y-field-line',
          'data-group': first.group,
          style: lineStyle(first.group)
        },
        h('strong', null, `${(t.badges && t.badges[first.group]) || t.groups[first.group]}. `),
        h('span', null, first.summary),
        more > 0
          ? h(
              'span',
              { style: { color: 'var(--card-muted-fg-color)' } },
              ` ${fill(t.moreInField, { n: more })}.`
            )
          : null,
        pane
          ? h(
              'button',
              {
                type: 'button',
                className: 'surea11y-field-details',
                style: linkStyle,
                onClick: () => pane.openInspector(INSPECTOR_NAME)
              },
              t.details
            )
          : null
      )
    );
  }
  return h(
    'div',
    {
      className: current ? 'surea11y-field surea11y-field-current' : 'surea11y-field',
      style: current ? frameStyle(first ? first.group : 'review') : undefined
    },
    ...children
  );
}

const GROUP_COLOURS = {
  problem: ['#b32d2e', '#fcf0f1'],
  likely: ['#8a4d00', '#fcf3e6'],
  review: ['#1d5fa6', '#eef4fb'],
  'probably-fine': ['#00702a', '#edf7ef']
};
function lineStyle(group) {
  const [fg, bg] = GROUP_COLOURS[group] || GROUP_COLOURS.review;
  return {
    marginTop: 8,
    padding: '6px 10px',
    borderRadius: 4,
    borderInlineStart: `4px solid ${fg}`,
    background: bg,
    color: '#1e1e1e',
    fontSize: 13,
    lineHeight: 1.45
  };
}
function frameStyle(group) {
  const [fg] = GROUP_COLOURS[group] || GROUP_COLOURS.review;
  return { outline: `2px solid ${fg}`, outlineOffset: 6, borderRadius: 4 };
}
const linkStyle = {
  marginInlineStart: 8,
  padding: 0,
  border: 0,
  background: 'none',
  color: '#1d5fa6',
  textDecoration: 'underline',
  font: 'inherit',
  cursor: 'pointer'
};

// ---- The side panel --------------------------------------------------------

function Inspector(props) {
  const { documentId, onClose } = props;
  const pane = useDocumentPane();
  const checker = useChecker(documentId);
  const locale = useLocaleWords(useLocale());
  const client = useClient({ apiVersion: API_VERSION });
  const projectId = useProjectId();
  const dataset = useDataset();
  const user = useCurrentUser();
  const host = useRef(null);
  const results = useRef(null);
  const [lines, setLines] = useState(fieldLinesOn());
  const t = uiStrings(locale);

  // The panel itself, made once.
  useEffect(() => {
    defineResultsElement();
    const el = document.createElement('surea11y-results');
    el.setAttribute('heading-level', '3');
    host.current.append(el);
    results.current = el;
    return () => el.remove();
  }, []);

  // Words, who answers, and how to check a finding.
  useEffect(() => {
    const el = results.current;
    if (!el) return;
    el.locale = locale;
    el.canReview = true;
    el.reviewer = (user && user.name) || '';
    el.questionFor = questionLoader(locale);
  }, [locale, user]);

  // The results, whenever the checker has new ones.
  useEffect(() => {
    const el = results.current;
    if (!el || !checker) return undefined;
    let shown = null;
    const sync = () => {
      el.reviews = checker.reviews;
      el.marked = checker.marked;
      if (checker.state === 'scanning' && !shown) el.state = 'scanning';
      else if (checker.state === 'error') el.error = checker.error;
      else if (checker.state === 'done' && shown !== checker.findings) {
        shown = checker.findings;
        el.empty = checker.empty;
        el.outline = checker.outline;
        el.findings = checker.findings;
      }
    };
    const stop = checker.subscribe(sync);
    const unwatch = checker.watch();
    sync();
    return () => {
      stop();
      unwatch();
    };
  }, [checker]);

  // What the person does in the panel.
  useEffect(() => {
    const el = results.current;
    if (!el || !checker) return undefined;
    const onShow = (event) => {
      const itemId = event.detail && event.detail.itemId;
      if (!itemId) return;
      const path = stringToPath(itemId);
      checker.current = itemId;
      checker.notify();
      pane.onPathOpen(path);
      pane.onFocus(path);
    };
    const onMark = () => {
      checker.marked = el.marked;
      saveHidden(projectId, dataset, user && user.id, checker.id, checker.marked);
      checker.notify();
    };
    const onReview = (event) => {
      const { keys, note, answer } = event.detail;
      saveAnswer(client, checker.id, keys, {
        answer,
        note,
        by: (user && user.name) || '',
        byId: (user && user.id) || ''
      }).catch((error) => {
        el.error = error && error.message ? error.message : String(error);
      });
    };
    const onReopen = (event) => removeAnswers(client, checker.id, event.detail.keys);
    const onRetry = () => checker.retry();
    el.addEventListener('surea11y-show', onShow);
    el.addEventListener('surea11y-mark', onMark);
    el.addEventListener('surea11y-review', onReview);
    el.addEventListener('surea11y-reopen', onReopen);
    el.addEventListener('surea11y-retry', onRetry);
    return () => {
      el.removeEventListener('surea11y-show', onShow);
      el.removeEventListener('surea11y-mark', onMark);
      el.removeEventListener('surea11y-review', onReview);
      el.removeEventListener('surea11y-reopen', onReopen);
      el.removeEventListener('surea11y-retry', onRetry);
    };
  }, [checker, client, pane, projectId, dataset, user]);

  // Closing the panel stops framing the field last shown.
  useEffect(
    () => () => {
      if (checker && checker.current) {
        checker.current = null;
        checker.notify();
      }
    },
    [checker]
  );

  const toggleLines = (event) => {
    const on = event.target.checked;
    try {
      localStorage.setItem(fieldLinesKey, on ? 'on' : 'off');
    } catch {
      // storage turned off: for this visit only
    }
    setLines(on);
    if (checker) checker.notify();
  };

  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
    h(DocumentInspectorHeader, { title: t.heading, closeButtonLabel: t.close, onClose }),
    h(
      'div',
      {
        'data-surea11y-inspector': '',
        style: { flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }
      },
      h('div', { ref: host }),
      settings.fieldLines
        ? h(
            'label',
            {
              style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, fontSize: 13 }
            },
            h('input', { type: 'checkbox', checked: lines, onChange: toggleLines }),
            t.fieldLines
          )
        : null
    )
  );
}

/** How to check a finding, in the Studio's language, loaded the first time. */
const questionLoaders = new Map();
function questionLoader(locale) {
  if (!questionLoaders.has(locale)) {
    const urls = [];
    const load = async () => {
      const files = [REVIEWS.en()];
      if (locale !== 'en' && REVIEWS[locale]) files.push(REVIEWS[locale]());
      for (const m of await Promise.all(files)) {
        urls.push(URL.createObjectURL(new Blob([m.default], { type: 'text/javascript' })));
      }
      return createQuestionLoader(document, { urls, locale });
    };
    let loader = null;
    questionLoaders.set(locale, (card) => {
      if (!loader) loader = load();
      return loader.then((ask) => ask(card));
    });
  }
  return questionLoaders.get(locale);
}

/** The header button: "Accessibility", with how many places are left to look at. */
function useMenuItem({ documentId }) {
  const checker = useChecker(documentId);
  const locale = useLocaleWords(useLocale());
  const t = uiStrings(locale);
  const n = checker && checker.state === 'done' ? checker.openCount() : 0;
  return {
    title: n ? `${t.heading} (${n})` : t.heading,
    showAsAction: true,
    icon: AccessibilityIcon,
    tone: n ? 'caution' : undefined
  };
}

function AccessibilityIcon() {
  return h(
    'svg',
    { width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
    h('circle', { cx: 12, cy: 4.5, r: 2, fill: 'currentColor' }),
    h('path', {
      d: 'M4 8.5h16M12 8.5v5l-3.5 7M12 13.5l3.5 7',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round'
    })
  );
}

export const accessibilityInspector = defineDocumentInspector({
  name: INSPECTOR_NAME,
  component: Inspector,
  useMenuItem
});

/**
 * The plugin. Options:
 * - `altFields`: where images keep their alternative text
 *   (default `['alt', 'altText', 'alternativeText']`);
 * - `fieldLines`: show a line under each field with a finding (default
 *   true; each person can still turn it off in the panel).
 */
export const surea11y = definePlugin((options = {}) => {
  settings = {
    altFields:
      Array.isArray(options.altFields) && options.altFields.length ? options.altFields : ALT_FIELDS,
    fieldLines: options.fieldLines !== false
  };
  return {
    name: '@surea11y/sanity',
    document: {
      inspectors: (prev) => [
        ...prev.filter((i) => i.name !== INSPECTOR_NAME),
        accessibilityInspector
      ]
    },
    form: {
      components: {
        input: RootInput,
        field: FieldLine
      }
    }
  };
});
