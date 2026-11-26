const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Executes the shipped classic UI script, including its actual event wiring.
function fixture(hash = '') {
  class Target {
    constructor() { this.handlers = new Map(); }
    addEventListener(type, fn) { const list = this.handlers.get(type) ?? []; list.push(fn); this.handlers.set(type, list); }
    dispatchEvent(event) { event.target ??= this; for (const fn of this.handlers.get(event.type) ?? []) fn(event); return !event.defaultPrevented; }
    emit(type, detail) { return this.dispatchEvent({ type, ...detail, preventDefault() { this.defaultPrevented = true; } }); }
  }
  class Element extends Target {
    constructor(dataset = {}) {
      super(); this.dataset = dataset; this.attributes = new Map(); this.classes = new Set();
      this.classList = { add: (...names) => names.forEach(n => this.classes.add(n)), remove: (...names) => names.forEach(n => this.classes.delete(n)), contains: name => this.classes.has(name), toggle: (name, force) => { const on = force ?? !this.classes.has(name); if (on) this.classes.add(name); else this.classes.delete(name); return on; } };
    }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    getAttribute(key) { return this.attributes.get(key); }
    hasAttribute(key) { return this.attributes.has(key); }
    focus() { document.activeElement = this; }
    scrollIntoView() {}
  }
  class Dialog extends Element {
    constructor() { super(); this.closeButton = new Element(); }
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
    querySelector() { return this.closeButton; }
  }
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const win = new Target(), body = new Element(), icon = new Element(), theme = new Element(), home = new Element(), resume = new Element();
  const buttons = Array.from({ length: 4 }, (_, scene) => new Element({ scene: String(scene) }));
  const experience = new Element({ open: 'about' }), contact = new Element({ open: 'about' }); contact.setAttribute('data-contact', '');
  const details = new Element({ open: 'about' });
  const about = new Dialog(), projectInfo = new Dialog();
  const ids = new Map([['about', about], ['project-info', projectInfo], ['scene-details', details]]);
  const notes = [1, 2, 3].map(n => new Element({ projectNote: String(n) }));
  const document = {
    body, activeElement: body,
    getElementById(id) { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); },
    querySelector(selector) {
      return selector === '.theme-toggle' ? theme : selector === 'link[rel="icon"]' ? icon : selector === '[data-home]' ? home : selector === '[data-resume]' ? resume : selector === 'dialog[open]' ? [about, projectInfo].find(d => d.open) : null;
    },
    querySelectorAll(selector) { return selector === '[data-scene]' ? buttons : selector === '[data-project-note]' ? notes : selector === '[data-open]' ? [experience, contact, details] : selector === 'dialog' ? [about, projectInfo] : []; },
  };
  const location = { pathname: '/', hash };
  const scenes = [];
  win.addEventListener('portfolio:scene', event => scenes.push(event.detail.index));
  const history = { replaceState(_state, _title, value) { location.hash = value.startsWith('#') ? value : ''; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/script.js'), 'utf8'), {
    document, location, history, HTMLDialogElement: Dialog, CustomEvent,
    addEventListener: win.addEventListener.bind(win), dispatchEvent: win.dispatchEvent.bind(win),
    localStorage: { getItem() { return null; }, setItem() {} }, navigator: {}, setTimeout() {},
  });
  const mode = key => win.dispatchEvent(new CustomEvent('portfolio:mode', { detail: { mode: key } }));
  const ready = () => { body.classList.add('work-ui-ready'); win.dispatchEvent(new CustomEvent('portfolio:work-ready')); };
  return { win, body, buttons, experience, contact, resume, about, location, scenes, mode, ready };
}

test('fallback experience remains a native dialog when enhancement is unavailable', () => {
  const f = fixture(); f.experience.emit('click'); assert.equal(f.about.open, true);
  let prevented = false; f.resume.dispatchEvent({ type: 'click', preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'approved PDF must remain a direct fallback');
});

test('late enhancement readiness does not reset the scene or interrupt an intro', () => {
  const f = fixture(); const count = f.scenes.length; f.ready();
  assert.equal(f.scenes.length, count, 'readiness on the default route must emit no replacement scene');
  f.buttons[2].emit('click'); const afterSelection = f.scenes.length; f.ready();
  assert.equal(f.scenes.length, afterSelection);
  assert.equal(f.location.hash, '#nacre');
});

test('professional scenes and Escape preserve the selected project', () => {
  const f = fixture(); f.buttons[1].emit('click'); f.ready(); f.experience.emit('click');
  assert.equal(f.about.open, undefined);
  assert.equal(f.scenes.at(-1), 4); assert.equal(f.location.hash, '#work-knowledge');
  f.mode('replication'); assert.equal(f.scenes.at(-1), 5);
  f.mode('payments'); assert.equal(f.scenes.at(-1), 6);
  f.win.emit('keydown', { key: 'Escape' });
  assert.equal(f.scenes.at(-1), 1); assert.equal(f.location.hash, '#terra');
  assert.equal(f.body.classList.contains('work-view'), false);
  assert.equal(f.buttons[1].getAttribute('aria-pressed'), 'true');
});

test('career/contact routes use their distinct scenes and reject malformed mode requests', () => {
  const f = fixture(); f.ready(); let prevented = false;
  f.resume.dispatchEvent({ type: 'click', preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(f.scenes.at(-1), 7);
  f.contact.emit('click'); assert.equal(f.scenes.at(-1), 8);
  const before = f.scenes.length;
  for (const value of [undefined, {}, 'toString', 5]) f.mode(value);
  assert.equal(f.scenes.length, before);
  f.mode(null); assert.equal(f.scenes.at(-1), 0);
});

test('explicit professional destinations survive delayed mounting without URL changes', () => {
  for (const [hash, index] of [['#work-payments', 6], ['#experience', 4], ['#career', 7], ['#contact', 8]]) {
    const f = fixture(hash); f.ready();
    assert.equal(f.scenes.at(-1), index); assert.equal(f.location.hash, hash);
  }
});
