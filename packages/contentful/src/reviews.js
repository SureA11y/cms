// What people answered about findings ("it's fine", "it's a problem", "not
// sure"), kept in the space for everyone who edits the entry, and the
// findings each person hid for themselves, kept in their own browser.
//
// Answers live in one entry of the app's own content type per checked
// entry. It is never published, so the Content Delivery API, and with it
// the website, never sees it.

export const REVIEW_TYPE = 'surea11yReview';
const LOCALE_KEY = (locale) => locale || 'en-US';

/** The review entry's id: Contentful's ids are at most 64 characters. */
export function reviewEntryId(entryId) {
  return `sa11y-${entryId}`.slice(0, 64);
}

/** The app's content type, created when the app is installed. */
export const REVIEW_CONTENT_TYPE = {
  name: 'Accessibility answers',
  description:
    'Kept by SureA11y: what people answered about accessibility findings. Never published.',
  displayField: 'entryId',
  fields: [
    { id: 'entryId', name: 'Entry', type: 'Symbol', required: true },
    { id: 'answers', name: 'Answers', type: 'Object' }
  ]
};

/** Creates the content type if it isn't there (the app's configuration screen does this). */
export async function ensureReviewType(cma) {
  try {
    await cma.contentType.get({ contentTypeId: REVIEW_TYPE });
    return false;
  } catch {
    const created = await cma.contentType.createWithId(
      { contentTypeId: REVIEW_TYPE },
      REVIEW_CONTENT_TYPE
    );
    await cma.contentType.publish({ contentTypeId: REVIEW_TYPE }, created);
    return true;
  }
}

/** Answers as the panel takes them: finding key → { by, when, note, answer }. */
export function answersFrom(stored, locale = 'en') {
  const out = {};
  for (const [key, a] of Object.entries(stored || {})) {
    if (!a || typeof a !== 'object') continue;
    let when;
    try {
      when = a.when ? new Date(a.when).toLocaleDateString(locale) : '';
    } catch {
      when = '';
    }
    out[key] = {
      by: typeof a.by === 'string' ? a.by : '',
      when,
      note: typeof a.note === 'string' ? a.note : '',
      answer: ['pass', 'fail', 'unsure'].includes(a.answer) ? a.answer : 'pass'
    };
  }
  return out;
}

async function getReview(cma, entryId) {
  try {
    return await cma.entry.get({ entryId: reviewEntryId(entryId) });
  } catch {
    return null;
  }
}

/** `locale`: the space's content locale; `display`: the language dates are shown in. */
export async function loadAnswers(cma, entryId, locale, display = 'en') {
  const entry = await getReview(cma, entryId);
  const fields = (entry && entry.fields) || {};
  return answersFrom(fields.answers && fields.answers[LOCALE_KEY(locale)], display);
}

async function writeAnswers(cma, entryId, change, locale) {
  const loc = LOCALE_KEY(locale);
  const entry = await getReview(cma, entryId);
  const answers = { ...((entry && entry.fields.answers && entry.fields.answers[loc]) || {}) };
  change(answers);
  const fields = { entryId: { [loc]: entryId }, answers: { [loc]: answers } };
  if (entry) return cma.entry.update({ entryId: entry.sys.id }, { ...entry, fields });
  return cma.entry.createWithId(
    { contentTypeId: REVIEW_TYPE, entryId: reviewEntryId(entryId) },
    { fields }
  );
}

export function saveAnswer(cma, entryId, keys, { answer, note = '', by = '', byId = '' }, locale) {
  const when = new Date().toISOString();
  return writeAnswers(
    cma,
    entryId,
    (answers) => {
      for (const key of keys)
        answers[key] = { answer, note: String(note || '').slice(0, 500), by, byId, when };
    },
    locale
  );
}

export function removeAnswers(cma, entryId, keys, locale) {
  return writeAnswers(
    cma,
    entryId,
    (answers) => {
      for (const key of keys) delete answers[key];
    },
    locale
  );
}

const hiddenKey = (space, userId) => `surea11y:hidden:${space}:${userId || 'anyone'}`;

export function loadHidden(space, userId, entryId) {
  try {
    const all = JSON.parse(localStorage.getItem(hiddenKey(space, userId)) || '{}');
    return Array.isArray(all[entryId]) ? all[entryId].filter((k) => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function saveHidden(space, userId, entryId, keys) {
  try {
    const key = hiddenKey(space, userId);
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    if (keys.length) all[entryId] = [...keys];
    else delete all[entryId];
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    // Storage turned off: hidden for this visit only.
  }
}
