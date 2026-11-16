// Serves the test website on http://127.0.0.1:3337: an address apart from
// the test page's, as the preview's is from the app's in Contentful. Build
// first: npx esbuild dev/contentful/preview-site/site.js --bundle
// --format=esm --splitting --outdir=dev/contentful/preview-site/dist. Not
// shipped.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript' };
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const file = url.pathname.startsWith('/dist/') ? url.pathname : '/index.html';
    const full = path.join(root, path.normalize(file));
    if (!full.startsWith(root) || !fs.existsSync(full)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  })
  .listen(Number(process.env.PORT) || 3337, '127.0.0.1');
