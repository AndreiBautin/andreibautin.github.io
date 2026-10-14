const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const html = fs.readFileSync('dist/index.html', 'utf8');
execFileSync(process.execPath, ['--check', 'dist/script.js']);
execFileSync(process.execPath, ['--input-type=module', '--check'], { input: fs.readFileSync('dist/hero.js') });
execFileSync(process.execPath, ['--check', 'serve.cjs']);
assert(!/hello@example|Electron|01\.4 TB|0\.98|evidence matching/.test(html));
for (const text of ['3Cloud', 'September 2024', 'June 2019', '11 hours', '5+ engineers', 'AZ-900', 'AI-900', 'Colorado State University']) assert(html.includes(text), text);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate IDs');
for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (href.startsWith('#')) assert(ids.includes(href.slice(1)), href);
  if (href.startsWith('./')) assert(fs.existsSync('dist/' + href.slice(2).split('?')[0]), href);
}
// The stylesheet and script links carry a hash of the file they point to
// (scripts/stamp.cjs): a page served fresh with a stylesheet from a
// browser's cache drew the hero as a block image once.
for (const file of ['styles.css', 'script.js', 'hero.js']) {
  const hash = require('crypto').createHash('sha256').update(fs.readFileSync('dist/' + file)).digest('hex').slice(0, 10);
  assert(html.includes(`./${file}?v=${hash}`), `${file} link must be stamped ./${file}?v=${hash} (run node scripts/stamp.cjs)`);
}
for (const path of ['dist/index.html', 'dist/404.html', 'dist/styles.css', 'dist/script.js', 'dist/hero.js', 'dist/tech-marks.js']) {
  const text = fs.readFileSync(path, 'utf8');
  assert(!text.includes('\ufffd'), 'Invalid Unicode');
  // A CSS escape like "\00a0" once landed as a raw NUL byte and drew "\ufffd0\u2192".
  assert(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text), `${path}: control character`);
  assert(!/[\t ]+$/m.test(text), 'Trailing whitespace');
}
// hero.js may only use THREE.* names the vendor subset exports.
const { EXPORTS } = require('./scripts/build_three.cjs');
const used = new Set([...fs.readFileSync('dist/hero.js', 'utf8').matchAll(/THREE.(w+)/g)].map((m) => m[1]));
for (const name of used) assert(EXPORTS.includes(name), `THREE.${name} is not in scripts/build_three.cjs EXPORTS`);
for (const name of EXPORTS) assert(new RegExp(` as ${name}[,}]`).test(fs.readFileSync('dist/vendor/three.hero.min.js', 'utf8')), `vendor subset lacks ${name}; run node scripts/build_three.cjs`);
assert.equal(fs.readFileSync('dist/tech-marks.js', 'utf8'), require('./scripts/build_marks.cjs').render(), 'dist/tech-marks.js is stale; run node scripts/build_marks.cjs');
// Byte budgets, gzipped as Pages serves them: a regression fails here rather
// than being found in a Lighthouse run. Raise one only on purpose.
const gz = (files) => files.reduce((sum, f) => sum + require('node:zlib').gzipSync(fs.readFileSync('dist/' + f), { level: 9 }).length, 0);
for (const [name, files, limit] of [
  ['critical path', ['index.html', 'styles.css', 'script.js'], 30_000],
  ['hero visual', ['hero.js', 'tech-marks.js', 'vendor/three.hero.min.js'], 150_000],
]) { const size = gz(files); assert(size <= limit, `${name} is ${size} B gzipped, over its ${limit} B budget`); }
// The fonts are subset (scripts/subset_fonts.py): every character a page
// can show must be in that list, or it renders in a fallback face.
const ranges = fs.readFileSync('scripts/subset_fonts.py', 'utf8').match(/UNICODES = "([^"]+)"/)[1].split(',')
  .map((r) => r.slice(2).split('-').map((h) => parseInt(h, 16))).map(([a, b = a]) => [a, b]);
const shown = ['dist/index.html', 'dist/404.html', 'dist/script.js', 'dist/styles.css']
  .map((f) => fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>|<[^>]+>|\s/g, ' ')).join('');
for (const ch of new Set(shown)) {
  const code = ch.codePointAt(0);
  assert(ranges.some(([a, b]) => code >= a && code <= b), `U+${code.toString(16)} (${ch}) is not in the font subset; add it in scripts/subset_fonts.py`);
}
assert(fs.readFileSync('dist/Andrei_Bautin_Resume.pdf').subarray(0, 5).equals(Buffer.from('%PDF-')));
assert.equal(JSON.parse(fs.readFileSync('.openai/hosting.json')).static.directory, 'dist');
console.log('verify passed: JavaScript syntax, content, local links, formatting, PDF, static build manifest. No TypeScript or compilation step in this static site.');
