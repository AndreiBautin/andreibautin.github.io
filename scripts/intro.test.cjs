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

test('overview holds the name and leads with Resume before experience and projects', () => {
  let state = policy.createIntroState(100);
  for (const [elapsed, key, index] of [[0, 'identity', 0], [1599, 'identity', 0], [1600, 'career', 7], [2999, 'career', 7], [3000, 'knowledge', 4], [4200, 'replication', 5], [5400, 'payments', 6], [6600, 'terra', 1], [8000, 'nacre', 2], [9400, 'pelagic', 3], [10799, 'pelagic', 3]]) {
    state = policy.advanceIntro(state, elapsed + 100);
    assert.equal(policy.introBeat(state).key, key);
    assert.equal(policy.introBeat(state).index, index);
  }
  state = policy.advanceIntro(state, 10900);
  assert.equal(state.elapsed, 10800);
  assert.equal(policy.introBeat(state), null);
});

test('normal entry always offers the tour; motion, data saving and explicit destinations skip it', () => {
  assert.equal(policy.shouldStartIntro(), true);
  assert.equal(policy.shouldStartIntro({ seen: true }), true, 'old session state cannot suppress the tour');
  for (const options of [{ reducedMotion: true }, { saveData: true }, ...['top', 'projects', 'terra', 'nacre', 'pelagic', 'construct', 'experience', 'resume', 'career', 'contact', 'work-payments'].map(key => ({ hash: `#${key}` }))]) {
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
  assert.equal(policy.advanceIntro(policy.createIntroState(0), Number.MAX_VALUE).elapsed, 10800);
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
function fixture({ denied = false, seen = false, hash = '', reduced = false, saveData = false, selected = 0, workReady = true, graphicsReady = true } = {}) {
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
  const classes = new Set(workReady ? ['work-ui-ready'] : []);
  if (graphicsReady) classes.add('field-ready');
  doc.body = { classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key) } };
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
  const timers = new Map();
  win.setTimeout = (fn, delay) => { assert.equal(delay, 2500); timers.set(++id, fn); return id; };
  win.clearTimeout = key => timers.delete(key);
  win.addEventListener('portfolio:scene', event => scenes.push(event.detail.index));
  function frame(now) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); }
  return { doc, win, overlay, replay, skip, message, caption, images, frames, scenes, frame, motion, connection, timers };
}

test('adapter showcases work then actual project images and completes once without stale restoration', async () => {
  const { adapter } = await modules(), f = fixture({ selected: 2 });
  let completions = 0; f.win.addEventListener('portfolio:intro-complete', () => completions++);
  adapter.mountIntro(f.doc);
  f.frame(0); f.frame(1600);
  assert.equal(f.images.every(image => image.hidden), true);
  f.frame(3000); f.frame(4200); f.frame(5400); f.frame(6600);
  assert.equal(f.images[0].hidden, false);
  assert.equal(f.images[1].hidden, true);
  f.frame(8000); assert.equal(f.images[1].hidden, false);
  f.frame(9400); assert.equal(f.images[2].hidden, false);
  f.frame(10800); f.frame(15000);
  assert.deepEqual(f.scenes, [0, 7, 4, 5, 6, 1, 2, 3]);
  assert.equal(completions, 1);
  assert.equal(f.overlay.hidden, true);
  assert.equal(f.win.location.hash, '');
  assert.equal(f.frames.size, 0);
});

test('a late graphics renderer receives the current intro beat without interrupting it', async () => {
  const { adapter } = await modules(), f = fixture();
  adapter.mountIntro(f.doc);
  f.frame(0); f.frame(3000);
  f.win.emit('portfolio:graphics-ready');
  assert.deepEqual(f.scenes, [0, 4, 4]);
  assert.equal(f.overlay.hidden, false);
  f.frame(4200);
  assert.equal(f.scenes.at(-1), 5);
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
  f.frame(11100); assert.equal(f.overlay.dataset.introBeat, 'career');
  f.skip.emit('click'); assert.equal(f.overlay.hidden, true);
  mounted.replay(); assert.equal(f.overlay.hidden, false);
  f.skip.emit('click'); assert.equal(f.frames.size, 0);
});

