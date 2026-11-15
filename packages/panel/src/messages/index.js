// Plain-language wording for the findings editors meet most, by core's
// message keys, passed to a scan as `engineOptions.messages`. They name what
// an author sees and edits ("alternative text", "heading") rather than HTML.
// Keys not listed here keep core's own wording.

import en from './en.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };

export const MESSAGES = { en, es };

/** `engineOptions.messages` for a scan in `locale`. */
export function messagesFor(locale) {
  const primary = String(locale || 'en').toLowerCase().split(/[-_]/)[0];
  const out = { en: MESSAGES.en };
  if (primary !== 'en' && MESSAGES[primary]) out[primary] = MESSAGES[primary];
  return out;
}
