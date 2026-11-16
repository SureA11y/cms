// Which language the app speaks: the first of the candidates the panel
// speaks (Contentful's web app language, then the browser's), else English.

export const LOCALES = ['en', 'es', 'de', 'fr', 'ja'];

/** 'es-ES' → 'es'; a language the panel doesn't speak → the next, or 'en'. */
export function pickLocale(...candidates) {
  for (const c of candidates) {
    const l = String(c || '')
      .toLowerCase()
      .split(/[-_]/)[0];
    if (LOCALES.includes(l)) return l;
  }
  return 'en';
}
