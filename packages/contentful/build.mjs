// Builds the app into build/, as Contentful hosts it: index.html and the
// scripts beside it, with relative addresses. Run `npm run build` at the
// repository's root first, for the engine files in dist/.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'build');
fs.rmSync(out, { recursive: true, force: true });
await build({
  entryPoints: [path.join(here, 'src/main.js')],
  bundle: true,
  format: 'esm',
  splitting: true,
  minify: true,
  target: 'es2020',
  outdir: path.join(out, 'assets'),
  logLevel: 'warning'
});
fs.writeFileSync(
  path.join(out, 'index.html'),
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SureA11y</title>' +
    '<style>body{margin:0;font:14px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif;background:#fff;color:#1e1e1e}#root{padding:0}</style>' +
    '</head><body><div id="root"></div><script type="module" src="./assets/main.js"></script></body></html>\n'
);
for (const f of fs.readdirSync(path.join(out, 'assets'))) {
  const size = fs.statSync(path.join(out, 'assets', f)).size;
  console.log(`${f.padEnd(28)} ${(size / 1024).toFixed(0).padStart(6)} KB`);
}
