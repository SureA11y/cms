// What the preview script and the editor tab say to each other, through
// postMessage between frames on Contentful's page (the live preview's frame
// and the app's frame are siblings there).
//
// Tab → preview: { source, version, type: 'hello', entryId } every few
//   seconds, to every frame on the page, addressed to the preview's origin
//   only (the browser drops it for any other frame); then { type: 'show',
//   selector } and { type: 'check' }.
// Preview → tab (only the frame that said hello): { type: 'results', url,
//   entries, tagged, findings, scanMs } or { type: 'error', message }.
export const MESSAGE_SOURCE = 'surea11y-contentful-preview';
export const VERSION = 1;

/** Every frame inside `win`, nested ones too. */
export function framesIn(win, list = []) {
  for (let i = 0; i < win.frames.length; i += 1) {
    const f = win.frames[i];
    list.push(f);
    try {
      framesIn(f, list);
    } catch {
      // a frame that can't be walked: its own frames are left out
    }
  }
  return list;
}
