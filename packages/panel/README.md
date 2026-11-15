# @surea11y/panel

The part of SureA11y for CMS that knows no CMS. An adapter gives it the
content items (blocks, fields), the styles they are drawn with and what to
do on "Show"; the panel checks them and lists what it finds.

| Module | What it does |
| --- | --- |
| `sandbox.js` | A hidden frame where items are rendered as siblings, as the published page has them, each marked with its id, and scanned. Its own Content Security Policy keeps the author's content from running scripts, loading frames or fetching anything. The engine loads only there. |
| `findings.js` | Turns a scan result into findings tied to their item, grouped as core's report groups them (to fix, likely problems, needs a person, probably fine), with core's finding identity as their key. |
| `scheduler.js` | Scans after a pause in editing, one scan at a time. |
| `messages/` | Plain-language wording for the findings authors meet most, passed to the engine by its message keys, in English and Spanish; and the panel's own words. |
| `ui/results-element.js` | `<surea11y-results>`: the accessible list of findings. |

MPL-2.0. Tests: `npm test` (jsdom).
