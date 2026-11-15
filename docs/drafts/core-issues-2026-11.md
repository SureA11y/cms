# Draft issues for SureA11y/core

Drafted on 2026-11-15 from the [Phase 0 results](../../prototypes/phase-0/RESULTS.md),
against `@surea11y/core` 1.17.0. Not filed yet. Each section below is one
issue: the heading is its title, the text under it is its body. Once filed,
link each from "Engine dependencies" in [`PLAN.md`](../PLAN.md) and delete
this file.

Examples were reproduced in Chromium with the browser bundle, scoped to
`main`, with the default profile and with `wcag22-aaa`; both gave the same
results.

---

## link-name-quality doesn't ask about "click here" when the sentence around it gives context, even under 2.4.9

`link-name-quality` leaves out a generic link name ("click here", "read more") when the paragraph, list item or cell around it has text of its own, and that is right for 2.4.4, where the link's context counts. The rule also maps to 2.4.9 Link Purpose (Link Only), where context does not count, but a scan under `wcag22-aaa` leaves out the same links. A link that only makes sense with the sentence around it is never asked about against 2.4.9.

Content authors write exactly this pattern, and every other content checker we compared flags it.

### Examples (Chromium, 1.17.0)

| Markup | Default profile | `wcag22-aaa` |
|---|---|---|
| `<p><a href="/more">Read more</a></p>` | `cantTell` `GENERIC_LINK_TEXT` | `cantTell` `GENERIC_LINK_TEXT` |
| `<p>For the pricing sheet, <a href="/prices">click here</a>.</p>` | not reported | not reported |
| `<p>Our 2026 plans changed. <a href="/plans">Read more</a> about them.</p>` | not reported | not reported |

### Spec

- WCAG 2.4.9 Link Purpose (Link Only), Level AAA: "A mechanism is available to allow the purpose of each link to be identified from link text alone, except where the purpose of the link would be ambiguous to users in general."
- WCAG 2.4.4 Link Purpose (In Context), Level A, lets the surrounding sentence count; 2.4.9 does not.

### Proposed fix

- A generic link name with context around it is asked about with a new reason code, such as `GENERIC_LINK_TEXT_IN_CONTEXT` (`cantTell`), mapped to 2.4.9 only. It is reported when the scan's target includes AAA, and by a scan that opts in to it.
- It also carries the `best-practice` tag, so a profile for content authors can include it without targeting AAA.
- `GENERIC_LINK_TEXT` and what it reports today are unchanged: a new code is a minor change, and existing baselines keep matching.
- The steps for the new code say the sentence may make the link clear in context, and ask whether the link text alone says where it goes.

Found in the CMS Phase 0 comparison.

---

## No rule asks about links to PDF and Office documents

A link to a PDF, Word, Excel or PowerPoint file sends the reader to a document the page's own checks don't cover, often opened in another application. No rule asks about it unless the link's whole name is a bare format word ("PDF"), which `link-name-quality` already reports.

Every other content checker we compared flags these links, typically as a warning that the document needs its own accessibility check and that the link should say what it opens.

### Examples (Chromium, 1.17.0)

| Markup | Result |
|---|---|
| `<a href="/files/annual-report-2026.pdf">annual report</a>` | not reported |
| `<a href="/files/budget.xlsx">2026 budget</a>` | not reported |
| `<a href="/files/form.docx">application form</a>` | not reported |
| `<a href="/files/guide.pdf">Guide (PDF, 2 MB)</a>` | not reported |

### Spec

- Telling users the format and size of a linked file before they open it is a common advisory practice for 2.4.4 (to verify against the current Understanding document before filing).
- A linked document has to meet the same requirements as the page (for PDF, the PDF techniques and PDF/UA), but a web page check can't open it.

### Proposed fix

- A new manual rule, such as `link-to-document`, tagged `best-practice` and `links`, mapped to no WCAG criterion so it never fails one.
- It applies to links whose `href` path ends in a document extension (`.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.odt`, `.ods`, `.odp`, `.rtf`, `.epub`), ignoring query and fragment, or that have a `type` attribute naming such a format.
- Two reason codes, both `cantTell`:
  - `DOCUMENT_LINK_FORMAT_UNSTATED`: the link's name doesn't mention the format. Asks whether the reader is told what opens.
  - `DOCUMENT_LINK`: the name mentions it. Asks only that the document itself be checked.
- Steps: open the document, check it with a tool made for its format, and check the link says the format (and size, for large files).
- Format words are recognised in the five supported languages, like `link-name-quality`'s phrases.

Found in the CMS Phase 0 comparison.

---

## p-as-heading misses a bold paragraph used as a heading at body text size

`p-as-heading` asks about a short paragraph whose text is all bold only when it is drawn at 18px or more. Authors who make a "heading" by bolding a line usually leave it at the body size, and those are not asked about. Every other content checker we compared flags them.

### Examples (Chromium, 1.17.0, body text 16px)

| Markup | Result |
|---|---|
| `<p><strong>Next steps</strong></p><p>Body text follows here with several words in it.</p>` | not reported |
| `<p><b>Opening hours</b></p><p>Monday to Friday.</p>` | not reported |
| `<p style="font-size:20px"><strong>Big bold line</strong></p><p>More text.</p>` | `cantTell` `BOLD_LARGE_PARAGRAPH` |

