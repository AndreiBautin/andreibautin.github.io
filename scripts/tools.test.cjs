// The generators and the dev server: behaviour nothing else exercises.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stamp } = require('./stamp.cjs');
const { render } = require('./build_marks.cjs');
const { createServer } = require('../serve.cjs');

const dist = path.resolve(__dirname, '../dist');

// A generator that is not deterministic makes verify's staleness checks flap.
test('stamp is idempotent and repairs a stale stamp', (t) => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  fs.cpSync(dist, copy, { recursive: true });
  const original = fs.readFileSync(path.join(copy, 'index.html'), 'utf8');
  stamp(copy);
  assert.equal(fs.readFileSync(path.join(copy, 'index.html'), 'utf8'), original, 'stamping a stamped page changed it');
  fs.appendFileSync(path.join(copy, 'script.js'), '\n');
  const [, scriptStamp] = stamp(copy);
  const html = fs.readFileSync(path.join(copy, 'index.html'), 'utf8');
  assert(html.includes(scriptStamp) && html !== original);
  stamp(copy);
  assert.equal(fs.readFileSync(path.join(copy, 'index.html'), 'utf8'), html);
});

test('build_marks renders the same module twice', () => assert.equal(render(), render()));

test('dev server holds to the Pages contract', async (t) => {
  const server = createServer(dist).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('content-security-policy'), html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]);
  assert.equal(await home.text(), html);

  const missing = await fetch(`${base}/no-such-page`);
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), fs.readFileSync(path.join(dist, '404.html'), 'utf8'));

  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  // URL parsing resolves a literal "..", but an encoded slash survives it and
  // decodes into a path outside dist/; the server's own guard must refuse it.
  assert.equal((await fetch(`${base}/..%2f..%2fpackage.json`)).status, 403);
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
});

// A root given relative or with forward slashes on Windows once failed the
// containment check for every path, serving 403 for the whole site.
test('dev server accepts an unresolved root', async (t) => {
  const server = createServer(path.relative(process.cwd(), dist).split(path.sep).join('/')).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/`)).status, 200);
});
