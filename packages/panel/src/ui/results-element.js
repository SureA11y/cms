// <surea11y-results>: what a check found, for the people who write the
// content. Count tiles that filter, "3 of 11" steps through every place, and
// one card per finding with the places it occurs in.
//
// Accessibility: real headings, lists and buttons; disclosure buttons with
// aria-expanded; toggle tiles with aria-pressed; the card last shown marked
// with aria-current and in words. One polite live region announces how each
// check ended, not every pause in typing. Nothing is told by colour alone:
// every group has an icon and a word. Focus stays on the same control across
// rescans. Text from the content is always set as text, never as HTML.
//
// The look comes from design tokens (./tokens.js): override any
// `--sa11y-…` custom property on the element to change it.
//
// Events (bubbling, composed):
// - surea11y-show  { itemId, finding, card, via }  bring a place into view
//   (via 'show': a Show button or marker; 'step': the arrows);
// - surea11y-mark  { keys, fine }       finding keys marked fine, or undone;
// - surea11y-retry {}                   the person asked to check again.

import { GROUP_ORDER } from '../findings.js';
import { toCards, countPlaces } from '../cards.js';
import { uiStrings, fill } from '../messages/ui.js';
import { tokenCss } from './tokens.js';
import { icon } from './icons.js';

const STYLE = `
${tokenCss()}
:host { display: block; font: inherit; font-size: var(--sa11y-font-size); line-height: 1.5; color: var(--sa11y-text); }
* { box-sizing: border-box; }
p { margin: 0; }
[hidden] { display: none !important; }
.root { display: flex; flex-direction: column; gap: var(--sa11y-space-4); }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.icon { flex-shrink: 0; }

button { font: inherit; color: inherit; cursor: pointer; min-height: var(--sa11y-target-min); }
button:focus-visible, summary:focus-visible { outline: var(--sa11y-focus-width) solid var(--sa11y-focus); outline-offset: 2px; }
.button { min-height: var(--sa11y-button-height); padding: 0 var(--sa11y-space-3); border-radius: var(--sa11y-radius-small); border: 1px solid var(--sa11y-accent); background: var(--sa11y-surface); color: var(--sa11y-accent); }
.button.primary { background: var(--sa11y-accent); color: var(--sa11y-on-accent); }
.link { border: 0; background: transparent; color: var(--sa11y-accent); text-decoration: underline; padding: 0 var(--sa11y-space-1); }
a.link { display: inline-flex; align-items: center; min-height: var(--sa11y-button-height); }
a.link:focus-visible { outline: var(--sa11y-focus-width) solid var(--sa11y-focus); outline-offset: 2px; }

.busy { display: flex; align-items: center; gap: var(--sa11y-space-2); color: var(--sa11y-text-muted); }
.busy[hidden] { display: none; }
.busy .icon { animation: sa11y-spin 1s linear infinite; }
@keyframes sa11y-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .busy .icon { animation: none; } }

.state { display: flex; flex-direction: column; align-items: center; gap: var(--sa11y-space-3); padding: var(--sa11y-space-4) var(--sa11y-space-2); text-align: center; }
.state[hidden] { display: none; }
.state-icon { width: 56px; height: 56px; border-radius: var(--sa11y-radius-round); display: flex; align-items: center; justify-content: center; }
.state-icon[data-kind="empty"] { background: var(--sa11y-surface-tag); color: var(--sa11y-text-muted); }
.state-icon[data-kind="nothing"] { background: var(--sa11y-fine-tint); color: var(--sa11y-fine); }
.state-icon[data-kind="error"] { background: var(--sa11y-problem-tint); color: var(--sa11y-problem); }
.status { font-size: var(--sa11y-font-size-title); font-weight: 600; }
.state-text { color: var(--sa11y-text-muted); }
details { align-self: stretch; text-align: start; }
summary { cursor: pointer; color: var(--sa11y-accent); }
.technical { margin-top: var(--sa11y-space-1); font-family: ui-monospace, Menlo, Consolas, monospace; font-size: var(--sa11y-font-size-small); color: var(--sa11y-text-muted); overflow-wrap: anywhere; }

.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sa11y-space-2); }
.tile { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: var(--sa11y-space-2) var(--sa11y-space-3); min-height: 64px; border-radius: var(--sa11y-radius); border: 1px solid var(--sa11y-border); background: var(--sa11y-surface); text-align: start; }
.tile-top { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.count { font-size: var(--sa11y-font-size-count); font-weight: 600; line-height: 1.1; }
.tile[aria-pressed="true"] { border-width: 2px; }

.filter { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sa11y-space-1); }
.filter[hidden] { display: none; }

.nav { display: flex; align-items: center; gap: var(--sa11y-space-2); padding: var(--sa11y-space-1); border: 1px solid var(--sa11y-border); border-radius: var(--sa11y-radius); }
.nav-button { width: var(--sa11y-button-height); height: var(--sa11y-button-height); display: flex; align-items: center; justify-content: center; padding: 0; border-radius: var(--sa11y-radius-small); border: 1px solid var(--sa11y-border-strong); background: var(--sa11y-surface); }
.nav-label { flex-grow: 1; text-align: center; font-weight: 600; }

section { display: flex; flex-direction: column; gap: var(--sa11y-space-2); }
h2, h3, h4, h5 { margin: 0; font-size: 1em; }
.group-toggle { width: 100%; display: flex; align-items: center; gap: var(--sa11y-space-2); border: 0; background: transparent; padding: var(--sa11y-space-1) 0; min-height: var(--sa11y-button-height); text-align: start; font-weight: 600; }
.group-name { flex-grow: 1; }
.chevron { transition: transform .15s; }
.group-toggle[aria-expanded="true"] .chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .chevron { transition: none; } }
.help { color: var(--sa11y-text-muted); margin-top: calc(-1 * var(--sa11y-space-1)); }
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--sa11y-space-2); }

.card { padding: var(--sa11y-space-3); border-radius: var(--sa11y-radius); border: 1px solid var(--sa11y-border); background: var(--sa11y-surface); }
.card[aria-current="true"] { border-width: 2px; }
.current-label { font-size: var(--sa11y-font-size-small); font-weight: 600; color: var(--sa11y-accent); margin-bottom: var(--sa11y-space-1); }
.tags { display: flex; flex-wrap: wrap; gap: var(--sa11y-space-1); margin-bottom: var(--sa11y-space-1); }
.tag { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: var(--sa11y-radius-small); background: var(--sa11y-surface-tag); color: var(--sa11y-text-muted); }
.summary { font-size: var(--sa11y-font-size-title); font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.hint { margin-top: var(--sa11y-space-2); }
.where { margin-top: var(--sa11y-space-2); font-style: italic; color: var(--sa11y-text-muted); }
.actions { display: flex; flex-wrap: wrap; gap: var(--sa11y-space-2); margin-top: var(--sa11y-space-3); }

${GROUP_ORDER.concat('marked')
  .map(
    (g) => `[data-group="${g}"] .group-icon { color: var(--sa11y-${g === 'probably-fine' ? 'fine' : g}); }
