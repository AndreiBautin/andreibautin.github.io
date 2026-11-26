// The one gate: pre-push hook, CI and the deploy all run this. Every check
// group runs and reports (scripts/checks.cjs), then the tests that prove the
// groups and tools can fail (scripts/*.test.cjs). The tests run with
// --experimental-vm-modules so the syntax group parses in-process. There is no TypeScript or
// compilation step in this static site.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
// CI uses whatever Node the runner image ships. The tests need node:test
// hooks, global fetch and fs.cpSync; say so plainly rather than failing oddly.
const major = Number(process.versions.node.split('.')[0]);
const minimum = Number(require('./package.json').engines.node.replace('>=', ''));
if (major < minimum) { console.error(`verify needs Node ${minimum} or newer; this is ${process.versions.node}`); process.exit(1); }
const { run } = require('./scripts/checks.cjs');
const preview = require('./scripts/preview.cjs');
// The bundle the gates are about to judge; see the end of this file.
const startToken = preview.bundleToken(`${__dirname}/dist`);
const results = run(__dirname);
for (const { name, error } of results) console.log(`${error ? 'FAIL' : 'ok  '} ${name}${error ? `: ${error.message}` : ''}`);
const failed = results.filter((r) => r.error).length;
if (failed) { console.error(`verify failed: ${failed} of ${results.length} check groups`); process.exit(1); }
try {
  execFileSync(process.execPath, ['--no-warnings', '--experimental-vm-modules', '--test', '--test-reporter=dot', ...fs.readdirSync('scripts').filter((f) => f.endsWith('.test.cjs')).map((f) => `scripts/${f}`)], { cwd: __dirname, stdio: 'inherit' });
} catch { console.error('verify failed: tests'); process.exit(1); }
console.log(`verify passed: ${results.length} check groups and tests`);
// Only now, after every group and test passed: publish the verified-bundle
// token the local preview reloads on (docs/LOCAL-PREVIEW.md). Every failure
// above exits first. A preview problem never fails or alters the gate.
try {
  const { published } = preview.publishVerified(`${__dirname}/dist`, preview.tokenFile(__dirname), startToken);
  console.log(published ? 'local preview token published' : 'local preview token not published: dist/ changed while verify ran');
} catch (error) { console.log(`local preview token not published: ${error.code || 'error'}`); }
