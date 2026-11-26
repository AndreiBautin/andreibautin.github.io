// dist/career.js against a fixture of the docs/STORY-CONTRACT.md markup.
// No DOM library is installed, so a small fake DOM below implements only
// what career.js touches: compound selectors, attributes, classList, events.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const load = () => import(pathToFileURL(path.join(ROOT, 'dist/career.js')).href);
const ADDRESS = 'andreibautin94@gmail.com';
const KEYS = ['education', 'engineer', 'senior', 'credentials'];

// ---- fake DOM -------------------------------------------------------------
function parseSelector(selector) {
  const m = /^([a-z]+)?((?:[#.][\w-]+|\[[\w-]+(?:[\^]?="[^"]*")?\])*)$/.exec(selector.trim());
  if (!m) throw new Error(`fake DOM cannot parse ${selector}`);
  const parts = [...m[2].matchAll(/#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:(\^?)="([^"]*)")?\]/g)];
  return (el) => (!m[1] || el.tagName === m[1]) && parts.every(([, id, cls, attr, op, value]) => {
    if (id) return el.getAttribute('id') === id;
    if (cls) return el.classList.contains(cls);
    const actual = el.getAttribute(attr);
    if (actual == null) return false;
    if (value === undefined) return true;
    return op === '^' ? actual.startsWith(value) : actual === value;
  });
}
class ClassList {
  constructor() { this.set = new Set(); }
  add(...n) { n.forEach((x) => this.set.add(x)); }
  remove(...n) { n.forEach((x) => this.set.delete(x)); }
  contains(n) { return this.set.has(n); }
  toggle(n, force) { const on = force === undefined ? !this.set.has(n) : force; if (on) this.set.add(n); else this.set.delete(n); return on; }
}
class El {
  constructor(doc, tag, attrs = {}, children = []) {
    this.ownerDocument = doc; this.tagName = tag; this.attrs = new Map(); this.classList = new ClassList();
    this.children = []; this.parentElement = null; this.listeners = []; this.text = ''; this.offsetWidth = 10;
    for (const [k, v] of Object.entries(attrs)) this.setAttribute(k, v);
    for (const c of [].concat(children)) { if (typeof c === 'string') this.text += c; else { c.parentElement = this; this.children.push(c); } }
  }
  setAttribute(k, v) { if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c)); else this.attrs.set(k, String(v)); }
  getAttribute(k) { if (k === 'class') return [...this.classList.set].join(' ') || null; return this.attrs.has(k) ? this.attrs.get(k) : null; }
  removeAttribute(k) { this.attrs.delete(k); }
  get hidden() { return this.attrs.has('hidden'); }
  set hidden(v) { if (v) this.attrs.set('hidden', ''); else this.attrs.delete('hidden'); }
  get textContent() { return this.text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.text = String(v); this.children = []; }
  *descendants() { for (const c of this.children) { yield c; yield* c.descendants(); } }
  querySelectorAll(sel) { const match = parseSelector(sel); return [...this.descendants()].filter(match); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) { const match = parseSelector(sel); for (let e = this; e; e = e.parentElement) if (match(e)) return e; return null; }
  contains(o) { for (let e = o; e; e = e.parentElement) if (e === this) return true; return false; }
  addEventListener(type, fn, options) { this.listeners.push({ type, fn, options }); }
  removeEventListener(type, fn) { this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn)); }
  dispatch(type, props = {}) {
    const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props };
    const results = this.listeners.filter((l) => l.type === type).map((l) => l.fn(event));
    return Object.assign(event, { done: Promise.all(results) });
  }
  focus() { this.ownerDocument.activeElement = this; }
}