.tile[data-group="${g}"][aria-pressed="true"], .card[data-group="${g}"][aria-current="true"] { border-color: var(--sa11y-${g === 'probably-fine' ? 'fine' : g}); background: var(--sa11y-${g === 'probably-fine' ? 'fine' : g}-tint); }`
  )
  .join('\n')}

@media (forced-colors: active) {
  .tile[aria-pressed="true"], .card[aria-current="true"] { border-color: Highlight; }
}
`;

let counter = 0;

export class ResultsElement extends HTMLElement {
  constructor() {
    super();
    this._id = `surea11y-${++counter}`;
    this._findings = [];
    this._marked = new Set();
    this._state = 'idle';
    this._error = '';
    this._empty = false;
    this._canMark = true;
    this._actionsFor = null;
    this._editUrl = '';
    this._locale = 'en';
    this._only = null; // the group the tiles filter to
    this._closed = new Set(['marked']);
    this._howOpen = new Set();
    this._current = null; // { cardKey, place }
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    this._root = document.createElement('div');
    this._root.className = 'root';
    root.append(style, this._root);
    this._build();
  }

  /* ---------- properties ---------- */

  /** The locale of the panel's own words. */
  set locale(value) {
    this._locale = value || 'en';
    this._build();
    this._render();
  }
  get locale() {
    return this._locale;
  }

  /** 'idle', 'scanning', 'done' or 'error'. */
  set state(value) {
    this._state = value;
    this._render();
  }
  get state() {
    return this._state;
  }

