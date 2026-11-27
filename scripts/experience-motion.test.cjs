const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/hero.js'), 'utf8');

function checkRanges(shader) {
  let count = 0;
  for (const match of shader.matchAll(/smoothstep\(\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*,/g)) {
    count++;
    assert(Number(match[1]) < Number(match[2]), `undefined smoothstep range ${match[1]}, ${match[2]}`);
  }
  assert(count >= 6, 'shader range check lost its inputs');
}

test('particle shader uses defined ascending constant smoothstep ranges', () => {
  checkRanges(source);
  // The original reverse-edge fade passes JS syntax checks but is undefined GLSL.
  assert.throws(() => checkRanges(source.replace('smoothstep(.82,1.,travel)', 'smoothstep(1.,.82,travel)')), /undefined smoothstep/);
});

function frames() {
  const values = Object.fromEntries(['uTime', 'uArrival', 'uMotion', 'uNameWeight', 'uJelly', 'uFlow', 'uFlowWork', 'uSpin', 'uMorph', 'uForce'].map(key => [key, { value: 0 }]));
  values.uPointer = { value: { lerp() {} } };
  const context = vm.createContext({
    Math, uniforms: values, document: { hidden: false }, active: 4,
    transitionStart: 0, transitionDuration: 1.45, time: 0, last: 0, frame: 0, lowFrames: 0,
    effectiveCount: 42000, fpsFrames: 0, fpsTime: 0, overlay: false,
    motion: { matches: false }, pointer: {}, status: {}, render() {},
    requestAnimationFrame() { return 1; },
  });
  const begin = source.indexOf('  function draw(now) {');
  const end = source.indexOf('  function resume()', begin);
  assert(begin > 0 && end > begin);
  vm.runInContext(source.slice(begin, end), context);
  let now = 0;
  return { context, tick(n) { for (let i = 0; i < n; i++) context.draw(now += 1000 / 60); } };
}

test('experience flow waits for geometry and swaps identity only while faded', () => {
  const run = frames(), state = run.context, u = state.uniforms;
  run.tick(60);
  assert.equal(u.uFlow.value, 0);
  run.tick(130);
  assert.equal(u.uFlowWork.value, 1);
  assert(u.uFlow.value > 0.99);
  state.active = 6;
  state.transitionStart = state.time;
  run.tick(10);
  assert.equal(u.uFlowWork.value, 1, 'live flow identity must not switch immediately');
  assert(u.uFlow.value > 0 && u.uFlow.value < 1);
  run.tick(180);
  assert.equal(u.uFlowWork.value, 3);
  assert(u.uFlow.value > 0.99);
  state.active = 1;
  state.transitionStart = state.time;
  run.tick(200);
  assert.equal(u.uFlowWork.value, 0);
  assert(u.uFlow.value < 0.001);
});

test('hidden frames do not advance flow time or identity', () => {
  const run = frames(), state = run.context;
  state.document.hidden = true;
  run.tick(100);
  assert.equal(state.time, 0);
  assert.equal(state.uniforms.uFlow.value, 0);
  assert.equal(state.uniforms.uFlowWork.value, 0);
});

test('welcome particles form once and remain on the name through prolonged idle time', () => {
  const run = frames(); run.context.active = 0; run.context.transitionStart = null;
  run.tick(20); assert(run.context.uniforms.uArrival.value > 0 && run.context.uniforms.uArrival.value < 1);
  run.tick(50); assert.equal(run.context.uniforms.uArrival.value, 1);
  run.tick(1200); assert.equal(run.context.active, 0); assert.equal(run.context.uniforms.uArrival.value, 1);
});

test('renderer initializes direct work routes and the welcome name without a tour', () => {
  const begin = source.lastIndexOf('  const initialMode =');
  const end = source.indexOf('\n} catch', begin);
  assert(begin > 0 && end > begin);
  for (const [selected, mode, hash, expected] of [[null, 'career', '', 7], [null, null, '#resume', 7], [null, null, '#work-payments', 6], [{ dataset: { scene: '2' } }, null, '#nacre', 2], [null, null, '', 0]]) {
    const calls = [];
    const context = vm.createContext({
      document: {
        querySelector(selector) { return selector === '#work-panel' ? { getAttribute: () => mode } : selected; },
        body: { classList: { add(name) { calls.push(name); } } },
      },
      location: { hash },
      uniforms: { uArrival: { value: 0 } }, motion: { matches: false },
      resize() { calls.push('resize'); },
      change(index, instant) { assert.equal(instant, true); calls.push(index); },
      render() { calls.push('render'); },
      resume() { calls.push('resume'); },
      CustomEvent: class { constructor(type) { this.type = type; } },
      dispatchEvent(event) { calls.push(event.type); },
    });
    vm.runInContext(source.slice(begin, end), context);
    assert.deepEqual(calls, ['resize', expected, 'render', 'field-ready', 'resume', 'portfolio:graphics-ready']);
    assert.equal(context.uniforms.uArrival.value, expected === 0 ? 0 : 1);
  }
});

test('instant startup paints the work target without the name-to-work morph', () => {
  const begin = source.indexOf('  function change('), end = source.indexOf('  function draw(', begin);
  const attributes = Object.fromEntries(['aFrom', 'aTo', 'aColorFrom', 'aColorTo'].map(key => [key, { array: new Float32Array(3) }]));
  const context = vm.createContext({
    active: 0, transitionStart: null, transitionDuration: 1.45, time: 0,
    shapes: Array.from({ length: 9 }, () => ({ positions: new Float32Array([1, 2, 3]), colors: new Float32Array([1, 1, 1]) })),
    geometry: { getAttribute: key => attributes[key] }, interpolateInto() {},
    uniforms: Object.fromEntries(['uMorph', 'uArrival', 'uWork', 'uNameWeight', 'uJelly'].map(key => [key, { value: key === 'uNameWeight' ? 1 : 0 }])),
    motion: { matches: false }, endDrag() {}, inspectionHint() {}, syncFlow() {}, render() {},
  });
  context.uniforms.uInspect = { value: { set() {} } };
  context.uniforms.uZoom = { value: 1 };
  vm.runInContext(source.slice(begin, end), context);
  context.change(7, true);
  assert.equal(context.active, 7); assert.equal(context.uniforms.uMorph.value, 1);
  assert.equal(context.uniforms.uNameWeight.value, 0); assert.equal(context.transitionStart, null);
  context.change(4);
  assert.equal(context.uniforms.uMorph.value, 0);
  context.change(4, true);
  assert.equal(context.uniforms.uMorph.value, 1); assert.equal(context.transitionStart, null);
  context.change(0); context.change(0, true);
  assert.equal(context.uniforms.uMorph.value, 1); assert.equal(context.uniforms.uNameWeight.value, 1);
  assert.equal(context.transitionStart, null, 'instant identity must settle the preceding Home selection');
});

function inspection() {
  const listeners = new Map(), captures = new Set(), turns = new Map();
  const angle = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } };
  let waves = 0, renders = 0;
  const context = vm.createContext({
    Math, active: 4, overlay: false, time: 2,
    uniforms: { uInspect: { value: angle }, uZoom: { value: 1 }, uWave: { value: { set() { waves++; } } } },
    motion: { matches: false }, pointer: { set() {} }, projectPointer() {}, render() { renders++; },
    canvas: { clientHeight: 900, addEventListener(type, fn) { listeners.set(type, fn); }, setPointerCapture(id) { captures.add(id); }, hasPointerCapture(id) { return captures.has(id); }, releasePointerCapture(id) { captures.delete(id); } },
    document: { querySelectorAll() { return ['left', 'right', 'closer', 'further', 'reset'].map(turn => ({ dataset: { turn }, addEventListener(_type, fn) { turns.set(turn, fn); } })); } },
  });
  const begin = source.indexOf('  let drag = null;'), end = source.indexOf("  addEventListener('resize'", begin);
  vm.runInContext(source.slice(begin, end), context);
  const send = (type, extra = {}) => {
    const event = { button: 0, buttons: 1, pointerType: 'mouse', isPrimary: true, pointerId: 1, clientX: 100, clientY: 100, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    listeners.get(type)(event); return event;
  };
  const right = (type, extra = {}) => send(type, { button: 2, buttons: 2, ...extra });
  return { context, angle, send, right, turns, captures, get waves() { return waves; }, get renders() { return renders; } };
}

