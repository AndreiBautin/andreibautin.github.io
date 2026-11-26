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
  const values = Object.fromEntries(['uTime', 'uMotion', 'uNameWeight', 'uJelly', 'uFlow', 'uFlowWork', 'uSpin', 'uMorph', 'uForce'].map(key => [key, { value: 0 }]));
  values.uPointer = { value: { lerp() {} } };
  const context = vm.createContext({
    Math, uniforms: values, document: { hidden: false }, active: 4,
    transitionStart: 0, time: 0, last: 0, frame: 0, lowFrames: 0,
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

test('renderer startup announces readiness when a work deep link leaves no project selected', () => {
  const begin = source.lastIndexOf('  resize(); change(');
  const end = source.indexOf('\n} catch', begin);
  assert(begin > 0 && end > begin);
  for (const selected of [null, { dataset: { scene: '2' } }]) {
    const calls = [];
    const context = vm.createContext({
      document: {
        querySelector() { return selected; },
        body: { classList: { add(name) { calls.push(name); } } },
      },
      resize() { calls.push('resize'); },
      change(index) { calls.push(index); },
      render() { calls.push('render'); },
      resume() { calls.push('resume'); },
      CustomEvent: class { constructor(type) { this.type = type; } },
      dispatchEvent(event) { calls.push(event.type); },
    });
    vm.runInContext(source.slice(begin, end), context);
    assert.deepEqual(calls, ['resize', selected ? 2 : 0, 'render', 'field-ready', 'resume', 'portfolio:graphics-ready']);
  }
});