  /**
   * Ends a check with an error. Editors get a plain sentence; the technical
   * message stays behind a disclosure for whoever supports the site.
   */
  set error(message) {
    this._error = message || '';
    this._state = 'error';
    this._render();
  }
  get error() {
    return this._error;
  }

  /** True when there is no content to check yet (set before `findings`). */
  set empty(value) {
    this._empty = !!value;
    this._render();
  }
  get empty() {
    return this._empty;
  }

  /** The findings to show, as `toFindings` makes them. Ends a check. */
  set findings(list) {
    this._findings = Array.isArray(list) ? list : [];
    this._state = 'done';
    this._render();
  }
  get findings() {
    return this._findings;
  }

  /** Keys of the findings the person has marked as fine. */
  set marked(keys) {
    this._marked = new Set(keys || []);
    this._render();
  }
  get marked() {
    return [...this._marked];
  }

  /**
   * The host's actions for a card: a function (card, current) returning
   * [{ id, label, run(card) }], such as opening the setting that fixes it.
   * Each becomes a button on the card, after "How to fix".
   */
  set actionsFor(fn) {
    this._actionsFor = typeof fn === 'function' ? fn : null;
    this._render();
  }
  get actionsFor() {
    return this._actionsFor;
  }

  /** Whether "Mark as fine" is offered (the host must keep the marks). */
  set canMark(value) {
    this._canMark = !!value;
    this._render();
  }
  get canMark() {
    return this._canMark;
  }

  /**
   * Where the author edits this content: when set, cards in the content get
   * an "Edit in the editor" link (used where the list is not in the editor).
   */
  set editUrl(value) {
    this._editUrl = value || '';
    this._render();
  }
  get editUrl() {
    return this._editUrl;
  }

  /** The cards as shown, for hosts that draw markers. */
  get cards() {
    return this._cards || [];
  }

  /** The place last shown: { cardKey, place } or null. */
  get current() {
    return this._current;
  }

  get _headingLevel() {
    const n = Number(this.getAttribute('heading-level'));
    return n >= 2 && n <= 5 ? n : 3;
  }

  /* ---------- the fixed parts ---------- */

  _build() {
    const t = uiStrings(this._locale);
    const doc = this.ownerDocument || document;
    this._root.textContent = '';

    this._busy = el(doc, 'p', 'busy');
    this._busy.hidden = true;
    this._busy.append(icon(doc, 'spinner', 16, 2.2), el(doc, 'span', '', t.checking));

    // How the last check ended: the one live region.
    this._status = el(doc, 'p', 'status');
    this._status.setAttribute('role', 'status');
    this._stateBox = el(doc, 'div', 'state');
    this._stateIcon = el(doc, 'div', 'state-icon');
    this._stateText = el(doc, 'p', 'state-text');
    this._retry = el(doc, 'button', 'button', t.tryAgain);
    this._retry.type = 'button';
    this._retry.dataset.focus = 'retry';
    this._retry.addEventListener('click', () => this._emit('surea11y-retry', {}));
    this._details = el(doc, 'details');
    this._details.append(el(doc, 'summary', '', t.errorDetails), el(doc, 'p', 'technical'));
    this._stateBox.append(this._stateIcon, this._status, this._stateText, this._retry, this._details);

    this._list = el(doc, 'div', 'root');
    this._root.append(this._busy, this._stateBox, this._list);
  }

  /* ---------- rendering ---------- */

