// Checks a published copy of the site: the pages carry their security
// policy and every local asset index.html links to loads. Run after a
// deploy: node scripts/smoke.cjs https://andreibautin.github.io/
// Pages can serve the previous build for a short while, so it retries.
const fs = require('node:fs');
const path = require('node:path');
// The same policy tags verify requires locally, so the two cannot disagree.
const { CSP_META, REFERRER_META } = require('./checks.cjs');

// Compares a served copy at base with the dist/ directory given; returns the
// problems found, empty when the two agree.
async function check(base, dist = path.resolve(__dirname, '../dist')) {
  const problems = [];
  for (const page of ['index.html', '404.html']) {
    const response = await fetch(new URL(page, base), { cache: 'no-store' });
    const html = await response.text();
    if (!response.ok) problems.push(`${page}: HTTP ${response.status}`);
    // Byte-for-byte with this checkout: proves the commit being deployed is
    // what Pages serves, stamped asset hashes included, not a cached build.
    if (html !== fs.readFileSync(path.join(dist, page), 'utf8')) problems.push(`${page}: differs from this commit's dist/${page}`);
    if (!html.includes(CSP_META)) problems.push(`${page}: Content-Security-Policy missing or different`);
    if (!html.includes(REFERRER_META)) problems.push(`${page}: referrer policy missing`);
    if (page !== 'index.html') continue;
    // hero.js imports its modules at idle, so they are not linked from the
    // page; read the dynamic imports to check them too.
    const imports = [...fs.readFileSync(path.join(dist, 'hero.js'), 'utf8').matchAll(/import\('\.\/([^']+)'\)/g)].map((m) => m[1]);
    if (!imports.length) problems.push('hero.js: no dynamic imports found; the smoke check has lost track of them');
    for (const href of [...[...html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)].map((m) => m[1]), ...imports]) {
      const asset = await fetch(new URL(href, base), { method: 'HEAD', cache: 'no-store' });
      if (!asset.ok) problems.push(`${href}: HTTP ${asset.status}`);
    }
  }
  return problems;
}

module.exports = { check };
if (require.main === module) (async () => {
  const base = new URL(process.argv[2] || 'https://andreibautin.github.io/');
  const attempts = Number(process.env.SMOKE_ATTEMPTS || 6);
  for (let attempt = 1; ; attempt++) {
    const problems = await check(base);
    if (!problems.length) { console.log(`smoke passed: ${base}`); return; }
    if (attempt >= attempts) { console.error(`smoke failed: ${base}\n  ${problems.join('\n  ')}`); process.exitCode = 1; return; }
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
})();
