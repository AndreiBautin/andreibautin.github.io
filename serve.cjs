// The local dev server: dist/ as GitHub Pages serves it, plus the security
// headers Pages cannot send. Run with: npm run dev
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PORT, TYPES } = require('./scripts/checks.cjs');
function createServer(root = path.resolve(__dirname, 'dist')) {
  // The same policy the pages set in their meta tag, sent as a header so a
  // local run is held to it too.
  const csp = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const security = { 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
  return http.createServer((req, res) => {
    // Pages answers only reads; anything else here would be a local-only path.
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    const send = (status, file, data) => res.writeHead(status, { ...security, 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(req.method === 'HEAD' ? undefined : data);
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    const target = path.resolve(root, '.' + pathname.replace(/\/$/, '/index.html'));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(target, (error, data) => {
      // Like Pages, a missing path gets the site's own 404 page.
      if (error) { const page = path.join(root, '404.html'); send(404, page, fs.readFileSync(page)); return; }
      send(200, target, data);
    });
  });
}
module.exports = { createServer };
if (require.main === module) {
  createServer().on('error', (error) => { console.error(`Cannot start on port ${PORT}:`, error.message); process.exitCode = 1; })
    .listen(PORT, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${PORT}`));
}
