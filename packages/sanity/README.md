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

The website's own design is not seen here: its colours, landmarks, and
headings that components add. A check of the live preview page will cover
those (planned).

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

Languages: English, Spanish, German, French and Japanese, following the
Studio's language. Other languages show English.

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

The end-to-end test runs against it:

```sh
SANITY_STUDIO_URL=http://localhost:3333 node --test tests/e2e/sanity-studio.test.mjs
```

It needs a logged-in Studio: set `SANITY_TOKEN` to an Editor token of the
test project, unless your network proxy adds it. Behind a proxy that only
speaks HTTP/1.1, the browser has six connections per host. The Studio's
live updates would take them all, so the test answers those requests with
one short reply each.
