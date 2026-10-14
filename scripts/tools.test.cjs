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

// smoke.cjs is the only check of the live site; run it against a local copy
// so its own logic is proven to pass on a faithful copy and fail on a bad one.
test('smoke passes a faithful copy and names what a bad one lacks', async (t) => {
  const { check } = require('./smoke.cjs');
  const served = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
  t.after(() => fs.rmSync(served, { recursive: true, force: true }));
  fs.cpSync(dist, served, { recursive: true });
  const server = createServer(served).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const base = new URL(`http://127.0.0.1:${server.address().port}/`);

  assert.deepEqual(await check(base, dist), []);
  fs.rmSync(path.join(served, 'tech-marks.js'));
  const page = path.join(served, '404.html');
  fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ''));
  const problems = await check(base, dist);
  assert(problems.some((p) => p.startsWith('tech-marks.js: HTTP 404')), problems.join('; '));
  assert(problems.some((p) => p.startsWith('404.html: Content-Security-Policy')), problems.join('; '));
});
