// The local preview refresh channel (docs/LOCAL-PREVIEW.md): the token verify
// publishes, the loopback endpoint serve.cjs exposes, and the shipped page's
// poll, run from dist/script.js itself.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const preview = require('./preview.cjs');
const { createServer } = require('../serve.cjs');

const repo = path.resolve(__dirname, '..');
const dist = path.join(repo, 'dist');
const temp = (t, prefix) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };

test('the bundle token is deterministic, content-addressed and only published when the bundle held still', (t) => {
  const copy = temp(t, 'preview-dist-');
  fs.cpSync(dist, copy, { recursive: true });
  const first = preview.bundleToken(copy);
  assert.match(first, preview.TOKEN);
  assert.equal(preview.bundleToken(copy), first, 'unchanged bytes must give the unchanged token');
  assert.equal(preview.bundleToken(dist), first);

  const file = path.join(temp(t, 'preview-token-'), 'nested', 'checkout.token');
  assert.deepEqual(preview.publishVerified(copy, file, first), { published: true, token: first });
  assert.equal(preview.readToken(file), first);
  // An edit while verify ran: the gates judged other bytes, so nothing is published.
  fs.appendFileSync(path.join(copy, 'script.js'), '\n');
  const edited = preview.bundleToken(copy);
  assert.notEqual(edited, first);
  assert.deepEqual(preview.publishVerified(copy, file, first), { published: false, token: edited });
  assert.equal(preview.readToken(file), first, 'an unverified edit must not replace the verified token');
  assert.throws(() => preview.publish(file, '../../etc'), /malformed/);
  fs.writeFileSync(file, 'C:\\Users\\someone\\log');
  assert.equal(preview.readToken(file), null, 'anything but the closed scalar reads as absent');
  // Outside the repository, keyed by checkout.
  const saved = process.env.PORTFOLIO_PREVIEW_TOKEN_FILE;
  delete process.env.PORTFOLIO_PREVIEW_TOKEN_FILE;
  t.after(() => { if (saved !== undefined) process.env.PORTFOLIO_PREVIEW_TOKEN_FILE = saved; });
  const own = preview.tokenFile(repo);
  assert(!path.resolve(own).toLowerCase().startsWith(repo.toLowerCase() + path.sep), own);
  assert.notEqual(preview.tokenFile(path.join(repo, 'other')), own);
});

test('a failed gate never publishes the token', (t) => {
  // A copy whose first check group fails; verify must exit before publishing.
  const root = temp(t, 'preview-verify-');
  for (const rel of ['dist', 'scripts', 'assets/tech', '.github', '.githooks', '.openai', 'docs', 'README.md', 'CLAUDE.md', 'SECURITY.md', 'serve.cjs', 'verify.cjs', 'package.json', 'start-app.bat']) {
    if (fs.existsSync(path.join(repo, rel))) fs.cpSync(path.join(repo, rel), path.join(root, rel), { recursive: true });
  }
  fs.appendFileSync(path.join(root, 'dist/script.js'), '\n'); // stale stamp
  const file = path.join(root, '..', `${path.basename(root)}.token`);
  t.after(() => fs.rmSync(file, { force: true }));
  let failed = false;
  try { execFileSync(process.execPath, ['verify.cjs'], { cwd: root, stdio: 'pipe', env: { ...process.env, PORTFOLIO_PREVIEW_TOKEN_FILE: file } }); } catch (error) { failed = error.status === 1; }
  assert(failed, 'the planted stale stamp must fail verify');
  assert(!fs.existsSync(file), 'a failed verify published a preview token');
});

