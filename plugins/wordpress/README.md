# SureA11y for WordPress

The WordPress plugin of SureA11y for CMS. GPL-2.0-or-later, as WordPress.org
requires; the panel and the pack it uses are MPL-2.0.

## What it does

A block editor sidebar, "Accessibility", lists what the checker finds in the
post, grouped: to fix, likely problems, needs a person, probably fine. Each
finding has "Show", which selects its block, and the arrows go through them
in order. Its toolbar button shows how many there are to fix or confirm, and
the pre-publish checks show the counts in one line (never blocking).

On a preview or a published page, "Check accessibility" in the toolbar opens
the same list at the side of the page, for the whole page: findings in the
post's content are marked "Your content", the rest "Theme or template".

- **Where it checks:** the post's blocks, rendered as WordPress saves them,
  in a hidden frame with the editor's styles (`@surea11y/panel`'s sandbox),
  never the editor's own markup.
- **When:** once the editor has loaded and the browser is idle, then after
  each pause in editing: one second while the sidebar is open, three
  otherwise. The page checker runs only when asked.
- **What:** the `cms-content` profile of `@surea11y/pack-cms`: WCAG 2.2 A and
  AA rules about content, the content best practices, and the pack's own.
  Contrast runs apart, only on blocks with colours the author chose, and only
  when they change.
- **Which block:** every block, inner ones included, is tagged with its id
  while the checker renders the post (never when the post is saved), so a
  finding names the block it is in. Images and tables offer to open the
  setting that fixes them.
  The page checker uses `cms-page`: those and the theme's rules together.
- **Where the content is on a page:** `.wp-block-post-content`,
  `.entry-content` or `.post-content`; a theme with its own can name it with
  the `surea11y_content_selector` filter.
- **Reviews:** "Reviewed, it's fine", with who, when and a note, is kept
  with the post and shared with everyone who edits it, in the editor and on
  the page (`/wp-json/surea11y/v1/reviews/<post>`). "Hide for me" is one
  person's.
- **Settings:** Settings → Accessibility checker: who sees the checker, who
  can review, where the content is on a page, the background check, and
  rules turned off.
- **Nothing for visitors:** it loads only for people who can edit the post,
  and the engine only when a check runs. It sends nothing anywhere.

## Files

| File | What it is |
| --- | --- |
| `surea11y.php` | The plugin: enqueues the scripts, adds the toolbar entry, and passes the settings as JSON data. |
| `src/editor.js` | The sidebar, the toolbar count and the pre-publish line, on WordPress's globals, with no build step. |
| `src/editor.css` | The count on the toolbar button and the pre-publish line. |
| `src/page.js` | The page checker on previews and published pages. |
| `includes/settings.php` | The settings page, and who may see and review. |
| `includes/reviews.php` | Shared reviews: storage and the REST route. |
| `build/` | Built by `node scripts/build.mjs` at the repository root: `panel.js` and a `panel.i18n.<locale>.js` per language, `engine.js` (core with the pack built in), the engine's message files, `rules.json`. Not committed. |
| `readme.txt` | The WordPress.org readme. |

## Trying it

From the repository root: `npm install`, `node scripts/build.mjs`, then link
or copy `plugins/wordpress` into a site's `wp-content/plugins/surea11y` and
activate it. Until core releases the rules the pack uses, link
`node_modules/@surea11y/core` to a checkout of core's main branch.

End-to-end tests run against such a site: see `tests/e2e/`.
