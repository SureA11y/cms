# Decisions

A running log, newest first. Each entry says what was decided and why.

## 2026-11-15: Plain rule titles for editors, in the panel, in five languages

- **Why.** The settings page and the site overview named rules by core's
  titles, written for developers and in English only ("<img> alt text must
  be appropriate (manual review)").
- **What.** A title per rule saying what should be true, in an editor's
  words ("Alternative text describes the image"), for all 135 rules a
  check can run, in English, Spanish, German, French and Japanese. The
  translations are ours and wait for the same native review as the rest.
- **Where.** `packages/panel/src/messages/rule-titles.<locale>.json`: CMS-
  neutral, so other CMS integrations use them too. The build adds them to
  `rules.json` (`titles` per locale); the plugin shows the person's
  language, then English, then core's title. `rules.json` grows from 22 KB
  to 61 KB, read only on the server.
- **Not in the exports.** CSV and EARL keep core's titles: they are
  evidence for auditors, and core's catalog is the stable reference.
- **Held to core.** Tests check that every language titles the same rules,
  that every title is for a real rule, that every rule the page profile
  runs has one, and that none names markup.

## 2026-11-15: Check records move out of the post's meta; the posts list column

- **Why move them.** WordPress loads all of a post's meta whenever it lists
  or opens the post. The evidence trail kept the last 20 records in the
  post's meta (`_surea11y_evidence`): 133 KB on the typical test post, and
  up to megabytes at the limits (20 records of 300 findings). A posts list
  of 20 such posts would load tens of MB to draw a table; the column would
  have made that the common case.
- **Where they are now.** Each record is a hidden child post of the post it
  records (post type `surea11y_record`: private, not public, not in search,
  the REST API or the admin), with the record in that post's meta. Reading
  the trail is one query for the IDs and one for their meta. Still in
  WordPress's own tables, so a site's backups and exports carry them; they
  are deleted with their post. This replaces "Where" in the evidence trail
  entry below.
- **Moving old records.** Records kept the old way move the first time
  they are read (147 ms for 20 records on the typical post, once); the
  post's own meta went from 133 KB to 1.4 KB. Nothing has been released, so
  only development sites have old records.
- **The column.** "Accessibility" in the lists of posts, pages and other
  types edited in the block editor, before the date, for people who see the
  checker. It reads the overview's summary (latest check, answers given
  since): the counts that aren't zero ("2 to fix, 5 to check"), "Nothing
  found" or "Not checked yet", and the date of the check. Plain text, no
  link (the title already links to the editor). No sorting yet: the counts
  sit inside the summary, so sorting would need its own meta per count.

## 2026-11-15: Trying it locally with wp-env and a demo site, in this repository

- **wp-env, not a separate repository.** WordPress's own tool runs a
  WordPress in Docker from `.wp-env.json`, with the plugin folder shared
  into it. It lives here because it depends on the plugin's build and on
  the test posts; a separate repository would drift from both. Needs Node.js
  and Docker, nothing else. `npm run wp:start`, `wp:stop`, `wp:reset`.
- **A demo site, apart from the test posts.** `dev/demo-content.php`
  creates a fictional library: six pages and three posts, some clean and
  some with mistakes the checker finds today (a table without headers, a
  skipped heading level, "click here", a PDF link, bold lines as headings,
  an image named by its file, pale text, images marked decorative). Mistakes
  the engine doesn't find yet (lists typed by hand, web addresses as text)
  are left out, so the demo shows what the checker does. The test posts
  stay as they were, now created by `tests/e2e/content.php` with fixed IDs
  (8, 9, 10), the tests' defaults.
- **Verified here in part.** This machine's network lets Docker download
  images but not run wp-env's build step (Alpine packages), so wp-env itself
  was not started here. Both content scripts were run in a WordPress here:
  every block valid in the editor, and the checker finds what each page is
  meant to show; running them again changes nothing.