test('drag inspection separates waves from rotation and cancels cleanly', () => {
  const f = inspection();
  f.send('pointerdown'); f.send('pointermove', { clientX: 103 }); f.send('pointerup');
  assert.equal(f.angle.x, 0); assert.equal(f.waves, 1); assert.equal(f.captures.size, 0);
  f.right('pointerdown'); f.right('pointermove', { pointerId: 2, clientX: 200 });
  assert.equal(f.angle.x, 0, 'another pointer cannot steer the captured model');
  f.right('pointermove', { clientX: 200, clientY: 10000 }); f.right('pointerup');
  assert(f.angle.x > 0); assert.equal(f.angle.y, Math.PI / 3); assert.equal(f.waves, 1);
  const before = f.angle.x;
  f.send('pointerdown'); f.send('pointercancel'); f.send('pointermove', { clientX: 300 });
  assert.equal(f.angle.x, before);
  assert.equal(f.captures.size, 0);
  f.send('pointerdown'); f.send('lostpointercapture'); f.send('pointerup');
  assert.equal(f.waves, 1);
  f.send('pointerdown'); f.send('pointermove', { clientX: NaN });
  assert.equal(f.angle.x, before, 'malformed synthetic input cannot poison the view');
});

test('rotation controls render manually in reduced motion and reset the view', () => {
  const f = inspection(); f.context.motion.matches = true;
  f.turns.get('right')(); assert.equal(f.angle.x, .3); assert(f.renders > 0);
  f.turns.get('left')(); assert.equal(f.angle.x, 0);
  f.right('pointerdown'); f.right('pointermove', { clientX: 200 }); f.right('pointerup');
  assert(f.angle.x > 0); assert.equal(f.waves, 0);
  f.turns.get('reset')(); assert.equal(f.angle.x, 0); assert.equal(f.angle.y, 0);
  f.context.active = 0; f.turns.get('right')(); assert.equal(f.angle.x, 0);
});

