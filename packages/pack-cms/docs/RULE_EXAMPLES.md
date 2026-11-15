# Rule examples

Examples of each rule's outcomes, a `## <rule id>` section per rule. Each example is a label (**Passed**, **Failed**, **Flagged (cantTell)** or **Not applicable**) over an `html` block. `npm run docs` runs every example in Chromium with the pack and records any that gives another outcome than its label in `scripts/data/rule-examples-outcomes.json`; `npm run docs:check` fails when that record, or the catalog, is stale.

## cms-link-to-document

**Flagged (cantTell)**
```html
<p>Download the <a href="/files/annual-report-2026.pdf">annual report</a>.</p>
```
The link opens a PDF, and nothing says so (`DOCUMENT_LINK_FORMAT_UNSTATED`).

**Flagged (cantTell)**
```html
<p><a href="/files/annual-report-2026.pdf">Annual report</a> (PDF, 2 MB)</p>
```
The paragraph names the format; the document still needs a check of its own (`DOCUMENT_LINK`).

**Not applicable**
```html
<p><a href="/reports/">Reports</a></p>
```
The link leads to a page, not a document.
