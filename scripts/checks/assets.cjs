// The shipped files themselves: generated ones match their generators, and
// sizes, glyphs and types stay within what the site depends on.
const path = require('node:path');
const assert = require('node:assert/strict');
const { STAMPED, TYPES, hashOf, gzipSize, walk } = require('./shared.cjs');

module.exports = [
  // A page served fresh with a stylesheet from a browser's cache drew the
  // hero as a block image once; see scripts/stamp.cjs.
  ['stamp', (c) => {
    const html = c.read('dist/index.html');
    for (const file of STAMPED) {
      const want = `./${file}?v=${hashOf(c.bytes('dist/' + file))}`;
      assert(html.includes(want), `${file} link must be stamped ${want} (run npm run stamp)`);
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
  ['mime types', (c) => {
    for (const file of walk(c.root, 'dist')) assert(TYPES[path.extname(file)], `${file}: no content type for ${path.extname(file) || 'files without an extension'} in TYPES`);
  }],
];
