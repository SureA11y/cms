# Content checks: what changed in core, what went to the pack

As of 2026-11-15, against `@surea11y/core` 1.17.0. Phase 0 found four kinds
of author mistake that other CMS checkers catch and core did not, and two
performance concerns. The core changes are in
[SureA11y/core#399](https://github.com/SureA11y/core/pull/399); the pack is
[`packages/pack-cms`](../../packages/pack-cms/). Each was checked against WCAG itself (w3.org) before
any code was written, and done in the place WCAG puts it.

## Summary

| Gap from Phase 0 | WCAG basis (checked at the source) | Where | Result |
| --- | --- | --- | --- |
| Small tables without headers | F91 applies to all data tables, whatever their size | Core: `td-has-header` from 2 by 2 (was 4 by 4) | Asked about (`TD_TABLE_NO_HEADERS`) |
| Bold line used as a heading at body size | F2: structure shown only by presentation | Core: `p-as-heading`, new `BOLD_SHORT_PARAGRAPH` | Asked about |
| "click here" whose sentence explains it | 2.4.4 counts the context; 2.4.9 doesn't; F84 | Core: new rule `link-name-quality-link-only` (2.4.9, AAA), a variant of `link-name-quality` | Asked about in AAA scans and in the pack's content profile |
| Links to PDF and Office files | No requirement: not even an advisory technique of 2.4.4 | Pack: `cms-link-to-document`, best practice | Asked about under the pack |
| Content vs. theme grouping | Not WCAG: a matter of who can fix what | Pack: profiles `cms-content` and `cms-theme` | Done |
| `contrast-computable` "takes 108 of 259 ms" | Not a WCAG question | Nowhere | **Not a real cost**: see below |
| `identical-iframes-same-purpose` "10 ms with no iframes" | Not a WCAG question | Nowhere | **Not a real cost**: see below |

## What Phase 0 got wrong about performance

Per-rule timings charge the work every rule shares (reading styles and
visibility once per scan) to the first rule that needs it. Measured as what
a scan saves without a rule, on fresh pages in Chromium:

- Without `contrast-computable`, scans are **5% slower** on the long post
  and **7% slower** on core's composite page: `contrast-minimum` and
  `contrast-enhanced` reuse what it computes.
- All three contrast rules together cost about 12% of a scan of the long
  post (44 of 353 ms).
- Without `identical-iframes-same-purpose`, nothing changes (within noise).

So there was nothing to fix. The recommendation to run contrast apart in the
editor still stands, for responsiveness, but core's contrast rules are not
slow.

## Performance of the changes

Chromium, `wcag22-aa`, fresh page per scan, builds alternating, 11 scans per
page, median:

| Page | Elements | 1.17.0 | Branch | Change | New findings |
| --- | --- | --- | --- | --- | --- |
| Core's composite page (every fixture) | 8,931 | 2,244 ms | 2,276 ms | +1.4% (spread 10%) | 6 table questions |
| 400 small tables | 6,009 | 641 ms | 689 ms | +7.3% | 400 |
| 800 paragraphs, half bold titles | 1,209 | 212 ms | 234 ms | +10.6% | 400 |
| 1,600 links in sentences | 2,409 | 475 ms | 495 ms | within noise | none under AA |
| WordPress typical post (published) | 348 | 190 ms | 184 ms | within noise | 6 |
| WordPress long post (published) | 1,072 | 305 ms | 330 ms | +8% (spread 11%) | 40 |

The first version of the `p-as-heading` change cost the rule about 50% more
on the composite page with identical results: it worked out visibility for
bold text the new check could never ask about. Exact early exits removed
that; CPU profiles of cold scans now show about 2 ms of extra work on that
page, against ±50 ms of run-to-run noise. In an AAA scan,
`link-name-quality-link-only` adds about 2% on the page of 1,600 links.

## Quality checks

- Core's full suite with Chromium: 6,806 tests on 1.17.0, all passing;
  6,819 on the branch, all passing, none skipped.
- W3C ACT test cases: 957 across 60 rules, **0 false positives**, identical
  to 1.17.0 rule by rule, in jsdom and in Chromium.
- Every generated file and `:check` command CI runs is current.

## Compared with axe-core 4.14.0 and Alfa 0.120.0

On pages holding only each planted mistake (Chromium; axe with its WCAG A,
AA, AAA and best-practice rules; Alfa with all its rules):

| Mistake | Core (branch) | axe-core | Alfa |
| --- | --- | --- | --- |
| "click here" / "Read more" explained by its sentence | Asked (2.4.9) | No | No |
| "Read more" alone, twice to different places | Asked | Asked (`identical-links-same-purpose`) | Asked (r41) |
| Link to a PDF without saying so | Pack only (best practice) | No | No |
| Bold line at body size over plain text | Asked | No | No |
| Small table without headers | Asked | No | No |
| Alt text that is a file name | Asked | No | Asked (r39) |

On the whole published typical post, axe reported a skipped heading level
(`heading-order`, best practice) that a plain `wcag22-aa` scan of core
doesn't run, as core treats it as best practice too; the pack's
`cms-content` profile runs it. Both engines report many findings about the
theme (target size, line height, ARIA on the theme's markup), which is why
the pack separates content from theme.
