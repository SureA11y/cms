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
| [`prototypes/`](prototypes/) | Throwaway experiments, such as Phase 0 |

The plan is in [`docs/PLAN.md`](docs/PLAN.md).

## Related repositories

- [SureA11y/core](https://github.com/SureA11y/core): the accessibility engine
- Other integrations: [cli](https://github.com/SureA11y/cli),
  [playwright](https://github.com/SureA11y/playwright),
  [cypress](https://github.com/SureA11y/cypress),
  [puppeteer](https://github.com/SureA11y/puppeteer),
  [selenium](https://github.com/SureA11y/selenium)