  _render() {
    const t = uiStrings(this._locale);
    const doc = this.ownerDocument || document;
    const scanning = this._state === 'scanning';
    this._busy.hidden = !scanning;
    this._list.setAttribute('aria-busy', String(scanning));
    if (scanning) return; // the last outcome stays until the check ends

    const focusId = this._focusedId();
    const cards = (this._cards = toCards(this._findings, this._marked));
    const counts = countPlaces(cards);
    const open = cards.filter((c) => !c.marked);
    if (this._only && !open.some((c) => c.group === this._only)) this._only = null;
    this._keepCurrent(cards);

    // The state box: errors, nothing to check, nothing found; otherwise only
    // its live region, read but not seen (the tiles show the counts).
    const kind =
      this._state === 'error' ? 'error' : this._state !== 'done' ? null : this._empty ? 'empty' : open.length ? 'found' : 'nothing';
    const visible = kind && kind !== 'found';
    this._stateIcon.hidden = !visible;
    this._stateText.hidden = !visible;
    this._status.className = visible ? 'status' : 'status sr-only';
    this._stateBox.style.padding = visible ? '' : '0';
    this._retry.hidden = kind !== 'error';
    this._details.hidden = kind !== 'error' || !this._error;
    this._stateIcon.textContent = '';
    if (visible) {
      this._stateIcon.dataset.kind = kind;
      this._stateIcon.append(icon(doc, kind === 'empty' ? 'empty' : kind === 'error' ? 'problem' : 'marked', 28));
    }
    if (kind === 'error') {
      this._status.textContent = t.errorTitle;
      this._stateText.textContent = t.error;
      this._details.lastChild.textContent = this._error;
    } else if (kind === 'empty') {
      this._status.textContent = t.emptyTitle;
      this._stateText.textContent = t.empty;
    } else if (kind === 'nothing') {
      this._status.textContent = t.nothingTitle;
      this._stateText.textContent = t.nothing;
    } else if (kind === 'found') {
      this._status.textContent = fill(t.summary, {
        problem: counts.problem,
        likely: counts.likely,
        review: counts.review,
        probably: counts['probably-fine']
      });
    } else {
      this._status.textContent = '';
    }

    this._list.textContent = '';
    if (kind === 'found' || (kind === 'nothing' && cards.length)) this._renderList(doc, t, cards, counts);
    this._restoreFocus(focusId);
  }

  _renderList(doc, t, cards, counts) {
    const open = cards.filter((c) => !c.marked);
    if (open.length) {
      // Count tiles.
      const tiles = el(doc, 'div', 'tiles');
      for (const g of GROUP_ORDER) {
        const tile = el(doc, 'button', 'tile');
        tile.type = 'button';
        tile.dataset.group = g;
        tile.dataset.focus = `tile:${g}`;
        tile.setAttribute('aria-pressed', String(this._only === g));
        const top = el(doc, 'span', 'tile-top');
        const ic = el(doc, 'span', 'group-icon');
        ic.append(icon(doc, g, 20));
        top.append(el(doc, 'span', 'count', String(counts[g])), ic);
        tile.append(top, el(doc, 'span', '', t.tiles[g]));
        tile.addEventListener('click', () => {
          this._only = this._only === g ? null : g;
          if (this._only) this._closed.delete(g);
          this._render();
        });
        tiles.append(tile);
      }
      this._list.append(tiles);

      if (this._only) {
        const filter = el(doc, 'p', 'filter');
        const all = el(doc, 'button', 'link', t.showAll);
        all.type = 'button';
        all.dataset.focus = 'show-all';
        all.addEventListener('click', () => {
          this._only = null;
          this._render();
        });
        filter.append(el(doc, 'span', '', t.showingOnly), el(doc, 'strong', '', t.groups[this._only]), all);
        this._list.append(filter);
      }

      // "3 of 11", over every place in the content that is shown.
      const places = this._places();
      if (places.length) {
        const nav = el(doc, 'div', 'nav');
        const i = this._currentIndex(places);
        const prev = this._navButton(doc, 'previous', t.previous, () => this.showPrevious());
        const next = this._navButton(doc, 'next', t.next, () => this.showNext());
        nav.append(prev, el(doc, 'span', 'nav-label', i >= 0 ? fill(t.position, { n: i + 1, total: places.length }) : fill(t.toLookAt, { total: places.length })), next);
        this._list.append(nav);
      }
    }

    const level = this._headingLevel;
    const groups = GROUP_ORDER.filter((g) => !this._only || this._only === g).map((g) => ({
      id: g,
      cards: open.filter((c) => c.group === g),
      count: counts[g]
    }));
    if (!this._only) {
      const marked = cards.filter((c) => c.marked);
      groups.push({ id: 'marked', cards: marked, count: marked.length });
    }
    for (const group of groups) {
      if (!group.cards.length) continue;
      this._list.append(this._renderGroup(doc, t, group, level));
    }
  }

  _navButton(doc, name, label, action) {
    const b = el(doc, 'button', 'nav-button');
    b.type = 'button';
    b.dataset.focus = `nav:${name}`;
    b.setAttribute('aria-label', label);
    b.append(icon(doc, name, 18));
    b.addEventListener('click', action);
    return b;
  }

