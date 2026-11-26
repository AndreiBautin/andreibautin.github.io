const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/experience-effects.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../dist/experience.css'), 'utf8');
let api;

test.before(async () => {
  const module = new vm.SourceTextModule(source);
  await module.link(() => {
    throw new Error('Experience effects cannot import runtime modules');
  });
  await module.evaluate();
  api = module.namespace;
});

function walkNumbers(value, visit) {
  if (typeof value === 'number') visit(value);
  else if (Array.isArray(value)) value.forEach((item) => walkNumbers(item, visit));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => walkNumbers(item, visit));
}

function assertInside(sample) {
  for (const node of sample.nodes) {
    assert(node.x >= 0.04 && node.x <= 0.96);
    assert(node.y >= 0.04 && node.y <= 0.96);
    assert(node.opacity >= 0 && node.opacity <= 1);
  }
  for (const edge of sample.edges) {
    for (const key of ['x0', 'y0', 'x1', 'y1', 'cx', 'cy']) {
      assert(edge[key] >= 0.04 && edge[key] <= 0.96);
    }
    assert(edge.opacity >= 0 && edge.opacity <= 1);
  }
  for (const mote of sample.motes) {
    assert(mote.x >= 0 && mote.x <= 1);
    assert(mote.y >= 0 && mote.y <= 1);
    assert(mote.opacity >= 0 && mote.opacity <= 1);
  }
  walkNumbers(sample, (value) => assert(Number.isFinite(value)));
}

test('models stay deterministic, bounded and distinct for each chapter', () => {
  assert.deepEqual(api.EXPERIENCE_KEYS, ['knowledge', 'replication', 'payments']);
  for (const key of api.EXPERIENCE_KEYS) {
    const model = api.createExperienceModel(key, 19);
    assert.deepEqual(model, api.createExperienceModel(key, 19));
    assert(model.nodes.length >= 8 && model.nodes.length <= api.EXPERIENCE_LIMITS.maxNodes);
    assert(model.edges.length >= 3 && model.edges.length <= api.EXPERIENCE_LIMITS.maxEdges);
    assert(model.motes.length >= 6 && model.motes.length <= api.EXPERIENCE_LIMITS.maxMotes);
    for (const progress of [0, 0.5, 1]) {
      for (const flow of [0, 0.33, 1]) {
        assertInside(api.sampleExperience(model, progress, flow, null));
      }
    }
  }
  const knowledge = api.createExperienceModel('knowledge', 3);
  const replication = api.createExperienceModel('replication', 3);
  const payments = api.createExperienceModel('payments', 3);
  assert.notDeepEqual(knowledge.nodes.map((node) => node.kind), replication.nodes.map((node) => node.kind));
  assert.notDeepEqual(payments.edges.map((edge) => edge.family), knowledge.edges.map((edge) => edge.id));
});

test('seed changes the opening composition and leaves the resolved anchors fixed', () => {
  const openA = api.sampleExperience(api.createExperienceModel('knowledge', 4), 0, 0, null);
  const openB = api.sampleExperience(api.createExperienceModel('knowledge', 5), 0, 0, null);
  const sourcesA = openA.nodes.filter((node) => node.kind === 'source').map((node) => [node.x, node.y]);
  const sourcesB = openB.nodes.filter((node) => node.kind === 'source').map((node) => [node.x, node.y]);
  assert.notDeepEqual(sourcesA, sourcesB);
  for (const seed of [4, 90, 400]) {
    const done = api.sampleExperience(api.createExperienceModel('knowledge', seed), 1, 0.2, null);
    const answer = done.nodes.find((node) => node.id === 'answer');
    const query = done.nodes.find((node) => node.id === 'query');
    assert.equal(answer.x, 0.78);
    assert.equal(answer.y, 0.5);
    assert.equal(query.x, 0.16);
    assert.equal(query.opacity, 1);
    assert(done.edges.every((edge) => edge.opacity === 1));
  }
  const manual = api.sampleExperience(api.createExperienceModel('payments', 8), 0, 0, null);
  const automated = api.sampleExperience(api.createExperienceModel('payments', 8), 1, 0, null);
  assert(manual.nodes.filter((node) => node.kind === 'manual').every((node) => node.opacity === 1));
  assert(automated.nodes.filter((node) => node.kind === 'auto').every((node) => node.opacity === 1));
  assert(automated.nodes.filter((node) => node.kind === 'manual').every((node) => node.opacity === 0));
  assert.deepEqual(
    automated.nodes.filter((node) => node.kind === 'auto').map((node) => node.y),
    [0.5, 0.5, 0.5, 0.5],
  );
});

