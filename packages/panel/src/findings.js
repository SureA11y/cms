// What a scan found, as the panel shows it: one finding per occurrence, tied
// to the content item (a block, a field) it sits in, and sorted into the
// groups core's own report uses.

/** Attribute the sandbox puts on the wrapper of each content item. */
export const ITEM_ATTRIBUTE = 'data-surea11y-item';

/**
 * The group a finding belongs to, as core's HTML report groups them:
 * - `problem`: the rule failed.
 * - `likely`: undecided, and the page's evidence leans toward a failure.
 * - `probably-fine`: undecided, leaning toward a pass.
 * - `review`: undecided, with no lean: a person has to look.
 */
export function groupOf(outcome, lean) {
  if (outcome === 'fail') return 'problem';
  const toward = lean && lean.toward;
  if (toward === 'fail') return 'likely';
  if (toward === 'pass') return 'probably-fine';
  return 'review';
}

/** The order groups are shown in. */
export const GROUP_ORDER = ['problem', 'likely', 'review', 'probably-fine'];

/**
 * A finding's identity, the one core keeps across scans (rule, reason code
 * and the element's HTML): a review recorded against it still applies after
 * the author edits something else.
 */
export function findingKey(ruleId, reasonCode, html) {
  return `${ruleId}|${reasonCode || ''}|${html || ''}`;
}

/**
 * Turns a scan result into findings. `doc` is the document that was scanned,
 * read to tie each occurrence to the content item that holds it.
 * Occurrences outside every item (a page-level check) get `itemId: null`.
 */
export function toFindings(result, doc) {
  const findings = [];
  if (!result || !Array.isArray(result.checksResults)) return findings;
  for (const check of result.checksResults) {
    if (check.outcome !== 'fail' && check.outcome !== 'cantTell') continue;
    if (check.ruleId === 'manual-review') continue; // a reminder, not a finding
    for (const occ of check.occurrences || []) {
      const outcome = occ.occurrenceOutcome || check.outcome;
      if (outcome !== 'fail' && outcome !== 'cantTell') continue;
      const details = (occ.data && occ.data.details) || {};
      const html = withoutItemAttribute(occ.html);
      findings.push({
        key: findingKey(check.ruleId, details.reasonCode, html),
        ruleId: check.ruleId,
        title: check.title,
        outcome,
        group: groupOf(outcome, occ.lean),
        severity: check.severity,
        reasonCode: details.reasonCode || null,
        summary: occ.summary || '',
        hint: occ.hint || '',
        lean: occ.lean || null,
        howToCheck: occ.howToCheck || null,
        selector: occ.selector || null,
        html,
        itemId: itemOf(doc, occ.selector)
      });
    }
  }
  return sortFindings(findings);
}

/**
 * The element's HTML without the attribute the sandbox adds to tie it to its
 * item: item ids change between sessions (a block editor makes new ones on
 * every load), and a finding's identity must not, or a review recorded
 * against it would be lost on the next load.
 */
const ITEM_ATTRIBUTE_RE = new RegExp(`\\s${ITEM_ATTRIBUTE}="[^"]*"`, 'g');
export function withoutItemAttribute(html) {
  return String(html || '').replace(ITEM_ATTRIBUTE_RE, '');
}

function itemOf(doc, selector) {
  if (!doc || !selector) return null;
  let el = null;
  try {
    el = doc.querySelector(selector);
  } catch {
    return null;
  }
  const item = el && el.closest ? el.closest(`[${ITEM_ATTRIBUTE}]`) : null;
  return item ? item.getAttribute(ITEM_ATTRIBUTE) : null;
}

/** Groups first, in GROUP_ORDER; within a group, in the content's order. */
export function sortFindings(findings, itemOrder) {
  const order = itemOrder ? new Map(itemOrder.map((id, i) => [id, i])) : null;
  return findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      const g = GROUP_ORDER.indexOf(a.f.group) - GROUP_ORDER.indexOf(b.f.group);
      if (g) return g;
      if (order) {
        const pa = order.has(a.f.itemId) ? order.get(a.f.itemId) : Infinity;
        const pb = order.has(b.f.itemId) ? order.get(b.f.itemId) : Infinity;
        if (pa !== pb) return pa - pb;
      }
      return a.i - b.i;
    })
    .map((x) => x.f);
}

/** How many findings each group holds. */
export function countByGroup(findings) {
  const counts = Object.fromEntries(GROUP_ORDER.map((g) => [g, 0]));
  for (const f of findings) counts[f.group] += 1;
  return counts;
}
