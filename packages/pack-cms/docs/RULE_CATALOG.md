# Rule catalog: SureA11y for CMS

The rules of SureA11y for CMS (`@surea11y/pack-cms`), a pack for `@surea11y/core`, which a scan given the pack runs as their tags and the pack's profiles say. Core's rules, and the WCAG rollups, are in core's [`RULE_CATALOG.md`](https://github.com/SureA11y/core/blob/main/docs/RULE_CATALOG.md).

Generated from the compiled engine's own catalog (`getChecksCatalog()`/`getRulesCatalog()`) and each rule's source header. Run `npx surea11y-pack docs` to regenerate this file whenever rules change. Do not hand-edit.

**1 rules total: 0 automatic (decide deterministically; can return `fail`), 1 manual (a person judges what they find; never `fail`, and `pass` only when nothing needs judging). 0 carry at least one formal WCAG Success Criterion mapping.**

The tables below are an index; [rule reference](#rule-reference) carries each rule's description, what it applies to and what it expects.

A rule with a **Margin** line measures a value against a threshold, and its check result's `margin` says how close the closest element came while still meeting it (see [`OUTPUT_SCHEMA.md`](https://github.com/SureA11y/core/blob/main/docs/OUTPUT_SCHEMA.md#a-check-result-checksresultsi)). Unlike the fields below, it is a stable contract.

Under **What a finding reports**, a rule lists the fields its findings carry in `data.details` besides `reasonCode`, and what each one means. They help to read and reproduce a finding, but apart from `reasonCode` (and the few fields [`API_STABILITY.md`](https://github.com/SureA11y/core/blob/main/docs/API_STABILITY.md) names, such as the contrast size fields) they are not a stable contract (see [`OUTPUT_SCHEMA.md`](https://github.com/SureA11y/core/blob/main/docs/OUTPUT_SCHEMA.md#an-occurrence-occurrencesi)): a field may be renamed or dropped in a minor release, so do not build on them.

See [`OUTPUT_SCHEMA.md`](https://github.com/SureA11y/core/blob/main/docs/OUTPUT_SCHEMA.md) for what `type`/`confidence`/`severity` mean on a scan result, and [`WCAG_CONFORMANCE.md`](https://github.com/SureA11y/core/blob/main/docs/WCAG_CONFORMANCE.md) for how these roll up to an SC-level conformance claim.

## Automatic rules (0), can return `fail`

| Rule ID | Title | WCAG SC | Level | Confidence | Default severity |
|---|---|---|---|---|---|

## Manual rules (1), never `fail`

| Rule ID | Title | WCAG SC | Level | Confidence | Default severity |
|---|---|---|---|---|---|
| [`cms-link-to-document`](#cms-link-to-document) | Links to documents say what they open | — | — | medium | minor |

## Profiles (3)

What a scan runs under each profile (`engineOptions.profile`): the rules its tags select, those its standard maps for its version, and those it names, less those it leaves out. A severity column gives a rule another severity under the profile.

| Profile | Tags | Mapped rules | Rules by id | Leaves out | Severity |
|---|---|---|---|---|---|
| `cms-content` | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`, `cms` | — | `heading-order`, `empty-heading`, `image-redundant-alt`, `empty-table-header`, `table-duplicate-name`, `scope-attr-valid`, `link-name-quality-link-only` | `text-spacing-content-loss`, `resize-text-content-loss`, `css-focus-indicator-suppressed`, `css-hidden-focus`, `css-orientation-lock`, `focus-not-obscured-minimum`, `target-size-minimum`, `meta-viewport-zoom-enabled`, `meta-viewport-large`, `bypass-blocks-present`, `skip-link`, `region`, `landmark-one-main`, `landmark-unique`, `landmark-no-duplicate-banner`, `landmark-no-duplicate-contentinfo`, `landmark-no-duplicate-main`, `landmark-banner-is-top-level`, `landmark-complementary-is-top-level`, `landmark-contentinfo-is-top-level`, `landmark-main-is-top-level`, `page-zones-landmark`, `page-title-present`, `page-title-patterns`, `html-lang-attr-present` | — |
| `cms-theme` | `cms` | — | `text-spacing-content-loss`, `resize-text-content-loss`, `css-focus-indicator-suppressed`, `css-hidden-focus`, `css-orientation-lock`, `focus-not-obscured-minimum`, `target-size-minimum`, `meta-viewport-zoom-enabled`, `meta-viewport-large`, `bypass-blocks-present`, `skip-link`, `region`, `landmark-one-main`, `landmark-unique`, `landmark-no-duplicate-banner`, `landmark-no-duplicate-contentinfo`, `landmark-no-duplicate-main`, `landmark-banner-is-top-level`, `landmark-complementary-is-top-level`, `landmark-contentinfo-is-top-level`, `landmark-main-is-top-level`, `page-zones-landmark`, `page-title-present`, `page-title-patterns`, `html-lang-attr-present` | — | — |
| `cms-page` | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`, `cms` | — | `heading-order`, `empty-heading`, `image-redundant-alt`, `empty-table-header`, `table-duplicate-name`, `scope-attr-valid`, `link-name-quality-link-only`, `text-spacing-content-loss`, `resize-text-content-loss`, `css-focus-indicator-suppressed`, `css-hidden-focus`, `css-orientation-lock`, `focus-not-obscured-minimum`, `target-size-minimum`, `meta-viewport-zoom-enabled`, `meta-viewport-large`, `bypass-blocks-present`, `skip-link`, `region`, `landmark-one-main`, `landmark-unique`, `landmark-no-duplicate-banner`, `landmark-no-duplicate-contentinfo`, `landmark-no-duplicate-main`, `landmark-banner-is-top-level`, `landmark-complementary-is-top-level`, `landmark-contentinfo-is-top-level`, `landmark-main-is-top-level`, `page-zones-landmark`, `page-title-present`, `page-title-patterns`, `html-lang-attr-present` | — | — |

## Rollups (4)

Each groups rules into one result, as a WCAG rollup does; the standard's own report sections show them.

| Rollup ID | Title | Rules |
|---|---|---|
| `cms-headings` | Headings are real headings, in order | `p-as-heading`, `heading-order`, `empty-heading`, `heading-quality` |
| `cms-images` | Images have a text alternative that describes them | `img-alt-present`, `img-alt-quality`, `img-alt-decorative`, `image-redundant-alt` |
| `cms-links` | Links say where they go | `link-name-present`, `link-name-quality`, `link-name-quality-link-only`, `identical-links-same-purpose`, `cms-link-to-document` |
| `cms-tables` | Tables have headers | `td-has-header`, `table-th-has-data-cells`, `empty-table-header`, `table-fake-caption` |

## Rule reference

Every atomic rule, alphabetically. "Applies to" is the rule's precondition (when it returns `notApplicable`), and "Expectation" is the condition it decides once it does apply.

### `cms-link-to-document`

**Links to documents say what they open**

manual · no formal WCAG SC mapping · confidence medium · default severity minor

Lists links to PDF, Office and other document files, asking that the link say what kind of file it opens and that the document be checked on its own.

**Applies to.** Links (`a[href]`, `area[href]`) whose address path ends in a document extension (.pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .odt, .ods, .odp, .rtf, .epub), the query and fragment left out, or whose `type` attribute names such a format.

**Expectation.** The link, or the text of the paragraph, list item or cell it sits in, says what kind of file it opens, so a reader isn't sent into another application unwarned; and the document meets the same requirements as the page, which a scan of the page can't check. Best practice: WCAG doesn't require the format to be named, and the document is outside the page.

**Reason codes.**

| Code | Outcome | Meaning | Basis |
|---|---|---|---|
| `DOCUMENT_LINK_FORMAT_UNSTATED` | cantTell | Neither the link nor the text around it names the file's format. |  |
| `DOCUMENT_LINK` | cantTell | The format is named; the document itself still needs a check of its own. |  |
