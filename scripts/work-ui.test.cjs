// dist/work-ui.js (styled by dist/work-ui.css) against a minimal fake DOM.
// No DOM library is installed, so the fake below implements only what the
// module touches: elements, attributes, classList, events, focus, selection.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'dist/work-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'dist/work-ui.css'), 'utf8');
let ui;
test.before(async () => {
  const module = new vm.SourceTextModule(source);
  await module.link(() => { throw new Error('work-ui.js must not import other modules'); });
  await module.evaluate();
  ui = module.namespace;
});

// ---- fake DOM -------------------------------------------------------------
class ClassList {
  constructor(owner) { this.owner = owner; this.set = new Set(); }
  add(...n) { n.forEach((x) => this.set.add(x)); }
  remove(...n) { n.forEach((x) => this.set.delete(x)); }
  contains(n) { return this.set.has(n); }
  toggle(n, force) { const on = force === undefined ? !this.set.has(n) : force; if (on) this.set.add(n); else this.set.delete(n); return on; }
}
class Target {
  constructor() { this.listeners = []; }
  addEventListener(type, fn) { this.listeners.push({ type, fn }); }
  removeEventListener(type, fn) { this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn)); }
  dispatchEvent(event) { for (const l of this.listeners.filter((x) => x.type === event.type)) l.fn(event); return !event.defaultPrevented; }
}
class El extends Target {
  constructor(doc, tag, ns = null) { super(); this.ownerDocument = doc; this.tagName = tag.toUpperCase(); this.namespaceURI = ns; this.attrs = new Map(); this.classList = new ClassList(this); this.children = []; this.parentElement = null; this.text = ''; }
  set className(v) { this.classList.set = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classList.set].join(' '); }
  get id() { return this.getAttribute('id') || ''; }
  setAttribute(k, v) { if (k === 'class') this.className = v; else this.attrs.set(k, String(v)); }
  getAttribute(k) { if (k === 'class') return this.className || null; return this.attrs.has(k) ? this.attrs.get(k) : null; }
  hasAttribute(k) { return this.getAttribute(k) !== null; }
  removeAttribute(k) { if (k === 'class') this.classList.set.clear(); else this.attrs.delete(k); }
  get hidden() { return this.attrs.has('hidden'); }
  set hidden(v) { if (v) this.attrs.set('hidden', ''); else this.attrs.delete('hidden'); }
  get textContent() { return this.text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.text = String(v); for (const c of this.children) c.parentElement = null; this.children = []; }
  append(...nodes) { for (const n of nodes) { if (typeof n === 'string') throw new Error('append text through textContent'); if (n.parentElement) n.remove(); n.parentElement = this; this.children.push(n); } }
  remove() { if (this.parentElement) { this.parentElement.children = this.parentElement.children.filter((c) => c !== this); this.parentElement = null; } }
  *descendants() { for (const c of this.children) { yield c; yield* c.descendants(); } }
  all(match) { return [...this.descendants()].filter(match); }
  querySelector(sel) { const m = /^#([\w-]+)$/.exec(sel); if (!m) throw new Error(`fake DOM cannot query ${sel}`); return this.all((e) => e.id === m[1])[0] || null; }
  contains(o) { for (let e = o; e; e = e.parentElement) if (e === this) return true; return false; }
  // Focus is refused for anything inside a hidden ancestor, as in a browser.
  focus() { for (let e = this; e; e = e.parentElement) if (e.hidden) return; this.ownerDocument.activeElement = this; }
  fire(type, props = {}) { const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props }; const done = this.listeners.filter((l) => l.type === type).map((l) => l.fn(event)); return Object.assign(event, { done: Promise.all(done) }); }
  get innerHTML() { throw new Error('innerHTML is not allowed'); }
  set innerHTML(v) { throw new Error('innerHTML is not allowed'); }
}

