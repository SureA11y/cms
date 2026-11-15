# Plan

How SureA11y for CMS gets from research to a first release, and beyond.
Written from the [research report](research/2026-10-04-cms-checkers.md) and
the [decisions](decisions.md) made so far. Last updated 2026-11-15, against `@surea11y/core` 1.17.0, with the Phase 0
results.

## Goal

Give content editors an accessibility checker inside their CMS that:

1. checks while they work, in plain language;
2. tells them whether a problem is in **their content** or in the
   **template**, and takes them to it;
3. turns what automated testing cannot decide into **questions they answer
   once**, kept as evidence;
4. never changes what visitors see, never claims "compliance", and never
   sends content off the site.

Order of platforms: **WordPress**, then a **headless CMS**, then
**Drupal**. Everything is free for now.

## Architecture

```
@surea11y/core          the engine (SureA11y/core, MPL-2.0): browser bundle,
      │                 "How to check" steps (@surea11y/core/how-to-check)
optional packs          standards and laws, e.g. @surea11y/pack-en301549
      │
@surea11y/panel         CMS-agnostic layer (this repo, MPL-2.0)
  ├─ runner             loads the engine where the content is rendered,
  │                     scopes the scan, schedules it, keeps results compact
  ├─ attribution        maps each problem to "content" or "template",
  │                     and to a content item (block, field) via adapter hooks
  ├─ messages           editor-friendly wording and repair suggestions
  ├─ reviews            answers and dismissals, through a storage interface
  └─ ui                 inline markers, results list, outlines (web components)
      │
adapters                one per CMS, as thin as possible
  ├─ WordPress plugin   (this repo, GPL-2.0-or-later)
  ├─ headless           (later; Sanity or Storyblok first)
  └─ Drupal module      (later, GPL-2.0-or-later)
```

Rules for the split:

- **The panel knows nothing about any CMS.** An adapter supplies: where the
  content is rendered, how to identify a content item (a block's client ID,
  a field path), how to open its settings, and where to store reviews.
- **The panel works in two modes from day one:** a rendered page (WordPress,
  Drupal) and content fields with no page (headless). The second mode does
  not have to ship first, but its interfaces exist so headless needs no
  rewrite.
- **UI as web components with Shadow DOM**, so CMS and theme styles cannot
  break it and it can move between CMSs. Editoria11y uses the same approach.
- **Engine improvements go to SureA11y/core**, never into a fork here. Until
  they land, the panel works around them (see "Engine dependencies").

### Repository layout (planned)

```
packages/panel/        @surea11y/panel            LICENSE: MPL-2.0
plugins/wordpress/     WordPress plugin "SureA11y" LICENSE: GPL-2.0-or-later
docs/                  plan, decisions, research
prototypes/            throwaway experiments, such as Phase 0
```

## Phases

Each phase ends with an exit check. A phase does not start until the
previous one passes, unless noted.

### Phase 0: Prototype (measure before building)

**Done on 2026-11-15.** Code and findings in
[`prototypes/phase-0/`](../prototypes/phase-0/RESULTS.md). In short:

- [x] Load the engine inside the block editor's canvas: it works, but the
      editor's own markup buries the author's content in findings and hides
      a skipped heading level. **Scan a sandbox instead**: the blocks
      rendered as WordPress saves them, in a hidden frame with the canvas's
      styles. Same findings as the published page, every content finding
      mapped to its block, no focus taken from the author.
- [x] Time scans on short, typical and long posts, at full speed and with
      the CPU slowed 4×: a typical post takes 22 ms with content-only rules
      and contrast run apart (106 ms at 4×); the long post 74 ms (277 ms).
- [x] Time loading the bundle: 26 to 43 ms to evaluate (141 to 153 ms at
      4×); 1.87 MB, the heaviest asset of any checker tested.
- [x] Scoping: the content area works; the whole page adds about 60 theme
      findings per post.
- [x] Map findings to blocks: all content findings mapped to top-level
      blocks.
- [x] "How to check" in the browser: 14 KB helper plus a 279 KB dictionary;
      every uncertain finding got steps.
- [x] Compare with three other checkers on the same posts: we match them on
      3 of the 7 kinds of planted mistake and miss 4.

