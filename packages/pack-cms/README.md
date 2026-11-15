# @surea11y/pack-cms

A pack for [`@surea11y/core`](https://github.com/SureA11y/core) that sorts
core's rules by who can fix what they find, for tools that show results to
the people who write a site's content, and adds the checks authors need that
WCAG doesn't make a rule of.

## Profiles

| Profile | Runs | For |
| --- | --- | --- |
| `cms-content` | Core's WCAG 2.2 A and AA rules about content (text, images, links, headings, lists, tables, embeds), the best-practice rules about content, `link-name-quality-link-only`, and this pack's rules. Rules that judge the theme's style sheets, layout or page structure are left out. | Authors, in the editor |
| `cms-theme` | The rules left out of `cms-content`: style sheets (text spacing, focus indicators, orientation), layout (target size, focus hidden behind sticky boxes) and page structure (landmarks, skip links, page title, page language). | Whoever can change the theme |

The two share no core rule, and every rule they name exists (`tests/profiles.test.js`).

```js
const pack = require('@surea11y/pack-cms');
runDomRulesInPage(url, '.entry-content', { packs: [pack], profile: 'cms-content' });
```

## Its rule

`cms-link-to-document` (manual, best practice): links to PDF, Office and
other document files. It asks whether the link says what kind of file it
opens (`DOCUMENT_LINK_FORMAT_UNSTATED`) and, either way, that the document be
checked on its own (`DOCUMENT_LINK`). WCAG requires neither, so it maps to no
criterion and never fails one.

## Checklist items

`cms-images`, `cms-headings`, `cms-links` and `cms-tables` group the rules
an author meets most into one result each.

## Working on it

```sh
npm install
npm test        # the pack's tests, in jsdom
npm run lint    # its rules against core's lint rules
npm run docs    # docs/RULE_CATALOG.md, and the examples run in Chromium
```

It needs the core release that ships `link-name-quality-link-only` and
`p-as-heading`'s `BOLD_SHORT_PARAGRAPH`; when that release is out, raise
`core` in `index.js` and the ranges in `package.json` to it. Until then,
develop against a local build of core: `npm install`, then replace
`node_modules/@surea11y/core` with a link to the core checkout.

## Licence

MPL-2.0, as core.
