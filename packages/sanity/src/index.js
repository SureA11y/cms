// @surea11y/sanity: an accessibility checker for the people who write the
// content, beside the form in Sanity Studio. It checks what the editor
// writes, in the browser, and sends nothing anywhere.
//
//   import { surea11y } from '@surea11y/sanity';
//   export default defineConfig({ ..., plugins: [structureTool(), surea11y()] });

export { surea11y, accessibilityInspector, INSPECTOR_NAME } from './plugin.js';
export { documentItems, ALT_FIELDS } from './content.js';
export { pathToString, stringToPath } from './paths.js';
