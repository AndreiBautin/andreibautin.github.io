// Local demo links (docs/LOCAL-DEMOS.md): runs the shipped dist/script.js with its
// real event wiring against the shipped index.html links, under an injected
// location, and checks which launch and detail links it routes to local servers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dist = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(dist, 'script.js'), 'utf8');

const PUBLIC = {
  terra: 'https://andreibautin.github.io/planet-generator/',
  nacre: 'https://liquid-sculpture-studio.andreibautin94.chatgpt.site/',
  pelagic: 'https://pelagic.andreibautin94.chatgpt.site/',
};
const LOCAL = { terra: 'http://127.0.0.1:5185/', nacre: 'http://127.0.0.1:4386/', pelagic: 'http://127.0.0.1:4392/' };
const RESUME = './Andrei_Bautin_Resume.pdf';

// The project-details links exactly as index.html ships them.
function shippedNotes() {
  const dialog = html.match(/<aside id="project-info"[\s\S]*?<\/aside>/)[0];
  return [...dialog.matchAll(/<article data-project-note="(\d)"[^>]*>([\s\S]*?)<\/article>/g)].map(([, note, body]) => ({
    note: Number(note),
    links: [...body.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(([, href, text]) => ({ href, text })),
  }));
}

function run(loc) {
  class Target {
    constructor() { this.handlers = new Map(); }
    addEventListener(type, fn) { const list = this.handlers.get(type) ?? []; list.push(fn); this.handlers.set(type, list); }
    dispatchEvent(event) { for (const fn of this.handlers.get(event.type) ?? []) fn(event); return !event.defaultPrevented; }
    click() { return this.dispatchEvent({ type: 'click', button: 0, preventDefault() { this.defaultPrevented = true; } }); }
  }
  class Element extends Target {
    constructor(dataset = {}) {
      super(); this.dataset = dataset; this.attributes = new Map(); this.classes = new Set(); this.writes = 0; this.textContent = '';
      this.classList = { add: (...n) => n.forEach(x => this.classes.add(x)), remove: (...n) => n.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x), toggle: (x, force) => { const on = force ?? !this.classes.has(x); if (on) this.classes.add(x); else this.classes.delete(x); return on; } };
    }
    setAttribute(key, value) { this.writes++; this.attributes.set(key, String(value)); }
    getAttribute(key) { return this.attributes.has(key) ? this.attributes.get(key) : null; }
    hasAttribute(key) { return this.attributes.has(key); }
    focus() {}
    scrollIntoView() {}
  }
  class Dialog extends Element {
    constructor() { super(); this.closeButton = new Element(); }
    showModal() { this.open = true; }
    close() { this.open = false; }
    querySelector() { return this.closeButton; }
  }
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const win = new Target(), body = new Element(), theme = new Element(), icon = new Element(), home = new Element();
  const resume = new Element(); resume.attributes.set('href', RESUME);
  const buttons = Array.from({ length: 4 }, (_, scene) => new Element({ scene: String(scene) }));
  const details = new Element({ open: 'about' });
  const about = new Dialog(), projectInfo = new Dialog();
  const ids = new Map([['about', about], ['project-info', projectInfo], ['scene-details', details]]);
  const notes = shippedNotes().map(({ note, links }) => {
    const element = new Element({ projectNote: String(note) });
    element.links = links.map(({ href, text }) => { const a = new Element(); a.attributes.set('href', href); a.textContent = text; return a; });
    return element;
  });
  const document = {
    body, visibilityState: 'hidden', addEventListener() {},
    getElementById(id) { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); },
    querySelector(s) { return s === '.theme-toggle' ? theme : s === 'link[rel="icon"]' ? icon : s === '[data-home]' ? home : s === '[data-resume]' ? resume : null; },
    querySelectorAll(s) {
      if (s === '[data-scene]') return buttons;
      if (s === '[data-project-note]') return notes;
      if (s === '[data-project-note] a[href]') return notes.flatMap(n => n.links);
      if (s === '[data-open]') return [details];
      if (s === 'dialog') return [about, projectInfo];
      return [];
    },
  };
  // The location records any navigation; none may ever happen.
  const navigations = [];
  const base = { pathname: '/', hash: '', assign(u) { navigations.push(['assign', u]); }, replace(u) { navigations.push(['replace', u]); }, reload() { navigations.push(['reload']); } };
  const location = new Proxy(Object.assign(base, loc), {
    get(target, key) { if (typeof loc.trap === 'function' && key !== 'pathname' && key !== 'hash') loc.trap(key); return target[key]; },
    set(target, key, value) { if (key !== 'hash') navigations.push(['set', key, value]); target[key] = value; return true; },
  });
  const requests = [];
  const history = { replaceState(_s, _t, value) { location.hash = value.startsWith('#') ? value : ''; } };
  vm.runInNewContext(script, {
    document, location, history, HTMLDialogElement: Dialog, CustomEvent,
    addEventListener: win.addEventListener.bind(win), dispatchEvent: win.dispatchEvent.bind(win),
    localStorage: { getItem: () => null, setItem() {} }, navigator: {},
    fetch: (url) => { requests.push(url); return new Promise(() => {}); },
    setTimeout: () => 0, clearTimeout() {},
  });
  // What a visitor sees for each scene, chosen through the real scene buttons.
  const scenes = buttons.map((button) => {
    button.click();
    const launch = ids.get('scene-launch');
    return { launch: launch.href, text: launch.textContent, category: ids.get('scene-category').textContent, title: ids.get('scene-title').textContent, description: ids.get('scene-description').textContent, details: details.textContent };
  });
  const detailLinks = notes.map(n => n.links.map(a => ({ href: a.getAttribute('href'), text: a.textContent })));
  const detailWrites = notes.flatMap(n => n.links).reduce((sum, a) => sum + a.writes, 0);
  return { scenes, detailLinks, detailWrites, resume: resume.getAttribute('href'), navigations, requests };
}

