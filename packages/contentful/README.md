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
   answers" content type.

`dev/contentful/deploy.mjs` does steps 2 and 3 through the Management API,
for the test space.

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

```sh
npm run build
npx esbuild dev/contentful/harness.js --bundle --format=esm --splitting --outdir=dev/contentful/dist
node dev/contentful/server.mjs        # http://localhost:3336
CONTENTFUL_APP_URL=http://localhost:3336 node --test tests/e2e/contentful-app.test.mjs
```

The test needs the space's content management token: `CONTENTFUL_TOKEN`, or
a network proxy that adds it.
