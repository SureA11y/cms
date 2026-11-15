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
packages/pack-cms/     @surea11y/pack-cms         LICENSE: MPL-2.0
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

**Accepted on 2026-11-15:** all seven recommendations in
[`RESULTS.md`](../prototypes/phase-0/RESULTS.md#recommendations) (see
[`decisions.md`](decisions.md)). The engine changes were made directly in
core, and in the CMS pack where WCAG doesn't require them
([details](research/2026-11-15-content-checks.md)).

### Phase 1: Panel and WordPress plugin, first usable version

**Milestone 1 done on 2026-11-15:** the panel and the editor sidebar. In
the local WordPress 7.1.4, on the Phase 0 posts: every planted problem
found and tied to its block; one rescan per burst of edits; a check takes
191 ms on the typical post the first time and 51 ms after an edit, 295 ms on
the long post; the sidebar passes the engine's own WCAG 2.2 AA checks.

Panel:

- [x] Runner: render the blocks into a sandbox frame and scan that (see
      Phase 0), after a pause in typing; compact results for storage
      (`output.detail: 'findings'`). The sandbox has its own Content Security
      Policy, and renders items as siblings, as the published page does.
      Rules that touch the live page touch only the sandbox.
- [x] Contrast run apart from the frequent check (Phase 0 decision 3):
      the frequent check leaves the contrast rules out, and they run only on
      blocks with colours of the author's, only when those blocks change.
      The theme's own colours are checked by the page checker.
- [x] Results grouped the way core's own report does it, using each
      uncertain finding's lean: "Likely problems: confirm", "Probably fine:
      confirm", "Needs a person".
- [x] Editor-friendly messages and repair suggestions for the rules editors
      meet most (alt text, headings, links, tables, lists, contrast,
      language), in English and Spanish first.
- [x] The same in German, French and Japanese, and plain wording for
      contrast in all five.
- [ ] German, French and Japanese reviewed by native speakers: written
      without one, using core's own terms where they overlap.
- [x] Results list with "show me where" and "next issue".
- [x] The look approved from the mock-up (2026-11-15):
  - count tiles per group (icon and word, never colour alone) that filter
    the list; no score or percentage;
  - "3 of 11" with previous and next, over every place a finding is in;
  - one card per finding, merged across places ("2 places"), with the
    block type, the quoted content, "How to fix" on request, and "Shown
    in the content" on the one last shown;
  - "Mark as fine" with Undo, in a "Marked fine by you" group;
  - plain states: checking (the last results stay), nothing to check yet,
    nothing found, and an error in plain words with the details for the
    administrator.
- [x] Styles built on design tokens: colours, corner radius, spacing, type
      and focus ring as CSS custom properties in one place, so the look can
      change without touching the components, and a site can override
      them. Every token pair keeps WCAG 2.2 AA contrast, checked by a test.
- [x] Inline markers: beside each block with a finding, in its group's
      colour and icon; a shortcut for pointer users, kept out of the tab
      order because the list and its arrows do the same from the keyboard.