test('serve.cjs exposes only the closed token, only to its loopback origin, and leaves pages faithful', async (t) => {
  const file = path.join(temp(t, 'preview-serve-'), 'checkout.token');
  const served = temp(t, 'preview-served-');
  fs.cpSync(dist, served, { recursive: true });
  const server = createServer(served, { tokenFile: file }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const port = server.address().port, base = `http://127.0.0.1:${port}`;
  // node:http, because fetch will not send a chosen Host header.
  const token = (host = `127.0.0.1:${port}`) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: preview.ENDPOINT, headers: { host } }, (response) => {
      let body = '';
      response.setEncoding('utf8').on('data', (chunk) => { body += chunk; }).on('end', () => resolve({ status: response.statusCode, body, store: response.headers['cache-control'], csp: response.headers['content-security-policy'] }));
    }).on('error', reject);
  });

  const empty = await token();
  assert.deepEqual([empty.status, empty.body, empty.store], [204, '', 'no-store']);
  assert(empty.csp, 'the endpoint keeps the CSP header');
  const verified = preview.bundleToken(served);
  preview.publish(file, verified);
  assert.deepEqual((({ status, body, store }) => ({ status, body, store }))(await token()), { status: 200, body: verified, store: 'no-store' });
  assert.equal((await token(`localhost:${port}`)).body, verified);
  const script = fs.readFileSync(path.join(served, 'script.js'));
  fs.appendFileSync(path.join(served, 'script.js'), '\n// unverified edit');
  assert.equal((await token()).status, 204, 'a just-published token cannot reload later unverified bytes');
  fs.writeFileSync(path.join(served, 'script.js'), script);
  assert.equal((await token()).body, verified, 'restoring the verified bundle makes its token available again');
  // A rebinding name or another origin learns nothing.
  assert.equal((await token(`attacker.example:${port}`)).status, 404);
  assert.equal((await token(`127.0.0.1:${port + 1}`)).status, 404);
  assert.equal((await fetch(`${base}${preview.ENDPOINT}?x=1`)).status, 404, 'no variant path reaches the token');
  assert.equal((await fetch(`${base}${preview.ENDPOINT}`, { method: 'POST' })).status, 405);
  fs.writeFileSync(file, 'C:\\Users\\someone\\verify.log');
  assert.equal((await token()).status, 204, 'malformed content is never relayed');
  // No markup injection: served pages stay byte-for-byte the source.
  for (const page of ['index.html', '404.html']) assert.equal(await (await fetch(`${base}/${page}`)).text(), fs.readFileSync(path.join(dist, page), 'utf8'));
});

