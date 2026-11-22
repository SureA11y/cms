// Writes docs/editors/messages.md: every rule a check can run, by its title
// for editors, with what it relates to in WCAG and EN 301 549, whether it is
// fixed in the content or in the theme, and, where the panel words it for
// editors, the messages an editor sees and what to do. Made from the build's
// rules.json and the panel's English messages, so it can't fall out of step.
//
//   node scripts/editor-docs.mjs          write it (after npm run build)
//   node scripts/editor-docs.mjs --check  fail if it is out of date
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/editors/messages.md');
const rulesFile = path.join(root, 'plugins/wordpress/build/rules.json');
if (!fs.existsSync(rulesFile)) {
  console.error('Run npm run build first: this reads plugins/wordpress/build/rules.json.');
  process.exit(1);
}
const rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
const messages = JSON.parse(
  fs.readFileSync(path.join(root, 'packages/panel/src/messages/en.json'), 'utf8')
);
const { createRequire } = await import('node:module');
const require = createRequire(path.join(root, 'package.json'));
const { getChecksCatalog } = require('@surea11y/core');
const pack = require(path.join(root, 'packages/pack-cms'));

// A rule's message prefix, from core's catalog (img-alt-present -> img_altPresent).
const prefixOf = {};
for (const r of getChecksCatalog({ packs: [pack] })) {
  if (r.i18n && r.i18n.titleKey) prefixOf[r.ruleId] = r.i18n.titleKey.replace(/_title$/, '');
}
// Messages shared by several rules, shown with the rule they are met under.
const SHARED = { textAlternative: 'img-alt-quality' };

const plain = (text) => text.replace(/\{\{\w+\}\}/g, '…');
function messagesOf(id) {
  const prefixes = [
    prefixOf[id],
    ...Object.entries(SHARED)
      .filter(([, rule]) => rule === id)
      .map(([p]) => p)
  ].filter(Boolean);
  const said = [];
  const todo = [];
  for (const [key, text] of Object.entries(messages)) {
    if (!prefixes.some((p) => key.startsWith(p + '_'))) continue;
    (key.includes('_hint_') ? todo : said).push(plain(text));
  }
  return { said: [...new Set(said)], todo: [...new Set(todo)] };
}

function section(rule, level = 4) {
  const title = (rule.titles && rule.titles.en) || rule.title;
  const lines = [`${'#'.repeat(level)} ${title}`, ''];
  const refs = [];
  if (rule.wcag.length)
    refs.push('WCAG ' + rule.wcag.map((c) => `${c.sc} (${c.level})`).join(', '));
  else refs.push('A good practice, not a WCAG requirement');
  if (rule.en301549) refs.push(`EN 301 549 ${rule.en301549.clauses.join(', ')}`);
  lines.push(`${refs.join(' · ')} · Rule \`${rule.id}\``, '');
  const { said, todo } = messagesOf(rule.id);
  if (said.length) {
    lines.push('What you may see:', '', ...said.map((t) => `- ${t}`), '');
  }
  if (todo.length) {
    lines.push('What to do:', '', ...todo.map((t) => `- ${t}`), '');
  }
  return lines.join('\n');
}

const byTitle = (a, b) =>
  ((a.titles && a.titles.en) || a.title).localeCompare((b.titles && b.titles.en) || b.title);
const content = rules.filter((r) => r.content).sort(byTitle);
const theme = rules.filter((r) => !r.content).sort(byTitle);
const worded = (list) => list.filter((r) => messagesOf(r.id).said.length);
// The rules editors meet most first, then the rest.
function grouped(list) {
  const often = worded(list);
  const rest = list.filter((r) => !often.includes(r));
  return [
    ...(often.length ? ['### Met most often', '', ...often.map((r) => section(r))] : []),
    ...(rest.length && often.length ? ['### Less common', ''] : []),
    ...rest.map((r) => section(r, often.length ? 4 : 3))
  ];
}

const doc = [
  '# What each finding means',
  '',
  "<!-- Made by scripts/editor-docs.mjs from the build and the panel's messages. Do not edit by hand. -->",
  '',
  `Every rule the checker runs, ${rules.length} in all, by the name the plugin`,
  'shows. The checker puts each finding in one of four groups: **to fix**',
  '(it is sure), **likely problem** (the evidence points to one: confirm it),',
  '**needs a person** (only a person can tell: answer the question) and',
  '**probably fine**. See [the guide](README.md) for how to work through them.',
  '',
  `The ${worded(content).length + worded(theme).length} rules editors meet most have their messages written for`,
  'editors, listed with what to do. The others are rarer, and their messages',
  "are the engine's own.",
  '',
  `## In your content (${content.length})`,
  '',
  'Fixed in the post or page, by whoever writes it.',
  '',
  ...grouped(content),
  `## In the theme or template (${theme.length})`,
  '',
  "Fixed in the theme, its templates or the site's settings, usually by whoever",
  'builds or looks after the site. The page checker and the Site Editor show',
  "them; the post editor doesn't. When the page checker finds one of them on",
  'something inside your content, such as a block whose height was set in the',
  'editor, it shows it under "Your content".',
  '',
  ...grouped(theme)
]
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trimEnd()
  .concat('\n');

if (process.argv.includes('--check')) {
  const now = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (now !== doc) {
    console.error('docs/editors/messages.md is out of date: run node scripts/editor-docs.mjs.');
    process.exit(1);
  }
  console.log('docs/editors/messages.md is up to date.');
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, doc);
  console.log(`Wrote ${path.relative(root, out)}: ${rules.length} rules.`);
}
