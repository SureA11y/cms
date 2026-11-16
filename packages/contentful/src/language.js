// The app in the person's language: the one Contentful's web app is set to,
// else the browser's, else English. The panel's words, the engine's
// messages and the "how to check" steps are loaded for it the first time.

import { addLocale, createQuestionLoader } from '@surea11y/panel';

export { LOCALES, pickLocale } from './language-pick.js';

// Listed one by one, so a bundler can find each file.
const PANEL = {
  es: () => import('@surea11y/panel/src/messages/locale.es.js'),
  de: () => import('@surea11y/panel/src/messages/locale.de.js'),
  fr: () => import('@surea11y/panel/src/messages/locale.fr.js'),
  ja: () => import('@surea11y/panel/src/messages/locale.ja.js')
};
const ENGINE = {
  es: () => import('../dist/engine.i18n.es.js'),
  de: () => import('../dist/engine.i18n.de.js'),
  fr: () => import('../dist/engine.i18n.fr.js'),
  ja: () => import('../dist/engine.i18n.ja.js')
};
const REVIEWS = {
  en: () => import('../dist/review.en.js'),
  es: () => import('../dist/review.es.js'),
  de: () => import('../dist/review.de.js'),
  fr: () => import('../dist/review.fr.js'),
  ja: () => import('../dist/review.ja.js')
};

const blobUrl = (text) => URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));

/** The panel's words for a language; English if they can't be loaded. */
export async function loadPanelWords(locale) {
  if (!PANEL[locale]) return 'en';
  try {
    addLocale(locale, (await PANEL[locale]()).default);
    return locale;
  } catch {
    return 'en';
  }
}

/** The engine's messages for a language, as a script address for the sandbox. */
export async function engineLocaleUrls(locale) {
  if (!ENGINE[locale]) return {};
  try {
    return { [locale]: blobUrl((await ENGINE[locale]()).default) };
  } catch {
    return {};
  }
}

/** How to check a finding, in the language, loaded when first asked for. */
export function questionLoader(doc, locale) {
  let loader = null;
  const load = async () => {
    const files = [REVIEWS.en()];
    if (locale !== 'en' && REVIEWS[locale]) files.push(REVIEWS[locale]());
    const urls = (await Promise.all(files)).map((m) => blobUrl(m.default));
    return createQuestionLoader(doc, { urls, locale });
  };
  return (card) => {
    if (!loader) loader = load();
    return loader.then((ask) => ask(card));
  };
}

/** The app's own words: what only the Contentful app says. */
export const WORDS = {
  en: { editDescription: "Edit the image's description" },
  es: { editDescription: 'Editar la descripción de la imagen' },
  de: { editDescription: 'Beschreibung des Bildes bearbeiten' },
  fr: { editDescription: "Modifier la description de l'image" },
  ja: { editDescription: '画像の説明を編集' }
};
