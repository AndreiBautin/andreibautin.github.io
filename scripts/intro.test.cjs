const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let policy;
async function modules(context = vm.createContext({})) {
  const state = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../dist/intro-state.js'), 'utf8'), { context });
  const adapter = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, '../dist/intro.js'), 'utf8'), { context });
  await state.link(() => { throw new Error('State must remain browser-free'); });
  await adapter.link(name => { assert.equal(name.split('?')[0], './intro-state.js'); return state; });
  await adapter.evaluate();
  return { state: state.namespace, adapter: adapter.namespace };
}
test.before(async () => { policy = (await modules()).state; });

test('exact visible sequence lasts 4800ms with 900ms identity and 1300ms per project', () => {
  let state = policy.createIntroState(100);
  for (const [elapsed, key, index] of [[0, 'identity', 0], [899, 'identity', 0], [900, 'terra', 1], [2199, 'terra', 1], [2200, 'nacre', 2], [3499, 'nacre', 2], [3500, 'pelagic', 3], [4799, 'pelagic', 3]]) {
    state = policy.advanceIntro(state, elapsed + 100);
    assert.equal(policy.introBeat(state).key, key);
    assert.equal(policy.introBeat(state).index, index);
  }
  state = policy.advanceIntro(state, 4900);
  assert.equal(state.elapsed, 4800);
  assert.equal(policy.introBeat(state), null);
});

test('policy skips seen sessions, motion, data saving and direct destinations', () => {
  assert.equal(policy.shouldStartIntro(), true);
  for (const options of [{ seen: true }, { reducedMotion: true }, { saveData: true }, ...['terra', 'nacre', 'pelagic', 'construct', 'experience', 'career', 'contact'].map(key => ({ hash: `#${key}` }))]) {
    assert.equal(policy.shouldStartIntro(options), false);
  }
  assert.equal(policy.shouldStartIntro({ hash: '#unrelated' }), true);
  assert.equal(policy.shouldStartIntro({ hash: null }), true);
});

test('hostile clocks cannot corrupt progress; paused time is excluded; interruption is terminal', () => {
  let state = policy.createIntroState(10);
  for (const now of [NaN, Infinity, -Infinity, -1, '100', null, {}, 9]) assert.equal(policy.advanceIntro(state, now), state);
  state = policy.advanceIntro(state, 510);
  state = policy.pauseIntro(state);
  state = policy.advanceIntro(state, 100000);
  assert.equal(state.elapsed, 500);
  state = policy.advanceIntro(state, 100400);
  assert.equal(state.elapsed, 900);
  const interrupted = policy.interruptIntro(state);
  assert.equal(policy.advanceIntro(interrupted, Number.MAX_VALUE), interrupted);
  assert.equal(policy.introBeat(interrupted), null);
  for (const now of [NaN, Infinity, -1, '1']) assert.equal(policy.createIntroState(now).anchor, null);
  assert.equal(policy.advanceIntro(policy.createIntroState(0), Number.MAX_VALUE).elapsed, 4800);
});

class Target {
  constructor() { this.handlers = new Map(); this.hidden = false; this.dataset = {}; this.textContent = ''; }
  addEventListener(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, new Set()); this.handlers.get(type).add(fn); }
  removeEventListener(type, fn) { this.handlers.get(type)?.delete(fn); }
  dispatchEvent(event) { for (const fn of [...(this.handlers.get(event.type) ?? [])]) fn(event); }
  emit(type, fields = {}) { this.dispatchEvent({ type, target: this, ...fields }); }
  contains(node) { return node === this || (this.children ?? []).includes(node); }
  focus() { this.focused = true; }
}
function fixture({ denied = false, seen = false, hash = '', reduced = false, saveData = false, selected = 0 } = {}) {
  const doc = new Target(), win = new Target(), overlay = new Target(), replay = new Target(), skip = new Target(), message = new Target(), caption = new Target();
  const images = ['terra', 'nacre', 'pelagic'].map(key => Object.assign(new Target(), { dataset: { introImage: key } }));
  const motion = Object.assign(new Target(), { matches: reduced });
  const connection = Object.assign(new Target(), { saveData });
  const nodes = { '#portfolio-intro': overlay, '#replay-intro': replay, '#skip-intro': skip, '#intro-message': message, '#intro-caption': caption };
  doc.querySelector = selector => selector.startsWith('[data-scene]') ? { dataset: { scene: String(selected) } } : nodes[selector];
  overlay.querySelector = selector => nodes[selector];
  overlay.querySelectorAll = () => images;
  overlay.children = [skip, message, caption, ...images];
  doc.defaultView = win;
  doc.hidden = false;
  win.navigator = { connection };
  win.matchMedia = () => motion;
  win.location = { hash };
  win.sessionStorage = { getItem() { if (denied) throw new Error('denied'); return seen ? '1' : null; }, setItem() { if (denied) throw new Error('denied'); seen = true; } };
  win.CustomEvent = class { constructor(type, fields) { this.type = type; Object.assign(this, fields); } };
  const frames = new Map(), scenes = [];
  let id = 0;
  win.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  win.cancelAnimationFrame = key => frames.delete(key);
  win.addEventListener('portfolio:scene', event => scenes.push(event.detail.index));
  function frame(now) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); }
  return { doc, win, overlay, replay, skip, message, caption, images, frames, scenes, frame, motion, connection };
}