function fixture({ clipboard = 'resolve', selection = true } = {}) {
  const win = new Target();
  const doc = { activeElement: null, defaultView: win };
  const h = (tag, attrs = {}) => { const e = new El(doc, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  doc.createElement = (tag) => new El(doc, tag);
  doc.createElementNS = (ns, tag) => new El(doc, tag, ns);
  const body = h('body');
  const stage = h('section', { class: 'particle-stage' });
  const panel = h('div', { id: 'work-panel' }); panel.hidden = true;
  const picker = h('nav', { id: 'projects', tabindex: '-1' });
  const homeChoice = h('a', { id: 'welcome-resume', href: './Andrei_Bautin_Resume.pdf' });
  const header = h('button', { 'data-open': 'about' });
  stage.append(panel, picker, homeChoice); body.append(header, stage);
  doc.body = body;
  doc.querySelector = (sel) => body.querySelector(sel);
  doc.activeElement = body;
  const ranges = [];
  doc.createRange = () => ({ node: null, selectNodeContents(n) { this.node = n; } });
  const pending = [];
  const writes = [];
  win.CustomEvent = class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } };
  win.navigator = { clipboard: clipboard === 'missing' ? undefined : { writeText(text) {
    writes.push(text);
    if (clipboard === 'reject') return Promise.reject(new Error('denied'));
    if (clipboard === 'manual') return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    return Promise.resolve();
  } } };
  win.getSelection = selection ? () => ({ removeAllRanges() { ranges.length = 0; }, addRange(r) { ranges.push(r); } }) : undefined;
  const seen = [];
  win.addEventListener('portfolio:mode', (e) => seen.push(e.detail && e.detail.mode));
  const send = (mode) => win.dispatchEvent(new win.CustomEvent('portfolio:mode', { detail: { mode } }));
  const find = (match) => panel.all(match);
  const byClass = (cls) => find((e) => e.classList.contains(cls));
  const view = (mode) => find((e) => e.getAttribute('data-work-mode') === mode && e.tagName === 'SECTION')[0];
  const tab = (mode) => find((e) => e.id === `work-ui-tab-${mode}`)[0];
  return { homeChoice, win, doc, body, panel, picker, header, send, seen, find, byClass, view, tab, pending, writes, ranges };
}
const flush = () => new Promise((r) => setImmediate(r));
const MODES = ['knowledge', 'replication', 'payments', 'career', 'contact'];
const EXPERIENCE = MODES.slice(0, 3);

// ---- tests -----------------------------------------------------------------
test('mount builds a hidden, labelled HUD and flags the body; dispose removes everything', () => {
  const f = fixture();
  const listenersBefore = f.win.listeners.length;
  const { dispose } = ui.mountWorkUI(f.doc);
  assert.equal(f.panel.hidden, true, 'initial mode is null');
  assert(f.body.classList.contains('work-ui-ready'));
  assert(!f.body.classList.contains('work-view'));
  assert.equal(f.doc.activeElement, f.body, 'mount must not move focus');
  const tablist = f.byClass('work-tabs')[0];
  assert(tablist.classList.contains('scene-picker'), 'Experience shares the Projects layout');
  assert.equal(tablist.getAttribute('role'), 'tablist');
  assert.equal(tablist.getAttribute('aria-label'), 'Professional work');
  for (const mode of MODES) {
    assert.equal(f.view(mode).getAttribute('role'), EXPERIENCE.includes(mode) ? 'tabpanel' : 'region');
    assert(f.view(mode).hidden);
    if (!EXPERIENCE.includes(mode)) { assert.equal(f.tab(mode), undefined); continue; }
    const t = f.tab(mode);
    assert.deepEqual(t.children.map(child => child.tagName), ['SPAN', 'SMALL']);
    assert(t.children[1].textContent.length > 0, 'each tab has a readable subtitle');
    assert.equal(t.getAttribute('role'), 'tab');
    assert.equal(t.getAttribute('aria-controls'), `work-ui-${mode}`);
    assert(t.textContent.length > 0);
  }
  const ids = f.find((e) => e.id).map((e) => e.id);
  assert.equal(ids.length, new Set(ids).size, 'duplicate ids');
  for (const button of f.find((e) => e.tagName === 'BUTTON')) {
    assert.equal(button.getAttribute('type'), 'button');
    assert(button.listeners.some((l) => l.type === 'click'), `${button.textContent} has no click handler`);
    assert((button.getAttribute('aria-label') || button.textContent).trim().length > 0, 'unlabelled button');
  }
  assert.equal(f.win.listeners.length, listenersBefore + 1);
  dispose();
  assert.equal(f.panel.children.length, 0, 'own DOM removed');
  assert.equal(f.panel.hidden, true);
  assert.equal(f.panel.getAttribute('data-work-mode'), null);
  assert(!f.body.classList.contains('work-ui-ready'));
  assert.equal(f.win.listeners.length, listenersBefore, 'window listener removed');
  dispose();
  f.send('career');
  assert.equal(f.panel.hidden, true, 'events after dispose are ignored');
});

