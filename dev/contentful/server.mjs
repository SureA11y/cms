// Serves the test page on http://localhost:3336. Not shipped.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = url.pathname.startsWith('/dist/') ? url.pathname : '/index.html';
    const full = path.join(root, path.normalize(file));
    if (!full.startsWith(root) || !fs.existsSync(full)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  })
  .listen(Number(process.env.PORT) || 3336);
