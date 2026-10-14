const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, 'dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
// The same policy the pages set in their meta tag, sent as a header so a
// local run is held to it too; Pages itself cannot send headers.
const csp = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
const security = { 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
http.createServer((req, res) => {
  // Pages answers only reads; anything else here would be a local-only path.
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  const send = (status, file, data) => res.writeHead(status, { ...security, 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(req.method === 'HEAD' ? undefined : data);
  const target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (error, data) => {
    // Like Pages, a missing path gets the site's own 404 page.
    if (error) { const page = path.join(root, '404.html'); send(404, page, fs.readFileSync(page)); return; }
    send(200, target, data);
  });
}).on('error', (error) => { console.error('Cannot start on port 4317:', error.message); process.exitCode = 1; })
  .listen(4317, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4317'));