test('a missing panel mounts nothing and leaves the body alone', () => {
  const f = fixture();
  f.panel.remove();
  const { dispose } = ui.mountWorkUI(f.doc);
  assert(!f.body.classList.contains('work-ui-ready'));
  assert.equal(f.win.listeners.length, 1);
  dispose();
});

test('portfolio:mode events synchronously set visibility, tabs and body state', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  for (const mode of MODES) {
    f.send(mode);
    assert.equal(f.panel.hidden, false);
    assert(f.body.classList.contains('work-view'));
    assert.equal(f.panel.getAttribute('data-work-mode'), mode);
    for (const other of MODES) {
      assert.equal(f.view(other).hidden, other !== mode, `${other} visibility under ${mode}`);
      if (!EXPERIENCE.includes(other)) continue;
      assert.equal(f.tab(other).getAttribute('aria-selected'), String(other === mode));
      assert.equal(f.tab(other).getAttribute('tabindex'), other === mode ? '0' : '-1');
    }
    assert.equal(f.byClass('work-tabs')[0].hidden, !EXPERIENCE.includes(mode));
  }
  for (const bad of [undefined, {}, { mode: 'resume' }, { mode: 3 }]) {
    f.win.dispatchEvent({ type: 'portfolio:mode', detail: bad });
    assert.equal(f.panel.getAttribute('data-work-mode'), 'contact', `ignored ${JSON.stringify(bad)}`);
  }
  f.send(null);
  assert.equal(f.panel.hidden, true);
  assert(!f.body.classList.contains('work-view'));
  assert(MODES.every((m) => f.view(m).hidden));
  assert.equal(EXPERIENCE.filter((m) => f.tab(m).getAttribute('tabindex') === '0').length, 1, 'one tab stays reachable');
  dispose();
});

test('external events move focus only when the visitor was navigating', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  f.send('knowledge');
  assert.equal(f.doc.activeElement, f.body, 'initial or restored mode does not steal focus');
  f.send(null);
  f.header.focus();
  f.send('career');
  const title = f.find((e) => e.id === 'work-ui-career-title')[0];
  assert.equal(f.doc.activeElement, title, 'header navigation focuses the panel title');
  assert.equal(title.getAttribute('tabindex'), '-1');
  f.header.focus();
  f.send('career');
  assert.equal(f.doc.activeElement, f.header, 're-dispatching the current mode keeps focus');
  dispose();
});

