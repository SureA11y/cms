// Loads every language into the panel, as the locale scripts do in a page.
import { addLocale } from '../src/locales.js';
import es from '../src/messages/locale.es.js';
import de from '../src/messages/locale.de.js';
import fr from '../src/messages/locale.fr.js';
import ja from '../src/messages/locale.ja.js';

for (const [locale, data] of Object.entries({ es, de, fr, ja })) addLocale(locale, data);