test('pointer influence stays inside the panel and playback recovers', () => {
  const model = api.createExperienceModel('replication', 12);
  const calm = api.sampleExperience(model, 1, 0.4, null);
  const stirred = api.sampleExperience(model, 1, 0.4, { x: 0.2, y: 0.3, amount: 1 });
  assertInside(stirred);
  assert.notDeepEqual(
    calm.nodes.map((node) => [node.x, node.y]),
    stirred.nodes.map((node) => [node.x, node.y]),
  );
  const untouched = api.sampleExperience(model, 1, 0.4, { x: 0.5, y: 0.5, amount: 0 });
  assert.deepEqual(untouched.nodes, calm.nodes);
  let state = api.createPlayback();
  state.amount = 1;
  state.playing = false;
  state.progress = 1;
  for (let step = 0; step < 80; step += 1) state = api.stepPlayback(state, 0.1, false);
  assert.equal(state.amount, 0);
  assert.equal(state.progress, 1);
  assert(state.flow > 0 && state.flow < 1);
  const reduced = api.stepPlayback(api.createPlayback(), 0, true);
  assert.equal(reduced.progress, 1);
  assert.equal(reduced.flow, 0);
  assert.equal(reduced.playing, false);
  const replay = api.replayPlayback({ ...reduced, pointerX: 0.25, pointerY: 0.75, hovering: false });
  assert.equal(replay.progress, 0);
  assert.equal(replay.playing, true);
  assert.equal(replay.pointerX, 0.25);
});

test('bad keys, seeds, clocks and influence are rejected', () => {
  for (const key of ['', 'hero', 'Knowledge']) {
    assert.throws(() => api.createExperienceModel(key, 1), TypeError);
  }
  for (const seed of [-1, 4294967296]) assert.throws(() => api.createExperienceModel('knowledge', seed), RangeError);
  for (const seed of [1.5, NaN, '3']) assert.throws(() => api.createExperienceModel('payments', seed), TypeError);
  const model = api.createExperienceModel('payments', 1);
  for (const progress of [-0.01, 1.01, NaN]) {
    assert.throws(() => api.sampleExperience(model, progress, 0, null), RangeError);
  }
  assert.throws(() => api.sampleExperience(model, 0, 2, null), RangeError);
  assert.throws(() => api.sampleExperience(model, 0, 0, { x: 2, y: 0, amount: 1 }), RangeError);
  assert.throws(() => api.stepPlayback(api.createPlayback(), 0.2, false), RangeError);
  assert.throws(() => api.stepPlayback(api.createPlayback(), 0.05, 'no'), TypeError);
  assert.throws(() => api.mountExperienceEffects(null), TypeError);
});

test('the module stays free of markup injection and documents its stylesheet', () => {
  assert.equal(typeof api.mountExperienceEffects, 'function');
  assert.equal(source.includes('innerHTML'), false);
  assert.equal(source.includes('insertAdjacentHTML'), false);
  assert.equal(source.includes('eval('), false);
  assert.equal(source.includes('fetch('), false);
  assert.equal(source.includes('Math.random'), false);
  assert.equal(css.includes('data-experience-canvas'), true);
  assert.equal(css.includes('prefers-reduced-motion'), true);
  const docs = fs.readFileSync(path.join(__dirname, '../docs/EXPERIENCE-EFFECTS.md'), 'utf8');
  assert.equal(docs.includes('dist/experience.css'), true);
  assert.equal(docs.includes('mountExperienceEffects'), true);
});
