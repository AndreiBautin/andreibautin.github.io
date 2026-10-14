// Checks a published copy of the site: the pages carry their security
// policy and every local asset index.html links to loads. Run after a
// deploy: node scripts/smoke.cjs https://andreibautin.github.io/
// Pages can serve the previous build for a short while, so it retries.
const fs = require('node:fs');
const base = new URL(process.argv[2] || 'https://andreibautin.github.io/');
const expected = fs.readFileSync('dist/index.html', 'utf8').match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)[0];

async function check() {
  const problems = [];
  for (const page of ['index.html', '404.html']) {
    const response = await fetch(new URL(page, base), { cache: 'no-store' });
    const html = await response.text();
    if (!response.ok) problems.push(`${page}: HTTP ${response.status}`);
    // Byte-for-byte with this checkout: proves the commit being deployed is
    // what Pages serves, stamped asset hashes included, not a cached build.
    if (html !== fs.readFileSync(`dist/${page}`, 'utf8')) problems.push(`${page}: differs from this commit's dist/${page}`);
    if (!html.includes(expected)) problems.push(`${page}: Content-Security-Policy missing or different`);
    if (!html.includes('<meta name="referrer" content="strict-origin-when-cross-origin" />')) problems.push(`${page}: referrer policy missing`);
    if (page !== 'index.html') continue;
    for (const [, href] of html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)) {
      const asset = await fetch(new URL(href, base), { method: 'HEAD', cache: 'no-store' });
      if (!asset.ok) problems.push(`${href}: HTTP ${asset.status}`);
    }
  }
  return problems;
}

(async () => {
  const attempts = Number(process.env.SMOKE_ATTEMPTS || 6);
  for (let attempt = 1; ; attempt++) {
    const problems = await check();
    if (!problems.length) { console.log(`smoke passed: ${base}`); return; }
    if (attempt >= attempts) { console.error(`smoke failed: ${base}\n  ${problems.join('\n  ')}`); process.exitCode = 1; return; }
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
})();
