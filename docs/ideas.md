# Ideas

The starting idea: build CMS plugins (WordPress "plugins", Drupal "modules",
Joomla "extensions", headless CMS "apps") that evaluate accessibility with
`@surea11y/core`.

## Why it fits the engine

- `surea11y.browser.js` runs in the browser with zero dependencies, so a
  plugin can be a thin layer that loads the engine and shows results.
- Nothing has to leave the site: no server, no third-party service. This
  matters to many site owners.
- Translations already exist (es, fr, de, ja).

## Where checks can run

1. **While writing**: in the editor preview, as content is created. Catches
   problems at the source. Cheap to build.
2. **On the published page**: an admin-only panel that checks the real page,
   theme included. Cheap to build.
3. **Across the whole site**: crawling every page. Needs a headless browser,
   which typical PHP hosting lacks, so it means a hosted service. A business
   decision, not just a feature.

## What could make it different

- **Uncertainty as a feature.** The engine reports what it cannot decide. For
  a developer in CI that is awkward; for an editor it is ideal, because the
  author is the person who can answer "is this alt text meaningful?".
- **Content or template?** Many problems come from the theme, which an editor
  cannot fix. Telling editors "this is in your content" versus "this is in the
  template, tell your developer" is something few tools do well.
- **Standards traceability.** ACT-verified rules and an EN 301 549 mapping are
  relevant to public-sector sites, for example in the EU.

## Risks

- **Overlay stigma.** The CMS accessibility market is full of overlays that
  promise automatic compliance. Positioning must be clear: a checker, never a
  "fix" or a compliance claim.
- **Competition.** Editoria11y, Sa11y and Equalize Digital's Accessibility
  Checker already exist. See [`research/`](research/).
- **Maintenance.** Each CMS has its own release cycle, review process and
  support load. Each plugin is a product to maintain.
- **Licensing.** WordPress.org requires GPL-compatible licences; this must be
  confirmed for whatever licence this repository uses.

## Proposed shape

1. A CMS-agnostic, embeddable results panel (working name
   `@surea11y/panel`).
2. Thin wrappers around it per CMS, WordPress first.
3. Engine improvements found along the way go to `SureA11y/core` as issues,
   not into this repository.
