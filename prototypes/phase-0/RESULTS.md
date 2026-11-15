# Phase 0 results

Measured on 2026-11-15 with `@surea11y/core` 1.17.0, WordPress 7.1.4 and
the Twenty Twenty-Five theme, in Chromium 1243 at 1280×800. "1×" is this
machine's full speed; "4×" slows the CPU four times, to approximate a modest
laptop. Raw numbers are in `results/raw/` (not committed); the scripts that
produced them are in this folder.

## Summary

1. **Do not scan the editor's own page.** In the block editor, most findings
   are about the editor's markup, not the author's content (1,213 questions
   on the long post, 602 of them about `aria-multiline` on the editor's
   `role="document"`). It also misses a skipped heading level the published
   page shows.
2. **Scan a sandbox instead.** Rendering the blocks as WordPress saves them
   into a hidden frame that carries the canvas's styles gives the same
   findings as the published page, maps every content finding to its block,
   never takes focus from the author, and is faster than scanning the editor.
3. **Split rules into content and theme.** Leaving out 11 rules that judge
   the theme's CSS or layout gives identical findings on these posts and
   cuts scan time by half or more. Contrast is the most expensive rule left.
4. **We match the other checkers on 3 of the 7 kinds of mistake planted in
   the posts, and miss 4** that all three of them catch: "click here" links,
   PDF links, bold paragraphs used as headings, and tables without headers.
   These are the engine's known content-check gaps, and they now block
   parity.
5. **Speed is close enough, not yet better.** Content-only and without
   contrast, our scan of a typical post takes 22 ms against Sa11y's 19 ms,
   and 74 ms against 41 ms on the long post. We run WCAG rules with
   uncertainty and "How to check" steps; they run lighter heuristics.
6. **The engine bundle is the heaviest asset** of any checker tested:
   1.87 MB (0.49 MB compressed), 26 to 43 ms to evaluate at 1×, 141 to
   153 ms at 4×. Load it only when the checker is used.

## Test content

Three posts built from the same sections (`make-content.php`):

| Post | Top-level blocks | Elements scanned in the sandbox |
| --- | --- | --- |
| Short | 11 | 41 |
| Typical | 61 | 196 |
| Long | 401 | 1,262 |

Each section plants common editor mistakes: an image whose alt text is its
file name, an image with empty alt, a "click here" link to a PDF, a bold
paragraph used as a heading, a table without headers in some sections, a
heading that skips a level in one, and a repeated link to the same help page.

## Where to scan

Median scan time in ms, all rules, scoped to the post content:

