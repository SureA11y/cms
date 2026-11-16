// What people answered about findings ("it's fine", "it's a problem", "not
// sure"), kept in the project for everyone who edits the document, and the
// findings each person hid for themselves, kept in their own browser.
//
// Answers live in one document per checked document, with the id
// `surea11y.review.<document id>`. An id with a dot is not readable without
// a token, even in a public dataset, so answers never reach the website;
// and it has no schema type, so it stays out of the Studio's lists.

import { publishedId } from './paths.js';

export const REVIEW_TYPE = 'surea11y.review';

export function reviewDocumentId(documentId) {
  return `surea11y.review.${publishedId(documentId)}`;
}

/** A short, stable key for a finding key: Sanity's array keys must be plain. */
export function entryKey(findingKey) {
  let h = 0x811c9dc5;
  const s = String(findingKey);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `r${h.toString(36)}${s.length.toString(36)}`;
}

/** Answers as the panel takes them: finding key → { by, when, note, answer }. */
export function reviewsFrom(doc, locale = 'en') {
  const out = {};
  for (const entry of (doc && Array.isArray(doc.answers) && doc.answers) || []) {
    if (!entry || typeof entry.key !== 'string') continue;
    let when;
    try {
      when = entry.when ? new Date(entry.when).toLocaleDateString(locale) : '';
    } catch {
      when = '';
    }
    out[entry.key] = {
      by: typeof entry.by === 'string' ? entry.by : '',
      when,
      note: typeof entry.note === 'string' ? entry.note : '',
      answer: ['pass', 'fail', 'unsure'].includes(entry.answer) ? entry.answer : 'pass'
    };
  }
  return out;
}

/**
 * Keeps `checker.reviews` up to date with the review document. Returns a
 * function that stops listening.
 */
export function connectReviews(checker, client, locale = 'en') {
  const id = reviewDocumentId(checker.id);
  let stopped = false;
  const apply = (doc) => {
    if (stopped) return;
    checker.reviews = reviewsFrom(doc, locale);
    checker.notify();
  };
  client
    .getDocument(id)
    .then(apply)
    .catch(() => {});
  const subscription = client
    .listen('*[_id == $id]', { id }, { includeResult: true, visibility: 'query' })
    .subscribe({
      next: (event) => {
        if (event.type === 'mutation') apply(event.result || null);
      },
      error: () => {}
    });
  return () => {
    stopped = true;
    subscription.unsubscribe();
  };
}

/** Saves one answer for these finding keys, replacing any earlier one. */
export function saveAnswer(client, documentId, keys, { answer, note = '', by = '', byId = '' }) {
  const id = reviewDocumentId(documentId);
  const when = new Date().toISOString();
  const entries = keys.map((key) => ({
    _key: entryKey(key),
    key,
    answer,
    note: String(note || '').slice(0, 500),
    by,
    byId,
    when
  }));
  let patch = client.patch(id).setIfMissing({ answers: [] });
  patch = patch.unset(entries.map((e) => `answers[_key=="${e._key}"]`));
  patch = patch.insert('after', 'answers[-1]', entries);
  return client
    .transaction()
    .createIfNotExists({
      _id: id,
      _type: REVIEW_TYPE,
      document: publishedId(documentId),
      answers: []
    })
    .patch(patch)
    .commit({ visibility: 'async' });
}

/** Takes back the answers for these finding keys. */
export function removeAnswers(client, documentId, keys) {
  const id = reviewDocumentId(documentId);
  return client
    .patch(id)
    .unset(keys.map((key) => `answers[_key=="${entryKey(key)}"]`))
    .commit({ visibility: 'async' })
    .catch(() => {});
}

const hiddenKey = (projectId, dataset, userId) =>
  `surea11y:hidden:${projectId}:${dataset}:${userId || 'anyone'}`;

/** The finding keys this person hid in this document, from their browser. */
export function loadHidden(projectId, dataset, userId, documentId) {
  try {
    const all = JSON.parse(localStorage.getItem(hiddenKey(projectId, dataset, userId)) || '{}');
    const list = all[publishedId(documentId)];
    return Array.isArray(list) ? list.filter((k) => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function saveHidden(projectId, dataset, userId, documentId, keys) {
  try {
    const key = hiddenKey(projectId, dataset, userId);
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    if (keys.length) all[publishedId(documentId)] = [...keys];
    else delete all[publishedId(documentId)];
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    // Private browsing or storage turned off: hidden for this visit only.
  }
}
