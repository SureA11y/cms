// Builds the WordPress plugin's assets into plugins/wordpress/build/:
// - panel.js: @surea11y/panel for the browser (global SureA11yPanel);
// - engine.js: core's browser bundle with the CMS pack built in, which runs
//   where a Content Security Policy forbids eval and can't fall out of step;
// - engine.i18n.<locale>.js: core's message side files;
// - pack-version.txt: the pack version a scan names.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const out = path.join(root, 'plugins/wordpress/build');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(root, 'packages/panel/src/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'SureA11yPanel',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  outfile: path.join(out, 'panel.js'),
  logLevel: 'warning'
});

const { buildBrowserBundle } = require('@surea11y/core/pack');
const pack = require(path.join(root, 'packages/pack-cms'));
fs.writeFileSync(path.join(out, 'engine.js'), buildBrowserBundle({ packs: [pack] }));
fs.writeFileSync(path.join(out, 'pack-version.txt'), require(path.join(root, 'packages/pack-cms/package.json')).version);

const coreDir = path.dirname(require.resolve('@surea11y/core/package.json'));
for (const locale of ['de', 'es', 'fr', 'ja']) {
  fs.copyFileSync(path.join(coreDir, `surea11y.i18n.${locale}.js`), path.join(out, `engine.i18n.${locale}.js`));
}

for (const f of fs.readdirSync(out)) {
  console.log(`${f.padEnd(24)} ${(fs.statSync(path.join(out, f)).size / 1024).toFixed(0).padStart(6)} KB`);
}
