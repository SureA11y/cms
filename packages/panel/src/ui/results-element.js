// <surea11y-results>: the list of findings, grouped, with a "Show" button on
// each that asks the host to bring the content item into view.
//
// Accessibility: real headings and lists; one polite live region that
// announces the outcome of each check, not every change; "Show" buttons whose
// accessible name starts with their visible label (WCAG 2.5.3), described by
// the finding; visible focus; 24px targets; nothing told by colour alone.
// Text from the content (alt text, link text) is set as text, never as HTML.

import { GROUP_ORDER, countByGroup } from '../findings.js';
import { uiStrings, fill } from '../messages/ui.js';

const STYLE = `
:host { display: block; font: inherit; color: inherit; }
.status, .busy { margin: 0 0 12px; }
.busy[hidden] { display: none; }
.next { margin: 0 0 16px; }
section { margin: 0 0 20px; }
h2, h3, h4 { font-size: 1em; margin: 0 0 4px; }
.help { margin: 0 0 8px; font-size: 0.92em; }
ul { list-style: none; margin: 0; padding: 0; }
li { border-inline-start: 4px solid; padding: 8px 0 8px 10px; margin: 0 0 8px; }
li[data-group="problem"] { border-inline-start-style: solid; }
li[data-group="likely"] { border-inline-start-style: double; }
li[data-group="review"], li[data-group="probably-fine"] { border-inline-start-style: dotted; }
.summary { margin: 0 0 4px; font-weight: 600; }
.hint { margin: 0 0 6px; }
.where { margin: 0 0 6px; font-style: italic; }
button {
  font: inherit; min-height: 24px; min-width: 24px; padding: 2px 10px;
  border: 1px solid currentColor; border-radius: 3px; background: transparent; color: inherit; cursor: pointer;
}
button:focus-visible { outline: 2px solid; outline-offset: 2px; }
@media (forced-colors: active) { li { border-inline-start-color: CanvasText; } }
`;

let counter = 0;

export class ResultsElement extends HTMLElement {
  constructor() {
    super();
    this._id = `surea11y-${++counter}`;
    this._findings = [];
    this._state = 'idle';
    this._error = '';
    this._locale = 'en';
    this._cursor = -1;
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    // The live region says only how a check ended; "Checking…" is shown
    // apart from it, so a pause in typing isn't announced.
    this._status = document.createElement('p');
    this._status.className = 'status';
    this._status.setAttribute('role', 'status');
    this._busy = document.createElement('p');
    this._busy.className = 'busy';
    this._busy.hidden = true;
    this._body = document.createElement('div');
    root.append(style, this._busy, this._status, this._body);
  }

  /** The locale of the panel's own words. */
  set locale(value) {
    this._locale = value || 'en';
    this._render();
  }
  get locale() {
    return this._locale;
  }

  /** 'idle', 'scanning', 'done' or 'error'. */
  set state(value) {
    this._state = value;
    this._renderStatus();
  }
  get state() {
    return this._state;
  }

  set error(message) {
    this._error = message || '';
    this._state = 'error';
    this._renderStatus();
  }

  /** The findings to show, as `toFindings` makes them. */
  set findings(list) {
    this._findings = Array.isArray(list) ? list : [];
    this._cursor = -1;
    this._state = 'done';
    this._render();
  }
  get findings() {
    return this._findings;
  }

  get _headingLevel() {
    const n = Number(this.getAttribute('heading-level'));
    return n >= 2 && n <= 5 ? n : 3;
  }

  _renderStatus() {
    const t = uiStrings(this._locale);
    this._busy.textContent = t.checking;
    this._busy.hidden = this._state !== 'scanning';
    this._body.setAttribute('aria-busy', String(this._state === 'scanning'));
    if (this._state === 'scanning') return; // the last outcome stays
    if (this._state === 'error') {
      this._status.textContent = fill(t.error, { message: this._error });
      return;
    }
    if (this._state !== 'done') {
      this._status.textContent = '';
      return;
    }
    const counts = countByGroup(this._findings);
    this._status.textContent = this._findings.length
      ? fill(t.summary, {
          problem: counts.problem,
          likely: counts.likely,
          review: counts.review,
          probably: counts['probably-fine']
        })
      : t.nothingFound;
  }