function fixture({ expanded = null, reduced = false, clipboard = 'resolve', io = true } = {}) {
  const doc = { activeElement: null, selections: [] };
  const h = (tag, attrs, children) => new El(doc, tag, attrs, children);
  const steps = KEYS.map((key) => h('li', { class: 'career-step' }, [
    h('button', { 'data-career-step': key, 'aria-expanded': String(key === expanded), 'aria-controls': `career-${key}` }, [key]),
    h('div', { id: `career-${key}`, 'data-career-detail': key }, [`${key} detail`]),
  ]));
  const career = h('section', { id: 'career', class: 'story-section career-section' }, [h('div', { class: 'career-shell' }, [h('ol', { class: 'career-path' }, steps)])]);
  const contact = h('section', { id: 'contact', class: 'story-section contact-finale' }, [
    h('div', { class: 'contact-orbit' }, [
      h('a', { class: 'contact-node', 'data-contact-node': 'email', href: `mailto:${ADDRESS}` }, [h('span', {}, [ADDRESS])]),
      h('a', { class: 'contact-node', 'data-contact-node': 'linkedin', href: 'https://linkedin.com/in/andrei-bautin-0b2578184' }, ['LinkedIn']),
      h('a', { class: 'contact-node', 'data-contact-node': 'github', href: 'https://github.com/AndreiBautin' }, ['GitHub']),
    ]),
    h('button', { id: 'copy-email' }, ['Copy email']),
    h('p', { id: 'copy-status', role: 'status', 'aria-live': 'polite' }),
  ]);
  const body = h('body', {}, [h('main', {}, [career, contact])]);
  const mq = { matches: reduced, listeners: [], addEventListener(t, fn) { this.listeners.push(fn); }, removeEventListener(t, fn) { this.listeners = this.listeners.filter((f) => f !== fn); }, set(v) { this.matches = v; this.listeners.forEach((f) => f({ matches: v })); } };
  const observers = [];
  const pending = [];
  const writes = [];
  const clip = clipboard === 'missing' ? undefined : { writeText(text) {
    writes.push(text);
    if (clipboard === 'reject') return Promise.reject(new Error('denied'));
    if (clipboard === 'manual') return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    return Promise.resolve();
  } };
  class IO { constructor(cb) { this.cb = cb; this.targets = []; this.disconnected = false; observers.push(this); } observe(t) { this.targets.push(t); } disconnect() { this.disconnected = true; } fire(isIntersecting) { this.cb([{ isIntersecting, target: this.targets[0] }]); } }
  const selection = { ranges: [], removeAllRanges() { this.ranges = []; }, addRange(r) { this.ranges.push(r); } };
  Object.assign(doc, {
    body,
    querySelector: (s) => body.querySelector(s),
    getElementById: (id) => body.querySelector(`#${id}`),
    createRange: () => ({ node: null, selectNodeContents(n) { this.node = n; } }),
    defaultView: { matchMedia: () => mq, IntersectionObserver: io ? IO : undefined, navigator: { clipboard: clip }, getSelection: () => selection },
  });
  const $ = (s) => body.querySelector(s);
  return { doc, $, mq, observers, pending, writes, selection, career, contact, button: (k) => $(`[data-career-step="${k}"]`), panel: (k) => $(`#career-${k}`) };
}
const flush = () => new Promise((r) => setImmediate(r));

