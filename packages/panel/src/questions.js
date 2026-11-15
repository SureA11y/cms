// How to check an undecided finding by hand: core's steps for its rule and
// reason code, with what it looks like when it passes and when it fails.
// They come from core's review dictionaries, which are large, so they are
// loaded only when someone first asks (opens "Check it"), as scripts that
// fill window.SureA11yReview.

import { loadScripts } from './page.js';

/**
 * A `questionFor` for <surea11y-results>: (card) => Promise of
 * { steps, passWhen, failWhen } or null. `urls` are the review scripts, the
 * English one (which brings the helper) first; `locale` is the language the
 * steps are wanted in, English where it has none.
 */
export function createQuestionLoader(doc, { urls = [], locale = 'en' } = {}) {
  let ready = null;
  const win = doc.defaultView;
  const locales = [String(locale || 'en').toLowerCase(), 'en'];
  return function questionFor(card) {
    const place =
      (card && card.places && card.places.find((p) => p.reviewPrefix && p.reasonCode)) || null;
    if (!place) return Promise.resolve(null);
    if (!ready) {
      ready = loadScripts(
        doc,
        urls,
        () => !!(win.SureA11yReview && win.SureA11yReview.howToCheckFrom)
      ).catch((error) => {
        ready = null; // try again next time
        throw error;
      });
    }
    return ready.then(() => {
      const review = win.SureA11yReview;
      const found = review.howToCheckFrom(
        review.dictionaries,
        place.reviewPrefix,
        place.reasonCode,
        locales,
        {
          values: place.values || {}
        }
      );
      return found && found.steps && found.steps.length ? found : null;
    });
  };
}
