// The local dev server: dist/ as GitHub Pages serves it, plus the security
// headers Pages cannot send. Run with: npm run dev
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PORT, TYPES } = require('./scripts/checks.cjs');
const preview = require('./scripts/preview.cjs');
const LOOPBACK = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
// tokenFile is where verify publishes the local refresh token; see
// docs/LOCAL-PREVIEW.md. A copied dist/ gets its own (normally absent) file.
function createServer(dir = path.join(__dirname, 'dist'), { tokenFile = preview.tokenFile(path.dirname(path.resolve(dir))) } = {}) {
  // Resolved, so the containment check below compares like with like.
  const root = path.resolve(dir);
  // The same policy the pages set in their meta tag, sent as a header so a
  // local run is held to it too.
  const csp = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const security = { 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
  return http.createServer((req, res) => {
    // Pages answers only reads; anything else here would be a local-only path.
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    const send = (status, file, data) => res.writeHead(status, { ...security, 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(req.method === 'HEAD' ? undefined : data);
    // The one local-only addition: the verified-bundle token as a bare scalar,
    // for a loopback client naming this loopback origin. Served HTML is untouched.
    if (req.url === preview.ENDPOINT) {
      const port = req.socket.localPort;
      const local = LOOPBACK.includes(req.socket.remoteAddress) && [`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host);
      let token = local ? preview.readToken(tokenFile) : null;
      // A later unverified edit must not ride a token published just before it.
      // Missing/changing files are a quiet unavailable state, never a reload.
      if (token) {
        try { if (preview.bundleToken(root) !== token) token = null; } catch { token = null; }
      }
      const headers = { ...security, 'Cache-Control': 'no-store' };
      if (!local) res.writeHead(404, headers).end();
      else if (!token) res.writeHead(204, headers).end();
      else res.writeHead(200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }).end(req.method === 'HEAD' ? undefined : token);
      return;
    }
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