// ---- pure helpers ----------------------------------------------------------
test('career helpers validate keys, pick the first step and wrap focus', async () => {
  const { validKey, initialKey, nextIndex, emailFromHref } = await load();
  assert.equal(validKey('senior'), true);
  for (const bad of ['', 'Senior', '1x', 'a b', '"]', null, 7, 'x'.repeat(40)]) assert.equal(validKey(bad), false, String(bad));
  assert.equal(initialKey([{ key: 'education' }, { key: 'senior', expanded: true }]), 'senior');
  assert.equal(initialKey([{ key: 'BAD' }, { key: 'engineer' }]), 'engineer');
  assert.equal(initialKey([]), null);
  assert.equal(initialKey('nope'), null);
  assert.equal(nextIndex(3, 'ArrowRight', 4), 0);
  assert.equal(nextIndex(0, 'ArrowLeft', 4), 3);
  assert.equal(nextIndex(1, 'ArrowDown', 4), 2);
  assert.equal(nextIndex(2, 'Home', 4), 0);
  assert.equal(nextIndex(0, 'End', 4), 3);
  assert.equal(nextIndex(0, 'Enter', 4), -1);
  assert.equal(nextIndex(0, 'ArrowRight', 0), -1);
  assert.equal(nextIndex(99, 'ArrowRight', 4), 1);
  assert.equal(emailFromHref(`mailto:${ADDRESS}`), ADDRESS);
  assert.equal(emailFromHref(`MAILTO:${ADDRESS}?subject=hi`), ADDRESS);
  for (const bad of ['https://x.test', 'mailto:', 'mailto:a@b@c', 'mailto:@b', 'mailto:a@', 'mailto:a b@c', 'mailto:"x"@c', undefined]) assert.equal(emailFromHref(bad), '', String(bad));
});

// ---- timeline ----------------------------------------------------------------
test('timeline opens one milestone at a time with clear selected state', async () => {
  const { mountCareer } = await load();
  const f = fixture();
  const view = mountCareer(f.doc);
  assert.equal(f.$('.career-shell').getAttribute('data-career-ready'), 'true');
  assert.equal(f.button('education').getAttribute('aria-expanded'), 'true');
  assert.equal(f.panel('education').hidden, false);
  for (const k of KEYS.slice(1)) { assert.equal(f.button(k).getAttribute('aria-expanded'), 'false'); assert.equal(f.panel(k).hidden, true); }
  assert.equal(f.$('.career-path').getAttribute('data-career-index'), '0');
  assert.equal(f.$('.career-path').getAttribute('data-career-active'), 'education');

  f.button('senior').dispatch('click');
  assert.equal(f.panel('senior').hidden, false);
  assert.equal(f.panel('education').hidden, true);
  assert.equal(f.button('senior').closest('.career-step').classList.contains('is-selected'), true);
  assert.equal(f.button('education').closest('.career-step').classList.contains('is-selected'), false);
  assert.equal(f.$('.career-path').getAttribute('data-career-index'), '2');

  f.button('senior').dispatch('click');
  assert.equal(f.panel('senior').hidden, true);
  assert.equal(f.button('senior').getAttribute('aria-expanded'), 'false');
  assert.equal(f.$('.career-path').getAttribute('data-career-active'), null);
  view.dispose();
});

test('a milestone the markup marks expanded opens first', async () => {
  const { mountCareer } = await load();
  const f = fixture({ expanded: 'credentials' });
  const view = mountCareer(f.doc);
  assert.equal(f.panel('credentials').hidden, false);
  assert.equal(f.panel('education').hidden, true);
  view.dispose();
});

test('arrow, Home and End move focus between milestones without selecting', async () => {
  const { mountCareer } = await load();
  const f = fixture();
  const view = mountCareer(f.doc);
  const e = f.button('education').dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(e.defaultPrevented, true);
  assert.equal(f.doc.activeElement, f.button('engineer'));
  assert.equal(f.panel('engineer').hidden, true, 'focus does not select');
  f.button('engineer').dispatch('keydown', { key: 'End' });
  assert.equal(f.doc.activeElement, f.button('credentials'));
  f.button('credentials').dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(f.doc.activeElement, f.button('education'));
  f.button('education').dispatch('keydown', { key: 'ArrowUp' });
  assert.equal(f.doc.activeElement, f.button('credentials'));
  const ignored = f.button('credentials').dispatch('keydown', { key: 'Home', ctrlKey: true });
  assert.equal(ignored.defaultPrevented, false);
  assert.equal(f.button('credentials').dispatch('keydown', { key: 'Tab' }).defaultPrevented, false);
  view.dispose();
});

