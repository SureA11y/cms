// Markers beside the content: a small round button next to each content item
// with a finding, in the group's colour and icon. Clicking one shows that
// finding in the list.
//
// They are a shortcut for pointer users, not the only way in: everything a
// marker does, the list and its arrows do from the keyboard. So markers
// stay out of the tab order and out of the accessibility tree, and add no
// stops to the editor's own keyboard navigation.
//
// The markers live in their own shadow root, positioned over the document
// that shows the content (the editor canvas), never inside the content: they
// change nothing the author saves.

import { tokenCss } from './tokens.js';
import { icon } from './icons.js';

const SIZE = 26;
const GAP = 4;
const MAX_PER_ITEM = 3;

const STYLE = `
${tokenCss()}
:host { all: initial; }
.marker {
  position: absolute; width: ${SIZE}px; height: ${SIZE}px; padding: 0; margin: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--sa11y-radius-round); border: 2px solid var(--sa11y-surface);
  color: var(--sa11y-on-accent); cursor: pointer; font: 600 11px/1 system-ui, sans-serif;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .2), 0 1px 3px rgba(0, 0, 0, .2);
}
.marker[data-group="problem"] { background: var(--sa11y-problem); }
.marker[data-group="likely"] { background: var(--sa11y-likely); }
.marker[data-group="review"] { background: var(--sa11y-review); }
.marker[data-group="probably-fine"] { background: var(--sa11y-fine); }
.marker[data-group="more"] { background: var(--sa11y-marked); }
.marker[data-current="true"] { border-color: var(--sa11y-text); box-shadow: 0 0 0 2px var(--sa11y-surface), 0 0 0 4px var(--sa11y-text); }
.marker:hover { transform: scale(1.1); }
.outline { position: absolute; pointer-events: none; border: 2px solid var(--sa11y-focus); border-radius: var(--sa11y-radius-small); box-shadow: 0 0 0 2px var(--sa11y-surface); }
@media (forced-colors: active) { .outline { border-color: Highlight; } }
@media (prefers-reduced-motion: reduce) { .marker:hover { transform: none; } }
@media (forced-colors: active) { .marker { border-color: ButtonText; background: ButtonFace; color: ButtonText; forced-color-adjust: none; } }
`;

/**
 * Creates the markers in `doc`.
 * - anchorFor(itemId): the element that shows a content item, or null.
 * - onPick(cardKey, place): a marker was clicked.
 * - label(card): the marker's tooltip.
 * - outline: also draw a frame around the place last shown (where the host
 *   has no selection of its own to show it, such as a published page).
 * - zIndex: the layer's stacking order.
 * - reserveEnd(): the width, in px, kept clear at the window's end edge (where
 *   a panel of the host's covers the page).
 * Returns { update(cards, current), position(), destroy(), doc }.
 */
