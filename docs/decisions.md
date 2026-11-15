# Decisions

A running log, newest first. Each entry says what was decided and why.

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
