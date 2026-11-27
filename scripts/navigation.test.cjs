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
    click() { this.emit('click'); }
  }
  class Dialog extends Element {
    constructor() { super(); this.closeButton = new Element(); }
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
    querySelector() { return this.closeButton; }
  }
  class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } }
  const win = new Target(), body = new Element(), icon = new Element(), theme = new Element(), home = new Element(), resume = new Element(), projectsLink = new Element();
  const buttons = Array.from({ length: 4 }, (_, scene) => new Element({ scene: String(scene) }));
  const experience = new Element({ open: 'about' }), contact = new Element({ open: 'about' }); contact.setAttribute('data-contact', '');
  const sectionLinks = [resume, experience, projectsLink, contact];
  sectionLinks.forEach((link, i) => { link.dataset.sectionLink = ['resume', 'experience', 'projects', 'contact'][i]; });
  const details = new Element({ open: 'about' });
  const about = new Dialog(), projectInfo = new Dialog();
  const ids = new Map([['about', about], ['project-info', projectInfo], ['scene-details', details]]);
  const notes = [1, 2, 3].map(n => new Element({ projectNote: String(n) }));
  const document = {
    body, activeElement: body,
    getElementById(id) { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); },
    querySelector(selector) {
      return selector === '.theme-toggle' ? theme : selector === 'link[rel="icon"]' ? icon : selector === '[data-home]' ? home : selector === '[data-resume]' ? resume : selector === '[data-projects]' ? projectsLink : selector === 'dialog[open]' ? [about, projectInfo].find(d => d.open) : null;
    },
    querySelectorAll(selector) { return selector === '[data-section-link]' ? sectionLinks : selector === '[data-scene]' ? buttons : selector === '[data-project-note]' ? notes : selector === '[data-open]' ? [experience, contact, details] : selector === 'dialog' ? [about, projectInfo] : []; },
  };
  const location = { pathname: '/', hash };
  const scenes = [];
  win.addEventListener('portfolio:scene', event => scenes.push(event.detail.index));
  const history = { replaceState(_state, _title, value) { location.hash = value.startsWith('#') ? value : ''; } };
  const timers = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/script.js'), 'utf8'), {
    document, location, history, HTMLDialogElement: Dialog, CustomEvent,
    addEventListener: win.addEventListener.bind(win), dispatchEvent: win.dispatchEvent.bind(win),
    localStorage: { getItem() { return null; }, setItem() {} }, navigator: {}, setTimeout(fn) { timers.push(fn); },
  });
  const mode = key => win.dispatchEvent(new CustomEvent('portfolio:mode', { detail: { mode: key } }));
  const ready = () => { body.classList.add('work-ui-ready'); win.dispatchEvent(new CustomEvent('portfolio:work-ready')); };
  return { win, body, buttons, experience, contact, resume, about, location, scenes, mode, ready, projectsLink, sectionLinks, home, ids, timers };
}

test('fallback experience remains a native dialog when enhancement is unavailable', () => {
  const f = fixture(); f.experience.emit('click'); assert.equal(f.about.open, true);
  let prevented = false; f.resume.dispatchEvent({ type: 'click', preventDefault() { prevented = true; } });
  assert.equal(prevented, false, 'approved PDF must remain a direct fallback');
});