export function createMarkers(
  doc,
  {
    anchorFor,
    onPick,
    label = (card) => card.summary,
    outline = false,
    zIndex = 30,
    reserveEnd = () => 0
  }
) {
  const host = doc.createElement('div');
  host.setAttribute('data-surea11y-markers', '');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:absolute;top:0;left:0;width:0;height:0;z-index:${zIndex};`;
  const root = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = STYLE;
  const layer = doc.createElement('div');
  root.append(style, layer);
  doc.body.append(host);

  let placed = []; // { button, itemId, slot }
  let frameBox = null; // { box, itemId } around the place last shown
  let frame = 0;
  const win = doc.defaultView;

  // All the reads first, then all the writes: reading a position after
  // moving a marker would make the browser lay the page out again for each
  // marker (with 600 blocks, close to a second of frozen editor).
  function position() {
    frame = 0;
    const width = doc.documentElement.clientWidth - reserveEnd();
    const frameAnchor = frameBox ? anchorFor(frameBox.itemId) : null;
    const frameRect = frameAnchor ? frameAnchor.getBoundingClientRect() : null;
    const rects = placed.map((m) => {
      const anchor = anchorFor(m.itemId);
      return anchor && anchor.isConnected ? anchor.getBoundingClientRect() : null;
    });
    const sx = win.scrollX;
    const sy = win.scrollY;
    if (frameBox) {
      frameBox.box.hidden = !frameRect;
      if (frameRect) {
        Object.assign(frameBox.box.style, {
          left: `${frameRect.left + sx - 4}px`,
          top: `${frameRect.top + sy - 4}px`,
          width: `${frameRect.width + 8}px`,
          height: `${frameRect.height + 8}px`
        });
      }
    }
    placed.forEach((m, i) => {
      const r = rects[i];
      if (!r) {
        m.button.hidden = true;
        return;
      }
      // Beside the item's end edge, or just inside it when there is no room.
      const outside = r.right + 12;
      const left =
        outside + SIZE <= width ? outside : Math.max(0, Math.min(r.right, width) - SIZE - 4);
      m.button.hidden = false;
      m.button.style.left = `${left + sx}px`;
      m.button.style.top = `${r.top + sy + m.slot * (SIZE + GAP)}px`;
    });
  }
  function schedule() {
    if (!frame) frame = win.requestAnimationFrame(position);
  }

  const resize = win.ResizeObserver ? new win.ResizeObserver(schedule) : null;
  if (resize) resize.observe(doc.body);
  win.addEventListener('resize', schedule);

  function makeButton(group, text, title, pick, current) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'marker';

    b.tabIndex = -1;
    b.dataset.group = group;
    b.title = title;
    if (current) b.dataset.current = 'true';
    if (text) b.textContent = text;
    else b.append(icon(doc, `mark-${group}`, 16, 2.6));
    // Keep the editor from taking the click as a click on its canvas.
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pick();
    });
    return b;
  }

  /**
   * Draws one marker per place of each card still open. The same cards and
   * place as last time only move the markers; nothing is drawn again.
   */
  let drawn = null;
  function update(cards, current) {
    const now = { cards, cardKey: current && current.cardKey, place: current && current.place };
    if (
      drawn &&
      drawn.cards === now.cards &&
      drawn.cardKey === now.cardKey &&
      drawn.place === now.place
    ) {
      schedule();
      return;
    }
    drawn = now;
    layer.textContent = '';
    placed = [];
    frameBox = null;
    if (outline && current) {
      const card = (cards || []).find((c) => c.key === current.cardKey);
      const place = card && card.places[current.place];
      if (place && place.itemId) {
        const box = doc.createElement('div');
        box.className = 'outline';
        layer.append(box);
        frameBox = { box, itemId: place.itemId };
      }
    }
    const perItem = new Map();
    for (const card of cards || []) {
      if (card.settled || card.marked) continue;
      card.places.forEach((p, place) => {
        if (!p.itemId) return;
        if (!perItem.has(p.itemId)) perItem.set(p.itemId, []);
        perItem.get(p.itemId).push({ card, place });
      });
    }
    for (const [itemId, list] of perItem) {
      const shown = list.length > MAX_PER_ITEM ? list.slice(0, MAX_PER_ITEM - 1) : list;
      shown.forEach(({ card, place }, slot) => {
        const isCurrent = !!current && current.cardKey === card.key && current.place === place;
        const button = makeButton(
          card.group,
          '',
          label(card),
          () => onPick(card.key, place),
          isCurrent
        );
        layer.append(button);
        placed.push({ button, itemId, slot });
      });
      if (shown.length < list.length) {
        const rest = list.slice(shown.length);
        const first = rest[0];
        const button = makeButton(
          'more',
          `+${rest.length}`,
          rest.map((r) => label(r.card)).join('\n'),
          () => onPick(first.card.key, first.place),
          false
        );
        layer.append(button);
        placed.push({ button, itemId, slot: shown.length });
      }
    }
    // Placed at once, in one pass of reads then writes.
    position();
  }

  function destroy() {
    if (frame) win.cancelAnimationFrame(frame);
    if (resize) resize.disconnect();
    win.removeEventListener('resize', schedule);
    host.remove();
  }

  return { update, position: schedule, destroy, doc, host };
}
