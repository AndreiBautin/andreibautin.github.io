// The local preview refresh token (docs/LOCAL-PREVIEW.md). A full passing
// `npm run verify` publishes a content hash of dist/ to a file outside the
// repository; `serve.cjs` exposes only that scalar on loopback, and the page
// polls it on http://127.0.0.1:4357 or http://localhost:4357 alone.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { walk } = require('./checks/shared.cjs');

// The only shape the server will ever send and the page will ever accept.
const TOKEN = /^[0-9a-f]{16}$/;
const ENDPOINT = '/__preview/token';

// Deterministic: the same dist/ bytes give the same token, so an unchanged
// re-verification never reloads the page.
function bundleToken(dist) {
  const hash = crypto.createHash('sha256');
  for (const rel of walk(path.resolve(dist), '').sort()) {
    const bytes = fs.readFileSync(path.join(dist, rel));
    hash.update(`${rel}\0${bytes.length}\0`).update(bytes);
  }
  return hash.digest('hex').slice(0, 16);
}

// Outside Git, one file per checkout, so worktrees do not refresh each other.
function tokenFile(repoRoot) {
  if (process.env.PORTFOLIO_PREVIEW_TOKEN_FILE) return path.resolve(process.env.PORTFOLIO_PREVIEW_TOKEN_FILE);
  const key = crypto.createHash('sha256').update(path.resolve(repoRoot).toLowerCase()).digest('hex').slice(0, 12);
  return path.join(os.tmpdir(), 'andrei-portfolio-preview', `${key}.token`);
}

// Written whole then renamed, so the server never reads half a token.
function publish(file, token) {
  if (!TOKEN.test(token)) throw new Error('refusing to publish a malformed preview token');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, token);
  fs.renameSync(temporary, file);
}

// Only called after every gate passed. The bundle must still be the one the
// gates started on: an edit made while verify ran is not verified.
function publishVerified(dist, file, startToken) {
  const now = bundleToken(dist);
  if (now !== startToken) return { published: false, token: now };
  publish(file, now);
  return { published: true, token: now };
}

// What the server answers with: the token, or null for absent or malformed.
function readToken(file) {
  try { const text = fs.readFileSync(file, 'utf8'); return TOKEN.test(text) ? text : null; } catch { return null; }
}

module.exports = { TOKEN, ENDPOINT, bundleToken, tokenFile, publish, publishVerified, readToken };
