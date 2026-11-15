// The panel's own words: headings, buttons and status messages.

export const UI = {
  en: {
    heading: 'Accessibility',
    checking: 'Checking…',
    checkingDone: 'Checked.',
    error: 'The check could not run: {{message}}',
    nothingFound: 'Nothing to fix or review in this content.',
    summary: '{{problem}} to fix, {{likely}} likely, {{review}} to review, {{probably}} probably fine.',
    groups: {
      problem: 'To fix',
      likely: 'Likely problems: confirm',
      review: 'Needs a person',
      'probably-fine': 'Probably fine: confirm'
    },
    groupHelp: {
      problem: 'These fail an accessibility requirement.',
      likely: "The checker can't be sure, but the evidence points to a problem.",
      review: 'Only a person can tell whether these are right.',
      'probably-fine': 'The evidence points to these being fine. A quick look confirms it.'
    },
    show: 'Show',
    showLabel: 'Show in the content: {{summary}}',
    next: 'Next finding',
    howToFix: 'How to fix',
    outsideContent: 'Not in the content: the template or theme.'
  },
  es: {
    heading: 'Accesibilidad',
    checking: 'Comprobando…',
    checkingDone: 'Comprobado.',
    error: 'No se pudo hacer la comprobación: {{message}}',
    nothingFound: 'No hay nada que corregir ni revisar en este contenido.',
    summary: '{{problem}} por corregir, {{likely}} probables, {{review}} por revisar, {{probably}} probablemente bien.',
    groups: {
      problem: 'Por corregir',
      likely: 'Problemas probables: confirmar',
      review: 'Necesita una persona',
      'probably-fine': 'Probablemente bien: confirmar'
    },
    groupHelp: {
      problem: 'No cumplen un requisito de accesibilidad.',
      likely: 'El comprobador no puede estar seguro, pero los indicios apuntan a un problema.',
      review: 'Solo una persona puede saber si están bien.',
      'probably-fine': 'Los indicios apuntan a que están bien. Basta un vistazo para confirmarlo.'
    },
    show: 'Mostrar',
    showLabel: 'Mostrar en el contenido: {{summary}}',
    next: 'Siguiente hallazgo',
    howToFix: 'Cómo corregirlo',
    outsideContent: 'Fuera del contenido: en la plantilla o el tema.'
  }
};

/** The panel's words in `locale`, falling back to English. */
export function uiStrings(locale) {
  const primary = String(locale || 'en').toLowerCase().split(/[-_]/)[0];
  return UI[primary] || UI.en;
}

/** Fills {{name}} placeholders. */
export function fill(text, params = {}) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in params ? String(params[k]) : m));
}
