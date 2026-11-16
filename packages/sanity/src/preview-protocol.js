// What the preview script and the Studio plugin say to each other, through
// postMessage between the Studio's window and the preview frame.
//
// Preview → Studio: { source, version, type: 'results', url, documents,
//   findings } (or type 'error', with message).
// Studio → preview: { source, version, type: 'show', selector } or
//   { type: 'check' }.
export const MESSAGE_SOURCE = 'surea11y-preview';
export const VERSION = 1;