### Spec

- WCAG 1.3.1 Info and Relationships; F2 (using changes in text presentation to convey information without using the appropriate markup).
- H42 (using h1 to h6 to identify headings).

### Proposed fix

- Keep `BOLD_LARGE_PARAGRAPH` and `BOLD_LARGE_DIV` as they are.
- Add a reason code, such as `BOLD_SHORT_PARAGRAPH` (`cantTell`), for a `<p>` below the size threshold whose visible text is all bold, that:
  - is short (the rule's existing length limit),
  - doesn't end in sentence punctuation (`.`, `!`, `?`, `:` or their equivalents in the supported languages), and
  - is followed by a block sibling whose text is not all bold.
- The last two conditions keep out a bold sentence used for emphasis and a run of bold lines such as an address.
- A new code is a minor change; existing findings keep their identity.

Found in the CMS Phase 0 comparison.

---

## td-has-header doesn't ask about tables smaller than 4 by 4 that have no headers

`td-has-header` only looks at tables with at least 4 rows and 4 columns. A small data table with no header cells, the kind authors build in a CMS table block (a price list, opening times), is never asked about. Every other content checker we compared flags it.

### Examples (Chromium, 1.17.0)

| Markup | Result |
|---|---|
| A 3-row, 2-column table of `<td>` only ("Plan / Price", "Basic / 10", "Pro / 20") | not reported |
| A 4-row, 4-column table of `<td>` only | `cantTell` `TD_TABLE_NO_HEADERS` |

### Spec

- WCAG 1.3.1 Info and Relationships; H51 (using table markup to present tabular information); F91 (failure for not correctly marking up table headers).

### Proposed fix

- Ask about a table with at least 2 rows and 2 columns, no header cell at all and no `colspan`/`rowspan`, below the 4 by 4 size, with a new reason code such as `TD_SMALL_TABLE_NO_HEADERS` (`cantTell`).
- Keep the rule's existing layout signals (nested blocks, form controls or long prose in cells) as leans, so a small layout table leans pass.
- Tables of 4 by 4 or more keep `TD_TABLE_NO_HEADERS` and their current findings: a new code is a minor change and baselines keep matching.

Found in the CMS Phase 0 comparison.

---

## Rules don't say whether they judge the content or the site's styles

A tool that shows results to content authors needs to know which rules judge what the author wrote (text, images, links, headings, tables) and which judge the site's CSS and layout (text spacing, focus indicators, target size, orientation). An author can fix the first kind and not the second. Nothing in the catalog says which is which, so each integration has to keep its own list, which goes stale as rules are added.

In the CMS prototype, leaving out 11 rules that judge styles and layout gave identical findings on the test posts and cut scan time by half or more (long post, Chromium: 292 to 215 ms; without contrast, 217 to 74 ms).

### The 11 rules left out in the prototype

`text-spacing-content-loss`, `css-focus-indicator-suppressed`, `css-hidden-focus`, `focus-not-obscured-minimum`, `focus-not-obscured-enhanced`, `target-size-minimum`, `target-size-enhanced`, `identical-iframes-same-purpose`, `css-orientation-lock`, `aria-hidden-focus`, `iframe-focusable-content`.

This list is the prototype's judgement, not a proposal for the final grouping.

### Proposed fix

- A catalog field on every rule, such as `judges: 'content' | 'presentation' | 'both'`, described in `RULE_AUTHORING.md` and checked by a test so that no rule ships without it.
- A way to select by it, such as `runOnly: { judges: ['content'] }`, beside the existing selections.
- Packs can set it on their own rules.
- Additive: a new catalog field and selection are a minor change.

Found in the CMS Phase 0 comparison.

---

## contrast-computable takes as long as the rest of a content scan put together

On a long, text-heavy page, `contrast-computable` is by far the slowest rule. In the CMS prototype (Chromium, 1,262 elements, all rules), the scan timed 259 ms across 149 rules, and `contrast-computable` alone took 108 ms. `contrast-minimum` and `contrast-enhanced` took 3 and 4 ms. A tool that rescans while an author writes can't afford it on every pass.

### Measurements (Chromium, `profileRules`, long post, 1.17.0)

| Rule | ms |
|---|---|
| `contrast-computable` | 108 |
| `text-spacing-content-loss` | 45 |
| `css-focus-indicator-suppressed` | 33 |
| `identical-iframes-same-purpose` | 10 (the page has no iframes) |
| Next 145 rules together | 63 |

### Questions to answer

- Does `contrast-computable` repeat work the other contrast rules already did, such as resolving backgrounds, that could be shared through the scan's caches?
- Why does `identical-iframes-same-purpose` take 10 ms on a page with no iframes?

### Proposed fix

- Profile `contrast-computable` and share what it computes with the other contrast rules.
- A way to check contrast for a given set of elements only (for example, those whose colours an author set), so an integration can run it often on a little and rarely on everything.
- Add the long test post to the performance history, so the improvement is measured and kept.

Found in the CMS Phase 0 comparison.
