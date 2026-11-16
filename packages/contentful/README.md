# SureA11y for Contentful

An accessibility checker for the people who write the content, in the
entry's sidebar in Contentful. It checks what the editor writes as they
write it, names the field each problem is in, and keeps everyone's answers
in the space.

It is a checker, not an overlay. It changes nothing on the website, and it
does not claim legal compliance.

## What it does

- **A section in the entry's sidebar**, under Publish, with the same panel
  as in WordPress and Sanity: findings in groups (to fix, likely problems,
  need a person, probably fine), and the Headings and Images views.
- **Each card names its field and block**, for example "Main image" or
  "Body: Heading 4". There is no Show button: Contentful does not let an
  app move the form to a field.
- **An image's alternative text is its description**, set once on the asset
  in Media. A card about it offers "Edit the image's description", which
  opens the image.
- **Check it** shows how to check a finding by hand and asks whether it is
  fine. **Hide for me** sets a finding aside for one person.

### The editor tab (optional)

A team can also add an editor tab, next to Contentful's own "Editor", per
content type (the content type's Entry editors settings, or the editor
interface's `editors`). It draws the entry's fields with Contentful's own
field editors (`@contentful/default-field-editors`), with a line under each
field with a finding, and the panel beside them. Because the tab draws the
form, **Show** moves to the field and puts the cursor in it.

- It draws Contentful's built-in field editors only: a field whose editor
  is another app looks different there. The sidebar stays the base.
- It is about 980 KB compressed, loaded only when the tab is opened.
- **Beside Contentful's live preview**, where the tab is narrow (put it
  first among the content type's editors to have it there), it shows one
  view at a time: "Fields" or "Accessibility", with a switch at the top.
  Show moves to the field; Details on a line opens the panel.

### The live preview's page (optional)

With Contentful's live preview open, the editor tab, put first among the
content type's editors, also checks the website's preview page, as
visitors get it, and shows one list with the fields':

- A problem found in both is listed once.
- Each card says whose it is: its field ("Body: Heading 4", "Title"), or
  **Website design** for what is not in the entry's content (the pale grey
  line of a site's footer). On a page with no tags at all, what only the
  page has is labelled **On the page**: it may be content the fields don't
  show.
- **Show** moves to the field and shows the place on the preview page.
- The sidebar can't do this: Contentful hides it while the live preview is
  open.

What it needs:

1. **The preview script**, in the site's preview (draft) mode only, next to
   Contentful's live preview package. Visitors never get it.

   ```js
   import { enableSureA11yPreview } from '@surea11y/contentful/preview';

   if (draftMode) enableSureA11yPreview();
   ```

   It names each problem's field from inspector mode's attributes
   (`data-contentful-entry-id`, `data-contentful-field-id`) or from Content
   Source Maps' hidden characters (Premium plans), which it takes out of
   the page while checking and puts back at once. It answers only the app
   hosted by Contentful (`*.ctfcloud.net`) or the addresses given as
   `appOrigins`.
2. **The preview's address** on the app's configuration screen ("Preview
   addresses"). The tab accepts results from those addresses only.

The results go from the preview's frame to the tab's frame through the
browser (postMessage), never to a server. The script includes the engine,
about 530 KB compressed, loaded on the first check.

## What is checked

The entry's content, as the page will have it:

- each top-level block of a Rich Text field (headings, paragraphs, lists,
  quotes, tables, embedded images, links, links to files);
- images in Media fields.

Short and long text fields (titles, slugs, summaries), numbers, dates and
references are left out. The website decides how they appear, so only the
page can check them. Embedded entries are left out too.

## Privacy

- The check runs in the app's frame, in the browser. No content is sent
  anywhere.
- **Answers** are kept in the space, in entries of the app's own content
  type "Accessibility answers" (`surea11yReview`), one per checked entry.
  They are never published, so the Content Delivery API, and with it the
  website, never sees them.
- **Hide for me** is kept in the person's browser.
- The engine, about 530 KB compressed, is a separate file, loaded only when
  the first check runs. The rest of the app is about 105 KB compressed,
  most of it Contentful's App SDK.

## Install (private app)

1. Build: `npm run build` at the repository's root (the engine files), then
   `npm run build` in `packages/contentful`.
2. In Contentful, create an app definition with the locations **Entry
   sidebar** and **App configuration screen**, and upload the `build`
   folder as its bundle (hosted by Contentful).
3. Install it in a space. Its configuration screen adds the panel to every
   content type's sidebar, under Publish, and creates the "Accessibility
   answers" content type. For the live preview check, add the **Entry
   editor** location too, enter the website's preview addresses, and put
   the Accessibility tab first in the content type's Entry editors.

`dev/contentful/deploy.mjs` does steps 2 and 3 through the Management API,
for the test space (`PREVIEW_ORIGINS=https://… node dev/contentful/deploy.mjs`
sets the preview address and puts the tab first).

Languages: English, Spanish, German, French and Japanese, following the
language Contentful's web app is set to, else the browser's. The panel's
words, the engine's messages and the "how to check" steps all follow it.
The configuration screen is in English.

Licence: MPL-2.0.

## Developing

`dev/contentful` has the test space's content (`seed.mjs`), the deployment
(`deploy.mjs`), and a test page that runs the app with a stand-in for the
App SDK backed by the test space's real data: Contentful's own editor needs
a person's login.

`dev/contentful/preview-site` is a test website in preview mode: the test
article, Contentful's live preview package with inspector mode's tags, and
the preview script. On the test page, `?view=tab&preview=<its address>`
puts it beside the tab, as Contentful's live preview does.

```sh
npm run build
npx esbuild dev/contentful/harness.js --bundle --format=esm --splitting --outdir=dev/contentful/dist
npx esbuild dev/contentful/preview-site/site.js --bundle --format=esm --splitting --outdir=dev/contentful/preview-site/dist
node dev/contentful/server.mjs                # http://localhost:3336
node dev/contentful/preview-site/server.mjs   # http://127.0.0.1:3337
CONTENTFUL_APP_URL=http://localhost:3336 CONTENTFUL_PREVIEW_URL=http://127.0.0.1:3337 \
  node --test tests/e2e/contentful-app.test.mjs
```

The test needs the space's content management token: `CONTENTFUL_TOKEN`, or
a network proxy that adds it.