test('selection pulses once and the timer clears the pulse class', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { mountCareer, TIMINGS } = await load();
  const f = fixture();
  const view = mountCareer(f.doc);
  const item = f.button('engineer').closest('.career-step');
  assert.equal(f.button('education').closest('.career-step').classList.contains('is-pulsing'), false, 'no pulse on mount');
  f.button('engineer').dispatch('click');
  assert.equal(item.classList.contains('is-pulsing'), true);
  t.mock.timers.tick(TIMINGS.stepPulse);
  assert.equal(item.classList.contains('is-pulsing'), false);
  view.dispose();
});

test('the path draws in when first seen; reduced motion shows it at once', async () => {
  const { mountCareer } = await load();
  const f = fixture();
  const view = mountCareer(f.doc);
  const shell = f.$('.career-shell');
  assert.equal(shell.classList.contains('is-revealed'), false);
  assert.equal(f.observers.length, 1);
  f.observers[0].fire(false);
  assert.equal(shell.classList.contains('is-revealed'), false);
  f.observers[0].fire(true);
  assert.equal(shell.classList.contains('is-revealed'), true);
  assert.equal(f.observers[0].disconnected, true);
  view.dispose();

  const r = fixture({ reduced: true });
  const still = mountCareer(r.doc);
  assert.equal(r.$('.career-shell').classList.contains('is-revealed'), true);
  assert.equal(r.observers.length, 0);
  assert.equal(r.$('.career-shell').getAttribute('data-career-motion'), 'reduce');
  r.button('senior').dispatch('click');
  assert.equal(r.button('senior').closest('.career-step').classList.contains('is-pulsing'), false);
  still.dispose();

  const n = fixture({ io: false });
  const plain = mountCareer(n.doc);
  assert.equal(n.$('.career-shell').classList.contains('is-revealed'), true, 'no IntersectionObserver: revealed');
  plain.dispose();
});

test('a live reduced-motion change applies without a reload', async () => {
  const { mountCareer } = await load();
  const f = fixture();
  const view = mountCareer(f.doc);
  const shell = f.$('.career-shell');
  assert.equal(shell.getAttribute('data-career-motion'), 'full');
  f.mq.set(true);
  assert.equal(shell.getAttribute('data-career-motion'), 'reduce');
  assert.equal(shell.classList.contains('is-revealed'), true);
  assert.equal(f.observers[0].disconnected, true);
  assert.equal(f.$('.contact-orbit').getAttribute('data-contact-motion'), 'reduce');
  f.$('[data-contact-node="github"]').dispatch('pointerenter');
  assert.equal(f.$('[data-contact-node="github"]').classList.contains('is-pulsing'), false);
  f.mq.set(false);
  assert.equal(shell.getAttribute('data-career-motion'), 'full');
  view.dispose();
  assert.equal(f.mq.listeners.length, 0, 'media listener removed');
});

// ---- contact -----------------------------------------------------------------
test('hover and keyboard focus pulse a contact and mark the connection', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { mountCareer, TIMINGS } = await load();
  const f = fixture();
  const view = mountCareer(f.doc);
  const orbit = f.$('.contact-orbit');
  const linkedin = f.$('[data-contact-node="linkedin"]');
  assert.equal(orbit.getAttribute('data-contact-ready'), 'true');
  linkedin.dispatch('focusin');
  assert.equal(orbit.getAttribute('data-contact-active'), 'linkedin');
  assert.equal(linkedin.classList.contains('is-pulsing'), true);
  assert.equal(orbit.classList.contains('is-signaling'), true);
  t.mock.timers.tick(TIMINGS.contactPulse);
  assert.equal(linkedin.classList.contains('is-pulsing'), false);
  assert.equal(orbit.classList.contains('is-signaling'), false);
  linkedin.dispatch('focusout', { relatedTarget: null });
  assert.equal(orbit.getAttribute('data-contact-active'), null);
  const github = f.$('[data-contact-node="github"]');
  github.dispatch('pointerenter');
  assert.equal(orbit.getAttribute('data-contact-active'), 'github');
  github.dispatch('pointerleave');
  assert.equal(orbit.getAttribute('data-contact-active'), null);
  assert.equal(github.getAttribute('href'), 'https://github.com/AndreiBautin', 'links stay direct');
  view.dispose();
});

