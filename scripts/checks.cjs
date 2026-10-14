// The checks `npm run verify` runs, as named groups over a repository root.
// Taking the root as a parameter is what lets scripts/verify.test.cjs plant a
// defect in a copy and prove each group fails on it: a check that cannot fail
// is how the Three.js subset check once passed while matching nothing.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { parseAll } = require('./parse.cjs');

const PAGES = ['index.html', '404.html'];
const STAMPED = ['styles.css', 'script.js', 'hero.js'];
// Hand-written text the site ships; vendor/ is generated and minified.
const TEXT = ['index.html', '404.html', '404.css', '404.js', 'styles.css', 'script.js', 'hero.js', 'tech-marks.js'];
const SHIPPED_JS = ['script.js', 'hero.js', '404.js', 'tech-marks.js', 'vendor/three.hero.min.js'];
const PORT = 4317;
const CSP = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none'`;
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`;
const REFERRER_META = '<meta name="referrer" content="strict-origin-when-cross-origin" />';
// What serve.cjs sends for each extension; every file type in dist/ needs one,
// or the local server sends octet-stream and nosniff refuses it while Pages works.
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const RESUME_FACTS = ['3Cloud', 'September 2024', 'June 2019', '11 hours', '5+ engineers', 'AZ-900', 'AI-900', 'Colorado State University'];

// By content, so the verify tests do not recompress the unchanged 700 KB
// vendor file once per planted defect.
const gzipped = new Map();
const gzipSize = (bytes) => {
  const key = crypto.createHash('sha1').update(bytes).digest('hex');
  if (!gzipped.has(key)) gzipped.set(key, zlib.gzipSync(bytes, { level: 9 }).length);
  return gzipped.get(key);
};
const hashOf = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);

function context(root) {
  const cache = new Map();
  const bytes = (rel) => { if (!cache.has(rel)) cache.set(rel, fs.readFileSync(path.join(root, rel))); return cache.get(rel); };
  return { root, bytes, read: (rel) => bytes(rel).toString('utf8'), exists: (rel) => fs.existsSync(path.join(root, rel)) };
}

const walk = (root, dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(root, `${dir}/${e.name}`) : [`${dir}/${e.name}`]));

// Every script in the repository, found rather than listed, so a new one is
// syntax-checked without anyone remembering to add it.
function scripts(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) { if (rel !== 'dist/vendor') walk(rel); } else if (/\.c?js$/.test(entry.name)) found.push(rel);
    }
  };
  walk('dist');
  walk('scripts');
  for (const name of fs.readdirSync(root)) if (name.endsWith('.cjs')) found.push(name);
  return found;
}

const checks = [
  ['syntax', (c) => {
    try { parseAll(scripts(c.root).map((rel) => path.join(c.root, rel))); } catch (error) { assert.fail(error.message.replace(c.root + path.sep, '')); }
  }],
  ['resume facts', (c) => {
    const html = c.read('dist/index.html');
    assert(!/hello@example|Electron|01\.4 TB|0\.98|evidence matching/.test(html), 'index.html carries a placeholder or retired claim');
    for (const text of RESUME_FACTS) assert(html.includes(text), `index.html lacks resume fact "${text}"`);
  }],
  // Both pages. index.html links relative (./), 404.html root-absolute (/),
  // because Pages serves it at whatever path was missing.
  ['links', (c) => {
    for (const page of PAGES) {
      const html = c.read('dist/' + page);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(ids.length, new Set(ids).size, `${page} has duplicate ids`);
      for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (href.startsWith('#')) assert(ids.includes(href.slice(1)), `${page}: ${href}: no element with that id`);
        const local = href.match(/^\.?\/(?!\/)([^?#]*)/);
        if (local) assert(c.exists('dist/' + (local[1] || 'index.html')), `${page}: ${href}: no such file in dist/`);
      }
    }
  }],
  // A key read but never written, or written under another spelling, loses
  // the visitor's setting silently: 404.js reads the theme script.js saves.
  ['storage keys', (c) => {
    const calls = (verb) => new Set(SHIPPED_JS.flatMap((f) => [...c.read('dist/' + f).matchAll(new RegExp(`localStorage\\.${verb}\\('([^']+)'`, 'g'))].map((m) => m[1])));
    const written = calls('setItem');
    for (const key of calls('getItem')) assert(written.has(key), `localStorage key '${key}' is read but never written`);
  }],
  // A class the stylesheet styles but no page or script uses is dead weight
  // on the critical path, and a sign of a renamed class whose styles were left behind.
  ['unused css', (c) => {
    for (const [sheet, users] of [['styles.css', ['index.html', 'script.js', 'hero.js']], ['404.css', ['404.html', '404.js']]]) {
      const css = c.read('dist/' + sheet).replace(/\/\*[\s\S]*?\*\//g, '');
      const preludes = [...css.matchAll(/(?:^|[{};])([^{};]+)\{/g)].map((m) => m[1]).filter((p) => !p.trim().startsWith('@'));
      const classes = new Set(preludes.flatMap((p) => [...p.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map((m) => m[1])));
      const used = users.map((f) => c.read('dist/' + f)).join('\n');
      for (const name of classes) assert(new RegExp(`(^|[^\\w-])${name}(?![\\w-])`).test(used), `.${name} is styled in ${sheet} but used by no page or script`);
      for (const [, name] of css.matchAll(/@keyframes ([\w-]+)/g)) assert(new RegExp(`animation(-name)?:[^;}]*\\b${name}\\b`).test(css) || used.includes(name), `@keyframes ${name} in ${sheet} is never used`);
    }
  }],
  // An orphan is published and cached with nothing pointing at it. Pages
  // are the entry points; everything else must be named by a shipped file.
  ['unreferenced files', (c) => {
    const files = walk(c.root, 'dist').map((f) => f.slice('dist/'.length));
    const text = files.filter((f) => /\.(html|css|js)$/.test(f)).map((f) => c.read('dist/' + f)).join('\n');
    for (const file of files) if (!PAGES.includes(file)) assert(text.includes(path.posix.basename(file)), `dist/${file} is referenced by no page, stylesheet or script`);
  }],
  // The living docs name files in backticks; a rename must not leave them
  // pointing at nothing. The backlogs are history and may name removed files.
  ['doc paths', (c) => {
    const docs = ['README.md', 'CLAUDE.md', 'SECURITY.md', 'docs/ARCHITECTURE.md', 'docs/TESTING.md'];
    const dirs = /^(dist|scripts|docs|assets|\.github|\.githooks|\.openai)\//;
    for (const doc of docs) for (const [, token] of c.read(doc).matchAll(/`([^`\s*<>]+)`/g)) {
      const rel = token.replace(/[?#].*$/, '').replace(/^\.?\//, '').replace(/\/$/, '');
      if (!dirs.test(rel) && !/^[\w.-]+\.(c?js|css|html|md|py|json|ya?ml|bat|pdf)$/.test(rel)) continue;
      assert(['', 'dist/', 'scripts/', '.github/workflows/'].some((base) => c.exists(base + rel)), `${doc} names \`${token}\`, which does not exist`);
    }
  }],
  // A page served fresh with a stylesheet from a browser's cache drew the
  // hero as a block image once; see scripts/stamp.cjs.
  ['stamp', (c) => {
    const html = c.read('dist/index.html');
    for (const file of STAMPED) {
      const want = `./${file}?v=${hashOf(c.bytes('dist/' + file))}`;
      assert(html.includes(want), `${file} link must be stamped ${want} (run npm run stamp)`);
    }
  }],
  ['text formatting', (c) => {
    for (const file of TEXT) {
      const text = c.read('dist/' + file);
      assert(!text.includes('�'), `${file}: invalid Unicode`);
      // A CSS escape like "\00a0" once landed as a raw NUL byte and drew "�0→".
      assert(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text), `${file}: control character`);
      assert(!/[\t ]+$/m.test(text), `${file}: trailing whitespace`);
    }
  }],
  ['generated files', (c) => {
    // hero.js may only use THREE.* names the vendor subset exports.
    const { EXPORTS } = require(path.join(c.root, 'scripts/build_three.cjs'));
    const vendor = c.read('dist/vendor/three.hero.min.js');
    for (const [, name] of c.read('dist/hero.js').matchAll(/\bTHREE\.(\w+)/g)) assert(EXPORTS.includes(name), `THREE.${name} is not in scripts/build_three.cjs EXPORTS`);
    for (const name of EXPORTS) assert(new RegExp(` as ${name}[,}]`).test(vendor), `vendor subset lacks ${name}; run node scripts/build_three.cjs`);
    const { render } = require(path.join(c.root, 'scripts/build_marks.cjs'));
    assert.equal(c.read('dist/tech-marks.js'), render(path.join(c.root, 'assets/tech')), 'dist/tech-marks.js is stale; run node scripts/build_marks.cjs');
  }],
  // Gzipped as Pages serves them: a regression fails here rather than being
  // found in a Lighthouse run. Raise one only on purpose.
  ['byte budgets', (c) => {
    const gz = (files) => files.reduce((sum, f) => sum + gzipSize(c.bytes('dist/' + f)), 0);
    for (const [name, files, limit] of [
      ['critical path', ['index.html', 'styles.css', 'script.js'], 30_000],
      ['hero visual', ['hero.js', 'tech-marks.js', 'vendor/three.hero.min.js'], 150_000],
    ]) { const size = gz(files); assert(size <= limit, `${name} is ${size} B gzipped, over its ${limit} B budget`); }
  }],
  // The fonts are subset (scripts/subset_fonts.py): every character a page
  // can show must be in that list, or it renders in a fallback face.
  ['font subset', (c) => {
    const ranges = c.read('scripts/subset_fonts.py').match(/UNICODES = "([^"]+)"/)[1].split(',')
      .map((r) => r.slice(2).split('-').map((h) => parseInt(h, 16))).map(([a, b = a]) => [a, b]);
    const shown = ['index.html', '404.html', '404.css', 'script.js', 'styles.css']
      .map((f) => c.read('dist/' + f).replace(/<script[\s\S]*?<\/script>|<[^>]+>|\s/g, ' ')).join('');
    for (const ch of new Set(shown)) {
      const code = ch.codePointAt(0);
      assert(ranges.some(([a, b]) => code >= a && code <= b), `U+${code.toString(16)} (${ch}) is not in the font subset; add it in scripts/subset_fonts.py`);
    }
  }],
  ['deploy manifest', (c) => {
    assert(c.bytes('dist/Andrei_Bautin_Resume.pdf').subarray(0, 5).equals(Buffer.from('%PDF-')), 'resume is not a PDF');
    assert.equal(JSON.parse(c.read('.openai/hosting.json')).static.directory, 'dist');
  }],
  // The pages keep to what their policy allows, so it never has to loosen:
  // same-origin scripts only, no inline code or styles.
  ['content security policy', (c) => {
    for (const page of PAGES) {
      const text = c.read('dist/' + page);
      assert(text.includes(CSP_META), `${page}: Content-Security-Policy missing or changed`);
      assert(text.includes(REFERRER_META), `${page}: referrer policy missing or changed`);
      assert(!/http:\/\//.test(text), `${page}: http:// URL`);
      for (const [tag] of text.matchAll(/<script\b[^>]*>/g)) assert(/\bsrc="(\.\/|\/)(?!\/)/.test(tag), `${page}: inline or external script ${tag}`);
      assert(!/<style\b|\sstyle="|\son[a-z]+=/i.test(text), `${page}: inline style or event handler`);
      for (const [tag] of text.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert(/rel="[^"]*noopener/.test(tag), `${page}: target=_blank without rel=noopener`);
    }
    // Trusted Types would refuse these at runtime; failing here makes it a
    // build error rather than a silently missing piece of the page.
    for (const file of SHIPPED_JS) assert(!/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(c.read('dist/' + file)), `${file}: string-to-code or string-to-HTML call`);
  }],
  // XMP packets and local paths are where usernames and machine names leak from.
  ['binary metadata', (c) => {
    for (const dir of ['dist', 'dist/images', 'dist/fonts']) for (const name of fs.readdirSync(path.join(c.root, dir)).filter((f) => /\.(pdf|jpe?g|png|webp|woff2)$/.test(f))) {
      assert(!/<x:xmpmeta|[A-Za-z]:\\\\?Users\\|\/Users\/|\/home\//.test(c.bytes(`${dir}/${name}`).toString('latin1')), `${dir}/${name} carries metadata or a local path; strip it`);
    }
  }],
  // The deploy job holds pages: write; a tag moved on an action would run with it.
  ['pinned actions', (c) => {
    for (const workflow of fs.readdirSync(path.join(c.root, '.github/workflows'))) for (const [, ref] of c.read(`.github/workflows/${workflow}`).matchAll(/uses: *(\S+)/g)) assert(/@[0-9a-f]{40}$/.test(ref), `${workflow}: ${ref} must be pinned to a commit SHA`);
  }],
  ['mime types', (c) => {
    for (const file of walk(c.root, 'dist')) assert(TYPES[path.extname(file)], `${file}: no content type for ${path.extname(file) || 'files without an extension'} in TYPES`);
  }],
  ['dev port', (c) => {
    assert(c.read('README.md').includes(`http://127.0.0.1:${PORT}`), `README.md must name the dev server port ${PORT}`);
  }],
];

// Runs every group rather than stopping at the first, so one push shows
// every problem. Returns [{ name, error }] for the groups that failed.
function run(root) {
  const c = context(path.resolve(root));
  return checks.map(([name, check]) => { try { check(c); return { name }; } catch (error) { return { name, error }; } });
}

module.exports = { run, names: checks.map(([name]) => name), PORT, TYPES, CSP_META, REFERRER_META, hashOf, STAMPED };
