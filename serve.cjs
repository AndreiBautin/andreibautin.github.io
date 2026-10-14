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
  const target = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { ...security, 'Content-Type': types[path.extname(target)] || 'application/octet-stream' }).end(data);
  });
}).on('error', (error) => { console.error('Cannot start on port 4317:', error.message); process.exitCode = 1; })
  .listen(4317, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4317'));