test('copy announces success only after the clipboard resolves, then clears', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { mountCareer, MESSAGES, TIMINGS } = await load();
  const f = fixture({ clipboard: 'manual' });
  const view = mountCareer(f.doc);
  const status = f.$('#copy-status');
  const button = f.$('#copy-email');
  const click = button.dispatch('click');
  assert.deepEqual(f.writes, [ADDRESS]);
  assert.equal(status.textContent, '', 'nothing announced while pending');
  assert.equal(button.getAttribute('aria-busy'), 'true');
  f.pending[0].resolve();
  await click.done;
  assert.equal(status.textContent, MESSAGES.copied);
  assert.equal(button.getAttribute('data-copy-state'), 'copied');
  assert.equal(button.getAttribute('aria-busy'), null);
  t.mock.timers.tick(TIMINGS.copied);
  assert.equal(status.textContent, '');
  assert.equal(button.getAttribute('data-copy-state'), null);
  view.dispose();
});

test('a denied clipboard selects the visible address and says how to copy it', async () => {
  const { mountCareer, MESSAGES } = await load();
  const f = fixture({ clipboard: 'reject' });
  const view = mountCareer(f.doc);
  await f.$('#copy-email').dispatch('click').done;
  const status = f.$('#copy-status').textContent;
  assert.equal(status, MESSAGES.selected(ADDRESS));
  assert.ok(status.includes(ADDRESS));
  assert.ok(!/copied to/i.test(status), 'no fake success');
  assert.equal(f.$('#copy-email').getAttribute('data-copy-state'), 'failed');
  assert.equal(f.selection.ranges.length, 1);
  assert.equal(f.selection.ranges[0].node, f.$('[data-contact-node="email"]'));
  assert.equal(f.$('[data-contact-node="email"]').classList.contains('is-copy-target'), true);
  view.dispose();
  assert.equal(f.$('[data-contact-node="email"]').classList.contains('is-copy-target'), false);
});

test('no clipboard API falls back without calling anything', async () => {
  const { mountCareer, MESSAGES } = await load();
  const f = fixture({ clipboard: 'missing' });
  f.doc.defaultView.getSelection = undefined;
  const view = mountCareer(f.doc);
  await f.$('#copy-email').dispatch('click').done;
  assert.equal(f.$('#copy-status').textContent, MESSAGES.manual(ADDRESS));
  view.dispose();
});

test('a late clipboard answer after a newer click or dispose is ignored', async () => {
  const { mountCareer, MESSAGES } = await load();
  const f = fixture({ clipboard: 'manual' });
  const view = mountCareer(f.doc);
  const button = f.$('#copy-email');
  const first = button.dispatch('click');
  const second = button.dispatch('click');
  f.pending[1].reject(new Error('denied'));
  await second.done;
  assert.equal(f.$('#copy-status').textContent, MESSAGES.selected(ADDRESS));
  f.pending[0].resolve();
  await first.done;
  assert.equal(f.$('#copy-status').textContent, MESSAGES.selected(ADDRESS), 'stale success not announced');
  const third = button.dispatch('click');
  view.dispose();
  f.pending[2].resolve();
  await third.done;
  await flush();
  assert.equal(button.getAttribute('data-copy-state'), null, 'nothing after dispose');
});

