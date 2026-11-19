// The editor tab, an option on top of the sidebar: the entry's fields drawn
// with Contentful's own field editors (@contentful/default-field-editors), a
// line under each field with a finding, and the panel beside them. Since
// the tab draws the form itself, Show can move to a field.
//
// Beside Contentful's live preview the tab is about 600 px wide: there it
// shows one view at a time, the fields or the findings, with a switch.
//
// Written with React.createElement rather than JSX, so the package needs no
// JSX build.

import { createElement as h, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Field, FieldWrapper } from '@contentful/default-field-editors';
import { GlobalStyles } from '@contentful/f36-components';
import { i18n } from '@lingui/core';
import { compileMessage } from '@lingui/message-utils/compileMessage';
import { uiStrings, fill } from '@surea11y/panel';
import { mount } from './app.js';

const ORDER = ['problem', 'likely', 'review', 'probably-fine'];
// Below this width, one view at a time.
const NARROW = 760;
const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap'
};
const COLOURS = {
  problem: ['#b32d2e', '#fcf0f1'],
  likely: ['#8a4d00', '#fcf3e6'],
  review: ['#1d5fa6', '#eef4fb'],
  'probably-fine': ['#00702a', '#edf7ef']
};

/** A field's own SDK, from the entry editor's: what Contentful's field editors expect. */
export function fieldSdk(sdk, field, locale, controls) {
  const control = (controls || []).find((c) => c.fieldId === field.id) || {};
  return {
    ...sdk,
    field: sdk.entry.fields[field.id].getForLocale(locale),
    ids: { ...sdk.ids, field: field.id },
    parameters: { ...(sdk.parameters || {}), instance: control.settings || {} }
  };
}

/** The editor Contentful's own form uses for a field, when it is a built-in one. */
function widgetIdOf(field, controls) {
  const control = (controls || []).find((c) => c.fieldId === field.id);
  return control && (control.widgetNamespace === 'builtin' || !control.widgetNamespace)
    ? control.widgetId
    : undefined;
}

function Line({ findings, onDetails, words }) {
  if (!findings.length) return null;
  const first = [...findings].sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group))[0];
  const [fg, bg] = COLOURS[first.group] || COLOURS.review;
  const more = findings.length - 1;
  return h(
    'div',
    {
      className: 'surea11y-field-line',
      'data-group': first.group,
      style: {
        margin: '8px 0 0',
        padding: '6px 10px',
        borderRadius: 4,
        borderInlineStart: `4px solid ${fg}`,
        background: bg,
        color: '#1e1e1e',
        fontSize: 13,
        lineHeight: 1.45
      }
    },
    h(
      'strong',
      null,
      `${(words.badges && words.badges[first.group]) || words.groups[first.group]}. `
    ),
    h('span', null, first.summary),
    more > 0
      ? h('span', { style: { color: '#50575e' } }, ` ${fill(words.moreInField, { n: more })}.`)
      : null,
    h(
      'button',
      {
        type: 'button',
        onClick: onDetails,
        style: {
          marginInlineStart: 8,
          padding: 0,
          border: 0,
          background: 'none',
          color: '#1d5fa6',
          textDecoration: 'underline',
          font: 'inherit',
          cursor: 'pointer'
        }
      },
      words.details
    )
  );
}

/** Fields or Accessibility (the panel): a switch like the panel's own views, for a narrow tab. */
function Switch({ view, onView, counts, words }) {
  const button = (v, name, n) =>
    h(
      'button',
      {
        key: v,
        type: 'button',
        'aria-pressed': String(view === v),
        'data-view': v,
        onClick: () => onView(v),
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: 36,
          padding: '4px 4px',
          lineHeight: 1.25,
          borderRadius: 4,
          border: `2px solid ${view === v ? '#1d5fa6' : 'transparent'}`,
          background: view === v ? '#fff' : 'transparent',
          color: view === v ? '#1d5fa6' : '#1e1e1e',
          fontWeight: view === v ? 600 : 400,
          font: 'inherit',
          fontSize: 14,
          cursor: 'pointer'
        }
      },
      h('span', null, name),
      h(
        'span',
        {
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 12,
            fontWeight: 400,
            color: view === v ? '#1d5fa6' : '#50575e'
          }
        },
        h('span', { style: SR_ONLY }, ' ('),
        String(n),
        h('span', { style: SR_ONLY }, ')')
      )
    );
  return h(
    'div',
    {
      role: 'group',
      'aria-label': words.tabViews,
      'data-surea11y-switch': '',
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
        padding: 2,
        marginBottom: 16,
        border: '1px solid #8c8f94',
        borderRadius: 6,
        background: '#f6f7f7'
      }
    },
    button('fields', words.viewFields, counts.fields),
    button('findings', words.heading, counts.findings)
  );
}

