# SureA11y for WordPress

The WordPress plugin of SureA11y for CMS. GPL-2.0-or-later, as WordPress.org
requires; the panel and the pack it uses are MPL-2.0.

## What it does

A block editor sidebar, "Accessibility", lists what the checker finds in the
post, grouped: to fix, likely problems, needs a person, probably fine. Each
finding has "Show", which selects its block, and "Next finding" goes through
them in order.

- **Where it checks:** the post's blocks, rendered as WordPress saves them,
  in a hidden frame with the editor's styles (`@surea11y/panel`'s sandbox),
  never the editor's own markup.
- **When:** when the sidebar opens, then about a second after each pause in
  editing, while it stays open.
- **What:** the `cms-content` profile of `@surea11y/pack-cms`: WCAG 2.2 A and
  AA rules about content, the content best practices, and the pack's own.
- **Nothing for visitors:** it loads only in the editor, for people who can
  edit posts, and the engine only inside its frame. It sends nothing anywhere.

## Files

| File | What it is |
| --- | --- |
| `surea11y.php` | The plugin: enqueues the editor script and passes its settings. |
| `src/editor.js` | The sidebar, on WordPress's globals, with no build step. |
| `build/` | Built by `node scripts/build.mjs` at the repository root: `panel.js`, `engine.js` (core with the pack built in), the engine's message files. Not committed. |
| `readme.txt` | The WordPress.org readme. |

## Trying it

From the repository root: `npm install`, `node scripts/build.mjs`, then link
or copy `plugins/wordpress` into a site's `wp-content/plugins/surea11y` and
activate it. Until core releases the rules the pack uses, link
`node_modules/@surea11y/core` to a checkout of core's main branch.

End-to-end tests run against such a site: see `tests/e2e/`.
