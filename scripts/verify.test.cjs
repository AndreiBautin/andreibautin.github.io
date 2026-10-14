// Proves each verify check group can fail. Each case copies the repository,
// plants one defect, and expects exactly the named group to go red: a check
// that passes on a broken copy is not checking anything.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { run, names } = require('./checks.cjs');
const { stamp } = require('./stamp.cjs');

const repo = path.resolve(__dirname, '..');
const COPIED = ['dist', 'scripts', 'assets/tech', '.github', '.githooks', '.openai', 'docs', 'README.md', 'CLAUDE.md', 'SECURITY.md', 'serve.cjs', 'verify.cjs', 'package.json', 'start-app.bat'];
const copies = [];
test.after(() => { for (const root of copies) fs.rmSync(root, { recursive: true, force: true }); });
const fresh = () => { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-')); copies.push(root); return root; };
// One real copy, then each case is a tree of hard links to it: copying the
// repository per case was most of verify's run time. Links share bytes, so
// a defect is planted only through edit(), which replaces the link with a
// new file and leaves the template untouched. It reads and writes latin1
// so binary files survive a round trip byte for byte.
let template;
const link = (from, to) => {
  if (fs.statSync(from).isDirectory()) { fs.mkdirSync(to); for (const name of fs.readdirSync(from)) link(path.join(from, name), path.join(to, name)); } else fs.linkSync(from, to);
};
const copy = () => {
  if (!template) { template = fresh(); for (const rel of COPIED) fs.cpSync(path.join(repo, rel), path.join(template, rel), { recursive: true }); }
  const root = fresh();
  for (const name of fs.readdirSync(template)) link(path.join(template, name), path.join(root, name));
  return root;
};
const edit = (root, rel, change) => {
  const file = path.join(root, rel);
  const before = fs.readFileSync(file, 'latin1');
  fs.unlinkSync(file);
  fs.writeFileSync(file, change(before), 'latin1');
};
const failing = (root) => run(root).filter((r) => r.error).map((r) => r.name);

const defects = {
  'syntax': (root) => edit(root, 'dist/404.js', (s) => s + '}\n'),
  'resume facts': (root) => edit(root, 'dist/index.html', (s) => s.replaceAll('AZ-900', 'AZ-104')),
  'links': [
    (root) => edit(root, 'dist/index.html', (s) => s.replace('</main>', '<a href="#nowhere">x</a></main>')),
    (root) => edit(root, 'dist/404.html', (s) => s.replace('/images/favicon.svg', '/images/missing.svg')),
  ],
  'storage keys': (root) => edit(root, 'dist/404.js', (s) => s.replace("'portfolio-theme'", "'theme'")),
  // Restamped, so only the dead class is wrong; index.html is edited first to
  // replace its link before stamp writes to it.
  'unused css': [
    (root) => {
      edit(root, 'dist/styles.css', (s) => s + '.nobody-uses-this{color:red}\n');
      edit(root, 'dist/index.html', (s) => s);
      stamp(path.join(root, 'dist'));
    },
    (root) => edit(root, 'dist/404.css', (s) => s + '@keyframes nobody-plays{to{opacity:0}}\n'),
    // A class that only differs from a used one by a suffix must not pass as used.
    (root) => edit(root, 'dist/404.css', (s) => s + '.light-x{color:red}\n'),
  ],
  'unreferenced files': (root) => fs.writeFileSync(path.join(root, 'dist/images/orphan.png'), ''),
  'doc paths': (root) => edit(root, 'docs/TESTING.md', (s) => s + '\nSee `scripts/renamed.cjs`.\n'),
  'stamp': (root) => edit(root, 'dist/styles.css', (s) => s + '/* changed */\n'),
  'text formatting': (root) => edit(root, 'dist/404.css', (s) => s.replace('}', '} ')),
  'generated files': (root) => edit(root, 'assets/tech/react.svg', (s) => s.replace('<svg', '<svg data-x="1"')),
  'byte budgets': (root) => edit(root, 'dist/vendor/three.hero.min.js', (s) => `${s}/*${crypto.randomBytes(200_000).toString('base64')}*/\n`),
  'font subset': (root) => edit(root, 'dist/404.html', (s) => s.replace('</body>', Buffer.from('Ж').toString('latin1') + '</body>')),
  'deploy manifest': (root) => edit(root, '.openai/hosting.json', (s) => s.replace('"dist"', '"public"')),
  'content security policy': (root) => edit(root, 'dist/404.html', (s) => s.replace('<body', '<body style="color:red"')),
  'binary metadata': (root) => edit(root, 'dist/images/apple-touch-icon.png', (s) => s + '<x:xmpmeta>'),
  'pinned actions': (root) => edit(root, '.github/workflows/pages.yml', (s) => s.replace(/(actions\/checkout)@[0-9a-f]{40}/, '$1@v7')),
  // A new file, not an edit, so it cannot write through to the template;
  // linked from the 404 page so it is not also an orphan.
  'mime types': (root) => {
    fs.writeFileSync(path.join(root, 'dist/images/new.avif'), '');
    edit(root, 'dist/404.html', (s) => s.replace('</body>', '<img src="/images/new.avif" alt=""></body>'));
  },
  'dev port': (root) => edit(root, 'README.md', (s) => s.replaceAll('127.0.0.1:4317', '127.0.0.1:8080')),
};

test('every check group has a planted defect', () => assert.deepEqual(Object.keys(defects).sort(), [...names].sort()));

test('a clean copy passes every group', () => assert.deepEqual(failing(copy()), []));

for (const [name, plants] of Object.entries(defects)) {
  [plants].flat().forEach((plant, i) => test(`${name} fails on its defect${i ? ` #${i + 1}` : ''}, and only it`, () => {
    const root = copy();
    plant(root);
    assert.deepEqual(failing(root), [name]);
  }));
}
