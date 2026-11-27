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
  return color[0] > color[1] * 1.15 && color[0] > color[2] * 1.4;
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

// ---- Adaptive quality prefixes (hero.js draws setDrawRange(0, n) of the full buffer) ----
// Population tiers come from the real renderer, so these tests follow it if it changes.
const heroSource = fs.readFileSync(require('node:path').join(__dirname, '../dist/hero.js'), 'utf8');
const DESKTOP = Number(heroSource.match(/\? 18000 : (\d+);/)[1]);
const PREFIXES = [...new Set([...heroSource.matchAll(/effectiveCount = effectiveCount > (\d+) \? (\d+) : (\d+);/g)].flatMap((m) => [Number(m[2]), Number(m[3])]))].sort((a, b) => a - b);
const TAG_SHARE = [0.6, 0.12, 0.28]; // bands [0.34, 0.26 | 0.12 | 0.2, 0.08] mapped through TAG
const TAU = Math.PI * 2;
const NODES = [[-3.1, -1.82, 0.32], [-1.05, -0.55, -0.8], [1.15, 0.72, 0.9], [3.15, 1.78, -0.22]];
const DEST = [[-3.15, 1.2, 0.72], [3.25, 1.02, -0.58], [0.15, -2.05, 0.9]];

test('Resume nodes keep lit and shadowed faces at phone and desktop populations', () => {
  for (const count of [18000, 42000]) {
    const shape = shapes.createWorkShapes(count)[3];
    NODES.forEach((center, node) => {
      const faces = [[], []], radius = 0.34 + node * 0.035;
      for (let i = 0; i < count; i++) {
        if (shape.positions[i * 4 + 3] !== 0) continue;
        const rel = center.map((value, axis) => shape.positions[i * 4 + axis] - value);
        if (Math.abs(Math.hypot(...rel) - radius) > 0.001) continue;
        const facing = (rel[0] * 0.4 + rel[1] * 0.6 + rel[2] * 0.7) / radius;
        if (Math.abs(facing) > 0.6) faces[facing > 0 ? 1 : 0].push(shape.colors[i * 3 + 1]);
      }
      faces.forEach(face => assert(face.length > 50));
      const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
      assert(mean(faces[1]) > mean(faces[0]) * 2, 'uniformly luminous spheres lose their depth');
      assert(mean(faces[0]) > 0.1, 'shadow side must remain visible');
    });
  }
});
let desktop;
const full = () => desktop ??= shapes.createWorkShapes(DESKTOP, 69);

function each(shape, limit, visit) {
  const p = shape.positions;
  for (let i = 0; i < limit; i++) visit(p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3]);
}
function tags(shape, limit) {
  const out = [0, 0, 0];
  each(shape, limit, (x, y, z, t) => out[t]++);
  return out;
}
function zSpread(shape, limit) {
  let sum = 0, sq = 0;
  each(shape, limit, (x, y, z) => { sum += z; sq += z * z; });
  return Math.sqrt(Math.max(0, sq / limit - (sum / limit) ** 2));
}
// Structural bins per scene: every bin must be populated for the motif to read.
const STRUCTURE = {
  'knowledge document quadrants': [0, 4, (x, y, z, t) => (t === 0 && Math.abs(x) > 2.2 ? (x < 0 ? 0 : 2) + (y > 0 ? 0 : 1) : -1)],
  'knowledge core hemispheres': [0, 2, (x, y, z, t) => (t === 0 && Math.hypot(x, y, z) < 0.7 ? (y > 0 ? 0 : 1) : -1)],
  'replication channels': [1, 4, (x, y, z, t) => (t === 0 && x > -2.3 && x < 3.9 ? Math.round((y + 1.62) / 1.08) : -1)],
  'replication source cylinder thirds': [1, 3, (x, y, z, t) => (t === 0 && x < -2.5 && x > -4.4 ? Math.min(2, Math.floor((x + 4.35) / 0.6)) : -1)],
  'payments annulus sectors': [2, 12, (x, y, z, t) => {
    const r = Math.hypot(x, y / 0.86);
    return t === 0 && r > 1.85 && r < 2.3 ? Math.min(11, Math.floor(((Math.atan2(y / 0.86, x) + Math.PI) / TAU) * 12)) : -1;
  }],
  'career milestone nodes': [3, 4, (x, y, z, t) => (t === 0 ? NODES.findIndex((n) => Math.hypot(x - n[0], y - n[1], z - n[2]) < 0.45) : -1)],
  'contact destinations': [4, 3, (x, y, z, t) => (t === 0 ? DEST.findIndex((n) => Math.hypot(x - n[0], y - n[1], z - n[2]) < 0.45) : -1)],
};
function bins(shape, limit, size, classify) {
  const out = new Array(size).fill(0);
  each(shape, limit, (x, y, z, t) => { const b = classify(x, y, z, t); if (b >= 0) out[b]++; });
  return out;
}
// Balanced: every structural bin is present and none is starved below half the fullest.
function balanced(counts) {
  return Math.min(...counts) > 0 && Math.min(...counts) >= Math.max(...counts) * 0.5;
}