function EditorTab({ sdk }) {
  const locale = sdk.locales.default;
  const controls =
    (sdk.editor && sdk.editor.editorInterface && sdk.editor.editorInterface.controls) || [];
  const fields = useMemo(
    () => (sdk.contentType.fields || []).filter((f) => !f.disabled && !f.omitted),
    [sdk]
  );
  const panel = useRef(null);
  const fieldEls = useRef({});
  const app = useRef(null);
  const [state, setState] = useState({
    findings: [],
    fieldOf: {},
    settled: new Set(),
    current: null,
    page: false,
    previewState: null,
    previewError: ''
  });
  const words = uiStrings((app.current && app.current.results.locale) || 'en');
  const outer = useRef(null);
  const [narrow, setNarrow] = useState(false);
  const [view, setView] = useState('findings');
  const narrowRef = useRef(false);
  narrowRef.current = narrow;

  useEffect(() => {
    const el = outer.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onResults = (
      findings,
      fieldOf,
      { page = false, previewState = null, previewError = '' } = {}
    ) => {
      const cards = app.current ? app.current.results.cards : [];
      const settled = new Set(
        cards.filter((c) => c.settled).flatMap((c) => c.places.map((p) => p.key))
      );
      setState((s) => ({ ...s, findings, fieldOf, settled, page, previewState, previewError }));
    };
    const onShow = (itemId, field) => {
      const el = fieldEls.current[field];
      if (!el) return;
      const go = () => {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const focusable = el.querySelector('[contenteditable="true"], input, textarea, button');
        if (focusable) focusable.focus({ preventScroll: true });
      };
      setState((s) => ({ ...s, current: field }));
      // In a narrow tab the fields may be the hidden view: show them first.
      if (narrowRef.current) {
        setView('fields');
        requestAnimationFrame(() => requestAnimationFrame(go));
      } else go();
    };
    app.current = mount(sdk, panel.current, {
      canShow: true,
      onShow,
      onResults,
      preview: true
    });
    return () => app.current && app.current.stop();
  }, [sdk]);

  const showFields = !narrow || view === 'fields';
  const showPanel = !narrow || view === 'findings';
  const open = state.findings.filter((f) => !state.settled.has(f.key));
  const counts = {
    fields: fields.filter((f) => open.some((x) => x.itemId && state.fieldOf[x.itemId] === f.id))
      .length,
    findings: open.length
  };
  const toPanel = () => {
    if (narrow) setView('findings');
    requestAnimationFrame(
      () => panel.current && panel.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    );
  };

  const inField = (id) =>
    state.findings.filter(
      (f) => f.itemId && state.fieldOf[f.itemId] === id && !state.settled.has(f.key)
    );

  return h(
    'div',
    { ref: outer, style: { padding: narrow ? 16 : 24 } },
    h(GlobalStyles),
    narrow ? h(Switch, { view, onView: setView, counts, words }) : null,
    h(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 340px',
          gap: 24,
          alignItems: 'start'
        }
      },
      h(
        'div',
        { 'data-surea11y-form': '', hidden: !showFields },
        ...fields.map((field) => {
          const fsdk = fieldSdk(sdk, field, locale, controls);
          const current = state.current === field.id;
          const findings = inField(field.id);
          const colour = (COLOURS[(findings[0] || {}).group] || COLOURS.review)[0];
          return h(
            'div',
            {
              key: field.id,
              ref: (el) => {
                fieldEls.current[field.id] = el;
              },
              'data-field': field.id,
              className: current ? 'surea11y-field surea11y-field-current' : 'surea11y-field',
              style: current
                ? { outline: `2px solid ${colour}`, outlineOffset: 6, borderRadius: 4 }
                : undefined
            },
            h(
              FieldWrapper,
              { sdk: fsdk, name: field.name, showFocusBar: true },
              h(Field, { sdk: fsdk, widgetId: widgetIdOf(field, controls) })
            ),
            h(Line, { findings, words, onDetails: toPanel })
          );
        })
      ),
      h(
        'div',
        { hidden: !showPanel, style: { position: narrow ? 'static' : 'sticky', top: 16 } },
        // Where the live preview's page is: checked, being checked, or not.
        state.previewState
          ? h(
              'p',
              {
                className:
                  state.previewState === 'done'
                    ? 'surea11y-checked'
                    : `surea11y-preview-${state.previewState}`,
                role: 'status',
                style: {
                  margin: '0 0 12px',
                  fontSize: 13,
                  color: state.previewState === 'error' ? '#b32d2e' : '#50575e'
                }
              },
              state.previewState === 'done'
                ? words.checkedBoth
                : state.previewState === 'checking'
                  ? words.previewChecking
                  : `${words.previewError}${state.previewError ? ` (${state.previewError})` : ''}`
            )
          : null,
        h('aside', { ref: panel, 'data-surea11y-inspector': '' })
      )
    )
  );
}

/** Draws the tab into `root`. */
export function mountEditorTab(sdk, root) {
  // Contentful's field editors translate their own words with Lingui, which
  // the host starts. With no catalogue they show their English words, put
  // together (plurals, values) by Lingui's compiler.
  if (!i18n.locale) {
    i18n.setMessagesCompiler(compileMessage);
    i18n.loadAndActivate({ locale: 'en', messages: {} });
  }
  const reactRoot = createRoot(root);
  reactRoot.render(h(EditorTab, { sdk }));
  return () => reactRoot.unmount();
}
