# Phase 0 prototype

Throwaway code to measure the engine inside a real WordPress block editor,
and to compare it with other checkers. Not for production. Findings are in
[`RESULTS.md`](RESULTS.md).

## Contents

| File | What it does |
| --- | --- |
| `surea11y-probe/` | WordPress plugin. Loads the engine in the editor canvas and, for logged-in users, on the published page (`probe.js`), and runs the sandbox experiment in the editor (`sandbox.js`). |
| `build.sh` | Copies the engine files from an installed `@surea11y/core` into `surea11y-probe/vendor/` and bundles the "How to check" helper. |
| `make-content.php` | Creates the short, typical and long test posts. |
| `switch-plugin.php` | Leaves exactly one checker active. |
| `measure.mjs` | Editor canvas and published-page scans, bundle cost, side effects, "How to check". |
| `measure-sandbox.mjs` | The sandbox approach, including content-only rule sets. |
| `profile-rules.mjs` | Time per rule on the long post. |
| `measure-competitors.mjs` | Other checkers on the same posts, one at a time. |

## Running it

Needs Node.js 22, PHP 8.3 with `pdo_sqlite`, Composer and a Chromium.

1. WordPress with SQLite: clone `WordPress/WordPress` at a release tag, build
   and install the `sqlite-database-integration` plugin's drop-in, write a
   `wp-config.php`, serve it with `php -S 127.0.0.1:8881 -t <wordpress>` and
   run the installer (user `admin`, password `labpass123`).
2. In a folder of your choice: `npm i @surea11y/core@1.17.0 playwright-core esbuild`.
3. `./build.sh <that folder>`, then link `surea11y-probe/` into
   `wp-content/plugins/` and activate it.
4. `php make-content.php <wordpress>`.
5. `node measure.mjs http://127.0.0.1:8881 <that folder>/node_modules [cpu slowdown]`,
   and the same for the other scripts. `measure-competitors.mjs` also takes
   the WordPress folder, and the competitors linked into `wp-content/plugins/`.

The scripts expect Chromium at `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`;
change `executablePath` for another location.