test('tabs request navigation through the event and rove with the arrow keys', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  f.send('knowledge');
  f.tab('payments').fire('click');
  assert.deepEqual(f.seen.slice(-1), ['payments'], 'click dispatches portfolio:mode');
  assert.equal(f.view('payments').hidden, false);
  assert.equal(f.doc.activeElement, f.tab('payments'));
  const press = (mode, key) => f.tab(mode).fire('keydown', { key });
  assert(press('payments', 'ArrowRight').defaultPrevented);
  assert.equal(f.doc.activeElement, f.tab('knowledge'));
  press('knowledge', 'End');
  assert.equal(f.doc.activeElement, f.tab('payments'));
  press('payments', 'ArrowRight');
  assert.equal(f.doc.activeElement, f.tab('knowledge'), 'wraps');
  press('knowledge', 'ArrowLeft');
  assert.equal(f.doc.activeElement, f.tab('payments'));
  press('payments', 'Home');
  assert.equal(f.doc.activeElement, f.tab('knowledge'));
  assert.equal(f.view('knowledge').hidden, false);
  assert.equal(press('knowledge', 'ArrowDown').defaultPrevented, false, 'other keys pass through');
  assert.equal(press('knowledge', 'Tab').defaultPrevented, false);
  assert.equal(f.tab('knowledge').fire('keydown', { key: 'ArrowRight', ctrlKey: true }).defaultPrevented, false);
  dispose();
});

test('the main page stays authoritative: a vetoed request changes nothing', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  f.send('career');
  // A listener that re-dispatches a different mode wins over the request.
  f.win.addEventListener('portfolio:mode', function redirect(e) { if (e.detail.mode === 'payments') { f.win.removeEventListener('portfolio:mode', redirect); f.send('contact'); } });
  f.tab('payments').fire('click');
  assert.equal(f.panel.getAttribute('data-work-mode'), 'contact');
  assert.equal(f.view('contact').hidden, false);
  assert.equal(f.view('payments').hidden, true);
  dispose();
});

test('Home returns to the welcome choice while Escape retains the project return', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  f.send('replication');
  const back = f.byClass('work-back')[0];
  assert.equal(back.textContent, '');
  assert.equal(back.getAttribute('aria-label'), 'Back to home');
  back.focus();
  back.fire('click');
  assert.equal(f.seen.at(-1), null);
  assert.equal(f.panel.hidden, true);
  assert.equal(f.doc.activeElement, f.homeChoice);
  f.send('payments');
  f.tab('payments').focus();
  const esc = f.panel.fire('keydown', { key: 'Escape' });
  assert(esc.defaultPrevented);
  assert.equal(f.panel.hidden, true);
  assert.equal(f.doc.activeElement, f.picker);
  assert.equal(f.panel.fire('keydown', { key: 'Escape' }).defaultPrevented, false, 'Escape is not swallowed once closed');
  dispose();
});

test('work views carry short factual copy, a three-step switcher and an abstract diagram', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  assert(ui.CONTENT.payments.steps.join(' ').includes('more than 11 hours of manual work each day'));
  assert(ui.CONTENT.career.milestones.some((m) => m[2].includes('5+ engineers')));
  const all = JSON.stringify(ui.CONTENT);
  assert(!/\d+\s*%|\b\d+x\b|per second|million|dashboard/i.test(all), 'no invented metrics or dashboards');
  for (const fact of ['Azure OpenAI', 'AI Search', 'Service Bus', 'AZ-900', 'AI-900', 'Colorado State University']) assert(html.includes(fact) && all.includes(fact), fact);
  for (const mode of ['knowledge', 'replication', 'payments']) {
    f.send(mode);
    const v = f.view(mode);
    const steps = v.all((e) => e.getAttribute('role') === 'tab');
    assert.deepEqual(steps.map((s) => s.textContent), ['Problem', 'My contribution', 'Outcome']);
    const detail = v.all((e) => e.getAttribute('role') === 'tabpanel')[0];
    assert.equal(detail.textContent, ui.CONTENT[mode].steps[0]);
    steps[2].fire('click');
    assert.equal(detail.textContent, ui.CONTENT[mode].steps[2]);
    assert.equal(steps[2].getAttribute('aria-selected'), 'true');
    assert.equal(detail.getAttribute('aria-labelledby'), steps[2].id);
    steps[2].fire('keydown', { key: 'ArrowRight' });
    assert.equal(detail.textContent, ui.CONTENT[mode].steps[0], 'wraps to the first step');
    assert.equal(f.doc.activeElement, steps[0]);
    const svg = v.all((e) => e.tagName === 'SVG')[0];
    assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert(svg.all((e) => e.tagName === 'TEXT').length === 0, 'diagrams carry no text or numbers');
    assert(v.all((e) => e.tagName === 'P').length <= 3);
    assert(v.all((e) => e.getAttribute('href') === './Andrei_Bautin_Resume.pdf').length === 1);
    const contact = v.all((e) => e.tagName === 'BUTTON' && e.textContent === 'Contact')[0];
    contact.fire('click');
    assert.equal(f.panel.getAttribute('data-work-mode'), 'contact');
    assert.equal(f.doc.activeElement.id, 'work-ui-contact-title');
  }
  const titles = ['knowledge', 'replication', 'payments'].map((m) => ui.CONTENT[m].title);
  assert.equal(new Set(titles).size, 3);
  dispose();
});

