// Parses files without running them: .cjs as a CommonJS script, anything
// else as an ES module. Throws on the first syntax error, naming the file.
// ES modules need vm.SourceTextModule, which only exists under
// --experimental-vm-modules; without it, this file re-runs itself in one
// child that has the flag, still far cheaper than `node --check` per file.
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
// Sources already parsed clean, by content: the verify tests parse the same
// unchanged files once per planted defect.
const clean = new Set();
function parseAll(files) {
  if (!vm.SourceTextModule) {
    try { execFileSync(process.execPath, ['--no-warnings', '--experimental-vm-modules', __filename, ...files], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (error) { throw new SyntaxError(String(error.stderr).trim()); }
    return;
  }
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const key = crypto.createHash('sha1').update(file.endsWith('.cjs') ? 'c' : 'm').update(source).digest('hex');
    if (clean.has(key)) continue;
    try {
      if (file.endsWith('.cjs')) new vm.Script(require('node:module').wrap(source.replace(/^#!.*/, '')), { filename: file });
      else new vm.SourceTextModule(source, { identifier: file });
    } catch (error) { throw new SyntaxError(`${file}: ${error.message}`); }
    clean.add(key);
  }
}
module.exports = { parseAll };
if (require.main === module) try { parseAll(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
