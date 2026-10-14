// The repository as source: scripts parse, text is clean, and the docs and
// tooling agree with the code.
const path = require('node:path');
const assert = require('node:assert/strict');
const { PORT, walk } = require('./shared.cjs');
const { parseAll } = require('../parse.cjs');

// Not ours, generated, or history; everything else is source.
const SKIP = ['.git', 'node_modules', 'dist/vendor'];
const TEXT = /\.(c?js|css|html|md|ya?ml|json|py|bat|svg)$|^\.githooks\/|^\.git(attributes|ignore)$/;
// Every script in the repository, found rather than listed, so a new one is
// syntax-checked without anyone remembering to add it.
const scripts = (root) => walk(root, '', SKIP).filter((f) => /\.c?js$/.test(f));

module.exports = [
  ['syntax', (c) => {
    try { parseAll(scripts(c.root).map((rel) => path.join(c.root, rel))); } catch (error) { assert.fail(error.message.replace(c.root + path.sep, '')); }
  }],
  // Over every text file, not only dist/: an editing layer has twice turned a
  // \b escape into a raw backspace byte in a script and a doc.
  ['text formatting', (c) => {
    for (const file of walk(c.root, '', SKIP).filter((f) => TEXT.test(f))) {
      const text = c.read(file);
      assert(!text.includes(String.fromCharCode(0xfffd)), `${file}: invalid Unicode`);
      // A CSS escape like "\00a0" once landed as a raw NUL byte and drew a
      // replacement character, then "0" and the arrow.
      assert(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text), `${file}: control character`);
      assert(!/[\t ]+$/m.test(text.replace(/\r$/gm, '')), `${file}: trailing whitespace`);
    }
  }],
  // In a template literal \w is just "w" and \b a backspace, so a RegExp built
  // from one with a single backslash silently matches something else; the
  // unused css group ran weakened that way for a round.
  ['regex escapes', (c) => {
    for (const file of scripts(c.root).filter((f) => !f.startsWith('dist/'))) {
      for (const [, body] of c.read(file).matchAll(/new RegExp\(`((?:[^`\\]|\\.)*)`/g)) {
        assert(!/(^|[^\\])(\\\\)*\\[wWbBdDsS.()[\]?*+|]/.test(body), `${file}: new RegExp(\`${body}\`) has a single backslash; double it inside a template literal`);
      }
    }
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
  ['dev port', (c) => {
    assert(c.read('README.md').includes(`http://127.0.0.1:${PORT}`), `README.md must name the dev server port ${PORT}`);
  }],
];