test('career offers four selectable milestones in a bottom scene picker and the approved PDF', () => {
  const f = fixture();
  const emphasized = [];
  f.win.addEventListener('portfolio:career-step', event => emphasized.push(event.detail.index));
  const { dispose } = ui.mountWorkUI(f.doc);
  f.send('career');
  const v = f.view('career');
  const row = f.byClass('work-milestones')[0];
  assert(row.classList.contains('scene-picker'), 'Resume shares the Projects layout');
  assert.equal(row.getAttribute('role'), 'tablist');
  assert.equal(row.getAttribute('aria-label'), 'Career milestones');
  assert.equal(v.all((e) => e.getAttribute('role') === 'tab').length, 0, 'no inline milestone row in the HUD');
  assert.equal(v.all((e) => e.classList.contains('work-steps')).length, 0);
  const steps = row.all((e) => e.getAttribute('role') === 'tab');
  assert.equal(steps.length, 4);
  steps.forEach((step, i) => {
    assert.deepEqual(step.children.map((c) => c.tagName), ['SPAN', 'SMALL'], 'project title/subtitle markup');
    assert.equal(step.children[0].textContent, ui.CONTENT.career.milestones[i][0]);
    assert.equal(step.children[1].textContent, ui.CONTENT.career.milestones[i][1]);
    assert.equal(step.getAttribute('aria-controls'), 'work-ui-career-detail');
  });
  assert.deepEqual(steps.map((s) => s.children[0].textContent), ['May 2019', 'June 2019', 'Sept 2024', 'Credentials']);
  assert.match(steps[0].textContent, /B.S., Applied Computing Technology/);
  assert.match(steps[1].textContent, /^June 2019Software Engineer, Brainspire/);
  assert.match(steps[2].textContent, /Senior Software Engineer/);
  assert.match(steps[3].textContent, /Microsoft Azure certifications/);
  const detail = v.all((e) => e.getAttribute('role') === 'tabpanel')[0];
  assert(v.contains(detail), 'detail copy stays in the left HUD');
  assert.equal(v.all((e) => e.classList.contains('work-lede')).length, 0, 'no redundant lede');
  assert.equal(steps[0].getAttribute('aria-selected'), 'true');
  assert.deepEqual(steps.map((s) => s.getAttribute('tabindex')), ['0', '-1', '-1', '-1']);
  steps[3].fire('click');
  assert.equal(emphasized.at(-1), 3);
  assert.match(detail.textContent, /AZ-900.*AI-900/);
  assert.equal(detail.getAttribute('aria-labelledby'), steps[3].id);
  assert.deepEqual(steps.map((s) => s.getAttribute('aria-selected')), ['false', 'false', 'false', 'true']);
  assert.deepEqual(steps.map((s) => s.getAttribute('tabindex')), ['-1', '-1', '-1', '0']);
  assert(steps[3].fire('keydown', { key: 'ArrowRight' }).defaultPrevented);
  assert.equal(emphasized.at(-1), 0, 'wraps to the degree');
  assert.equal(f.doc.activeElement, steps[0]);
  steps[0].fire('keydown', { key: 'ArrowLeft' });
  assert.equal(emphasized.at(-1), 3);
  assert.equal(f.doc.activeElement, steps[3]);
  steps[3].fire('keydown', { key: 'Home' });
  assert.equal(emphasized.at(-1), 0);
  assert.match(detail.textContent, /Colorado State University/);
  steps[0].fire('keydown', { key: 'End' });
  assert.equal(emphasized.at(-1), 3);
  steps[3].fire('keydown', { key: 'ArrowLeft' });
  assert.equal(emphasized.at(-1), 2);
  assert.match(detail.textContent, /Senior Software Engineer/);
  assert.equal(f.doc.activeElement, steps[2]);
  assert.equal(steps[2].fire('keydown', { key: 'ArrowDown' }).defaultPrevented, false, 'other keys pass through');
  assert.deepEqual(f.seen.filter((m) => m !== 'career'), [], 'milestones never navigate');
  const pdf = v.all((e) => e.getAttribute('href') === './Andrei_Bautin_Resume.pdf');
  assert.equal(pdf.length, 1);
  assert(fs.existsSync(path.join(ROOT, 'dist/Andrei_Bautin_Resume.pdf')));
  dispose();
});

