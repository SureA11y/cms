# Plan

How SureA11y for CMS gets from research to a first release, and beyond.
Written from the [research report](research/2026-10-04-cms-checkers.md) and
the [decisions](decisions.md) made so far. Last updated 2026-10-04.

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
@surea11y/core          the engine (SureA11y/core, MPL-2.0)
      │
@surea11y/panel         CMS-agnostic layer (this repo, MPL-2.0)
  ├─ runner             loads the engine where the content is rendered,
  │                     scopes the scan, schedules it, strips results
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
```

## Phases

Each phase ends with an exit check. A phase does not start until the
previous one passes, unless noted.

### Phase 0: Prototype (measure before building)

Answer the questions the research could not, in a real browser:

- [ ] Load the browser bundle inside the WordPress block editor's canvas
      (an iframe) using a local WordPress (wp-env or WordPress Playground).
- [ ] Time a scan on short, typical and long posts; with and without the
      contrast rules.
- [ ] Confirm scoping to the post content works, and what the template adds
      when the whole page is scanned.
- [ ] Try mapping a finding's element back to its block (block client ID).
- [ ] Check the front-end view for logged-in users: same engine, published
      page.

**Exit:** real timings, and a decision on checking while typing (live, after
a pause in typing, or on demand). If a typical post scans in under about
200 ms, live checking after a pause is the default.

### Phase 1: Panel and WordPress plugin, first usable version

Panel:

- [ ] Runner: scope, debounce, strip `engineOptions` from results, refuse a
      scope that matches nothing, exclude rules that touch the live page
      (`.focus()`, injected styles).
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

**Exit:** installed on at least three real sites with different themes; no
editor-visible slowdown; template problems never shown as the author's.

### Phase 2: What sets us apart

- [ ] **Questions instead of warnings.** Each uncertain result becomes a
      question the author answers (Yes / No / Not sure). Answers are kept
      until the content they refer to changes.
- [ ] **Evidence trail.** A dated record of results and answers per page,
      mapped to WCAG 2.2 and, optionally, EN 301 549. Export as CSV and EARL.
- [ ] **Site overview** built from editors' own page views (no crawler):
      top problems, pages with most problems, recent reviews.
- [ ] **WordPress Block Validation Framework** integration behind a setting,
      while it is experimental: our checks appear where WordPress shows its
      own, and errors can block publishing if the site chooses.
- [ ] Content checks the engine lacks today (see "Engine dependencies").

**Exit:** an editor can go from "problems found" to "every item fixed or
answered" on a page, and export the evidence.

### Phase 3: Public release on WordPress.org

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
| EN 301 549 mapping and statement support | 2 | Possibly |
| Site overview from page views | 2 | Possibly (advanced reports) |
| Publish blocking via WordPress validation | 2 | No |
| Multisite network management | Later | Likely |
| Scheduled reports by email | Later | Likely |
| Hosted crawling | Deferred | Likely |

## Engine dependencies

Changes wanted in SureA11y/core, and what the panel does until they land.

| Core change | Needed by | Until then |
| --- | --- | --- |
| Stop copying `engineOptions` (with the whole translation) into every result | Phase 1 | Strip it before saving |
| Flag a scope that matches nothing; flag a malformed `runOnly` | Phase 1 | Check the selector before scanning |
| Option to skip rules that touch the live page | Phase 1 | Exclude them by ID |
| `img-alt-quality` tells suspicious alt text from ordinary alt text | Phase 1 | Accept the noise, or hide that rule |
| A question for every uncertain result, including manual rules | Phase 2 | Questions written in the panel |
| Stable identity per finding, to match answers across scans | Phase 2 | Panel computes its own key |
| Content checks: URL as link text, PDF links, ALL CAPS, fake lists, adjacent duplicate links, readability | Phase 2 | Implement in the panel as custom rules |
| Scan a given element or document | Only if Phase 0 shows it is needed | Load the bundle inside the iframe |
| Yield to the browser during a scan | Only if Phase 0 shows it is needed | Scan after a pause in typing |

## Risks

| Risk | Mitigation |
| --- | --- |
| Scans too slow for live checking | Phase 0 measures first; fall back to scanning after a pause or on demand |
| The block editor changes and breaks the plugin (it broke Editoria11y) | Use public editor APIs only; test against Gutenberg's nightly builds |
| Noise from themes and plugins | Content-area scoping and attribution from Phase 1 |
| Stored results become attack surface (Editoria11y's 2026 advisory) | Capability checks on every endpoint; security review before Phase 3 |
| Being mistaken for an overlay | No front-end changes, no "compliance" wording, explicit statement |
| WordPress's validation framework changes or never reaches core | Integration behind a setting; our own sidebar works without it |

## Open

- [ ] Confirm the `surea11y` slug on WordPress.org and Drupal.org.
- [ ] Choose the headless platform after the Phase 4 investigation.
- [ ] Whether, and when, this repository becomes public.