- [x] Heading outline and alt-text views: "Findings", "Headings" and
      "Images" above the list. The headings in order, by level; each image
      with what a screen reader says for it (its text, "Decorative", or "No
      text alternative"). An entry is flagged only where the engine
      reported on that element, so the views never disagree with the
      findings. On a page, the theme's headings and images are there too,
      marked "Theme or template".
- [x] Attribution: content vs. template (each finding names its block; the
      `cms-content` profile runs no theme rule).
- [x] Nested blocks named by their own block, not their top-level one
      (an image in a group's columns is "Image", and Show selects it).

WordPress plugin:

- [x] Block editor sidebar; jump to the block.
- [x] Markers on the canvas.
- [x] Open the right setting from a finding: "Edit the alternative text"
      (image) and "Open the header setting" (table) select the block, open
      its settings and put focus on the field.
- [x] More settings to open: "Change the heading level" (focus on the
      level the heading has now), "Open the text colour" (the Typography
      panel's Color), and "Select the link text" (the link's text selected
      in its block, ready to type over: link text has no setting).
- [x] "Hide for me" (first called "Mark as fine"), kept per person and
      per post in their editor preferences.
- [x] Count on the toolbar button: what to fix or confirm, from a check
      that runs while the sidebar is closed (the first once the editor has
      loaded and the browser is idle, then three seconds after each pause).
- [x] Front-end checker for logged-in editors on previews and published
      pages, and nothing for anyone else ("Check accessibility" in the
      toolbar). It checks the whole page as visitors get it with the pack's
      `cms-page` profile: content and theme rules together. Findings inside
      the post content say "Your content" and link to the editor; the rest
      say "Theme or template". Same cards and tiles as the sidebar, in a
      panel at the side, with markers beside the elements and a frame
      around the one shown.
- [x] Front-end checker: "Edit in the editor" opens the editor on that
      finding (the sidebar opens and shows it).
- [x] Front-end checker: "Check at phone width" (WCAG 1.4.10, Reflow).
      On request, the page is loaded again in a hidden frame 320 CSS pixels
      wide and core's `reflow-horizontal-scroll` runs there; what sticks
      out past the edge joins the list, as content or theme, and Show finds
      it in the page as shown. It runs only when asked, since it loads the
      page a second time (0.6 seconds on the typical post). Needs core's
      rule, on core's main branch until a release.
- [x] Front-end checker: shared reviews there too. A finding is now
      identified by its rule, reason and what the element is and says (tag,
      link, image source, alternative text, text), not its markup, so it
      is the same in the editor and on the page.
- [x] Front-end checker: "Hide for me" there too. It changes the same
      entry of the person's editor preferences, through the plugin's REST
      route, so a hide made on the page is there in the editor.
- [x] Before publishing: one line in WordPress's pre-publish panel ("To
      fix: 0. Likely problems to confirm: 1. Need a person: 3."), with a
      button that opens the sidebar. It never blocks publishing.
- [x] Reviews: "Reviewed, it's fine", with who, when and an optional note,
      kept with the post (`_surea11y_reviews`) and seen by everyone who
      edits it, in the editor and on the page; reopenable. Beside it,
      "Hide for me", for one person.
- [x] Permissions: who sees the checker and who can review (a capability
      each; by default Contributors and Authors), checked by the REST route
      as well as the interface.
- [x] Settings (Settings → Accessibility checker): who, the content area
      selector, the background check on or off, rules on or off.
- [ ] Settings: severity, if sites ask for it.
- [x] Fewer buttons per card: when both "Reviewed, it's fine" and "Hide
      for me" are offered, they sit behind "More" (a disclosure button, not
      a menu), so a card shows at most four actions, with what fixes it
      first.
- [ ] Try "More" with people, with the screen-reader test.
- [x] No front-end changes for visitors. No external requests.

- [x] Content checks at least on par with the other checkers: "click here"
      links inside paragraphs, links to PDF and Office files, bold
      paragraphs used as headings, tables without headers (see "Engine
      dependencies").

**Exit:** finds at least what the other checkers find on the Phase 0 test
posts; installed on at least three real sites with different themes;
within the performance budgets; the panel passes its own accessibility
checks and a manual screen-reader test; template problems never shown as
the author's.

### Phase 2: What sets us apart

- [x] **Questions instead of warnings.** Each uncertain result becomes a
      question the author answers (Yes / No / Not sure), built on core's "How
      to check" steps and what passing and failing look like (`passWhen`,
      `failWhen`). Answers are kept, by core's finding identity, until the
      content they refer to changes. "Check it" on an uncertain card shows
      what to do, the steps, and what fine and a problem look like; "Yes" is
      a shared review, "No" makes it one to fix, saying who confirmed it, and
      "Not sure" leaves it open, saying so. The steps load on the first
      question (about 48 KB compressed per language), never with the panel.
- [x] Questions: steps reworded for editors where core's assume developer
      tools or markup, in `packages/panel/src/messages/review.<locale>.json`,
      by core's own keys: twelve sets (bold or large text as headings, tables
      without headers, skipped heading levels, alternative text, decorative
      images, link text that needs its sentence, text over an image), in
      five languages, and the first translations of the CMS pack rule's
      steps. Each replaces core's whole set; the others keep core's text.
- [ ] Questions: more editor wording as sites show which steps editors meet
      (contrast's other cases, lists, page titles).
- [x] **Evidence trail.** A dated record of results and answers per page,
      mapped to WCAG 2.2. Export as CSV and EARL. A record is made on each
      save by hand in the editor and after each check of the page, with the
      answers given so far, and one that would repeat the last is not kept;
      the last 20 per post are kept with it (`_surea11y_evidence`). The
      sidebar shows the last and downloads the CSV (every record, a row per
      place, with the WCAG criteria and level, the answer, who and when) and
      the EARL (the latest: the checker's assertions, automatic, and each
      person's answer, manual).
- [ ] Evidence trail: other standards through packs, such as EN 301 549
      (`@surea11y/pack-en301549`, when core moves it out), with the law a
      profile is assessed under where the pack gives one.
- [ ] Evidence trail: a record on demand ("Record this check"), and records
      kept longer, if sites ask (a candidate for the paid tier).
- [ ] **Site overview** built from editors' own page views (no crawler):
      top problems, pages with most problems, recent reviews.
- [ ] **Posts list column** with each post's counts from its last check,
      saved from the browser when the post is saved: nothing is scanned on
      the server or sent anywhere.
- [ ] **Site Editor:** templates, template parts, headers and footers
      checked with the theme profile, where theme problems are fixed.
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
  in CI (`npm run size`): the panel 22 KB, each of its languages 6 KB, the
  engine 540 KB, each of its languages 75 KB. The engine bundle has its own line in the budget, starting from
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
  conventions where they apply: ESLint and Prettier with core's settings;
  the WordPress scripts keep WordPress's own layout and are linted only.
  Every PHP file is syntax-checked.
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
| A reflow rule (WCAG 1.4.10): horizontal scrolling at 320 CSS pixels, for a host that renders the page at that width | Phase 1 (phone-width check) | Done on a core branch, awaiting release: `reflow-horizontal-scroll` |
| Content checks the others have: "click here" inside a paragraph, PDF and Office links, bold paragraphs used as headings, tables without headers | **Phase 1** (parity, found in Phase 0) | Done on a core branch, awaiting release: `td-has-header` from 2 by 2, `p-as-heading` `BOLD_SHORT_PARAGRAPH`, `link-name-quality-link-only` (2.4.9). Links to documents: `cms-link-to-document` in the pack |
| More content checks: ALL CAPS, fake lists, adjacent duplicate links, readability, web address as link text | Phase 2 | Not found in 1.17.0. A pack, or core |
| An official grouping of rules into content-level and theme-level | Phase 1 | Done in the pack: profiles `cms-content` and `cms-theme` |
| Cheaper contrast for a few elements | Phase 1 | Not needed: the 108 ms was shared work charged to the first rule; scans without `contrast-computable` are slower. All three contrast rules cost about 12% of a scan |
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