**Decision needed:** the recommendations in
[`RESULTS.md`](../prototypes/phase-0/RESULTS.md#recommendations): sandbox
scanning, content and theme rule sets, contrast apart, scanning after a
pause in typing, and closing the four content-check gaps before Phase 1
ships.

### Phase 1: Panel and WordPress plugin, first usable version

Panel:

- [ ] Runner: render the blocks into a sandbox frame and scan that (see
      Phase 0), after a pause in typing; compact results for storage
      (`output.detail: 'findings'`), treat a scope that matched nothing as an
      error, exclude rules that touch the live page (`.focus()`, injected
      styles).
- [ ] Results grouped the way core's own report does it, using each
      uncertain finding's lean: "Likely problems: confirm", "Probably fine:
      confirm", "Needs a person".
- [ ] Editor-friendly messages and repair suggestions for the rules editors
      meet most (alt text, headings, links, tables, lists, contrast,
      language), in English and Spanish first, then de, fr, ja.
- [ ] Results list with "show me where" and "next issue"; inline markers.
- [ ] Heading outline and alt-text views.
- [ ] Attribution: content vs. template.

WordPress plugin:

- [ ] Block editor sidebar, with markers on the canvas; jump to the block
      and open the right setting ("Open the Alternative text field").
- [ ] Front-end checker for logged-in editors on published pages and
      previews.
- [ ] Reviews: "Hide for me" and "Reviewed, it's fine" (with who, when and
      an optional note), stored in the site's database, reopenable.
- [ ] Permissions: who can see the checker, who can mark items as reviewed.
- [ ] Settings: content area selector, rules on/off, severity.
- [ ] No front-end changes for visitors. No external requests.

- [ ] Content checks at least on par with the other checkers: "click here"
      links inside paragraphs, links to PDF and Office files, bold
      paragraphs used as headings, tables without headers (see "Engine
      dependencies").

**Exit:** finds at least what the other checkers find on the Phase 0 test
posts; installed on at least three real sites with different themes;
within the performance budgets; the panel passes its own accessibility
checks and a manual screen-reader test; template problems never shown as
the author's.

### Phase 2: What sets us apart

- [ ] **Questions instead of warnings.** Each uncertain result becomes a
      question the author answers (Yes / No / Not sure), built on core's "How
      to check" steps and what passing and failing look like (`passWhen`,
      `failWhen`), reworded for editors where needed. Answers are kept, by
      core's finding identity, until the content they refer to changes.
- [ ] **Evidence trail.** A dated record of results and answers per page,
      mapped to WCAG 2.2 and, through packs, to other standards such as
      EN 301 549 (`@surea11y/pack-en301549`), with the law a profile is
      assessed under where the pack gives one. Export as CSV and EARL.
- [ ] **Site overview** built from editors' own page views (no crawler):
      top problems, pages with most problems, recent reviews.
- [ ] **WordPress Block Validation Framework** integration behind a setting,
      while it is experimental: our checks appear where WordPress shows its
      own, and errors can block publishing if the site chooses.
- [ ] Content checks the engine lacks today (see "Engine dependencies").

**Exit:** an editor can go from "problems found" to "every item fixed or
answered" on a page, and export the evidence.

### Phase 3: Public release on WordPress.org

- [ ] Security review and a full pass of the quality gates.
- [ ] Confirm the `surea11y` slug; submit for review.
- [ ] Translations through translate.wordpress.org.
- [ ] Documentation for editors (what each message means, how to fix it) and
      a clear "this is not an overlay" statement.
- [ ] Decide whether the repository becomes public.

**Exit:** approved and listed.

### Phase 4: Headless

- [ ] Investigation: Sanity, Storyblok and Contentful. How each shows
      previews, whether a preview script is acceptable to customers, and
      how rich text (Portable Text, JSON) can be rendered for checking.
- [ ] First adapter for the platform the investigation favours.

### Phase 5: Drupal

- [ ] Module for CKEditor 5 and rendered pages, reusing the panel.
- [ ] Only when we can be clearly better than Editoria11y on the points in
      Phase 2.

### Deferred

- **Hosted crawling service** (whole-site scans). Valid, but needs its own
  thinking on cost, privacy and operations. Nothing in Phases 0 to 3 should
  rule it out: keep the result format and the evidence trail independent
  of where a scan ran.

## Quality, in every phase

Performance and quality are part of every change, not a later phase. Every
phase's exit check includes the gates below, and every pull request says how
it affects them.

### Performance

- **Nothing for visitors.** Logged-out visitors load no SureA11y scripts,
  styles or requests.
- **Scan time budget**, set from the Phase 0 measurements and tracked in CI
  on fixed test posts (short, typical, long). A regression fails the build.
- **Editor responsiveness.** No noticeable typing lag; long scans are
  scheduled after a pause in typing, never on every keystroke.
- **Size budgets** for the panel's JavaScript and CSS (compressed), checked
  in CI. The engine bundle has its own line in the budget, starting from
  core 1.17.0's 0.49 MB compressed, so a core upgrade that grows it is
  noticed and judged, not just absorbed.
- **Server cost.** No crawling from PHP; a fixed, small number of database
  queries per request; results stored compactly (no repeated engine options).
- **Memory.** No references kept to the page between scans.

### Accessibility of our own interface

- The panel and plugin screens meet WCAG 2.2 AA: full keyboard use, visible
  focus, screen-reader announcements for new results, sufficient contrast,
  usable at 400% zoom and with reduced motion.
- Tested with our own engine in CI, and by hand with at least NVDA and
  VoiceOver before each release. An accessibility checker that is not
  accessible has no credibility.

### Security and privacy

- Capability checks and nonces on every action and endpoint; all input
  sanitised, all output escaped.
- No `eval` or inline scripts, so sites with strict Content Security
  Policies work.
- No external requests and no telemetry.
- A security review before every public release.

### Reliability and compatibility

- Supported WordPress, PHP and browser versions stated and tested in CI.
- Tested against Gutenberg's nightly builds, to catch editor changes early.
- Public editor APIs only; no reliance on the editor's internal markup.

### Code quality and tests

- Linting and formatting enforced in CI, matching SureA11y/core's
  conventions where they apply.
- Unit tests for the panel; end-to-end tests in a real browser against a
  local WordPress (Playwright with wp-env).
- Every user-facing string translatable, including right-to-left languages.
- Every change recorded in a changelog, written for the people who use it.

## Features: free now, paid candidates later

Everything ships free. This column only marks what to evaluate for a future
paid tier.

| Feature | Phase | Paid candidate? |
| --- | --- | --- |
| Checking in the editor and on the page | 1 | No, core value |
| Editor-friendly messages and repair suggestions | 1 | No |
| Content vs. template attribution | 1 | No, it is the differentiator |
| Hide and "reviewed" with who and when | 1 | No |
| Questions for uncertain results | 2 | No |
| Evidence trail and CSV/EARL export | 2 | Possibly (export, long history) |
| Other standards and laws through packs (EN 301 549 first), statement support | 2 | Possibly |
| Site overview from page views | 2 | Possibly (advanced reports) |
| Publish blocking via WordPress validation | 2 | No |
| Multisite network management | Later | Likely |
| Scheduled reports by email | Later | Likely |
| Hosted crawling | Deferred | Likely |

## Engine dependencies

What the plan needs from SureA11y/core. Status checked against core 1.17.0
on 2026-11-15.

| Core change | Needed by | Status |
| --- | --- | --- |
| Stop copying the translation into every result | Phase 1 | Done. A scan with Spanish loaded measured 285 KB, down from 21 MB |
| Flag a scope that matches nothing | Phase 1 | Done. It scans nothing and the result says so |
| `img-alt-quality` tells suspicious alt text from ordinary alt text | Phase 1 | Done: file names, web addresses, placeholders, "image of" openings, very long alt |
| A question for every uncertain result | Phase 2 | Done, as "How to check" steps with `passWhen`, `failWhen` and a lean |
| Stable identity per finding, to match answers across scans | Phase 2 | Done: rule ID + reason code + HTML, with `migrateBaselineEntries` when a code is split |
| Compact results for storage | Phase 1 | Done: `output.detail: 'findings'` |
| Other standards and laws | Phase 2 | Done, as packs (experimental until 1.18.0 for parts of the standard API) |
| Option to skip rules that touch the live page | Phase 1 | Not found. Until then, exclude them by ID |
| Content checks the others have: "click here" inside a paragraph, PDF and Office links, bold paragraphs used as headings, tables without headers | **Phase 1** (parity, found in Phase 0) | Missing in 1.17.0. A pack, or core |
| More content checks: ALL CAPS, fake lists, adjacent duplicate links, readability, web address as link text | Phase 2 | Not found in 1.17.0. A pack, or core |
| An official grouping of rules into content-level and theme-level | Phase 1 | Not in core. The prototype excludes 11 theme-level rules by ID |
| Cheaper contrast for a few elements (the most expensive rule: 108 of 259 ms on the long post) | Phase 1 | Run contrast apart, less often |
| Scan a given element or document | Only if Phase 0 shows it is needed | Not found. Load the bundle inside the iframe |
| Yield to the browser during a scan | Only if Phase 0 shows it is needed | Not found. Scan after a pause in typing |

Packs are now the natural home for editor-oriented content checks that are
good practice rather than WCAG failures: they keep core's WCAG results clean
and can be shared with other SureA11y products.

## Risks

| Risk | Mitigation |
| --- | --- |
| Scans too slow for live checking | Phase 0 measures first; fall back to scanning after a pause or on demand |
| The engine bundle keeps growing with core | Its own size budget; load it only when the checker is opened; measure every core upgrade |
| Experimental core APIs (parts of packs and standards) change | Pin core's minor version; upgrade deliberately |
| The block editor changes and breaks the plugin (it broke Editoria11y) | Use public editor APIs only; test against Gutenberg's nightly builds |
| Noise from themes and plugins | Content-area scoping and attribution from Phase 1 |
| Stored results become attack surface (Editoria11y's 2026 advisory) | Capability checks on every endpoint; security review before Phase 3 |
| Being mistaken for an overlay | No front-end changes, no "compliance" wording, explicit statement |
| WordPress's validation framework changes or never reaches core | Integration behind a setting; our own sidebar works without it |

## Open

- [ ] Confirm the `surea11y` slug on WordPress.org and Drupal.org.
- [ ] Choose the headless platform after the Phase 4 investigation.
- [ ] Whether, and when, this repository becomes public.