- **One login helper, and the login flake's cause.** WordPress's login
  page focuses and selects the username field 200 ms after it loads; when
  that came mid-typing, the password landed in the username field. The
  helper waits for that focus. See `tests/e2e/README.md`.

## 2026-11-15: The site overview reads a summary per post, never the records

- **Where.** Dashboard → Accessibility, for anyone who sees the checker and
  can edit posts. Each person sees only the posts they can edit, checked
  one by one with `edit_post`.
- **From what.** What people already recorded: each post's latest record
  (editor or page, whichever came last) and its answers as they are now, so
  an answer given after the check counts ("it's fine" removes the place,
  "it's a problem" moves it to To fix). Nothing is crawled or scanned on
  the server. A post nobody has checked is not in it, and the page says so.
- **How it stays cheap.** A summary per post, `_surea11y_summary` (about
  2 KB: counts per group, per rule, the last five answers), rewritten when
  a record is added or an answer changes. The overview reads that one meta
  key across posts in one query, not through `WP_Query`, which would load
  every meta of each post, the records included; then one query for the
  posts. The 1,000 most recently checked posts at most. Measured: 3 queries
  and 3.4 ms for the test site; aggregating 1,000 synthetic summaries takes
  12 ms. Posts recorded before summaries existed get one on the next visit,
  50 at a time.
