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
    motion: { matches: false }, syncFlow() {}, render() {},
  });
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
