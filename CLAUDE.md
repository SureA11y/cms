# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## Project

SureA11y for CMS: accessibility checking for content management systems
(WordPress and Drupal first), built on `@surea11y/core`
(https://github.com/SureA11y/core). The project is at the research and
planning stage; there is no code yet. Read `README.md`, `docs/ideas.md` and
`docs/decisions.md` before starting work.

## Git and attribution (strict)

- Never mention Claude, Anthropic or any AI assistant in commit messages,
  commit authors, code comments, documentation, issues, pull requests or
  review comments.
- No `Co-Authored-By`, session links or "Generated with" lines anywhere.
- Commit as the maintainer. Set the identity in each new clone before the
  first commit:

  ```sh
  git config user.name "Jorge Rumoroso"
  git config user.email "rumoroso@gmail.com"
  ```

- Commit messages: imperative, sentence case, no trailing period, describing
  what the change does (same style as SureA11y/core).

## Where things go

- Ideas and the original thinking: `docs/ideas.md`.
- Decisions, newest first, each with its reasoning: `docs/decisions.md`.
  Record every decision the maintainer makes there, and move resolved items
  out of its "Open" list.
- Research reports: `docs/research/`.
- The plan, once written: `docs/PLAN.md`. It is written from the research,
  not before it.
- Improvements the engine itself needs belong in SureA11y/core as issues, not
  in this repository. Link them from the plan.

## Product principles

- This is a checker, never an overlay. It does not auto-fix pages for
  visitors, does not change what visitors see and never claims legal
  "compliance". Use "checker", not "compliance", in names and copy.
- Checks run in the browser; page content is not sent to any external
  service.
- The audience is content editors, not developers: plain language, and say
  whether a problem is in the editor's content or in the theme/template.
- Keep the engine's honesty: show what could not be decided as questions the
  author can answer, not as failures.

## Quality in every change

Performance and quality are checked in every development, not left for
later. Follow "Quality, in every phase" in `docs/PLAN.md`: performance
budgets, accessibility of our own interface (WCAG 2.2 AA), security and
privacy, compatibility, and tests. Every change states how it affects them.

## Names

| Thing | Name |
| --- | --- |
| Repository | `SureA11y/cms` |
| Shared embeddable panel package | `@surea11y/panel` |
| Plugin in each CMS directory | SureA11y (slug `surea11y`) |

## Writing style

Plain English, short sentences, specific facts over adjectives. Mark anything
not verified from a primary source as unverified.