- **What it shows.** The problems found on the most pages, with WCAG
  criteria and whether each is fixed in the content of each page or once in
  the theme (from the pack's content and theme profiles); the pages with the
  most to fix; the latest answers with their notes. Server-made tables in
  WordPress's own styles, no script. One link per cell: a second link under
  the title sat closer than 2.5.8's spacing, which our own check caught.
- **Not yet.** Rule titles are core's, in English and written for
  developers; plain titles per rule in every language are a plan item.

## 2026-11-15: The evidence trail: records on save and on page checks, kept with the post

- **When.** A record is made when the post is saved by hand in the editor
  (not on autosave), checking again first if the content changed since the
  last check, so the record is of what was saved; and after each check of
  the page, which includes the theme. A record that would repeat the last
  one of its kind (the same findings and answers) is not kept, so saving
  three times without a change makes one record.
- **What.** Date, who, where (editor or page), the address, the engine and
  pack versions, the profile, each finding (its identity, rule, reason and
  group) and the answers as they stood then (answer, who, when, note).
  Answers are copied, not referred to: a later change to an answer doesn't
  rewrite the record.
- **Where.** The post meta `_surea11y_evidence`, the last 20 records per
  post, at most 300 findings each. No new table, so a site's own backups
  and exports carry it.
- **Exports, generated on the server from the stored records.** CSV holds
  every record, a row per place, with each rule's WCAG criteria and level
  from the build (core's catalog); cells a spreadsheet would read as a
  formula start with an apostrophe, and a byte order mark keeps the text
  UTF-8. EARL holds the latest record in the shape core's EARL reporter
  gives (`WCAG2:<id>` from core's own `scSlug`): each finding an automatic
  assertion by the checker, each answer a manual one by the person who gave
  it. Core's reporter needs a full scan result, which the record doesn't
  keep, so the plugin writes the document itself, in the same shape.
- **Who.** Anyone who sees the checker and can edit the post can read and
  add records, the same as for reviews.
- **EN 301 549 waits for its pack.** Core is moving it out to
  `@surea11y/pack-en301549`; the exports will take its clauses from there.

## 2026-11-15: Editor wording for "Check it" lives in the panel, keyed by core

- **Where.** `packages/panel/src/messages/review.<locale>.json`, beside the
  panel's plain-language messages, by core's own keys
  (`<prefix>_review_<CODE>_step<n>`, `_pass`, `_fail`). Core's steps are
  written for auditors with developer tools, which is right for core; the
  wording for CMS authors is ours. The pack holds what is checked, the panel
  how it is put to editors.
- **How.** The build puts three layers together for each language: core's
  steps, the pack rule's own (English, from its `meta.review`), then ours.
  Ours replaces a reason code's whole set, so no step of core's is left in
  among ours; a set we don't reword keeps core's text, and its improvements.
- **Held to core.** Tests check that every set we reword exists in core (or
  is the pack rule's), that each is whole, that every language has the same
  keys and placeholders, and that no step names the developer tools or
  markup. A step core renames or drops shows up as a failing test.
- **CMS-neutral.** The steps say "in the editor" and "the table's settings",
  not WordPress's own names. A WordPress-only layer can come later in the
  plugin if a step needs one.
- **Scope.** Twelve sets: those on the Phase 0 test posts that named
  developer tools or markup, plus text over an image. The rest keep core's
  wording until sites show editors meet them.

## 2026-11-15: Phase 2 starts with questions, as answers in the shared reviews

- **An answer is a review.** "Reviewed, it's fine" was already an answer:
  "it's fine". Answers extend it, in the same post meta and REST route, with
  `answer`: `pass`, `fail` or `unsure`. Reviews stored before have none and
  read as `pass`. So the shared reviews, who may make them, and a finding's
  identity (which drops an answer when the content changes) all carry over.
- **"No" is a problem to fix, not a dismissal.** The card moves to "To fix",
  counts there (in the toolbar too), and says who confirmed it. "Not sure"
  changes no count: the finding is still to look at, and the card says who
  wasn't sure.
- **"Check it" replaces "How to fix" on uncertain cards**, with the advice
  inside it above the steps, so a card keeps four actions at most. Problem
  cards keep "How to fix". "Reviewed, it's fine" and "More" go: the answers
  are inside "Check it", and "Hide for me" is shown directly again.
- **The steps are core's, loaded on demand.** Core's review dictionaries,
  cut to the rules the plugin runs, are 45 to 50 KB compressed per language:
  too big for the panel (20 KB). They load on the first "Check it", with
  core's own helper (`howToCheckFrom`), and are cached for the page.
- **Wording for editors is still to do.** Core's steps assume a browser's
  developer tools; some will need editor wording, kept in this repository by
  rule and reason code, ahead of core's.

## 2026-11-15: Milestone 6: views, settings, page hides, quality gates

- **The heading and image views judge nothing themselves.** They list what
  is there, and flag an entry only where the engine reported on that
  element. A second, simpler judgement in the panel would sometimes
  disagree with the findings, and the engine is the one source of truth.
- **"More" is a disclosure, not a menu.** A button with `aria-expanded`
  showing a row of ordinary buttons works the same for everyone and needs
  no menu keyboard handling. It appears only when a card has both
  "Reviewed, it's fine" and "Hide for me". Still to try with people.
- **Link text is selected, not opened.** WordPress has no setting for it:
  it is the text in the block. The action selects that text in the block,
  so the author can type over it.
- **"Hide for me" on the page uses the editor's own storage.** The plugin's
  route changes only its own entry of the person's editor preferences, and
  sets their modified time, so the editor takes it over a copy it kept in
  the browser.
- **The phone-width check is a core rule, run by the page checker.** WCAG
  1.4.10 belongs in core, so core gained `reflow-horizontal-scroll`: at a
  viewport 320 CSS pixels wide it fails what makes the page scroll
  sideways and asks about tables, media and code, which the exception for
  two-dimensional content may cover. The page checker lays the page out at
  that width in a hidden frame it names as the page, only when asked.
- **Quality gates from "Quality, in every phase" are now in CI:** ESLint and
  Prettier as core uses them, size budgets on the built files, and a syntax
  check of every PHP file. The code was formatted once, in its own commit.

## 2026-11-15: Shared reviews, who may make them, and a finding's identity

- **Two ways to set a finding aside.** "Reviewed, it's fine" is shared: it
  is kept with the post and everyone who edits it sees who reviewed it,
  when, and the note. "Hide for me" is one person's, in their editor
  preferences. A reviewed or hidden finding leaves the counts, the steps
  and the markers, and comes back with Reopen or Undo, or when its content
  changes.
- **Who.** Two settings, each a capability: who sees the checker (default
  `edit_posts`, Contributors and above) and who may review (default
  `publish_posts`, Authors and above: people who decide what is published).
  The REST route checks both, and `edit_post` for that post; the interface
  only follows.
- **A finding's identity is its rule, reason, and what the element is and
  says** (tag, link, image source, alternative text, text), not its whole
  markup. WordPress and themes add attributes on the published page
  (classes, `loading`, `srcset`), so the markup differs between the editor
  and the page; this identity doesn't, and a review made in one applies in
  the other. Two identical elements share it, and a judgement on one is a
  judgement on both. Marks made before this change don't carry over; the
  plugin is unreleased.
- **Each language is a file of its own.** Milestone 4 put all five in the
  panel's script (84 KB, 25 KB compressed). Now the script has English
  (45 KB, 16 KB compressed) and each other language is 8 to 17 KB, loaded
  only for people working in it.

## 2026-11-15: Contrast in the editor only for the author's colours

The contrast rules were measured again, on the content alone as the editor
checks it: they are about half of a check (15 of 30 ms on the typical post,
60 of 97 ms on the long one; at a CPU slowed 4×, 86 of 148 and 334 of 374).
The plan's 12% was for whole pages, where the other rules cost more.

- The frequent check leaves `contrast-minimum`, `contrast-computable` and
  `link-in-text-block` out. They run only on the blocks with colours of the
  author's (WordPress's `has-…-color` and `has-…-background-color` classes,
  or colours in a style attribute), and only when those blocks change: an
  author can only get wrong the colours they chose. The theme's colours are
  checked on the page, by the page checker, which runs every rule.
- The contrast pass names only rules the content profile runs: naming rules
  replaces the profile, so an AAA rule (`contrast-enhanced`) would join in.
- Result: a check after an edit takes 30 ms on the typical post (45 to 88
  before), and the background check 0 to 156 ms of main-thread work on the
  typical post and 89 to 145 ms on the long one (66 to 160 and 148 to 203
  before).

## 2026-11-15: How the checks outside the sidebar behave

- **The toolbar count and the pre-publish line need a check while the
  sidebar is closed.** It starts once the editor has loaded and the browser
  is idle, at least three seconds after the page opens, and then runs three
  seconds after each pause in editing (one second while the sidebar is
  open). Measured on the test posts: about 0.07 to 0.16 s of main-thread
  work for the typical post and 0.15 to 0.2 s for the long one, after the
  editor has started. A setting to turn it off belongs with the other
  settings.
- **The page checker loads nothing until asked**, then checks the whole
  page with a new profile in the pack, `cms-page` (content and theme rules
  together), and tells the author's content from the theme by where each
  finding is (`.wp-block-post-content`, `.entry-content`, `.post-content`,
  or the `surea11y_content_selector` filter). Findings about the page as a
  whole (its title, its language) have nothing on screen to show.
- **"Mark as fine" stays in the editor for now.** WordPress adds attributes
  to the published markup, so the same finding has a different identity
  there; sharing marks needs a key that survives that.
- **Settings reach the scripts as JSON data, not as an inline script**, so
  sites with a strict Content Security Policy work (plan: "No inline
  scripts").
- **The end-to-end test files run one at a time**: they share one WordPress
  user, whose preferences each saves whole.

## 2026-11-15: Where the checker runs, and how its look is built

**Where it runs.** Besides the editor sidebar:

- Phase 1: previews and published pages for logged-in editors (already
  planned), and one line in the pre-publish panel that never blocks
  publishing. The preview is where the real theme is, so it is where
  contrast, landmarks and menus can be checked; the pre-publish line
  reaches editors who never open the sidebar, at almost no cost.
- Phase 2: a posts list column (counts saved from checks the browser
  already ran) and the Site Editor (templates checked with the theme
  profile). Both are bigger and build on the reviews and evidence work.

**The look.** The mock-up of the new sidebar was approved: count tiles
that filter, "N of M" steps, cards merged by finding, markers beside the
content, plain states. Its styles are built on design tokens (CSS custom
properties for colour, radius, spacing, type and focus) defined in one
place, so colours or shapes can change later without touching the
components. A test keeps every text and background token pair at WCAG 2.2
AA contrast, so a change of colour can't quietly break it.

## 2026-11-15: Develop against core's main branch until its next release

Core was released recently, so the rules the pack names
(`link-name-quality-link-only`, `BOLD_SHORT_PARAGRAPH`, small tables in
`td-has-header`) stay unreleased for now. Development and CI use core's main
branch, linked in place of the published package; the packages keep
`^1.17.0` as their range until the release, then raise it.

## 2026-11-15: Core changes made directly, without issues

No issues are opened in SureA11y/core. The Phase 0 gaps were checked against
WCAG at the source and handled where WCAG puts them
([details](research/2026-11-15-content-checks.md)):

- **In core**, because WCAG asks for them: small tables without headers
  (F91 covers all data tables), bold lines used as headings at body size
  (F2), and generic link text that only its context explains, as a 2.4.9
  rule (F84). One branch and pull request in core.
- **In the pack** (`packages/pack-cms`), because WCAG doesn't: links to
  documents (not even an advisory technique of 2.4.4) and the split of
  rules into content and theme (a matter of who can fix what). Core stays
  WCAG's; the pack adds what CMS authors need.
- **Not done**, because the premise was wrong: the contrast and iframe rules
  were never slow. Per-rule timings charged them with work every rule
  shares; scans without `contrast-computable` are slower, not faster.

The pack is MPL-2.0, as decided for the shared parts.

## 2026-11-15: Phase 0 recommendations accepted

From the [Phase 0 results](../prototypes/phase-0/RESULTS.md#recommendations):

1. **Scan a sandbox rendering of the blocks**, never the editor's own page.
   The editor's markup buried the author's content in findings and hid a
   skipped heading level. The published-page scan stays as a second view
   for logged-in editors.
2. **Two rule sets:** content rules for authors (the default in the
   editor), and theme rules (CSS, layout, focus, target size) for people who
   can change the theme.
3. **Contrast runs apart**, only for blocks where the author chose colours
   or after a longer pause. It is the most expensive rule.
4. **Scan after a pause in typing** (about one second), never per keystroke.
5. **Close the four content-check gaps before Phase 1 ships**, so we find at
   least what the other checkers find: "click here" inside a sentence, links
   to PDF and Office files, bold paragraphs used as headings, tables without
   headers. Done directly in core, and in the pack where WCAG doesn't
   require it (see the entry above).
6. **Load the engine lazily**, when the checker opens or once the editor is
   idle, and never for logged-out visitors.
7. **Ask core** for a content/theme grouping of rules and a cheaper contrast
   check. Superseded: the grouping is in the pack, and contrast was not slow
   (see the entry above).

## 2026-11-15: Competitor names stay in this repository while it is private

The research report, README and ideas name other checkers and engines
because they are a competitor analysis. They stay while the repository is
private. Before it becomes public, review them and anonymise or remove what
should not be published.

## 2026-11-15: The plan follows core 1.17.0

Core moved from 1.9.0 to 1.17.0 since the plan was written. The four engine
improvements we asked for have landed: compact results, a scope that matches
nothing reported instead of scanning the whole page, suspicious alt text told
apart, and "How to check" steps for every uncertain result. The plan now:

- builds questions on core's "How to check" steps and leans instead of
  writing its own;
- matches answers across scans with core's finding identity;
- takes other standards and laws, EN 301 549 first, from packs rather than
  from core, which is moving them out;
- gives the engine bundle its own size budget, since it grew from 0.21 MB
  to 0.49 MB compressed between 1.9.0 and 1.17.0;
- treats packs as the home for editor content checks that are good practice
  rather than WCAG failures.

## 2026-10-04: Licences split by component

| Component | Licence | Why |
| --- | --- | --- |
| `@surea11y/core` (engine) | MPL-2.0, unchanged | Already published |
| `@surea11y/panel` (shared, CMS-agnostic UI) | MPL-2.0 | Same as core. Usable unmodified inside proprietary products, including future SureA11y products; changes to its own files stay open. Compatible with GPL. |
| WordPress plugin | GPL-2.0-or-later | Required by the WordPress.org directory, and the norm for code that runs inside WordPress |
| Drupal module (later) | GPL-2.0-or-later | Required by drupal.org |
| Future hosted services | Proprietary | Code that runs as a service is not distributed, so it can stay closed |

Reasoning:

- Most of the value lives in core and the panel, which stay MPL-2.0. The
  GPL plugins are thin wrappers, so their licence does not limit the company.
- A paid tier remains possible: GPL allows selling, and WordPress paid
  add-ons (as Equalize Digital does) are GPL too; what customers pay for is
  updates, support and services.
- **Keep the copyright in one place.** As long as all code belongs to the
  maintainer (later, the company), it can be relicensed or dual-licensed.
  If outside contributions are accepted, require a contributor licence
  agreement first.
- Licence files are added to each component's folder when that folder is
  created.

This is a reasoned choice, not legal advice. Review it with a lawyer when
the company is formed.

## 2026-10-04: Free only, for now

Everything is free at first. Each feature in the plan is still analysed for
whether it could belong to a future paid tier, so that the decision can be
made later with evidence. Likely candidates from the research: site-wide
reports, the evidence trail and its export, and multisite management.

## 2026-10-04: Hosted crawling service deferred, not dropped

A hosted service that crawls whole sites is a valid way into the market,
but needs proper thought (cost, privacy, operations). It stays out of the
first versions. Design choices now should not rule it out.

## 2026-10-04: One CMS at a time: WordPress, then headless, then Drupal

- **WordPress first.** Largest audience, the most to learn from
  competitors, and WordPress's own Block Validation Framework to plug into.
- **Headless second.** The market is empty, but it is technically
  different: the CMS does not render the page. The website is a separate
  application, usually on another domain, so the engine cannot simply be
  loaded into the preview. It needs either checks on content fields
  (rich text rendered to HTML by us) or a small script the website adds to
  its preview mode. That needs its own investigation first.
- **Drupal third.** Editoria11y leads there, so we go when we can be
  clearly better.
- **Robustness comes from the design, not from shipping two at once.** The
  shared panel is designed from day one for both models (a rendered page,
  and content fields without a page), so headless can follow without a
  rewrite.

## 2026-10-04: The repository is private for now

It will hold competitor research and early plans. It can be made public
later.

## 2026-10-04: Research before planning

We analyse our engine and the existing CMS checkers first, then write
`docs/PLAN.md` from the findings, so the plan rests on evidence.

## 2026-10-04: WordPress and Drupal first; Joomla deprioritised

WordPress has the largest audience. Drupal is common in government and
universities, where accessibility is often a legal requirement. Joomla has
shipped Sa11y as its built-in accessibility checker since version 4.1, so
every Joomla site already has a free checker.

## 2026-10-04: Names

| Thing | Name |
| --- | --- |
| Repository | `SureA11y/cms` |
| Shared panel package | `@surea11y/panel` (free on npm as of 2026-10-04) |
| Plugin in each CMS directory | SureA11y (slug `surea11y`) |

The plugin's display name may carry a description, such as "SureA11y —
Accessibility Checker". It should say "checker", never "compliance". The
`surea11y` slug on WordPress.org and Drupal.org could not be checked
automatically and still needs a manual check.

## 2026-10-04: A separate project, not part of core

Core is the engine: zero dependencies, deterministic, verified against the
W3C ACT test cases. A CMS plugin brings a user interface, PHP and each CMS's
release and review process. Keeping it separate, like the existing
Playwright, Cypress and CLI integrations, keeps core focused and lets the
plugin pin engine versions.

## Open

- [ ] Confirm the `surea11y` slug is free on WordPress.org and Drupal.org
