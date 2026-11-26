const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../dist/work-shapes.js'), 'utf8');
let shapes;
test.before(async () => {
  const module = new vm.SourceTextModule(source);
  await module.link(() => { throw new Error('Geometry cannot import runtime modules'); });
  await module.evaluate();
  shapes = module.namespace;
});

function accent(color) {
  return color[0] > color[1] && color[0] > 0.55;
}

test('five work scenes stay finite, tagged and inside the stage at maximum population', () => {
  const scenes = shapes.createWorkShapes(60000);
  assert.equal(scenes.length, 5);
  for (const shape of scenes) {
    assert.equal(shape.positions.length, 240000);
    assert.equal(shape.colors.length, 180000);
    for (let i = 0; i < shape.positions.length; i += 4) {
      assert(Math.abs(shape.positions[i]) <= 5);
      assert(Math.abs(shape.positions[i + 1]) <= 3.2);
      assert(Math.abs(shape.positions[i + 2]) <= 2.2);
      assert(shape.positions[i + 3] === 0 || shape.positions[i + 3] === 1 || shape.positions[i + 3] === 2);
    }
    for (let i = 0; i < shape.colors.length; i += 3) {
      const color = [shape.colors[i], shape.colors[i + 1], shape.colors[i + 2]];
      assert(color.every((value) => value >= 0 && value <= 1));
      assert(accent(color) || (color[1] >= color[0] * 0.85 && color[1] >= color[2] * 0.45));
    }
  }
});

test('work scene identity is deterministic and changes with the integer seed', () => {
  const first = shapes.createWorkShapes(500, 69);
  assert.deepEqual(first, shapes.createWorkShapes(500));
  assert.deepEqual(first, shapes.createWorkShapes(500, 69));
  assert.notDeepEqual(first, shapes.createWorkShapes(500, 70));
  for (let i = 0; i < first.length; i++) for (let j = i + 1; j < first.length; j++) assert.notDeepEqual(first[i].positions, first[j].positions);
});

test('invalid allocations and malformed seeds fail before geometry is built', () => {
  for (const count of [0, -1, 60001, NaN, Infinity, 1.5]) assert.throws(() => shapes.createWorkShapes(count), RangeError);
  for (const input of [null, [], NaN, Infinity, '69', 69.5]) assert.throws(() => shapes.createWorkShapes(100, input), TypeError);
});

test('low counts still separate the five motifs', () => {
  const one = shapes.createWorkShapes(1, 69);
  assert.equal(one.length, 5);
  const anchors = one.map((shape) => [shape.positions[0], shape.positions[1], shape.positions[2]]);
  for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) assert.notDeepEqual(anchors[i], anchors[j]);
  for (const shape of shapes.createWorkShapes(8, 69)) {
    const tags = new Set();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      tags.add(shape.positions[i * 4 + 3]);
      minX = Math.min(minX, shape.positions[i * 4]);
      maxX = Math.max(maxX, shape.positions[i * 4]);
      minY = Math.min(minY, shape.positions[i * 4 + 1]);
      maxY = Math.max(maxY, shape.positions[i * 4 + 1]);
    }
    assert(tags.size >= 2);
    assert(maxX - minX > 0.4 || maxY - minY > 0.4);
  }
});

test('each scene keeps a readable silhouette and a restrained accent', () => {
  const [knowledge, replication, payments, career, contact] = shapes.createWorkShapes(2400, 69);
  const tally = (shape, accept) => {
    let hits = 0;
    for (let i = 0; i < 2400; i++) if (accept(shape.positions[i * 4], shape.positions[i * 4 + 1], shape.positions[i * 4 + 2], shape.positions[i * 4 + 3])) hits++;
    return hits;
  };
  const accents = (shape) => {
    let hits = 0;
    for (let i = 0; i < 2400; i++) if (accent([shape.colors[i * 3], shape.colors[i * 3 + 1], shape.colors[i * 3 + 2]])) hits++;
    return hits;
  };
  assert(tally(knowledge, (x, y, z) => x * x + y * y + z * z < 0.55) > 500);
  assert(tally(knowledge, (x) => Math.abs(x) > 2.6) > 400);
  assert(tally(replication, (x) => x < -2) > 400);
  assert(tally(replication, (x, y) => x > 1 && y < -1) > 80);
  assert(tally(replication, (x, y) => x > 1 && y > 1) > 80);
  assert(tally(payments, (x, y) => Math.hypot(x, y) > 1.7 && Math.hypot(x, y) < 2.6) > 700);
  assert(tally(payments, (x) => x > 3.4) > 80);
  let left = 0, leftN = 0, right = 0, rightN = 0;
  for (let i = 0; i < 2400; i++) {
    const x = career.positions[i * 4], y = career.positions[i * 4 + 1];
    if (x < -1) { left += y; leftN++; } else if (x > 1) { right += y; rightN++; }
  }
  assert(leftN > 200 && rightN > 200 && right / rightN > left / leftN + 1);
  assert(tally(contact, (x, y, z) => Math.hypot(x + 3.15, y - 1.2, z - 0.72) < 0.55) > 80);
  assert(tally(contact, (x, y, z) => Math.hypot(x - 3.25, y - 1.02, z + 0.58) < 0.55) > 80);
  assert(tally(contact, (x, y, z) => Math.hypot(x - 0.15, y + 2.05, z - 0.9) < 0.55) > 80);
  assert(tally(contact, (x, y, z) => Math.hypot(x, y, z) < 0.9) > 400);
  for (const shape of [knowledge, replication, payments, career, contact]) {
    const tags = new Set();
    for (let i = 0; i < 2400; i++) tags.add(shape.positions[i * 4 + 3]);
    assert.deepEqual([...tags].sort(), [0, 1, 2]);
  }
  assert(accents(knowledge) > 400 && accents(knowledge) < 1000);
  assert.equal(accents(replication), 0);
  assert(accents(payments) > 200 && accents(payments) < 900);
  assert(accents(career) > 80 && accents(career) < 400);
  assert.equal(accents(contact), 0);
});
