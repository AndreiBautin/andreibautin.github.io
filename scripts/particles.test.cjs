const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../dist/particle-shapes.js'), 'utf8');
let shapes;
test.before(async () => { const module = new vm.SourceTextModule(source); await module.link(() => { throw new Error('Geometry cannot import runtime modules'); }); await module.evaluate(); shapes = module.namespace; });
test('all target shapes stay finite and within the visible world at maximum population', () => {
  for (const shape of shapes.createShapes(60000)) {
    assert.equal(shape.positions.length, 240000); assert.equal(shape.colors.length, 180000);
    assert(shape.positions.every(Number.isFinite)); assert(shape.colors.every(Number.isFinite));
    for (let i = 0; i < shape.positions.length; i++) assert(Math.abs(shape.positions[i]) <= (i % 4 === 3 ? 3 : 17));
    assert(shape.colors.every(value => value >= 0 && value <= 1));
  }
});
test('shape identity is deterministic and responds to its injected seed', () => {
  const first = shapes.createShapes(500, 17);
  assert.deepEqual(first, shapes.createShapes(500, 17));
  assert.notDeepEqual(first, shapes.createShapes(500, 18));
  assert.notDeepEqual(first[1].positions, first[2].positions);
});
test('invalid allocations and malformed seeds fail at the boundary', () => {
  for (const count of [0, -1, 60001, NaN, Infinity, 1.5]) assert.throws(() => shapes.createShapes(count), RangeError);
  for (const input of [null, [], NaN, Infinity, '17']) assert.throws(() => shapes.createShapes(100, input), TypeError);
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

test('name distance retains holes and boundaries without mutating the supplied alpha mask', () => {
  const mask = new Uint8Array(81);
  for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) mask[y * 9 + x] = 255;
  mask[4 * 9 + 4] = 0;
  const before = mask.slice(), field = shapes.createNameField(mask, 9, 9);
  assert.deepEqual(mask, before);
  assert.equal(field[4 * 9 + 4], -1); assert(Math.abs(field[0] + Math.SQRT2) < 1e-6);
  assert.equal(field[1 * 9 + 4], 1); assert.equal(field[2 * 9 + 4], 2);
  assert(field.every(Number.isFinite));
});

test('name raster validation bounds memory and rejects missing glyphs', () => {
  for (const [width, height] of [[0, 9], [3.5, 9], [2000, 2000], [NaN, 9]]) assert.throws(() => shapes.createNameField(new Uint8Array(9), width, height), RangeError);
  for (const mask of [null, [], new Uint8Array(8), new Uint8Array(9), new Uint8Array(9).fill(255)]) assert.throws(() => shapes.createNameField(mask, 3, 3), TypeError);
});

test('extruded name keeps glyph holes empty and samples front, back and side depth', () => {
  const mask = new Uint8Array(81);
  for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) mask[y * 9 + x] = 255;
  mask[40] = 0;
  const before = mask.slice(), result = shapes.createNameShape(mask, 9, 9, 2000);
  assert.deepEqual(mask, before); assert.deepEqual(result, shapes.createNameShape(mask, 9, 9, 2000));
  let front = 0, back = 0, side = 0;
  for (let i = 0; i < 2000; i++) {
    const x = Math.round((result.positions[i * 4] / 16 + .5) * 9), y = Math.round((.5 - result.positions[i * 4 + 1] / 8) * 9), z = result.positions[i * 4 + 2];
    assert.equal(mask[y * 9 + x], 255);
    if (z > .4) front++; else if (z < -.4) back++; else side++;
  }
  assert(front > 400 && back > 100 && side > 100);
  assert(result.positions.every(Number.isFinite)); assert(result.colors.every(v => v >= 0 && v <= 1));
});