test('welcome stays on the name after enhancement, graphics readiness and idle time', () => {
  const f = fixture(); f.ready();
  assert.equal(f.scenes.at(-1), 0);
  assert.equal(f.location.hash, '', 'automatic default keeps the clean home URL');
  assert.equal(f.sectionLinks.some(link => link.getAttribute('aria-current') === 'location'), false);
  f.win.emit('portfolio:graphics-ready');
  assert.equal(f.scenes.length, 1);
  assert.equal(f.timers.length, 0, 'welcome must not schedule a slide or delayed route');
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
test('modified resume clicks keep the native PDF destination without changing the active scene', () => {
  for (const flags of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    const f = fixture(); f.ready(); f.buttons[2].emit('click');
    const before = f.scenes.length;
    let prevented = false;
    f.resume.dispatchEvent({ type: 'click', ...flags, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
    assert.equal(f.scenes.length, before);
    assert.equal(f.location.hash, '#nacre');
  }
});

test('explicit professional destinations survive delayed mounting without URL changes', () => {
  for (const [hash, index] of [['#work-payments', 6], ['#experience', 4], ['#career', 7], ['#contact', 8]]) {
    const f = fixture(hash); f.ready();
    assert.equal(f.scenes.at(-1), index); assert.equal(f.location.hash, hash);
  }
});

test('four ordered sections keep their own active state and remember the selected personal project', () => {
  const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
  assert.deepEqual([...html.matchAll(/data-section-link="([^"]+)"/g)].map(m => m[1]), ['resume', 'experience', 'projects', 'contact']);
  assert.deepEqual([...html.matchAll(/data-scene="(\d)"/g)].map(m => Number(m[1])), [1, 2, 3]);
  const f = fixture(); f.ready();
  f.resume.emit('click'); assert.equal(f.resume.getAttribute('aria-current'), 'location');
  f.projectsLink.emit('click'); assert.equal(f.scenes.at(-1), 1);
  assert.equal(f.projectsLink.getAttribute('aria-current'), 'location');
  f.buttons[3].emit('click'); f.contact.emit('click');
  assert.equal(f.contact.getAttribute('aria-current'), 'location');
  f.projectsLink.emit('click'); assert.equal(f.scenes.at(-1), 3);
  assert.equal(f.location.hash, '#pelagic');
  assert.equal(f.sectionLinks.filter(link => link.getAttribute('aria-current') === 'location').length, 1);
});

test('welcome background choice opens Resume and project choice opens the demos', () => {
  const f = fixture(); f.ready();
  const background = f.ids.get('scene-launch');
  assert.equal(background.textContent, 'Explore my background');
  assert.equal(background.href, './Andrei_Bautin_Resume.pdf');
  assert.equal(f.ids.get('scene-details').hidden, true);
  background.emit('click'); assert.equal(f.scenes.at(-1), 7);
  f.home.emit('click'); assert.equal(f.scenes.at(-1), 0);
  assert.equal(f.ids.get('welcome-projects').hidden, false);
  f.ids.get('welcome-projects').emit('click'); assert.equal(f.scenes.at(-1), 1);
  assert.equal(f.ids.get('welcome-projects').hidden, true);
  assert.equal(f.ids.get('scene-details').hidden, false);
});

test('explicit Projects deep link and early Home choice survive delayed enhancement', () => {
  const projects = fixture('#projects'); projects.ready();
  assert.equal(projects.scenes.at(-1), 1); assert.equal(projects.location.hash, '#projects');
  const home = fixture(); home.home.emit('click'); const before = home.scenes.length; home.ready();
  assert.equal(home.scenes.length, before); assert.equal(home.scenes.at(-1), 0);
});

test('graphics readiness restores only the visitor-selected professional target', () => {
  const f = fixture(); f.ready(); f.resume.emit('click');
  f.win.emit('portfolio:graphics-ready');
  assert.equal(f.scenes.at(-1), 7);
});

test('background choice retains PDF fallback and modified native clicks', () => {
  const fallback = fixture(); let prevented = false;
  fallback.ids.get('scene-launch').emit('click', { preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  for (const flags of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    const f = fixture(); f.ready(); const count = f.scenes.length; prevented = false;
    f.ids.get('scene-launch').emit('click', { ...flags, preventDefault() { prevented = true; } });
    assert.equal(prevented, false); assert.equal(f.scenes.length, count);
  }
});

test('professional destinations show a matching summary before optional UI is ready or if it never loads', () => {
  for (const [hash, target, title] of [['#resume', 7, 'Career & credentials'], ['#experience', 4, 'Engineering knowledge assistant'], ['#work-replication', 5, 'Asynchronous data replication'], ['#work-payments', 6, 'Payment automation'], ['#contact', 8, 'Get in touch']]) {
    const f = fixture(hash);
    assert.equal(f.scenes.at(-1), target); assert.equal(f.ids.get('scene-title').textContent, title);
    assert.equal(f.body.classList.contains('work-fallback'), true);
    assert.equal(f.ids.get('scene-launch').href, target === 8 ? 'mailto:andreibautin94@gmail.com' : './Andrei_Bautin_Resume.pdf');
    f.win.emit('portfolio:graphics-ready'); assert.equal(f.scenes.at(-1), target);
    assert.equal(f.ids.get('scene-title').textContent, title); assert.equal(f.location.hash, hash);
    f.ready(); assert.equal(f.scenes.at(-1), target); assert.equal(f.body.classList.contains('work-fallback'), false);
    f.home.emit('click'); assert.equal(f.scenes.at(-1), 0);
  }
});

test('modified Home clicks preserve native anchor behavior and the selected scene', () => {
  for (const flags of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    const f = fixture('#nacre'); let prevented = false; const before = f.scenes.length;
    f.home.emit('click', { ...flags, preventDefault() { prevented = true; } });
    assert.equal(prevented, false); assert.equal(f.scenes.length, before); assert.equal(f.location.hash, '#nacre');
  }
});

test('number shortcuts follow section order and a consumed Escape cannot leave the view again', () => {
  const f = fixture(); f.ready();
  for (const [key, scene] of [['2', 4], ['3', 1], ['4', 8], ['1', 7]]) {
    f.win.emit('keydown', { key }); assert.equal(f.scenes.at(-1), scene);
  }
  const before = f.scenes.length;
  f.win.emit('keydown', { key: 'Escape', defaultPrevented: true });
  assert.equal(f.scenes.length, before);
});