const publicRun = run({ protocol: 'https:', hostname: 'andreibautin.github.io', port: '' });
const order = ['terra', 'nacre', 'pelagic'];

test('the shipped links are the published demo URLs', () => {
  const notes = shippedNotes();
  assert.deepEqual(notes.map(n => n.note), [1, 2, 3]);
  notes.forEach(({ links }, i) => assert.equal(links[0].href, PUBLIC[order[i]], `${order[i]} details link`));
  assert.deepEqual(notes[0].links[1], { href: 'https://github.com/AndreiBautin/planet-generator', text: 'Source' });
  assert.deepEqual(notes[1].links[1], { href: 'https://github.com/AndreiBautin/nacre', text: 'Source' });
  assert.deepEqual(notes[2].links[1], { href: 'https://github.com/AndreiBautin/pelagic', text: 'Source' });
  // noscript keeps the published URLs; it never runs script.js.
  const noscript = html.match(/<noscript>[\s\S]*?<\/noscript>/)[0];
  for (const url of Object.values(PUBLIC)) assert(noscript.includes(`href="${url}"`), url);
  for (const url of Object.values(LOCAL)) assert(!html.includes(url), 'index.html must not ship a local URL');
});

test('the published origin keeps every demo link byte for byte', () => {
  assert.deepEqual(publicRun.scenes.map(s => s.launch), [RESUME, PUBLIC.terra, PUBLIC.nacre, PUBLIC.pelagic]);
  assert.deepEqual(publicRun.detailLinks, shippedNotes().map(n => n.links));
  assert.equal(publicRun.detailWrites, 0, 'no detail link attribute may be written');
  assert.deepEqual(publicRun.requests, [], 'the published origin makes no request');
  assert.deepEqual(publicRun.navigations, []);
});

for (const hostname of ['127.0.0.1', 'localhost']) {
  test(`http://${hostname}:4357 routes launch and detail links to the local demo servers`, () => {
    const local = run({ protocol: 'http:', hostname, port: '4357' });
    assert.deepEqual(local.scenes.map(s => s.launch), [RESUME, LOCAL.terra, LOCAL.nacre, LOCAL.pelagic]);
    // Facts, labels and the resume are unchanged; only the demo destinations move.
    local.scenes.forEach((scene, i) => assert.deepEqual({ ...scene, launch: null }, { ...publicRun.scenes[i], launch: null }));
    assert.equal(local.resume, RESUME);
    const expected = shippedNotes().map(({ links }, i) => links.map((link, j) => (j === 0 ? { ...link, href: LOCAL[order[i]] } : link)));
    assert.deepEqual(local.detailLinks, expected, 'only the Open links move; Source stays on GitHub');
    // Selecting scenes makes no request of its own: the only one is the preview poll.
    assert(local.requests.every(url => url === '/__preview/token'), local.requests.join());
    assert(local.requests.length <= 1);
    assert.deepEqual(local.navigations, []);
  });
}

test('lookalike, other-port and malformed origins keep the published links and never navigate', () => {
  const thrower = { trap(key) { if (key === 'protocol' || key === 'hostname' || key === 'port') throw new Error('unreadable'); } };
  const cases = [
    { protocol: 'https:', hostname: 'localhost', port: '4357' },
    { protocol: 'http:', hostname: 'localhost', port: '4358' },
    { protocol: 'http:', hostname: 'localhost', port: '' },
    { protocol: 'http:', hostname: '127.0.0.1', port: '43570' },
    { protocol: 'http:', hostname: '127.0.0.1', port: 4357 },
    { protocol: 'http:', hostname: 'localhost.example.test', port: '4357' },
    { protocol: 'http:', hostname: '127.0.0.1.nip.io', port: '4357' },
    { protocol: 'http:', hostname: 'evil-localhost', port: '4357' },
    { protocol: 'http:', hostname: '127.0.0.2', port: '4357' },
    { protocol: 'http:', hostname: '0.0.0.0', port: '4357' },
    { protocol: 'http:', hostname: '[::1]', port: '4357' },
    { protocol: 'http:', hostname: ' localhost', port: '4357' },
    { protocol: 'http:', hostname: ['localhost'], port: '4357' },
    { protocol: 'file:', hostname: '', port: '' },
    {},
    thrower,
  ];
  for (const loc of cases) {
    const label = JSON.stringify(loc);
    const result = run(loc);
    assert.deepEqual(result.scenes, publicRun.scenes, label);
    assert.deepEqual(result.detailLinks, publicRun.detailLinks, label);
    assert.equal(result.detailWrites, 0, label);
    assert.deepEqual(result.requests, [], label);
    assert.deepEqual(result.navigations, [], label);
  }
});