| Where | Short 1× | Typical 1× | Long 1× | Short 4× | Typical 4× | Long 4× |
| --- | --- | --- | --- | --- | --- | --- |
| Editor canvas (the editor's own page) | 78 | 138 | 541 | 272 | 670 | 2,856 |
| Published page, content area | 57 | 62 | 200 | 283 | 300 | 1,021 |
| Sandbox, all rules | 76 | 92 | 292 | 395 | 433 | 1,611 |
| Sandbox, content-only rules | 23 | 40 | 215 | 108 | 184 | 665 |
| Sandbox, content-only, no contrast | 15 | 22 | 74 | 74 | 106 | 277 |

The sandbox's first scan includes creating the frame and evaluating the
engine in it (68 to 176 ms). Serialising the blocks and rendering them into
the sandbox costs 1 to 6 ms at 1× and up to 88 ms on the long post at 4×.

What the template adds: scanning the whole published page instead of the
content area adds about 60 findings from the theme (header, navigation,
footer) to every post. On the short post, 59 of 60 findings were the
theme's.

## Mapping findings to blocks

In the sandbox, every top-level block is wrapped with its client ID. All
content findings mapped to a block: 1 of 2, 13 of 14 and 90 of 91; the one
left over in each post is the page-level `manual-review` reminder. Nested
blocks (list items inside a list) map to their top-level block for now.

In the editor canvas, findings also map to blocks through `data-block`, but
the findings themselves are mostly about the editor (point 1).

## Side effects

No scan moved focus, scrolled the page, changed the selected block or added
style tags, in the editor or the sandbox. After typing in the editor, focus
stayed in the paragraph while the sandbox scanned.

## "How to check" in the browser

`@surea11y/core/how-to-check`, bundled for the browser, is 14 KB. The English
review dictionary is 279 KB; fetching and parsing it took 7 to 10 ms, and
applying it 2 to 9 ms. Every uncertain finding got steps (31 of 31, 184 of
184, 1,213 of 1,213).

## Where the time goes

Per rule, sandbox, long post, 1×, all rules (259 ms timed in total):

| Rule | ms | Judges |
| --- | --- | --- |
| `contrast-computable` | 108 | Content colours (and the theme's) |
| `text-spacing-content-loss` | 45 | Theme CSS |
| `css-focus-indicator-suppressed` | 33 | Theme CSS |
| `identical-iframes-same-purpose` | 10 | No iframes in these posts |
| `css-hidden-focus` | 9 | Theme CSS |
| Next 144 rules | 54 | |

## Compared with other checkers

Each checker was active alone, on the same posts, in the same WordPress.

### What each found on the typical post

| Planted mistake (count) | SureA11y (sandbox) | Editoria11y 3.0.8 | Sa11y 1.2.9 | Equalize Digital 1.52.0 |
| --- | --- | --- | --- | --- |
| Alt text is a file name (2) | Yes, asks | Yes, error | Yes, error | Yes, warning |
| Empty alt, decorative? (2) | Yes, asks | Yes, warning | Yes, warning | Yes, warning |
| Skipped heading level (1) | Yes, asks | Yes, warning | Yes, error | Yes, error |
| Repeated link to the same page (6) | Yes, asks | No | Yes (5), warning | No |
| "click here" link text (6) | **No** | Yes | Yes | Yes |
| Link to a PDF (6) | **No** | Yes | Yes | Yes |
| Bold paragraph used as a heading (6) | **No** | Yes | Yes | Yes |
| Table without headers (2) | **No** | Yes, error | Yes, error | Yes, error |
| Readability | No | No | Yes | No |
| Findings in the theme's header and navigation | 0 | 0 | 0 | 11 |

### Speed and weight

| | SureA11y | Editoria11y | Sa11y | Equalize Digital |
| --- | --- | --- | --- | --- |
| When it checks | Our choice (sandbox, any time) | Live in the editor; page view | Page view (preview, published) | On save, in a hidden frame |
| Check time, typical / long post, 1× | 22 / 74 ms content-only without contrast; 40 / 215 ms with contrast | Not separable (results 174 / 247 ms after navigation start, page load included) | 19 / 41 ms (its own timer) | Results stored 15 to 38 s after saving (approximate: includes this script's polling) |
| Script weight, uncompressed | 1.87 MB engine + 14 KB helper (+ 291 KB Spanish) | 623 KB on the page, 646 KB in the editor | 260 KB | 284 KB in the editor |

Opening the editor and typing showed no difference between checkers beyond
run-to-run noise: the editor alone varied from 426 to 1,602 ms of long
tasks on opening, and typing eight characters took 250 to 700 ms with or
without a checker. A finer test is needed to measure typing lag.

## Recommendations

These are proposals for the maintainer to accept or change.

1. **Scan a sandbox rendering of the blocks**, never the editor's own page.
   Keep the published-page scan for logged-in editors as a second view.
2. **Two rule sets:** a content set for authors (the default in the editor)
   and a theme set (CSS, layout, focus, target size) shown to people who can
   change the theme. This is also the content-vs-template split from the
   plan.
3. **Contrast separately:** only for blocks where the author chose colours,
   or after a longer pause, so the frequent scan stays near 20 ms on a
   typical post.
4. **Scan after a pause in typing** (about one second), not live per
   keystroke. At 4×, a typical post costs about 100 ms content-only without
   contrast: acceptable after a pause, too much per keystroke.
5. **Close the four content-check gaps before Phase 1 ships**, to at least
   match the others: "click here" and similar link text inside a paragraph,
   links to PDF and Office files, bold paragraphs used as headings, and
   tables without headers, plus readability later. Build them as a pack, or
   ask core for them; both keep WCAG results clean.
6. **Load the engine lazily** (when the checker opens or after the editor is
   idle), and keep it out of the published page entirely for visitors.
7. **Ask core** for two things the prototype had to work around: an
   official content-vs-theme rule grouping, and a cheaper contrast pass for
   a small set of elements.

## Limits of these measurements

- One machine, one theme, synthetic posts. Real sites have more varied
  blocks, dynamic blocks and plugins.
- The 4× CPU slowdown approximates a slower computer; it does not model a
  slow network or memory pressure.
- Competitors were timed differently: Sa11y by its own timer, the others by
  this script. Treat their times as indications, not benchmarks.
- Dynamic blocks (rendered by the server) are not in the sandbox yet: their
  saved HTML is empty. They need a server render or the published-page
  view.
- Nested blocks map to their top-level block only.
- PHP's built-in server sends files uncompressed, so download sizes here
  are uncompressed sizes.
