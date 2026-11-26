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

function runLauncher(args) {
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', launcher, ...args], {
      cwd: root,
      windowsHide: true,
    });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { out += chunk; });
    // 'exit' rather than 'close': an attached preview inherits the launcher
    // pipes and would keep 'close' pending for the life of the server.
    child.on('exit', (code) => resolve({ code, out }));
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
      spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Start-Sleep -Milliseconds 200'], { windowsHide: true });
    }
  }
}

describe('startup launcher', { concurrency: 1 }, () => {
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
    assert.equal(result.code, 4, result.out);
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