test('the milestone row sits outside the scrolling HUD and shows only for career', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  const row = f.byClass('work-milestones')[0];
  const hud = f.byClass('work-hud')[0];
  const tabs = f.byClass('work-tabs')[0];
  assert.equal(row.parentElement, f.panel, 'a direct panel child like the Experience row');
  assert(!hud.contains(row));
  assert.deepEqual(f.panel.children, [hud, tabs, row]);
  assert(row.hidden, 'hidden before any mode');
  for (const mode of [...MODES, null, 'career', 'contact']) {
    f.send(mode);
    assert.equal(row.hidden, mode !== 'career', `milestones under ${mode}`);
    assert.equal(hud.classList.contains('work-hud-milestones'), mode === 'career');
    assert.equal(tabs.hidden, !EXPERIENCE.includes(mode));
  }
  f.send('career');
  row.all((e) => e.getAttribute('role') === 'tab')[1].focus();
  dispose();
  assert(!f.panel.contains(row), 'dispose removes the row');
  assert.equal(row.parentElement, null);
  assert.equal(f.doc.activeElement, f.picker, 'focus inside the row is restored');
  assert(!f.body.classList.contains('work-view'));
});

test('re-entering Resume keeps the selected milestone and re-announces its index', () => {
  const f = fixture();
  const emphasized = [];
  f.win.addEventListener('portfolio:career-step', event => emphasized.push(event.detail.index));
  const { dispose } = ui.mountWorkUI(f.doc);
  assert.deepEqual(emphasized, [0], 'the initial selection is announced');
  f.send('career');
  assert.deepEqual(emphasized, [0, 0], 'entering career announces the selection');
  f.send('career');
  assert.equal(emphasized.length, 2, 'repeating the current mode does not re-announce');
  const steps = f.byClass('work-milestones')[0].all((e) => e.getAttribute('role') === 'tab');
  steps[2].fire('click');
  assert.equal(emphasized.at(-1), 2);
  f.send('knowledge');
  f.send(null);
  const before = emphasized.length;
  f.send('career');
  assert.deepEqual(emphasized.slice(before), [2], 're-entry announces the kept milestone without a reset');
  assert.equal(steps[2].getAttribute('aria-selected'), 'true');
  assert.match(f.view('career').all((e) => e.getAttribute('role') === 'tabpanel')[0].textContent, /Senior Software Engineer/);
  assert(emphasized.every((index) => Number.isInteger(index) && index >= 0 && index <= 3));
  dispose();
  f.send(null);
  f.send('career');
  assert.equal(emphasized.length, before + 1, 'no events after dispose');
});

