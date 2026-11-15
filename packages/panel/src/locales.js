// The languages besides English, each a file of its own (the plain messages
// and the panel's words), so a page loads only the one it speaks. A build
// makes each into a small script that calls addLocale on the panel.
// German, French and Japanese are not yet reviewed by native speakers.

import { MESSAGES } from './messages/index.js';
import { UI } from './messages/ui.js';

export const LOCALES = ['es', 'de', 'fr', 'ja'];

/** Adds a language: { messages, ui }. */
export function addLocale(locale, { messages, ui } = {}) {
  if (messages) MESSAGES[locale] = messages;
  if (ui) UI[locale] = ui;
}