// ---- lifecycle ---------------------------------------------------------------
test('dispose restores the markup, removes listeners and clears timers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { mountCareer } = await load();
  const f = fixture();
  const all = () => [...f.doc.body.descendants()];
  const before = all().map((el) => [...el.attrs].join('|') + [...el.classList.set].join(' '));
  const view = mountCareer(f.doc);
  f.button('senior').dispatch('click');
  f.$('[data-contact-node="email"]').dispatch('pointerenter');
  view.dispose();
  view.dispose();
  assert.deepEqual(all().map((el) => [...el.attrs].join('|') + [...el.classList.set].join(' ')), before);
  assert.equal(all().reduce((n, el) => n + el.listeners.length, 0), 0);
  assert.equal(f.observers[0].disconnected, true);
  t.mock.timers.runAll();
  assert.deepEqual(all().map((el) => [...el.attrs].join('|') + [...el.classList.set].join(' ')), before, 'no timer fires after dispose');
});

test('missing or partial markup leaves the page alone', async () => {
  const { mountCareer } = await load();
  const empty = { querySelector: () => null, defaultView: null };
  assert.doesNotThrow(() => mountCareer(empty).dispose());
  assert.doesNotThrow(() => mountCareer(null).dispose());
  const f = fixture();
  const orphan = f.panel('engineer');
  orphan.removeAttribute('id');
  orphan.removeAttribute('data-career-detail');
  const view = mountCareer(f.doc);
  assert.equal(f.button('engineer').getAttribute('aria-expanded'), 'false', 'a step without a panel is left as markup');
  f.button('engineer').dispatch('click');
  assert.equal(f.panel('education').hidden, false);
  view.dispose();
});

// ---- policy and contract -------------------------------------------------------
test('career files keep to the page policy and invent no facts', () => {
  const js = fs.readFileSync(path.join(ROOT, 'dist/career.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'dist/career.css'), 'utf8');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|\.style\b|setInterval|requestAnimationFrame|fetch\(|import\(/.test(js));
  assert.ok(!js.includes('@gmail') && !/https?:/.test(js.replace(/\/\/.*$/gm, '')), 'addresses and links come from the markup');
  assert.ok(!/url\(|@import|https?:/.test(css), 'no external or embedded resources');
  assert.ok(!/animation:[^;}]*infinite/.test(css), 'no constant movement');
  for (const [, name] of css.matchAll(/@keyframes ([\w-]+)/g)) assert.ok(new RegExp(`animation:[^;}]*\\b${name}\\b`).test(css), `@keyframes ${name} unused`);
  assert.ok(/prefers-reduced-motion:reduce/.test(css));
});

test('the shipped page follows the career contract once it carries the sections', (t) => {
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  if (!/<section[^>]*id="career"/.test(html)) { t.skip('dist/index.html does not carry section#career yet (Codex integration)'); return; }
  for (const key of KEYS) {
    const tag = (html.match(new RegExp(`<button[^>]*data-career-step="${key}"[^>]*>`)) || [])[0];
    assert.ok(tag, `button[data-career-step="${key}"]`);
    const controls = (tag.match(/aria-controls="([^"]+)"/) || [])[1];
    assert.ok(controls && /aria-expanded="(true|false)"/.test(tag), `${key}: aria-controls and aria-expanded`);
    assert.ok(new RegExp(`id="${controls}"[^>]*data-career-detail="${key}"|data-career-detail="${key}"[^>]*id="${controls}"`).test(html), `${key}: detail panel #${controls}`);
  }
  for (const sel of ['class="career-shell', 'class="career-path', 'id="contact"', 'contact-orbit', 'id="copy-email"', 'id="copy-status"']) assert.ok(html.includes(sel), sel);
  for (const node of ['email', 'linkedin', 'github']) assert.ok(new RegExp(`<a[^>]*data-contact-node="${node}"[^>]*href=|<a[^>]*href=[^>]*data-contact-node="${node}"`).test(html), `a[data-contact-node="${node}"]`);
  assert.ok(html.includes(`href="mailto:${ADDRESS}"`));
});
