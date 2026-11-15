// The panel's own words: headings, buttons and status messages.

import { MORE } from './ui-more.js';

export const UI = {
  en: {
    heading: 'Accessibility',
    checking: 'Checking…',
    summary: '{{problem}} to fix, {{likely}} likely, {{review}} to review, {{probably}} probably fine.',
    groups: {
      problem: 'To fix',
      likely: 'Likely problems',
      review: 'Needs a person',
      'probably-fine': 'Probably fine',
      marked: 'Marked fine by you'
    },
    tiles: {
      problem: 'To fix',
      likely: 'Likely problems',
      review: 'Need a person',
      'probably-fine': 'Probably fine'
    },
    groupHelp: {
      problem: 'These fail an accessibility requirement.',
      likely: "The checker can't be sure, but the evidence points to a problem. Confirm each one.",
      review: 'Only a person can tell whether these are right.',
      'probably-fine': 'The evidence says these are fine. A quick look confirms it.',
      marked: 'Left out of the counts. Undo brings one back.'
    },
    showingOnly: 'Showing only:',
    showAll: 'Show all',
    previous: 'Previous finding',
    next: 'Next finding',
    position: '{{n}} of {{total}}',
    toLookAt: '{{total}} to look at',
    places: '{{n}} places',
    show: 'Show',
    showNextPlace: 'Show next place',
    shown: 'Shown in the content',
    shownPlace: 'Shown in the content, place {{n}} of {{total}}',
    howToFix: 'How to fix',
    markFine: 'Mark as fine',
    undo: 'Undo',
    outsideContent: 'Not in the content: the template or theme.',
    inTheme: 'In the theme or template, not in your content: whoever looks after the theme can fix it.',
    editInEditor: 'Edit in the editor',
    yourContent: 'Your content',
    themeOrTemplate: 'Theme or template',
    close: 'Close',
    panelLabel: 'Accessibility checker',
    prepublish: 'To fix: {{problem}}. Likely problems to confirm: {{likely}}. Need a person: {{review}}.',
    prepublishNothing: 'Nothing to fix or review.',
    prepublishReview: 'Review in the Accessibility panel',
    prepublishNote: "This doesn't stop you publishing.",
    toolbarCount: '{{n}} to fix or confirm',
    openAltText: 'Edit the alternative text',
    openTableHeaders: 'Open the header setting',
    emptyTitle: 'Nothing to check yet',
    empty: 'Add some content and it will be checked here as you write.',
    nothingTitle: 'Nothing to fix or review in this content.',
    nothing: 'The checks that can be automated found nothing. Some things only a person can judge, such as whether the text is clear.',
    errorTitle: "The check didn't finish.",
    error: "Try again. If it keeps happening, tell your site's administrator.",
    tryAgain: 'Try again',
    errorDetails: 'Details for your administrator',
    marker: '{{group}}: {{summary}}'
  },
  es: {
    heading: 'Accesibilidad',
    checking: 'Comprobando…',
    summary: '{{problem}} por corregir, {{likely}} probables, {{review}} por revisar, {{probably}} probablemente bien.',
    groups: {
      problem: 'Por corregir',
      likely: 'Problemas probables',
      review: 'Necesita una persona',
      'probably-fine': 'Probablemente bien',
      marked: 'Marcados como correctos por ti'
    },
    tiles: {
      problem: 'Por corregir',
      likely: 'Problemas probables',
      review: 'Necesitan una persona',
      'probably-fine': 'Probablemente bien'
    },
    groupHelp: {
      problem: 'No cumplen un requisito de accesibilidad.',
      likely: 'El comprobador no puede estar seguro, pero los indicios apuntan a un problema. Confirma cada uno.',
      review: 'Solo una persona puede saber si están bien.',
      'probably-fine': 'Los indicios apuntan a que están bien. Basta un vistazo para confirmarlo.',
      marked: 'No cuentan en los totales. «Deshacer» devuelve uno a la lista.'
    },
    showingOnly: 'Solo se muestra:',
    showAll: 'Mostrar todo',
    previous: 'Hallazgo anterior',
    next: 'Hallazgo siguiente',
    position: '{{n}} de {{total}}',
    toLookAt: '{{total}} por mirar',
    places: '{{n}} sitios',
    show: 'Mostrar',
    showNextPlace: 'Mostrar el siguiente sitio',
    shown: 'Mostrado en el contenido',
    shownPlace: 'Mostrado en el contenido, sitio {{n}} de {{total}}',
    howToFix: 'Cómo corregirlo',
    markFine: 'Marcar como correcto',
    undo: 'Deshacer',
    outsideContent: 'Fuera del contenido: en la plantilla o el tema.',
    inTheme: 'En el tema o la plantilla, no en tu contenido: puede corregirlo quien se ocupa del tema.',
    editInEditor: 'Editar en el editor',
    yourContent: 'Tu contenido',
    themeOrTemplate: 'Tema o plantilla',
    close: 'Cerrar',
    panelLabel: 'Comprobador de accesibilidad',
    prepublish: 'Por corregir: {{problem}}. Problemas probables por confirmar: {{likely}}. Necesitan una persona: {{review}}.',
    prepublishNothing: 'No hay nada que corregir ni revisar.',
    prepublishReview: 'Revisar en el panel de Accesibilidad',
    prepublishNote: 'Esto no te impide publicar.',
    toolbarCount: '{{n}} por corregir o confirmar',
    openAltText: 'Editar el texto alternativo',
    openTableHeaders: 'Abrir el ajuste de encabezado',
    emptyTitle: 'Aún no hay nada que comprobar',
    empty: 'Añade contenido y se comprobará aquí mientras escribes.',
    nothingTitle: 'No hay nada que corregir ni revisar en este contenido.',
    nothing: 'Las comprobaciones automáticas no han encontrado nada. Algunas cosas solo puede juzgarlas una persona, como si el texto se entiende bien.',
    errorTitle: 'La comprobación no terminó.',
    error: 'Vuelve a intentarlo. Si sigue pasando, avisa a quien administra el sitio.',
    tryAgain: 'Volver a intentarlo',
    errorDetails: 'Detalles para quien administra el sitio',
    marker: '{{group}}: {{summary}}'
  }
};

Object.assign(UI, MORE);

/** The panel's words in `locale`, falling back to English. */
export function uiStrings(locale) {
  const primary = String(locale || 'en').toLowerCase().split(/[-_]/)[0];
  return UI[primary] || UI.en;
}

/** Fills {{name}} placeholders. */
export function fill(text, params = {}) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in params ? String(params[k]) : m));
}
