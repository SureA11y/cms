# Decisions

A running log, newest first. Each entry says what was decided and why.

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

- [ ] Licence for this repository (must be GPL-compatible for WordPress.org;
      MPL-2.0, as used by core, needs checking)
- [ ] Confirm the `surea11y` slug is free on WordPress.org and Drupal.org
- [ ] Whether a hosted site-wide scanning service is in scope at all
