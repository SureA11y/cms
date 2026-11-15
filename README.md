# SureA11y for CMS

Accessibility checking for content management systems (WordPress, Drupal and
more), built on [`@surea11y/core`](https://github.com/SureA11y/core).

> **Status: Phase 1 starting.** The first package is the CMS pack; the panel
> and the WordPress plugin follow. This repository
> currently holds the ideas, decisions and research that will shape the
> project.

## The idea

Bring the SureA11y engine to the people who write web content: editors and
authors working in a CMS, not only developers running tests. The engine
already runs in the browser with zero dependencies, so a CMS plugin can check
pages without sending any content to a server.

What should set it apart is the engine's honesty about uncertainty. Questions
automated testing cannot settle, such as "does this alt text describe the
image?", are exactly the ones a content author can answer.

## What this is not

This is a **checker**, not an overlay. It does not "fix" sites automatically,
does not change what visitors see, and does not claim legal compliance.

## Repository contents

| Path | What it holds |
| --- | --- |
| [`docs/ideas.md`](docs/ideas.md) | The idea as first discussed: where checks can run, what makes it different, open risks |
| [`docs/decisions.md`](docs/decisions.md) | Decisions made so far, with the reasoning |
| [`docs/research/`](docs/research/) | Analysis of our engine and of existing CMS accessibility checkers |
| [`packages/pack-cms/`](packages/pack-cms/) | `@surea11y/pack-cms`: core's rules sorted into content and theme profiles, and checks authors need |
| [`packages/panel/`](packages/panel/) | `@surea11y/panel`: the results panel every CMS integration embeds |
| [`plugins/wordpress/`](plugins/wordpress/) | The WordPress plugin |
| [`tests/e2e/`](tests/e2e/) | End-to-end tests of the plugin in a real WordPress, and the test posts they check |
| [`dev/`](dev/) | The demo site for trying it locally |
| [`prototypes/`](prototypes/) | Throwaway experiments, such as Phase 0 |

The plan is in [`docs/PLAN.md`](docs/PLAN.md).

## Trying it locally

A WordPress on your own computer, in Docker, with the plugin active and a
small demo site to check: a fictional library with pages and posts, some
clean and some with the mistakes editors commonly make. It uses
[wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/),
WordPress's own tool for this. Nothing else to install: no PHP, web server
or database.

You need [Node.js](https://nodejs.org/) 22 or later and
[Docker Desktop](https://www.docker.com/products/docker-desktop/), running.

```sh
npm install
npm run setup:core
npm run wp:start
```

`setup:core` is needed until the next release of `@surea11y/core`: the
plugin uses rules that are on core's main branch but not yet in 1.17.0. It
clones core beside this folder (`../core`) and installs it from there; run
it again after any `npm install`, which puts the released version back.

The first start downloads WordPress and a database, so it takes a few
minutes. Then open <http://localhost:8888/wp-admin> and log in as `admin`
with the password `password`.

What to try:

- **Pages → "Events"** or **"Opening hours"**: open one in the editor and
  click the accessibility icon at the top right for the sidebar. Fix
  something (add a table header, change a bold line into a heading) and
  watch the list change.
- **"About us"** and **"Contact"**: clean. **"Opening hours (fixed)"**: the
  same table done right, with one problem left to find.
- **On the site**, while logged in: "Check accessibility" in the top bar
  checks the whole page, theme included.
- **Dashboard → Accessibility**: the site overview, once you have checked
  a few pages.
- **Settings → Accessibility checker**: who sees the checker, and which
  rules run.

| Command | What it does |
| --- | --- |
| `npm run wp:start` | Builds the plugin and starts WordPress (again) |
| `npm run wp:stop` | Stops it; your changes are kept |
| `npm run wp:reset` | Wipes the site and creates the demo content again |
| `npm run test:e2e:local` | Runs the end-to-end tests against it |
| `npx wp-env destroy` | Removes it from your computer entirely |

After changing the plugin's code, `npm run build` and reload the page; the
plugin folder is shared with the site, so there is no need to restart.

The end-to-end tests run against it too. Once, install the browser they
use; then run them:

```sh
npm run e2e:browser
npm run test:e2e:local
```

`test:e2e:local` takes the site's address and login from
`tests/e2e/wp-env.env`. See [`tests/e2e/README.md`](tests/e2e/README.md).

## Related repositories

- [SureA11y/core](https://github.com/SureA11y/core): the accessibility engine
- Other integrations: [cli](https://github.com/SureA11y/cli),
  [playwright](https://github.com/SureA11y/playwright),
  [cypress](https://github.com/SureA11y/cypress),
  [puppeteer](https://github.com/SureA11y/puppeteer),
  [selenium](https://github.com/SureA11y/selenium)
