// Runs Lighthouse (mobile, performance only) several times and prints the
// medians: single runs of this page vary by 2x in TBT, so one run proves
// nothing. Usage: node scripts/lighthouse.cjs [url] [runs]
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const url = process.argv[2] || 'https://andreibautin.github.io/';
const runs = Number(process.argv[3]) || 5;
const out = path.join(os.tmpdir(), 'lh-run.json');
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rows = [];
for (let i = 0; i < runs; i++) {
  execSync(`npx --yes lighthouse@12.2.1 ${JSON.stringify(url)} --quiet --chrome-flags=--headless=new --only-categories=performance --output=json --output-path=${JSON.stringify(out)}`, { stdio: 'ignore' });
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  const a = j.audits;
  rows.push({ score: j.categories.performance.score * 100, lcp: a['largest-contentful-paint'].numericValue,
    tbt: a['total-blocking-time'].numericValue, kib: a['total-byte-weight'].numericValue / 1024 });
  console.log(`run ${i + 1}: score ${rows.at(-1).score} lcp ${Math.round(rows.at(-1).lcp)} ms tbt ${Math.round(rows.at(-1).tbt)} ms`);
}
for (const key of ['score', 'lcp', 'tbt', 'kib']) {
  const xs = rows.map((r) => r[key]);
  console.log(`${key}: median ${Math.round(median(xs))} (${Math.round(Math.min(...xs))}–${Math.round(Math.max(...xs))})`);
}
fs.rmSync(out, { force: true });
