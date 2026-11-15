// Findings as the list shows them: one card per thing to fix or answer,
// with every place it occurs. The same message on two tables is one card
// with "2 places", not two cards an editor reads twice.

import { GROUP_ORDER } from './findings.js';

/** What makes two findings the same card: group, rule, reason and message. */
export function cardKey(f) {
  return [f.group, f.ruleId, f.reasonCode || '', f.summary || f.title || ''].join('|');
}

/**
 * Merges findings into cards, keeping the findings' order (groups first,
 * then the content's order). `marked` holds the finding keys the person has
 * marked as fine: a card is marked when all its places are.
 *
 * Each card: { key, group, ruleId, summary, hint, itemLabel, places, marked,
 * inContent }. `places` are the findings, in order; `inContent` is false when
 * none of them sits in a content item (a template or theme problem).
 */
export function toCards(findings, marked = []) {
  const markedSet = marked instanceof Set ? marked : new Set(marked);
  const byKey = new Map();
  for (const f of findings || []) {
    const key = cardKey(f);
    let card = byKey.get(key);
    if (!card) {
      card = {
        key,
        group: f.group,
        ruleId: f.ruleId,
        summary: f.summary || f.title || f.ruleId,
        hint: f.hint || '',
        itemLabel: f.itemLabel || '',
        places: []
      };
      byKey.set(key, card);
    }
    card.places.push(f);
  }
  const cards = [...byKey.values()];
  for (const card of cards) {
    card.marked = card.places.every((p) => markedSet.has(p.key));
    card.inContent = card.places.some((p) => p.itemId);
    const labels = new Set(card.places.map((p) => p.itemLabel).filter(Boolean));
    card.itemLabel = labels.size === 1 ? [...labels][0] : '';
  }
  return cards.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
}

/** How many places each group holds, leaving out marked cards. */
export function countPlaces(cards) {
  const counts = Object.fromEntries(GROUP_ORDER.map((g) => [g, 0]));
  for (const c of cards) if (!c.marked) counts[c.group] += c.places.length;
  return counts;
}