test('renderer quality tiers are the populations these prefix tests exercise', () => {
  assert.equal(DESKTOP, 42000);
  assert.deepEqual(PREFIXES, [18000, 24000]);
});

test('every draw-range prefix of the desktop buffer keeps all three tags in their weighted share', () => {
  for (const shape of full()) {
    // Cumulative check over every prefix: the fair scheduler bounds the drift per tag.
    const seen = [0, 0, 0];
    let worst = 0;
    each(shape, DESKTOP, (x, y, z, t) => {
      seen[t]++;
      const n = seen[0] + seen[1] + seen[2];
      for (let tag = 0; tag < 3; tag++) worst = Math.max(worst, Math.abs(seen[tag] - n * TAG_SHARE[tag]));
    });
    assert(worst <= 2, `tag drift ${worst}`);
    for (const limit of PREFIXES) {
      const counts = tags(shape, limit);
      assert(counts.every((c) => c > 0));
      for (let tag = 0; tag < 3; tag++) assert(Math.abs(counts[tag] / limit - TAG_SHARE[tag]) < 0.002);
    }
  }
});

test('draw-range prefixes keep comparable depth in every scene', () => {
  for (const shape of full()) {
    const whole = zSpread(shape, DESKTOP);
    assert(whole > 0.25, `full depth ${whole}`);
    for (const limit of PREFIXES) assert(zSpread(shape, limit) >= whole * 0.6, `prefix ${limit} flattened`);
  }
});

test('the full desktop buffer populates every structural bin of every scene', () => {
  const scenes = full();
  for (const [name, [scene, size, classify]] of Object.entries(STRUCTURE)) {
    const counts = bins(scenes[scene], DESKTOP, size, classify);
    assert(balanced(counts), `${name}: ${counts}`);
  }
});

// These regressions failed before spatial traversal was separated from buffer
// order and before each node received its own complete sphere sampling.
for (const limit of PREFIXES) {
  test(`prefix ${limit} of the desktop buffer keeps every lane, quadrant, node and sector`, () => {
    const scenes = full();
    const missing = [];
    for (const [name, [scene, size, classify]] of Object.entries(STRUCTURE)) {
      const counts = bins(scenes[scene], limit, size, classify);
      if (!balanced(counts)) missing.push(`${name}: ${counts}`);
    }
    assert.deepEqual(missing, []);
  });
}

test('milestone and destination orbs are whole spheres, not latitude belts', () => {
  const scenes = full();
  const belts = [];
  const span = (shape, centre, radius) => {
    let lo = Infinity, hi = -Infinity;
    each(shape, DESKTOP, (x, y, z, t) => {
      if (t || Math.abs(Math.hypot(x - centre[0], y - centre[1], z - centre[2]) - radius) > 0.003) return;
      lo = Math.min(lo, (y - centre[1]) / radius);
      hi = Math.max(hi, (y - centre[1]) / radius);
    });
    return [lo, hi];
  };
  NODES.slice(0, 3).forEach((n, i) => { const [lo, hi] = span(scenes[3], n, 0.34 + i * 0.035); if (lo > -0.8 || hi < 0.8) belts.push(`career ${i}`); });
  DEST.forEach((n, i) => { const [lo, hi] = span(scenes[4], n, 0.4); if (lo > -0.8 || hi < 0.8) belts.push(`contact ${i}`); });
  assert.deepEqual(belts, []);
});

