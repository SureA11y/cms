// The size budgets in docs/PLAN.md ("Quality, in every phase"), checked on
// the built files, compressed as a server sends them (gzip). Run after
// `node scripts/build.mjs`. A file over its budget fails; growing a budget
// is a decision, recorded in docs/decisions.md.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUILD = new URL('../plugins/wordpress/build/', import.meta.url);
const KB = 1024;

// Each budget, compressed. The engine's comes from core: a core upgrade that
// grows it past this is noticed and judged, not just absorbed.
const BUDGETS = [
  { match: /^panel\.js$/, max: 22 * KB, what: 'the panel' },
  { match: /^panel\.i18n\.[\w-]+\.js$/, max: 6 * KB, what: 'one language of the panel' },
  { match: /^engine\.js$/, max: 625 * KB, what: 'the engine with the CMS pack' },
  {
    match: /^review\.[\w-]+\.js$/,
    max: 60 * KB,
    what: 'how to check, in one language, loaded on the first question'
  },
  {
    match: /^engine\.i18n\.[\w-]+\.js$/,
    max: 75 * KB,
    what: "one language of the engine's messages"
  }
];

const files = fs.readdirSync(BUILD).filter((f) => f.endsWith('.js'));
let failed = 0;
for (const file of files) {
  const budget = BUDGETS.find((b) => b.match.test(file));
  if (!budget) continue;
  const size = zlib.gzipSync(fs.readFileSync(path.join(BUILD.pathname, file)), { level: 9 }).length;
  const over = size > budget.max;
  if (over) failed++;
  console.log(
    `${over ? 'OVER' : 'ok  '}  ${file.padEnd(22)} ${(size / KB).toFixed(1).padStart(6)} KB of ${(budget.max / KB).toFixed(0)} KB  (${budget.what})`
  );
}
for (const budget of BUDGETS) {
  if (!files.some((f) => budget.match.test(f))) {
    console.log(`MISSING  ${budget.what}: no built file. Run node scripts/build.mjs first.`);
    failed++;
  }
}
if (failed) {
  console.error(`${failed} over budget or missing.`);
  process.exit(1);
}