  _renderGroup(doc, t, group, level) {
    const section = el(doc, 'section');
    section.dataset.group = group.id;
    const h = el(doc, `h${level}`);
    const headingId = `${this._id}-${group.id}`;
    const toggle = el(doc, 'button', 'group-toggle');
    toggle.type = 'button';
    toggle.id = headingId;
    toggle.dataset.focus = `group:${group.id}`;
    const isOpen = !this._closed.has(group.id);
    toggle.setAttribute('aria-expanded', String(isOpen));
    const ic = el(doc, 'span', 'group-icon');
    ic.append(icon(doc, group.id, 18));
    const chevron = icon(doc, 'chevron', 18);
    chevron.classList.add('chevron');
    toggle.append(ic, el(doc, 'span', 'group-name', `${t.groups[group.id]} (${group.count})`), chevron);
    toggle.addEventListener('click', () => {
      if (this._closed.has(group.id)) this._closed.delete(group.id);
      else this._closed.add(group.id);
      this._render();
    });
    h.append(toggle);
    section.append(h);
    if (!isOpen) return section;
    section.setAttribute('aria-labelledby', headingId);
    section.append(el(doc, 'p', 'help', t.groupHelp[group.id]));
    const ul = el(doc, 'ul');
    for (const card of group.cards) ul.append(this._renderCard(doc, t, card));
    section.append(ul);
    return section;
  }

  _renderCard(doc, t, card) {
    const li = el(doc, 'li', 'card');
    li.dataset.group = card.group;
    li.dataset.key = card.key;
    const id = `${this._id}-c${this._cards.indexOf(card)}`;
    const here = !card.marked && this._current && this._current.cardKey === card.key;
    if (here) {
      li.setAttribute('aria-current', 'true');
      const n = card.places.length;
      li.append(el(doc, 'p', 'current-label', n > 1 ? fill(t.shownPlace, { n: this._current.place + 1, total: n }) : t.shown));
    }
    const tags = [card.itemLabel, card.places.length > 1 ? fill(t.places, { n: card.places.length }) : ''].filter(Boolean);
    if (tags.length) {
      const box = el(doc, 'p', 'tags');
      for (const tag of tags) box.append(el(doc, 'span', 'tag', tag));
      li.append(box);
    }
    const summary = el(doc, 'p', 'summary', card.summary);
    summary.id = id;
    li.append(summary);

    const howOpen = this._howOpen.has(card.key);
    const hintId = `${id}-hint`;
    if (card.hint && howOpen && !card.marked) {
      const hint = el(doc, 'p', 'hint');
      hint.id = hintId;
      hint.append(el(doc, 'strong', '', `${t.howToFix}: `), doc.createTextNode(card.hint));
      li.append(hint);
    }
    if (card.outside) li.append(el(doc, 'p', 'where', card.inContent ? t.inTheme : t.outsideContent));

    const actions = el(doc, 'div', 'actions');
    const add = (label, cls, focus, action, expanded) => {
      const b = el(doc, 'button', cls, label);
      b.type = 'button';
      b.dataset.focus = `card:${hash(card.key)}:${focus}`;
      b.setAttribute('aria-describedby', id);
      if (expanded !== undefined) {
        b.setAttribute('aria-expanded', String(expanded));
        if (expanded) b.setAttribute('aria-controls', hintId);
      }
      b.addEventListener('click', action);
      actions.append(b);
    };
    if (card.marked) {
      add(t.undo, 'button', 'undo', () => this._mark(card, false));
    } else {
      if (card.inContent) {
        const next = here && card.places.length > 1;
        add(next ? t.showNextPlace : t.show, 'button primary show', 'show', () => this._showCard(card));
      }
      if (card.hint) {
        add(t.howToFix, 'button', 'how', () => {
          if (this._howOpen.has(card.key)) this._howOpen.delete(card.key);
          else this._howOpen.add(card.key);
          this._render();
        }, howOpen);
      }
      // The host's own actions, such as opening the setting that fixes it.
      const extra = typeof this._actionsFor === 'function' ? this._actionsFor(card, this._current) || [] : [];
      for (const action of extra) {
        if (action && action.label && typeof action.run === 'function') {
          add(action.label, 'button', `act:${action.id || action.label}`, () => action.run(card));
        }
      }
      if (this._editUrl && !card.outside) {
        const a = el(doc, 'a', 'link edit', t.editInEditor);
        a.href = this._editUrl;
        a.setAttribute('aria-describedby', id);
        a.dataset.focus = `card:${hash(card.key)}:edit`;
        actions.append(a);
      }
      if (this._canMark && card.group !== 'problem') add(t.markFine, 'link', 'fine', () => this._mark(card, true));
    }
    li.append(actions);
    return li;
  }