test('only held right mouse drag rotates; left drag, release and context menu stay distinct', () => {
  const f = inspection();
  f.send('pointerdown'); f.send('pointermove', { clientX: 250 }); f.send('pointerup');
  assert.equal(f.angle.x, 0); assert.equal(f.waves, 0);
  f.right('pointerdown'); f.right('pointerup'); assert.equal(f.waves, 0);
  assert.equal(f.send('contextmenu').defaultPrevented, true);
  f.right('pointerdown'); f.right('pointermove', { clientX: 180, buttons: 0 });
  assert.equal(f.angle.x, 0); assert.equal(f.captures.size, 0);
  f.context.active = 0; assert.equal(f.send('contextmenu').defaultPrevented, false);
});

test('wheel zoom is bounded, normalizes units, preserves browser zoom and resets', () => {
  const f = inspection(), scale = f.context.uniforms.uZoom;
  f.context.motion.matches = true;
  assert.equal(f.send('wheel', { deltaY: -100, deltaMode: 0 }).defaultPrevented, true);
  assert(scale.value > 1); assert(f.renders > 0);
  f.turns.get('reset')(); assert.equal(scale.value, 1);
  f.send('wheel', { deltaY: -6.25, deltaMode: 1 }); const lineZoom = scale.value;
  f.turns.get('reset')(); f.send('wheel', { deltaY: -100, deltaMode: 0 });
  assert.equal(scale.value, lineZoom);
  for (let i = 0; i < 20; i++) f.send('wheel', { deltaY: -1, deltaMode: 2 });
  assert.equal(scale.value, 1.5);
  for (let i = 0; i < 20; i++) f.turns.get('further')();
  assert.equal(scale.value, .65);
  for (const props of [{ ctrlKey: true, deltaY: 100 }, { metaKey: true, deltaY: 100 }, { deltaY: NaN }]) assert.equal(f.send('wheel', props).defaultPrevented, false);
  assert.equal(scale.value, .65);
  f.turns.get('reset')(); assert.equal(scale.value, 1);
  f.context.active = 0; assert.equal(f.send('wheel', { deltaY: -100 }).defaultPrevented, false); assert.equal(scale.value, 1);
});
