// The panel's own words: headings, buttons and status messages. English is
// built in; other languages are added with addLocale (../locales.js), each
// from its own file, loaded only where that language is used.

export const UI = {
  en: {
    heading: 'Accessibility',
    checking: 'Checking…',
    summary:
      '{{problem}} to fix, {{likely}} likely, {{review}} to review, {{probably}} probably fine.',
    groups: {
      problem: 'To fix',
      likely: 'Likely problems',
      review: 'Needs a person',
      'probably-fine': 'Probably fine',
      reviewed: 'Reviewed, fine',
      marked: 'Hidden by you'
    },
    // One finding's group, on its card.
    badges: {
      problem: 'To fix',
      likely: 'Likely problem',
      review: 'Needs a person',
      'probably-fine': 'Probably fine',
      reviewed: 'Reviewed, fine',
      marked: 'Hidden by you'
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
      reviewed:
        'Someone checked these and found them fine. Everyone who edits this content sees them here.',
      marked: 'Hidden only for you, and left out of your counts. Undo brings one back.'
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
    hideForMe: 'Hide for me',
    checkIt: 'Check it',
    howToCheck: 'How to check',
    loadingSteps: 'Loading the steps…',
    isItFine: 'Is it fine?',
    answerYes: "Yes, it's fine",
    answerNo: "No, it's a problem",
    answerUnsure: 'Not sure',
    fineWhen: "It's fine when: {{text}}",
    problemWhen: "It's a problem when: {{text}}",
    confirmedBy: '{{by}} confirmed it is a problem on {{when}}.',
    confirmedOn: 'Confirmed as a problem on {{when}}.',
    unsureBy: "{{by}} wasn't sure, on {{when}}.",
    unsureOn: 'Someone was not sure, on {{when}}.',
    more: 'More',
    reviewedBy: '{{by}} reviewed it on {{when}}.',
    reviewedOn: 'Reviewed on {{when}}.',
    noteLabel: 'Note (optional)',
    cancel: 'Cancel',
    reopen: 'Reopen',
    undo: 'Undo',
    outsideContent: 'Not in the content: the template or theme.',
    inTheme:
      'In the theme or template, not in your content: whoever looks after the theme can fix it.',
    editInEditor: 'Edit in the editor',
    yourContent: 'Your content',
    themeOrTemplate: 'Theme or template',
    close: 'Close',
    panelLabel: 'Accessibility checker',
    prepublish:
      'To fix: {{problem}}. Likely problems to confirm: {{likely}}. Need a person: {{review}}.',
    prepublishNothing: 'Nothing to fix or review.',
    prepublishReview: 'Review in the Accessibility panel',
    prepublishNote: "This doesn't stop you publishing.",
    toolbarCount: '{{n}} to fix or confirm',
    openAltText: 'Edit the alternative text',
    openTableHeaders: 'Open the header setting',
    openHeadingLevel: 'Change the heading level',
    openTextColour: 'Open the text colour',
    selectLinkText: 'Select the link text',
    emptyTitle: 'Nothing to check yet',
    empty: 'Add some content and it will be checked here as you write.',
    nothingTitle: 'Nothing to fix or review in this content.',
    nothing:
      'The checks that can be automated found nothing. Some things only a person can judge, such as whether the text is clear.',
    errorTitle: "The check didn't finish.",
    error: "Try again. If it keeps happening, tell your site's administrator.",
    tryAgain: 'Try again',
    errorDetails: 'Details for your administrator',
    viewLabel: 'What to show',
    // Under a field of the form, where the host shows one (Sanity).
    moreInField: '{{n}} more in this field',
    details: 'Details',
    fieldLines: 'Show findings under each field',
    viewFindings: 'Findings',
    viewHeadings: 'Headings',
    viewImages: 'Images',
    headingsTitle: 'Headings',
    imagesTitle: 'Images',
    headingsHelp:
      'The headings in order, as a screen reader lists them. Each level should follow the one above it, and each heading should say what its section is about.',
    imagesHelp:
      'Each image and what a screen reader says for it. The text should say what the image shows or does, unless the image is only decoration.',
    noHeadings: 'No headings here.',
    noImages: 'No images here.',
    level: 'Level {{n}}',
    emptyHeading: '(empty heading)',
    noAlt: 'No text alternative',
    decorative: 'Decorative: screen readers skip it',
    quoted: '“{{text}}”',
    phoneHelp:
      'Load this page again at 320 pixels wide, as a phone shows it, and check that nothing needs scrolling sideways.',
    phoneCheck: 'Check at phone width',
    phoneChecking: 'Checking at phone width…',
    phoneDone: 'Checked at phone width (320 pixels): {{n}} found.',
    phoneError: "The check at phone width didn't finish.",
    marker: '{{group}}: {{summary}}'
  }
};

/** The panel's words in `locale`, falling back to English. */
export function uiStrings(locale) {
  const primary = String(locale || 'en')
    .toLowerCase()
    .split(/[-_]/)[0];
  return UI[primary] || UI.en;
}

/** Fills {{name}} placeholders. */
export function fill(text, params = {}) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in params ? String(params[k]) : m));
}