  /* ---------- behaviour ---------- */

  /** Places in the content, in the order they are listed, honouring the filter. */
  _places() {
    const out = [];
    for (const card of this._cards || []) {
      if (card.marked || (this._only && card.group !== this._only)) continue;
      card.places.forEach((p, place) => {
        if (p.itemId) out.push({ card, place });
      });
    }
    return out;
  }

  _currentIndex(places) {
    if (!this._current) return -1;
    return places.findIndex((p) => p.card.key === this._current.cardKey && p.place === this._current.place);
  }

  /** After a rescan, the card last shown stays shown while it exists. */
  _keepCurrent(cards) {
    if (!this._current) return;
    const card = cards.find((c) => c.key === this._current.cardKey && !c.marked);
    if (!card) this._current = null;
    else if (this._current.place >= card.places.length) this._current.place = card.places.length - 1;
  }

  _showCard(card) {
    const here = this._current && this._current.cardKey === card.key;
    let place = here ? (this._current.place + 1) % card.places.length : 0;
    while (!card.places[place].itemId) place = (place + 1) % card.places.length;
    this._go(card, place, `card:${hash(card.key)}:show`);
  }

  _go(card, place, focusId) {
    this._current = { cardKey: card.key, place };
    this._render();
    if (focusId) this._restoreFocus(focusId);
    const finding = card.places[place];
    // How it was asked for: the host may move focus to the content for
    // "Show", but keep it here while the arrows step through.
    const via = focusId && focusId.startsWith('nav:') ? 'step' : 'show';
    this._emit('surea11y-show', { itemId: finding.itemId, finding, card, via });
  }

  /** Shows the next place in the content, and keeps focus on the arrow. */
  showNext() {
    return this._step(1, 'nav:next');
  }

  /** Shows the previous place in the content. */
  showPrevious() {
    return this._step(-1, 'nav:previous');
  }

  _step(delta, focusId) {
    const places = this._places();
    if (!places.length) return false;
    const i = this._currentIndex(places);
    const j = i < 0 ? (delta > 0 ? 0 : places.length - 1) : (i + delta + places.length) % places.length;
    this._go(places[j].card, places[j].place, focusId);
    return true;
  }

  /** Shows a given place (from a marker beside the content). */
  showPlace(cardKey, place = 0) {
    const card = (this._cards || []).find((c) => c.key === cardKey);
    if (card) this._go(card, place, `card:${hash(card.key)}:show`);
  }

  _mark(card, fine) {
    const keys = card.places.map((p) => p.key);
    for (const k of keys) {
      if (fine) this._marked.add(k);
      else this._marked.delete(k);
    }
    if (fine && this._current && this._current.cardKey === card.key) this._current = null;
    // Focus moves to the heading of the group the card left, or, when that
    // group is now empty, of the group it went to.
    const from = `group:${fine ? card.group : 'marked'}`;
    const to = `group:${fine ? 'marked' : card.group}`;
    this._render();
    this._restoreFocus(this.shadowRoot.querySelector(`[data-focus="${from}"]`) ? from : to);
    this._emit('surea11y-mark', { keys, fine });
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /* ---------- focus ---------- */

  _focusedId() {
    const active = this.shadowRoot.activeElement;
    return active ? active.dataset.focus || '__list' : null;
  }

  _restoreFocus(id) {
    if (!id) return;
    const target = this.shadowRoot.querySelector(`[data-focus="${cssEscape(id)}"]`);
    if (target) {
      target.focus();
      return;
    }
    // The control is gone (the finding was fixed): keep focus in the panel.
    const fallback = this.shadowRoot.querySelector('[data-focus^="group:"], [data-focus^="tile:"]') || this._list;
    if (fallback === this._list) this._list.setAttribute('tabindex', '-1');
    fallback.focus();
  }
}

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A short, stable id for a card key, safe in a selector. */
function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, '\\$&');
}

/** Defines <surea11y-results> once. */
export function defineResultsElement(registry = globalThis.customElements) {
  if (registry && !registry.get('surea11y-results')) registry.define('surea11y-results', ResultsElement);
}
