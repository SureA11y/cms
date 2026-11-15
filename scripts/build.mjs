// Builds the WordPress plugin's assets into plugins/wordpress/build/:
// - panel.js: @surea11y/panel for the browser (global SureA11yPanel), in
//   English; panel.i18n.<locale>.js adds each other language;
// - engine.js: core's browser bundle with the CMS pack built in, which runs
//   where a Content Security Policy forbids eval and can't fall out of step;
// - engine.i18n.<locale>.js: core's message side files;
// - pack-version.txt: the pack version a scan names;
// - rules.json: the rules a check can run, for the settings page;
// - review.<locale>.js: how to check each undecided finding by hand (core's
//   review dictionaries, cut to the rules a check can run), loaded only when
//   someone opens a question; review.en.js also has core's helper that reads
//   them (window.SureA11yReview).
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

  // How to check, by hand, the undecided findings of those rules: their
  // entries in core's review dictionaries, keyed by each rule's prefix.
  const prefixes = new Set(
    getChecksCatalog({ packs: [pack] })
      .filter((r) => rules.some((x) => x.id === r.ruleId))
      .map((r) => ((r.i18n && r.i18n.titleKey) || '').replace(/_title$/, ''))
      .filter(Boolean)
  );
  // Three layers, each over the one before: core's steps; the pack's own
  // rules' steps (in English, from their meta.review); and the panel's
  // wording for editors (packages/panel/src/messages/review.<locale>.json),
  // which replaces a reason code's whole set, so no step of core's is left
  // in among ours.
  const packReview = {};
  for (const rule of pack.rules || []) {
    const prefix = ((rule.meta.i18n && rule.meta.i18n.titleKey) || '').replace(/_title$/, '');
    for (const [code, r] of Object.entries((prefix && rule.meta.review) || {})) {
      r.steps.forEach((step, i) => (packReview[`${prefix}_review_${code}_step${i + 1}`] = step));
      packReview[`${prefix}_review_${code}_pass`] = r.passWhen;
      packReview[`${prefix}_review_${code}_fail`] = r.failWhen;
    }
  }
  const setOf = (key) => key.replace(/_(step\d+|pass|fail)$/, '');
  const reviewOf = (locale) => {
    const all = require(`@surea11y/core/review/${locale}`);
    const out = Object.fromEntries(
      Object.entries(all).filter(([k]) => prefixes.has(k.slice(0, k.indexOf('_review_'))))
    );
    if (locale === 'en') Object.assign(out, packReview);
    const ours = JSON.parse(
      fs.readFileSync(path.join(root, `packages/panel/src/messages/review.${locale}.json`), 'utf8')
    );
    const replaced = new Set(Object.keys(ours).map(setOf));
    for (const k of Object.keys(out)) if (replaced.has(setOf(k))) delete out[k];
    return Object.assign(out, ours);
  };
  await build({
    stdin: {
      contents:
        "import { howToCheckFrom } from '@surea11y/core/how-to-check';\n" +
        'const r = (window.SureA11yReview = window.SureA11yReview || { dictionaries: {} });\n' +
        'r.howToCheckFrom = howToCheckFrom;\n' +
        `r.dictionaries.en = ${JSON.stringify(reviewOf('en'))};`,
      resolveDir: root,
      sourcefile: 'review.en.js'
    },
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    outfile: path.join(out, 'review.en.js'),
    logLevel: 'warning'
  });
  for (const locale of ['es', 'de', 'fr', 'ja']) {
    fs.writeFileSync(
      path.join(out, `review.${locale}.js`),
      `(window.SureA11yReview=window.SureA11yReview||{dictionaries:{}}).dictionaries[${JSON.stringify(locale)}]=${JSON.stringify(reviewOf(locale))};\n`
    );
  }
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