test('low and extreme counts allocate deterministically and paint every particle', () => {
  const expected = (count) => {
    const w = [0.34, 0.26, 0.2, 0.12, 0.08];
    const exact = w.map((v) => count * v);
    const out = exact.map(Math.floor);
    const left = count - out.reduce((s, v) => s + v, 0);
    const rank = exact.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let e = 0; e < left; e++) out[rank[e][1]]++;
    return [out[0] + out[1], out[3], out[2] + out[4]];
  };
  for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 25, 50, 99, 101, 997, 18000, 24000, 59999, 60000]) {
    const scenes = shapes.createWorkShapes(count, 69);
    assert.deepEqual(scenes, shapes.createWorkShapes(count, 69));
    for (const shape of scenes) {
      assert.deepEqual(tags(shape, count), expected(count), `count ${count}`);
      // Every colour is a tone of a non-black base, so a near-zero sum means an unpainted slot.
      for (let i = 0; i < count; i++) assert(shape.colors[i * 3] + shape.colors[i * 3 + 1] + shape.colors[i * 3 + 2] > 0.05, `count ${count} slot ${i}`);
    }
  }
  assert.deepEqual(tags(shapes.createWorkShapes(1)[0], 1), [1, 0, 0]);
  for (const seed of [-2147483648, -1, 0, 2147483647, Number.MAX_SAFE_INTEGER]) assert.doesNotThrow(() => shapes.createWorkShapes(64, seed));
});

// The Resume scene once ended in a straight decorative baseline across the
// bottom of the stage. Every career particle must now belong to a milestone
// (node, rings, orbital trail) or to the curved journey between milestones.
function journey(t) {
  const seg = Math.min(2, Math.floor(Math.min(t, 0.999999) * 3));
  const u = Math.min(t, 0.999999) * 3 - seg, w = 1 - u;
  const a = NODES[seg], c = NODES[seg + 1];
  const b = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + 0.38, (a[2] + c[2]) / 2];
  return [0, 1, 2].map((d) => w * w * a[d] + 2 * w * u * b[d] + u * u * c[d]);
}
const JOURNEY = Array.from({ length: 900 }, (_, i) => journey((i + 0.5) / 900));

test('the Resume scene has no isolated straight baseline: every particle is node-centred or on the journey', () => {
  const career = full()[3];
  const stray = [];
  let bottom = 0;
  each(career, DESKTOP, (x, y, z) => {
    if (y < -2.3 && x > -2.4) bottom++;
    const nearNode = NODES.some((n) => Math.hypot(x - n[0], y - n[1], z - n[2]) < 1.0);
    const nearPath = JOURNEY.some((p) => Math.hypot(x - p[0], y - p[1], z - p[2]) < 0.1);
    if (!nearNode && !nearPath && stray.length < 5) stray.push([x, y, z].map((v) => v.toFixed(2)).join(','));
  });
  assert.equal(bottom, 0, 'particles strung along the bottom of the stage');
  assert.deepEqual(stray, []);
});

test('each Resume milestone carries its own short connection trail that survives quality prefixes', () => {
  const career = full()[3];
  // Connection-tagged particles outside the journey tube, binned by nearest node.
  const trail = (limit) => bins(career, limit, 4, (x, y, z, t) => {
    if (t !== 2 || JOURNEY.some((p) => Math.hypot(x - p[0], y - p[1], z - p[2]) < 0.1)) return -1;
    return NODES.findIndex((n) => Math.hypot(x - n[0], y - n[1], z - n[2]) < 1.0);
  });
  for (const limit of [...PREFIXES, DESKTOP]) {
    const counts = trail(limit);
    assert(balanced(counts), `prefix ${limit}: ${counts}`);
    // A trail is a short arc, not a full ring hiding the node.
    assert(counts.reduce((s, v) => s + v, 0) > limit * 0.04, `prefix ${limit} trails too thin`);
  }
  // Trails are tilted out of the screen plane so they read as dimensional orbits.
  NODES.forEach((n, i) => {
    let zLo = Infinity, zHi = -Infinity;
    each(career, DESKTOP, (x, y, z, t) => {
      if (t !== 2 || Math.hypot(x - n[0], y - n[1], z - n[2]) > 1.0) return;
      if (JOURNEY.some((p) => Math.hypot(x - p[0], y - p[1], z - p[2]) < 0.1)) return;
      zLo = Math.min(zLo, z - n[2]); zHi = Math.max(zHi, z - n[2]);
    });
    assert(zHi - zLo > 0.2, `node ${i} trail is flat`);
  });
});
