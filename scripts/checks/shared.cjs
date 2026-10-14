// What the check groups share: the site's fixed lists and policies, and the
// helpers that read a repository root. serve.cjs, smoke.cjs and stamp.cjs
// import the policies from here too, so no copy of them can drift.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const PAGES = ['index.html', '404.html'];
const STAMPED = ['styles.css', 'script.js', 'hero.js'];
const SHIPPED_JS = ['script.js', 'hero.js', '404.js', 'tech-marks.js', 'vendor/three.hero.min.js'];
const PORT = 4317;
const CSP = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none'`;
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`;
const REFERRER_META = '<meta name="referrer" content="strict-origin-when-cross-origin" />';
// What serve.cjs sends for each extension; every file type in dist/ needs one,
// or the local server sends octet-stream and nosniff refuses it while Pages works.
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

const hashOf = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);

// By content, so the verify tests do not recompress the unchanged 700 KB
// vendor file once per planted defect.
const gzipped = new Map();
const gzipSize = (bytes) => {
  const key = crypto.createHash('sha1').update(bytes).digest('hex');
  if (!gzipped.has(key)) gzipped.set(key, zlib.gzipSync(bytes, { level: 9 }).length);
  return gzipped.get(key);
};

// Reads under one root, each file once however many groups ask for it.
function context(root) {
  const cache = new Map();
  const bytes = (rel) => { if (!cache.has(rel)) cache.set(rel, fs.readFileSync(path.join(root, rel))); return cache.get(rel); };
  return { root, bytes, read: (rel) => bytes(rel).toString('utf8'), exists: (rel) => fs.existsSync(path.join(root, rel)) };
}

// Every file under dir, as root-relative paths with forward slashes.
const walk = (root, dir, skip = []) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap((e) => {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (skip.includes(rel)) return [];
    return e.isDirectory() ? walk(root, rel, skip) : [rel];
  });

module.exports = { PAGES, STAMPED, SHIPPED_JS, PORT, CSP_META, REFERRER_META, TYPES, hashOf, gzipSize, context, walk };
