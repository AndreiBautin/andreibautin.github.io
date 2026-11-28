// Launcher behavior through a temporary server. Never binds or stops port 4357.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const launcher = path.join(root, 'start-app.ps1');
const marker = 'Andrei Bautin | Software Engineer';
const csp = "default-src 'self'";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

const onWindows = process.platform === 'win32';

function runLauncher(args) {
  return new Promise((resolve) => {
    // A local script runs under the normal file policy. Do not pass
    // -ExecutionPolicy Bypass; that would change how this process treats scripts.
    const child = spawn('powershell.exe', ['-NoProfile', '-File', launcher, ...args], {
      cwd: root,
      windowsHide: true,
    });
    const started = Date.now();
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { out += chunk; });
    // 'exit' rather than 'close': an attached preview inherits the launcher
    // pipes and would keep 'close' pending for the life of the server.
    child.on('exit', (code, signal) => resolve({
      code,
      out,
      // For a failed assertion: how the launcher ended, how long it took,
      // and everything it wrote to stdout and stderr.
      why: `exit ${String(code)}${signal ? ` signal ${signal}` : ''} after ${Date.now() - started} ms\n${out}`,
    }));
  });
}

function listen(port, respond) {
  const server = http.createServer(respond);
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function portfolioResponse(body = `<title>${marker}</title>`) {
  return (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp });
    res.end(body);
  };
}

async function text(port) {
  const response = await fetch(`http://127.0.0.1:${port}/`);
  return { status: response.status, csp: response.headers.get('content-security-policy'), body: await response.text() };
}

function launchedPid(output) {
  const match = output.match(/LAUNCHED_PID=(\d+)/);
  return match ? Number(match[1]) : 0;
}

function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid) {
  if (!pid) return;
  spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
}

function removeDir(dir) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
}

describe('startup launcher source', () => {
test('batch launcher keeps CRLF and does not retarget git hooks', () => {
  const bat = fs.readFileSync(path.join(root, 'start-app.bat'));
  assert(bat.includes(Buffer.from('\r\n')), 'start-app.bat must use CRLF');
  assert(!bat.includes(Buffer.from('\n')) || bat.toString('latin1').split('\n').every((line) => line.endsWith('\r') || line === ''), 'bare LF in start-app.bat');
  const textBat = bat.toString('utf8');
  assert(textBat.includes('--no-browser'));
  assert(textBat.includes('https://nodejs.org'));
  assert(!textBat.includes('core.hooksPath'));
  assert(!textBat.includes('npm install'));
});
});

