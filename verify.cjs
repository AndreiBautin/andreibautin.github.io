const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const html = fs.readFileSync('dist/index.html', 'utf8');
execFileSync(process.execPath, ['--check', 'dist/script.js']);
execFileSync(process.execPath, ['--check', 'serve.cjs']);
assert(!/hello@example|Electron|01\.4 TB|0\.98|evidence matching/.test(html));
for (const text of ['3Cloud', 'September 2024', 'June 2019', '11 hours', '5+ engineers', 'AZ-900', 'AI-900', 'Colorado State University']) assert(html.includes(text), text);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate IDs');
for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (href.startsWith('#')) assert(ids.includes(href.slice(1)), href);
  if (href.startsWith('./')) assert(fs.existsSync('dist/' + href.slice(2)), href);
}
for (const path of ['dist/index.html', 'dist/styles.css', 'dist/script.js']) {
  const text = fs.readFileSync(path, 'utf8');
  assert(!text.includes('\ufffd'), 'Invalid Unicode');
  assert(!/[\t ]+$/m.test(text), 'Trailing whitespace');
}
assert(fs.readFileSync('dist/Andrei_Bautin_Resume.pdf').subarray(0, 5).equals(Buffer.from('%PDF-')));
assert.equal(JSON.parse(fs.readFileSync('.openai/hosting.json')).static.directory, 'dist');
console.log('verify passed: JavaScript syntax, content, local links, formatting, PDF, static build manifest. No TypeScript or compilation step in this static site.');