test('adapter cycles actual images with scene events and restores the selected scene without navigation', async () => {
  const { adapter } = await modules(), f = fixture({ selected: 2 });
  adapter.mountIntro(f.doc);
  f.frame(0); f.frame(900);
  assert.equal(f.images[0].hidden, false);
  assert.equal(f.images[1].hidden, true);
  f.frame(2200); assert.equal(f.images[1].hidden, false);
  f.frame(3500); assert.equal(f.images[2].hidden, false);
  f.frame(4800);
  assert.deepEqual(f.scenes, [0, 1, 2, 3, 2]);
  assert.equal(f.overlay.hidden, true);
  assert.equal(f.win.location.hash, '');
  assert.equal(f.frames.size, 0);
});

test('a late graphics renderer receives the current intro beat without interrupting it', async () => {
  const { adapter } = await modules(), f = fixture();
  adapter.mountIntro(f.doc);
  f.frame(0); f.frame(900);
  f.win.emit('portfolio:graphics-ready');
  assert.deepEqual(f.scenes, [0, 1, 1]);
  assert.equal(f.overlay.hidden, false);
  f.frame(2200);
  assert.equal(f.scenes.at(-1), 2);
});

test('the integrated page supplies the optional intro contract and keeps replay outside it', () => {
  const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
  assert.match(html, /id="portfolio-intro"[^>]*hidden/);
  for (const id of ['intro-message', 'intro-caption', 'skip-intro', 'replay-intro']) assert(html.includes(`id="${id}"`));
  assert.deepEqual([...html.matchAll(/data-intro-image="([^"]+)"/g)].map(match => match[1]), ['terra', 'nacre', 'pelagic']);
  const start = html.indexOf('id="portfolio-intro"');
  assert(!html.slice(start, html.indexOf('</aside>', start)).includes('id="replay-intro"'));
});

test('outside controls cancel before their handler; stale frames cannot override the choice', async () => {
  const { adapter } = await modules();
  for (const type of ['pointerdown', 'keydown', 'click', 'wheel']) {
    const f = fixture(); adapter.mountIntro(f.doc);
    const stale = [...f.frames.values()][0];
    f.doc.emit(type, { target: new Target() });
    f.win.dispatchEvent(new f.win.CustomEvent('portfolio:scene', { detail: { index: 3 } }));
    stale(10000);
    assert.deepEqual(f.scenes, [0, 0, 3]);
    assert.equal(f.overlay.hidden, true);
    assert.equal(f.frames.size, 0);
  }
});

test('hidden tabs pause beats, passive pointer movement does not cancel, skip works immediately', async () => {
  const { adapter } = await modules(), f = fixture();
  const mounted = adapter.mountIntro(f.doc);
  f.frame(0); f.frame(500);
  f.doc.emit('pointermove');
  assert.equal(f.overlay.hidden, false);
  f.doc.hidden = true; f.doc.emit('visibilitychange');
  assert.equal(f.frames.size, 0);
  f.doc.hidden = false; f.doc.emit('visibilitychange');
  f.frame(10000); assert.equal(f.overlay.dataset.introBeat, 'identity');
  f.frame(10400); assert.equal(f.overlay.dataset.introBeat, 'terra');
  f.skip.emit('click'); assert.equal(f.overlay.hidden, true);
  mounted.replay(); assert.equal(f.overlay.hidden, false);
  f.skip.emit('click'); assert.equal(f.frames.size, 0);
});

test('denied storage and policy skip automatically, while explicit replay is repeatable', async () => {
  const { adapter } = await modules();
  for (const options of [{ denied: true }, { seen: true }, { hash: '#contact' }, { reduced: true }, { saveData: true }]) {
    const f = fixture(options), mounted = adapter.mountIntro(f.doc);
    assert.equal(f.overlay.hidden, true); assert.deepEqual(f.scenes, []);
    mounted.replay();
    assert.equal(f.overlay.hidden, Boolean(options.reduced || options.saveData));
    mounted.dispose(); mounted.replay(); assert.equal(f.overlay.hidden, true);
  }
});

test('external scenes never get restored over; live preferences, pagehide and dispose stop pending work', async () => {
  const { adapter } = await modules();
  for (const reason of ['scene', 'motion', 'data', 'pagehide', 'dispose']) {
    const f = fixture(), mounted = adapter.mountIntro(f.doc);
    if (reason === 'scene') f.win.dispatchEvent(new f.win.CustomEvent('portfolio:scene', { detail: { index: 1 } }));
    if (reason === 'motion') { f.motion.matches = true; f.motion.emit('change'); }
    if (reason === 'data') { f.connection.saveData = true; f.connection.emit('change'); }
    if (reason === 'pagehide') f.win.emit('pagehide');
    if (reason === 'dispose') mounted.dispose();
    assert.equal(f.frames.size, 0); assert.equal(f.overlay.hidden, true);
    if (reason === 'scene') assert.deepEqual(f.scenes, [0, 1]);
    mounted.dispose();
    assert.equal([...f.doc.handlers.values()].reduce((sum, set) => sum + set.size, 0), 0);
  }
});
