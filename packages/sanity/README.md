# SureA11y for Sanity Studio

An accessibility checker for the people who write the content, beside the
form in Sanity Studio. It checks what the editor writes as they write it.
Problems point to the field they are in. Questions it cannot decide alone
are asked, and the answers are kept for the whole team.

It is a checker, not an overlay. It changes nothing on the website, and it
does not claim legal compliance.

## What it does

- **An "Accessibility" button in the document's header**, with how many
  places are left to look at, for example "Accessibility (4)". It opens a
  side panel next to the form.
- **The side panel** lists the findings in groups: to fix, likely problems,
  need a person, probably fine.
  - Each card names its field ("Main image", "Body: Table").
  - **Show** moves the form to that field and frames it.
  - **Check it** shows how to check the finding by hand and asks whether it
    is fine.
  - The Headings and Images views list the document's headings in order,
    and each image with its alternative text.
- **A line under each field with a finding**, so problems are seen while
  writing. "Details" opens the side panel. Each person can turn the lines
  off at the bottom of the panel.

## What is checked

The document's content, as the page will have it:

- each Portable Text block (headings, paragraphs, lists, quotes, links);
- images, in fields and in Portable Text, with their alternative text;
- tables from `@sanity/table`.

Strings such as the title and slug, numbers, dates and references are left
out. The website decides how they appear, so only the page can check them.

The website's own design is not seen in the fields: its colours,
landmarks, and headings that components add. The live preview check covers
those.

## The live preview

When a site uses Sanity's live preview (the Presentation tool) and adds the
preview script, the side panel also checks the preview page, as visitors
get it. The panel shows one list:

- A problem found in both the fields and the page is listed once.
- Each card says whose it is: your content, named by its field, or the
  website's design ("Website design"), which whoever looks after the
  website can fix.
- **Show** moves the form to the field and points at the place on the
  preview page.
- The panel says "Checked in the fields and on the preview page."

The site adds one call, in its preview (draft) mode only, so visitors never
get it:

```js
import { enableSureA11yPreview } from '@surea11y/sanity/preview';

if (draftMode) enableSureA11yPreview({ studioOrigin: 'https://your-project.sanity.studio' });
```

And the Studio is told where the preview runs:

```js
surea11y({ previewOrigins: ['https://www.example.org'] })
```

How it works:

- It names each problem's field from the tags Sanity's preview already puts
  on the page (hidden characters in text, `data-sanity`).
- It takes those characters out while it checks, and puts them back in the
  same step, so Sanity's own overlays are untouched.
- It sends results only to the Studio's window, and the Studio takes them
  only from the preview's address.

The engine is loaded from a `blob:` address. A site whose Content Security
Policy blocks that can serve the engine file itself and pass its address as
`engineUrl`.

In the Presentation tool, the Studio shows the preview, the form and this
panel side by side, and gives the preview most of the width. The panel can
start partly off the right edge, even on a 1920-pixel screen: drag the
divider between the preview and the form to the left to make room.

## Privacy

- The check runs in this browser, in a hidden frame. No content is sent
  anywhere.
- **Answers** ("it's fine", "it's a problem", "not sure") are kept in your
  project, in one document per checked document, with the id
  `surea11y.review.<document id>`. Its id contains a dot, so it cannot be
  read without a token, even in a public dataset. It has no schema type,
  so it doesn't appear in the Studio's lists. Each answer keeps who gave
  it and when.
- **"Hide for me"** is kept in the person's own browser (local storage).
  It doesn't follow them to another browser.
- The engine, about 530 KB compressed, is a separate file. It is loaded
  only when the first check runs. The plugin adds about 27 KB compressed to
  the Studio itself.

## Install

```js
// sanity.config.js
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { surea11y } from '@surea11y/sanity';

export default defineConfig({
  // ...
  plugins: [structureTool(), surea11y()]
});
```

Options:

| Option | Default | What it does |
| --- | --- | --- |
| `altFields` | `['alt', 'altText', 'alternativeText']` | Where images keep their alternative text, tried in order |
| `fieldLines` | `true` | Show a line under each field with a finding |
| `previewOrigins` | `[]` | The addresses the site's preview runs on, whose preview script may send results |

Languages: English, Spanish, German, French and Japanese, following the
Studio's language. Other languages show English.

Colours: the panel and the lines under fields take the Studio's own
background, text and line colours, light or dark, including a custom Studio
theme. The group colours (to fix, likely, need a person, probably fine) are
the panel's own, in a light or dark set that keeps WCAG 2.2 AA contrast.

Licence: MPL-2.0.

## Developing

A Studio for development and tests is in `dev/sanity-studio`, on the
project the maintainer set up for it.

```sh
npm run build                      # builds the engine files into packages/sanity/dist
cd dev/sanity-studio
npm install
node seed.mjs                      # puts the test article in the project
npx sanity dev --port 3333
```

The test website for the live preview is in `dev/preview-site`:

```sh
cd dev/preview-site && npm install && npm run build && npm start   # http://localhost:3334
```

The end-to-end tests run against them:

```sh
SANITY_STUDIO_URL=http://localhost:3333 SANITY_PREVIEW_URL=http://localhost:3334 \
  node --test tests/e2e/sanity-studio.test.mjs
```

It needs a logged-in Studio: set `SANITY_TOKEN` to an Editor token of the
test project, unless your network proxy adds it. Behind a proxy that only
speaks HTTP/1.1, the browser has six connections per host. The Studio's
live updates would take them all, so the test answers those requests with
one short reply each.
