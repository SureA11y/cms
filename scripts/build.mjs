// Builds the WordPress plugin's assets into plugins/wordpress/build/:
// - panel.js: @surea11y/panel for the browser (global SureA11yPanel), in
//   English; panel.i18n.<locale>.js adds each other language;
// - engine.js: core's browser bundle with the CMS pack built in, which runs
//   where a Content Security Policy forbids eval and can't fall out of step;
// - engine.i18n.<locale>.js: core's message side files;
// - pack-version.txt: the pack version a scan names;
// - rules.json: the rules a check can run, for the settings page.
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

// Each language besides English: a small script that adds it to the panel,
// loaded only where that language is used.
for (const locale of ['es', 'de', 'fr', 'ja']) {
  await build({
    stdin: {
      contents: `import data from './packages/panel/src/messages/locale.${locale}.js';\nwindow.SureA11yPanel.addLocale(${JSON.stringify(locale)}, data);`,
      resolveDir: root,
      sourcefile: `panel.i18n.${locale}.js`
    },
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    outfile: path.join(out, `panel.i18n.${locale}.js`),
    logLevel: 'warning'
  });
}

const { buildBrowserBundle } = require('@surea11y/core/pack');
const pack = require(path.join(root, 'packages/pack-cms'));
fs.writeFileSync(path.join(out, 'engine.js'), buildBrowserBundle({ packs: [pack] }));
fs.writeFileSync(
  path.join(out, 'pack-version.txt'),
  require(path.join(root, 'packages/pack-cms/package.json')).version
);

// The rules a check can run (the page profile holds the content profile's
// and the theme's), with their titles, for the settings page's list of
// rules to turn off.
{
  const { runa11yCoreOnHtml } = require('@surea11y/core/testing');
  const { getChecksCatalog } = require('@surea11y/core');
  const page =
    '<!doctype html><html lang="en"><head><title>t</title></head><body><p>t</p></body></html>';
  const ids = (profile) =>
    runa11yCoreOnHtml(page, { engineOptions: { packs: [pack], profile } }).checksResults.map(
      (c) => c.ruleId
    );
  const content = new Set(ids('cms-content'));
  const titles = Object.fromEntries(
    getChecksCatalog({ packs: [pack] }).map((r) => [r.ruleId, r.title])
  );
  const rules = ids('cms-page')
    .filter((id) => id !== 'manual-review')
    .sort()
    .map((id) => ({ id, title: titles[id] || id, content: content.has(id) }));
  fs.writeFileSync(path.join(out, 'rules.json'), JSON.stringify(rules));
}

const coreDir = path.dirname(require.resolve('@surea11y/core/package.json'));
for (const locale of ['de', 'es', 'fr', 'ja']) {
  fs.copyFileSync(
    path.join(coreDir, `surea11y.i18n.${locale}.js`),
    path.join(out, `engine.i18n.${locale}.js`)
  );
}

for (const f of fs.readdirSync(out)) {
  console.log(
    `${f.padEnd(24)} ${(fs.statSync(path.join(out, f)).size / 1024).toFixed(0).padStart(6)} KB`
  );
}