  _render() {
    const t = uiStrings(this._locale);
    // A rescan rebuilds the list: whoever was on a button stays on the same
    // finding's button, or on the list if that finding is gone.
    const active = this.shadowRoot.activeElement;
    const activeKey = active && active.closest('li') ? active.closest('li').dataset.key : null;
    const hadFocus = !!active;
    this._renderStatus();
    this._body.textContent = '';
    if (!this._findings.length) {
      if (hadFocus) this._focusBody();
      return;
    }

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'next';
    next.textContent = t.next;
    next.addEventListener('click', () => this.showNext());
    this._body.append(next);

    const tag = `h${this._headingLevel}`;
    for (const group of GROUP_ORDER) {
      const items = this._findings.filter((f) => f.group === group);
      if (!items.length) continue;
      const section = document.createElement('section');
      const headingId = `${this._id}-${group}`;
      section.setAttribute('aria-labelledby', headingId);
      const h = document.createElement(tag);
      h.id = headingId;
      h.textContent = `${t.groups[group]} (${items.length})`;
      const help = document.createElement('p');
      help.className = 'help';
      help.textContent = t.groupHelp[group];
      const ul = document.createElement('ul');
      for (const f of items) ul.append(this._renderFinding(f, t));
      section.append(h, help, ul);
      this._body.append(section);
    }
    if (hadFocus) {
      const same = activeKey
        ? [...this.shadowRoot.querySelectorAll('li')].find((li) => li.dataset.key === activeKey)
        : null;
      const target = same && same.querySelector('button');
      if (target) target.focus();
      else this._focusBody();
    }
  }

  _focusBody() {
    this._body.setAttribute('tabindex', '-1');
    this._body.focus();
  }

  _renderFinding(f, t) {
    const index = this._findings.indexOf(f);
    const li = document.createElement('li');
    li.dataset.group = f.group;
    li.dataset.key = f.key;
    li.dataset.index = String(index);
    const summaryId = `${this._id}-f${index}`;
    const summary = document.createElement('p');
    summary.className = 'summary';
    summary.id = summaryId;
    summary.textContent = f.summary || f.title || f.ruleId;
    li.append(summary);
    if (f.hint) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = `${t.howToFix}: ${f.hint}`;
      li.append(hint);
    }
    if (f.itemId) {
      const show = document.createElement('button');
      show.type = 'button';
      show.className = 'show';
      show.textContent = t.show;
      show.setAttribute('aria-describedby', summaryId);
      show.addEventListener('click', () => this._show(index));
      li.append(show);
    } else {
      const where = document.createElement('p');
      where.className = 'where';
      where.textContent = t.outsideContent;
      li.append(where);
    }
    return li;
  }

  _show(index) {
    const f = this._findings[index];
    if (!f) return;
    this._cursor = index;
    this.dispatchEvent(
      new CustomEvent('surea11y-show', { detail: { itemId: f.itemId, finding: f }, bubbles: true, composed: true })
    );
  }

  /**
   * Shows the next finding that sits in the content, after the last one
   * shown, and moves focus to its "Show" button.
   */
  showNext() {
    const n = this._findings.length;
    for (let step = 1; step <= n; step++) {
      const i = (this._cursor + step + n) % n;
      if (!this._findings[i].itemId) continue;
      this._show(i);
      const button = this.shadowRoot.querySelector(`li[data-index="${i}"] .show`);
      if (button) button.focus();
      return true;
    }
    return false;
  }
}

/** Defines <surea11y-results> once. */
export function defineResultsElement(registry = globalThis.customElements) {
  if (registry && !registry.get('surea11y-results')) registry.define('surea11y-results', ResultsElement);
}