test('milestone styles give four equal desktop columns and a 2x2 phone grid', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const phoneAt = rules.indexOf('@media(max-width:600px){');
  assert(phoneAt > 0);
  assert(rules.slice(0, phoneAt).includes('.work-milestones.scene-picker{grid-template-columns:repeat(4,minmax(0,1fr))}'));
  const phone = rules.slice(phoneAt, rules.indexOf('\n}', phoneAt));
  assert(phone.includes('.work-milestones.scene-picker{grid-template-columns:repeat(2,minmax(0,1fr))}'));
  assert.match(phone, /\.work-hud\.work-hud-milestones\{bottom:\d+px\}/, 'the HUD clears the two-row picker');
});

test('explicit Home navigation focuses the title even when hiding its opener restores body focus', () => {
  const f = fixture(); const { dispose } = ui.mountWorkUI(f.doc);
  assert.equal(f.doc.activeElement, f.body);
  f.win.dispatchEvent(new f.win.CustomEvent('portfolio:mode', { detail: { mode: 'career', focus: 'title' } }));
  assert.equal(f.doc.activeElement, f.view('career').all(e => e.id === 'work-ui-career-title')[0]);
  dispose();
});

test('contact shows selectable email, mailto, LinkedIn, GitHub and resume links', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  const v = f.view('contact');
  const hrefs = v.all((e) => e.tagName === 'A').map((a) => a.getAttribute('href'));
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  for (const href of hrefs) assert(html.includes(`href="${href}"`), `${href} matches the approved page`);
  assert.deepEqual(hrefs.sort(), ['./Andrei_Bautin_Resume.pdf', 'https://github.com/AndreiBautin', 'https://linkedin.com/in/andrei-bautin-0b2578184', 'mailto:andreibautin94@gmail.com']);
  assert.equal(f.byClass('work-email')[0].textContent, ui.EMAIL);
  assert.match(css, /\.work-email\{[^}]*user-select:all/);
  const status = f.byClass('work-status')[0];
  assert.equal(status.getAttribute('role'), 'status');
  dispose();
});

test('copy announces success only after the clipboard resolves', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture({ clipboard: 'manual' });
  const { dispose } = ui.mountWorkUI(f.doc);
  f.send('contact');
  const copy = f.byClass('work-copy')[0];
  const status = f.byClass('work-status')[0];
  copy.fire('click');
  assert.equal(status.textContent, '', 'nothing claimed before the clipboard answers');
  assert.equal(copy.getAttribute('aria-busy'), 'true');
  f.pending[0].resolve();
  await flush();
  assert.equal(status.textContent, ui.MESSAGES.copied);
  assert.equal(copy.getAttribute('data-copy-state'), 'copied');
  assert.equal(copy.getAttribute('aria-busy'), null);
  assert.deepEqual(f.writes, [ui.EMAIL]);
  t.mock.timers.tick(ui.TIMINGS.copied);
  assert.equal(status.textContent, '');
  assert.equal(copy.getAttribute('data-copy-state'), null);
  dispose();
});