// Native cases start powershell.exe and taskkill.exe. On Linux they are
// skipped, which is not a pass of the Windows scenario. The verify-windows
// job runs this same file there.
describe('startup launcher', {
  concurrency: 1,
  skip: onWindows ? false : 'native Windows launcher behavior runs only on Windows (verify-windows)',
}, () => {
test('refuses a foreign listener without stopping it', async () => {
  const port = await freePort();
  const server = await listen(port, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('other-app');
  });
  try {
    const result = await runLauncher(['-Port', String(port), '-NoBrowser', '-ServeEntry', 'does-not-exist.cjs']);
    assert.equal(result.code, 3, result.out);
    assert.match(result.out, /did not stop or replace/);
    assert.doesNotMatch(result.out, /LAUNCHED_PID=/);
    const body = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert.equal(body, 'other-app');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('refuses a page that has the marker but not the portfolio CSP', async () => {
  const port = await freePort();
  const server = await listen(port, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<title>${marker}</title>`);
  });
  try {
    const result = await runLauncher(['-Port', String(port), '-NoBrowser']);
    assert.equal(result.code, 3, result.out);
    assert.equal((await text(port)).body.includes(marker), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('reuses a positively identified preview and does not open another URL', async (t) => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-reuse-'));
  const started = path.join(dir, 'started.txt');
  fs.writeFileSync(path.join(dir, 'serve.cjs'), `require('node:fs').writeFileSync(${JSON.stringify(started)}, 'started');\n`);
  const sink = path.join(dir, 'browser.txt');
  const server = await listen(port, portfolioResponse());
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  try {
    const result = await runLauncher([
      '-Port', String(port), '-Root', dir, '-BrowserSink', sink, '-ServeEntry', 'serve.cjs',
    ]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /already running/);
    assert.match(result.out, /Not opening another browser tab/);
    assert.equal(fs.existsSync(started), false);
    assert.equal(fs.existsSync(sink), false);
    assert.equal((await text(port)).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('reports a missing Node.js prerequisite before starting anything', async () => {
  const port = await freePort();
  const missing = path.join(os.tmpdir(), 'portfolio-missing-node.exe');
  const result = await runLauncher([
    '-Port', String(port), '-NoBrowser', '-NodeExe', missing, '-ReadyTimeoutSec', '2',
  ]);
  assert.equal(result.code, 2, result.out);
  assert.match(result.out, /https:\/\/nodejs\.org/);
  assert.doesNotMatch(result.out, /LAUNCHED_PID=/);
  assert.equal(await probe(port), false);
});

test('reports a too-old Node.js before starting anything', async () => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-old-node-'));
  const fake = path.join(dir, 'node.cmd');
  fs.writeFileSync(fake, '@echo off\r\necho v10.0.0\r\nexit /b 0\r\n');
  try {
    const result = await runLauncher([
      '-Port', String(port), '-NoBrowser', '-NodeExe', fake, '-Root', dir, '-ServeEntry', 'serve.cjs',
    ]);
    assert.equal(result.code, 2, result.out);
    assert.match(result.out, /https:\/\/nodejs\.org/);
    assert.doesNotMatch(result.out, /LAUNCHED_PID=/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('names a missing server entry and does not listen', async () => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-missing-entry-'));
  try {
    const result = await runLauncher(['-Port', String(port), '-NoBrowser', '-Root', dir, '-ServeEntry', 'serve.cjs']);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /was not found/);
    assert.doesNotMatch(result.out, /LAUNCHED_PID=/);
    assert.equal(await probe(port), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('waits until the endpoint is the portfolio, then records one browser open', async (t) => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-ready-'));
  const sink = path.join(dir, 'browser.txt');
  fs.writeFileSync(path.join(dir, 'serve.cjs'), `
    const http = require('node:http');
    setTimeout(() => {
      http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': ${JSON.stringify(csp)} });
        res.end('<title>${marker}</title>');
      }).listen(${port}, '127.0.0.1');
    }, 1200);
  `);
  const started = Date.now();
  const result = await runLauncher([
    '-Port', String(port), '-Root', dir, '-Attached', '-BrowserSink', sink, '-ReadyTimeoutSec', '8',
  ]);
  const pid = launchedPid(result.out);
  t.after(() => { stopPid(pid); removeDir(dir); });
  assert.equal(result.code, 0, result.out);
  assert.ok(Date.now() - started >= 1000, 'returned before the server listened');
  const page = await text(port);
  assert.equal(page.status, 200);
  assert.equal(page.body.includes(marker), true);
  assert.equal(fs.readFileSync(sink, 'utf8').trim().split(/\r?\n/).length, 1);
  const again = await runLauncher(['-Port', String(port), '-Root', dir, '-BrowserSink', sink, '-Attached']);
  assert.equal(again.code, 0, again.out);
  assert.match(again.out, /Not opening another browser tab/);
  assert.equal(fs.readFileSync(sink, 'utf8').trim().split(/\r?\n/).length, 1);
});

test('times out a server that never accepts and stops only that process', async () => {
  const port = await freePort();
  const bystanderPort = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-timeout-'));
  fs.writeFileSync(path.join(dir, 'serve.cjs'), 'setInterval(() => {}, 1000);\n');
  const bystander = await listen(bystanderPort, (req, res) => { res.writeHead(200); res.end('bystander'); });
  try {
    const result = await runLauncher([
      '-Port', String(port), '-Root', dir, '-Attached', '-NoBrowser', '-ReadyTimeoutSec', '2',
    ]);
    assert.equal(result.code, 4, result.why);
    assert.match(result.out, /No other process was stopped/);
    const pid = launchedPid(result.out);
    assert.ok(pid > 0);
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(alive(pid), false);
    assert.equal(await probe(port), false);
    assert.equal(await (await fetch(`http://127.0.0.1:${bystanderPort}/`)).text(), 'bystander');
  } finally {
    await new Promise((resolve) => bystander.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('times out a noisy server with a child, stops both, and leaves an unrelated process', async () => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-timeout-tree-'));
  const childFile = path.join(dir, 'child.pid');
  // Never listens; writes to both pipes all the time and starts a child of
  // its own, so the stop has a tree to take down and output in flight.
  fs.writeFileSync(path.join(dir, 'serve.cjs'), `
    const { spawn } = require('node:child_process');
    const fs = require('node:fs');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    fs.writeFileSync(${JSON.stringify(childFile)}, String(child.pid));
    setInterval(() => {
      process.stdout.write('out '.repeat(200) + '\\n');
      process.stderr.write('err '.repeat(200) + '\\n');
    }, 20);
  `);
  // Started by the test, not by the launcher: it must survive the stop.
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
  let childPid = 0;
  try {
    const result = await runLauncher([
      '-Port', String(port), '-Root', dir, '-Attached', '-NoBrowser', '-ReadyTimeoutSec', '3',
    ]);
    assert.equal(result.code, 4, result.why);
    assert.match(result.out, /stopping the process this launcher started/);
    assert.match(result.out, /No other process was stopped/);
    const pid = launchedPid(result.out);
    assert.ok(pid > 0, result.why);
    childPid = Number(fs.readFileSync(childFile, 'utf8'));
    assert.ok(childPid > 0, 'the server started its child');
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal(alive(pid), false, `launched server ${pid} still running\n${result.why}`);
    assert.equal(alive(childPid), false, `server's child ${childPid} still running\n${result.why}`);
    assert.equal(alive(unrelated.pid), true, 'a process the launcher did not start was stopped');
  } finally {
    // Only processes this test started or the fixture recorded.
    stopPid(childPid);
    if (alive(unrelated.pid)) unrelated.kill();
    removeDir(dir);
  }
});

// The launcher's own cleanup function (scripts/launcher-cleanup.ps1), run in
// PowerShell against a fake process table: which processes it stops, in what
// order, and whether it says the stop was confirmed. No real process is touched.
const cleanup = path.join(root, 'scripts', 'launcher-cleanup.ps1');

function stopWithFake({ rows, procs, snapshotFails = false }) {
  const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
  const at = (seconds) => `([datetime]'2026-11-28T10:00:00').AddSeconds(${seconds})`;
  const table = procs.map((p) => `$procs[${p.id}] = @{ Alive = $true; Start = ${at(p.start)}; Refuse = $${p.refuse ? 'true' : 'false'} }`).join('\n');
  const listing = rows.map((r) => `[pscustomobject]@{ Id = ${r.id}; Parent = ${r.parent}; Created = ${at(r.created)} }`).join(', ');
  const script = `
$ErrorActionPreference = 'Stop'
. ${quote(cleanup)}
$procs = @{}
${table}
$killed = New-Object System.Collections.Generic.List[int]
$rows = @(${listing})
$adapter = @{
  Snapshot = { if (${snapshotFails ? '$true' : '$false'}) { throw 'listing unavailable' }; $rows }
  Open = { param([int]$Id) if ($procs.ContainsKey($Id)) { [pscustomobject]@{ Id = $Id } } else { $null } }
  StartOf = { param($Handle) $procs[[int]$Handle.Id].Start }
  Kill = { param($Handle) $p = $procs[[int]$Handle.Id]; if ($p.Refuse) { throw 'Access is denied.' }; $p.Alive = $false; $killed.Add([int]$Handle.Id) }
  WaitExit = { param($Handle, [int]$Ms) -not $procs[[int]$Handle.Id].Alive }
}
$result = Stop-OwnedTree -Root ([pscustomobject]@{ Id = 100 }) -Adapter $adapter
[pscustomobject]@{ Stopped = $result.Stopped; Failures = @($result.Failures); Killed = @($killed) } | ConvertTo-Json -Compress
`;
  const run = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', windowsHide: true });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const out = JSON.parse(run.stdout.trim());
  return { stopped: out.Stopped, failures: [].concat(out.Failures ?? []), killed: [].concat(out.Killed ?? []) };
}

test('cleanup stops the launched tree deepest first, and nothing else', () => {
  const result = stopWithFake({
    procs: [{ id: 100, start: 0 }, { id: 200, start: 1 }, { id: 300, start: 2 }, { id: 400, start: 3 }],
    rows: [
      { id: 200, parent: 100, created: 1 },
      { id: 300, parent: 200, created: 2 },
      { id: 400, parent: 999, created: 3 },
    ],
  });
  assert.equal(result.stopped, true, result.failures.join(' '));
  assert.deepEqual(result.killed, [300, 200, 100]);
});

test('cleanup reports a stop that did not happen instead of claiming it', () => {
  const child = stopWithFake({
    procs: [{ id: 100, start: 0 }, { id: 200, start: 1, refuse: true }, { id: 300, start: 2 }],
    rows: [{ id: 200, parent: 100, created: 1 }, { id: 300, parent: 200, created: 2 }],
  });
  assert.equal(child.stopped, false);
  assert.match(child.failures.join(' '), /Process 200 did not stop/);
  assert.deepEqual(child.killed, [300, 100]);
  const launched = stopWithFake({ procs: [{ id: 100, start: 0, refuse: true }], rows: [] });
  assert.equal(launched.stopped, false);
  assert.match(launched.failures.join(' '), /Process 100 did not stop/);
  const unlisted = stopWithFake({ procs: [{ id: 100, start: 0 }], rows: [], snapshotFails: true });
  assert.equal(unlisted.stopped, false);
  assert.match(unlisted.failures.join(' '), /Could not list/);
  assert.deepEqual(unlisted.killed, [100]);
});

test('cleanup never stops an id reused by another process', () => {
  // Listed as the launched process's child, but the id now belongs to a
  // process created later: the handle's creation time does not match.
  const reused = stopWithFake({
    procs: [{ id: 100, start: 0 }, { id: 200, start: 5 }],
    rows: [{ id: 200, parent: 100, created: 1 }],
  });
  assert.equal(reused.stopped, true, reused.failures.join(' '));
  assert.deepEqual(reused.killed, [100]);
  // Created after the launched process but before its listed parent: a
  // survivor of an earlier process that had the parent's id.
  const stale = stopWithFake({
    procs: [{ id: 100, start: 0 }, { id: 200, start: 3 }, { id: 300, start: 2 }],
    rows: [{ id: 200, parent: 100, created: 3 }, { id: 300, parent: 200, created: 2 }],
  });
  assert.equal(stale.stopped, true, stale.failures.join(' '));
  assert.deepEqual(stale.killed, [200, 100]);
});

test('a detached preview still answers after the launcher exits', async (t) => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-detach-'));
  fs.writeFileSync(path.join(dir, 'serve.cjs'), `
    const http = require('node:http');
    http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': ${JSON.stringify(csp)} });
      res.end('<title>${marker}</title>');
    }).listen(${port}, '127.0.0.1');
  `);
  const result = await runLauncher([
    '-Port', String(port), '-Root', dir, '-NoBrowser', '-DetachedHidden', '-ReadyTimeoutSec', '8',
  ]);
  const pid = launchedPid(result.out);
  t.after(() => { stopPid(pid); removeDir(dir); });
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /Browser not opened/);
  const page = await text(port);
  assert.equal(page.status, 200);
  assert.equal(page.csp, csp);
  assert.equal(page.body.includes(marker), true);
});

test('detached launch survives from a temporary root whose path contains spaces', async (t) => {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio launch '));
  assert.match(dir, / /, 'temporary root must contain a space so the quoted entry path is real');
  const entry = path.join(dir, 'serve.cjs');
  assert.match(entry, / /);
  fs.writeFileSync(entry, `
    const http = require('node:http');
    http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Security-Policy': ${JSON.stringify(csp)} });
      res.end('<title>${marker}</title>');
    }).listen(${port}, '127.0.0.1');
  `);
  const result = await runLauncher([
    '-Port', String(port), '-Root', dir, '-DetachedHidden', '-NoBrowser', '-ReadyTimeoutSec', '8',
  ]);
  const pid = launchedPid(result.out);
  t.after(() => { stopPid(pid); removeDir(dir); });
  assert.equal(result.code, 0, result.out);
  assert.ok(pid > 0, result.out);
  const page = await text(port);
  assert.equal(page.status, 200);
  assert.equal(page.csp, csp);
  assert.equal(page.body.includes(marker), true);
});

test('leaves an already open 4357 listener untouched', async () => {
  const before = await probe(4357);
  const port = await freePort();
  const server = await listen(port, (req, res) => { res.writeHead(200); res.end('foreign'); });
  try {
    const result = await runLauncher(['-Port', String(port), '-NoBrowser']);
    assert.equal(result.code, 3, result.out);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(await probe(4357), before);
});
});

function probe(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(400, () => done(false));
  });
}