test('policy skips automatically, while explicit replay is repeatable', async () => {
  const { adapter } = await modules();
  for (const options of [{ hash: '#contact' }, { reduced: true }, { saveData: true }]) {
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

test('Skip completes once, outside navigation does not complete, and interruption restores a professional scene', async () => {
  const { adapter } = await modules();
  const f = fixture();
  const query = f.doc.querySelector;
  f.doc.querySelector = selector => selector === '#work-panel' ? { getAttribute: () => 'payments' } : query(selector);
  let completions = 0; f.win.addEventListener('portfolio:intro-complete', () => completions++);
  const mounted = adapter.mountIntro(f.doc);
  f.doc.emit('pointerdown', { target: new Target() });
  assert.equal(completions, 0);
  assert.equal(f.scenes.at(-1), 6, 'interrupted replay restores the current professional target');
  mounted.replay(); f.skip.emit('click'); f.skip.emit('click');
  assert.equal(completions, 1); assert.equal(f.overlay.hidden, true);
  assert.equal(f.frames.size, 0);
});

test('keyboard can reach Skip; Escape is consumed, and failed work enhancement restores matching copy', async () => {
  const { adapter } = await modules();
  const f = fixture(); adapter.mountIntro(f.doc);
  f.doc.emit('keydown', { key: 'Tab', target: new Target() });
  assert.equal(f.overlay.hidden, false, 'Tab must be able to reach Skip');
  let prevented = false;
  f.overlay.emit('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(f.overlay.hidden, true);
  f.replay.emit('click'); prevented = false;
  f.doc.emit('keydown', { key: 'Escape', target: f.replay, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(f.overlay.hidden, true, 'Escape on Replay also finishes');
  const fallback = fixture({ workReady: false, selected: 2 }); adapter.mountIntro(fallback.doc);
  fallback.frame(0); fallback.frame(10800);
  assert.equal(fallback.scenes.at(-1), 2);
});

test('cold renderer cannot consume the name hold; ready starts the complete tour', async () => {
  const { adapter } = await modules(), f = fixture({ graphicsReady: false });
  adapter.mountIntro(f.doc);
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 1);
  f.frame(10000); assert.equal(f.overlay.dataset.introBeat, 'identity');
  f.win.emit('portfolio:graphics-ready'); assert.equal(f.timers.size, 0);
  f.frame(20000); f.frame(21599);
  assert.equal(f.overlay.dataset.introBeat, 'identity');
  f.frame(21600); assert.equal(f.overlay.dataset.introBeat, 'career');
});

test('missing renderer has a bounded fallback and navigation cancels its pending warmup', async () => {
  const { adapter } = await modules(), f = fixture({ graphicsReady: false });
  adapter.mountIntro(f.doc);
  const fallback = [...f.timers.values()][0]; fallback();
  f.frame(0); f.frame(3000); assert.equal(f.scenes.at(-1), 4);
  const waiting = fixture({ graphicsReady: false }); adapter.mountIntro(waiting.doc);
  const stale = [...waiting.timers.values()][0];
  waiting.doc.emit('pointerdown', { target: new Target() }); stale();
  assert.equal(waiting.frames.size, 0); assert.equal(waiting.timers.size, 0);
  assert.equal(waiting.overlay.hidden, true);
});

test('repeat clean entries play even if storage is denied or a prior tour was seen', async () => {
  const { adapter } = await modules();
  for (const options of [{ denied: true }, { seen: true }]) {
    const f = fixture(options); adapter.mountIntro(f.doc);
    assert.equal(f.overlay.hidden, false);
    assert.equal(f.scenes[0], 0);
  }
});

test('home can explicitly reopen the complete overview from a direct section', async () => {
  const { adapter } = await modules(), f = fixture({ hash: '#resume' }); adapter.mountIntro(f.doc);
  assert.equal(f.overlay.hidden, true);
  f.win.emit('portfolio:replay-intro'); assert.equal(f.overlay.hidden, false);
  f.frame(0); f.frame(1600); assert.equal(f.scenes.at(-1), 7);
});