test('a denied or missing clipboard selects the address with a readable fallback', async () => {
  const denied = fixture({ clipboard: 'reject' });
  const a = ui.mountWorkUI(denied.doc);
  await denied.byClass('work-copy')[0].fire('click').done;
  assert.equal(denied.byClass('work-status')[0].textContent, ui.MESSAGES.selected);
  assert.match(ui.MESSAGES.selected, /andreibautin94@gmail\.com.*Ctrl\+C/);
  assert.equal(denied.ranges[0].node, denied.byClass('work-email')[0], 'the email link text is selected');
  assert.equal(denied.byClass('work-copy')[0].getAttribute('data-copy-state'), 'failed');
  a.dispose();
  const missing = fixture({ clipboard: 'missing', selection: false });
  const b = ui.mountWorkUI(missing.doc);
  await missing.byClass('work-copy')[0].fire('click').done;
  assert.equal(missing.byClass('work-status')[0].textContent, ui.MESSAGES.manual);
  assert.match(ui.MESSAGES.manual, /andreibautin94@gmail\.com/);
  b.dispose();
});

test('a stale or post-dispose clipboard answer is ignored', async () => {
  const f = fixture({ clipboard: 'manual' });
  const { dispose } = ui.mountWorkUI(f.doc);
  const copy = f.byClass('work-copy')[0];
  const status = f.byClass('work-status')[0];
  copy.fire('click');
  copy.fire('click');
  f.pending[1].resolve();
  await flush();
  assert.equal(status.textContent, ui.MESSAGES.copied);
  f.pending[0].reject(new Error('late denial'));
  await flush();
  assert.equal(status.textContent, ui.MESSAGES.copied, 'an older attempt cannot overwrite the newer result');
  copy.fire('click');
  dispose();
  f.pending[2].reject(new Error('after dispose'));
  await flush();
  assert.equal(f.ranges.length, 0, 'no selection after dispose');
});

test('dispose returns focus to the projects when it was inside the panel', () => {
  const f = fixture();
  const { dispose } = ui.mountWorkUI(f.doc);
  f.send('career');
  f.view('career').all((e) => e.tagName === 'BUTTON')[0].focus();
  dispose();
  assert.equal(f.doc.activeElement, f.picker);
  assert(!f.body.classList.contains('work-view'));
});

test('helpers validate modes and wrap roving focus', () => {
  assert.deepEqual([...ui.MODES], MODES);
  assert.equal(ui.validMode(null), true);
  for (const bad of [undefined, '', 'Career', 'projects', 0]) assert.equal(ui.validMode(bad), false);
  assert.equal(ui.nextIndex(4, 'ArrowRight', 5), 0);
  assert.equal(ui.nextIndex(0, 'ArrowLeft', 5), 4);
  assert.equal(ui.nextIndex(2, 'Home', 5), 0);
  assert.equal(ui.nextIndex(2, 'End', 5), 4);
  assert.equal(ui.nextIndex(2, 'Enter', 5), -1);
  assert.equal(ui.nextIndex(0, 'ArrowRight', 0), -1);
});

test('module and stylesheet keep to the policy and scope', () => {
  assert(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|\.style\b|fetch\(|XMLHttpRequest|import\(|getContext|<canvas|createElement\('canvas'\)/.test(source));
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const preludes = [...rules.matchAll(/(?:^|[{};])([^{};@]+)\{/g)].map((m) => m[1].trim()).filter((p) => !/^(from|to|\d+%)$/.test(p));
  for (const prelude of preludes) for (const selector of prelude.split(',')) {
    const s = selector.trim();
    assert(s !== '.work-view' && !s.startsWith('.work-view['), 'panel layout must not match the body work-view state class');
    assert(/^\.work-/.test(s) || /^body\.work-view (\.scene-copy|#projects)$/.test(s), `selector outside the .work-* scope: ${s}`);
  }
  assert(!/(^|[^-\w])(html|body|main)\s*\{/.test(rules), 'no page-level overrides');
  assert(!/\.(nav-shell|particle-stage|hero-tech)\b/.test(rules));
  for (const name of new Set([...rules.matchAll(/\.(work-[\w-]+)/g)].map((m) => m[1]))) assert(source.includes(name), `.${name} is styled but never built`);
  assert(!/\b(work-list|work-section)\b/.test(rules + source), 'collides with styles.css experience classes');
});
