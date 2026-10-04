# Decisions

A running log, newest first. Each entry says what was decided and why.

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
