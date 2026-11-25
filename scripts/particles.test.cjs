const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../dist/particle-shapes.js'), 'utf8');
let shapes;
test.before(async () => { const module = new vm.SourceTextModule(source); await module.link(() => { throw new Error('Geometry cannot import runtime modules'); }); await module.evaluate(); shapes = module.namespace; });
const samples = new Float32Array([-6, 2, 0, 1, -2, 0, 5, 3, 0]);
test('all target shapes stay finite and within the visible world at maximum population', () => {
  for (const shape of shapes.createShapes(60000, samples)) {
    assert.equal(shape.positions.length, 240000); assert.equal(shape.colors.length, 180000);
    assert(shape.positions.every(Number.isFinite)); assert(shape.colors.every(Number.isFinite));
    for (let i = 0; i < shape.positions.length; i++) assert(Math.abs(shape.positions[i]) <= (i % 4 === 3 ? 3 : 17));
    assert(shape.colors.every(value => value >= 0 && value <= 1));
  }
});
test('shape identity is deterministic and does not mutate name input', () => {
  const before = samples.slice(), first = shapes.createShapes(500, samples);
  assert.deepEqual(first, shapes.createShapes(500, samples)); assert.deepEqual(samples, before);
  assert.notDeepEqual(first[1].positions, first[2].positions);
});
test('invalid allocations and malformed raster coordinates fail at the boundary', () => {
  for (const count of [0, -1, 60001, NaN, Infinity, 1.5]) assert.throws(() => shapes.createShapes(count, samples), RangeError);
  for (const input of [null, [], new Float32Array(), new Float32Array([1, 2]), new Float32Array([NaN, 0, 0])]) assert.throws(() => shapes.createShapes(100, input), TypeError);
});
test('retargeting preserves current positions and colors instead of jumping to the old destination', () => {
  const current = new Float32Array([0, 10, 20, .2]), target = new Float32Array([20, 30, 40, .8]);
  shapes.interpolateInto(current, target, .25);
  assert.deepEqual([...current].slice(0, 3), [5, 15, 25]);
  const snapshot = current.slice(), next = new Float32Array([-20, -30, -40, 1]);
  shapes.interpolateInto(current, next, 0); assert.deepEqual(current, snapshot);
  shapes.interpolateInto(current, next, 1); assert.deepEqual(current, next);
  shapes.interpolateInto(current, target, NaN); assert.deepEqual(current, next);
  assert.throws(() => shapes.interpolateInto(current, new Float32Array(2), .5), TypeError);
});