// The shipped script against a minimal lenient DOM, with fetch, timers and
// visibility under the test's control.
function page({ protocol = 'http:', hostname = '127.0.0.1', port = '4357', visibilityState = 'visible', boot } = {}) {
  class Node {
    constructor() { this.dataset = {}; this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false }; }
    setAttribute() {} addEventListener() {} focus() {} scrollIntoView() {}
  }
  const docListeners = [], timers = new Map(), requests = [], answers = [];
  let nextTimer = 1, reloads = 0;
  // The bootstrap poll runs while the script loads, so its answer is queued first.
  if (boot) answers.push({ status: boot[0], text: async () => boot[1] ?? '' });
  const document = {
    body: new Node(), visibilityState,
    addEventListener(type, fn) { docListeners.push([type, fn]); },
    getElementById: () => new Node(), querySelector: () => new Node(), querySelectorAll: () => [],
  };
  const location = { protocol, hostname, port, pathname: '/', hash: '', reload() { reloads++; } };
  const fetch = (url, init) => { requests.push([url, init]); const answer = answers.shift(); return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer); };
  vm.runInNewContext(fs.readFileSync(path.join(dist, 'script.js'), 'utf8'), {
    document, location, fetch, history: { replaceState() {} }, CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    HTMLDialogElement: class {}, addEventListener() {}, dispatchEvent() {}, navigator: {}, localStorage: { getItem: () => null, setItem() {} },
    setTimeout: (fn, ms) => { const id = nextTimer++; timers.set(id, [fn, ms]); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  const respond = (status, body = '') => answers.push({ status, text: async () => body });
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  // Runs the single pending timer; there must never be more than one.
  const tick = async () => { assert.equal(timers.size, 1, 'exactly one owned timer'); const [[id, [fn]]] = timers; timers.delete(id); fn(); await settle(); };
  const visibility = async (state) => { document.visibilityState = state; for (const [type, fn] of docListeners) if (type === 'visibilitychange') fn(); await settle(); };
  return { requests, timers, docListeners, respond, settle, tick, visibility, delay: () => [...timers.values()][0]?.[1], reloads: () => reloads, answers, fail: () => answers.push(new Error('offline')) };
}

test('the published site and every other origin get no poll, timer or listener', async () => {
  for (const origin of [{ protocol: 'https:', hostname: 'andreibautin.github.io', port: '' }, { hostname: '127.0.0.1', port: '4317' }, { hostname: 'localhost', port: '' }, { protocol: 'https:', hostname: 'localhost' }, { hostname: '0.0.0.0' }, { hostname: '192.168.1.5' }, { hostname: 'localhost.example.com' }]) {
    const p = page(origin);
    await p.settle();
    assert.deepEqual([p.requests.length, p.timers.size, p.docListeners.length], [0, 0, 0], JSON.stringify(origin));
  }
});

test('the local page reloads exactly once, only for a newer verified token, through failures and hidden time', async () => {
  const p = page({ boot: [200, 'aaaaaaaaaaaaaaaa'] });
  await p.settle();
  assert.equal(p.requests.length, 1, 'bootstrap polls once');
  assert.equal(JSON.stringify(p.requests[0]), JSON.stringify(['/__preview/token', { cache: 'no-store', credentials: 'omit', redirect: 'error' }]));
  assert.equal(p.docListeners.length, 1, 'one owned visibility listener');

  // Unchanged verification: no reload.
  p.respond(200, 'aaaaaaaaaaaaaaaa'); await p.tick();
  assert.equal(p.reloads(), 0);
  // Server outage and failed or unverified states: no reload, bounded backoff, no storm.
  const quiet = p.delay();
  for (let i = 0; i < 8; i++) { p.fail(); await p.tick(); }
  assert.equal(p.reloads(), 0);
  assert.equal(p.delay(), 30000, 'backoff is capped');
  p.respond(503); await p.tick();
  p.respond(200, '<html>not a token'); await p.tick();
  p.respond(204); await p.tick();
  assert.equal(p.reloads(), 0, 'missing or malformed tokens never reload');
  p.respond(200, 'aaaaaaaaaaaaaaaa'); await p.tick();
  assert.equal(p.delay(), quiet, 'a good answer restores the normal cadence');

  // Hidden: polling stops entirely; nothing runs until visible again.
  await p.visibility('hidden');
  assert.equal(p.timers.size, 0, 'hidden clears the timer');
  const before = p.requests.length;
  await p.visibility('hidden');
  assert.equal(p.requests.length, before);
  // A token published while hidden is picked up on return, once.
  p.respond(200, 'bbbbbbbbbbbbbbbb');
  await p.visibility('visible');
  assert.equal(p.requests.length, before + 1);
  assert.equal(p.reloads(), 1);
  assert.equal(p.timers.size, 0, 'nothing further is scheduled after the reload');
  await p.visibility('hidden'); await p.visibility('visible');
  assert.equal(p.reloads(), 1, 'never a second reload');
  assert.equal(p.requests.length, before + 1);
});

test('a page loaded before any verification reloads when the first verified token appears', async () => {
  const p = page({ hostname: 'localhost', boot: [204] });
  await p.settle();
  p.respond(204); await p.tick();
  assert.equal(p.reloads(), 0);
  p.respond(200, 'cccccccccccccccc'); await p.tick();
  assert.equal(p.reloads(), 1);
});

test('a page that starts hidden waits for visibility before its first poll', async () => {
  const p = page({ visibilityState: 'hidden' });
  await p.settle();
  assert.deepEqual([p.requests.length, p.timers.size, p.docListeners.length], [0, 0, 1]);
  p.respond(200, 'dddddddddddddddd');
  await p.visibility('visible');
  assert.equal(p.requests.length, 1);
  assert.equal(p.reloads(), 0, 'the bootstrap token is the baseline');
  p.respond(200, 'dddddddddddddddd'); await p.tick();
  assert.equal(p.reloads(), 0);
});
