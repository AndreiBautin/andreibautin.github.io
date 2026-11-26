// Illustrative Canvas2D diagrams for the three experience chapters.
// Geometry is seeded and bounded. The drawings are diagrams of resume work,
// not live client systems and not measured benchmarks.

export const EXPERIENCE_KEYS = Object.freeze(['knowledge', 'replication', 'payments']);

export const EXPERIENCE_LIMITS = Object.freeze({
  maxNodes: 24,
  maxEdges: 32,
  maxMotes: 36,
  maxDt: 0.1,
  duration: 9,
});

const TAU = Math.PI * 2;
const PLAY = EXPERIENCE_LIMITS.duration;

const KNOWLEDGE_SCATTER = [
  [0.1, 0.16], [0.28, 0.12], [0.44, 0.2], [0.16, 0.3],
  [0.36, 0.34], [0.08, 0.46], [0.3, 0.5], [0.14, 0.64],
  [0.4, 0.66], [0.22, 0.8], [0.46, 0.82], [0.08, 0.84],
];

const PAYMENT_MANUAL = [
  { label: 'intake', x: 0.12, y: 0.22 },
  { label: 'mail', x: 0.38, y: 0.16 },
  { label: 'sheet', x: 0.62, y: 0.28 },
  { label: 'hold', x: 0.28, y: 0.46 },
  { label: 'rekey', x: 0.7, y: 0.58 },
  { label: 'bank', x: 0.4, y: 0.78 },
];

const PAYMENT_AUTO = [
  { label: 'intake', x: 0.14, y: 0.5 },
  { label: 'rules', x: 0.4, y: 0.5 },
  { label: 'post', x: 0.64, y: 0.5 },
  { label: 'ledger', x: 0.86, y: 0.5 },
];

const MANUAL_LINKS = [
  [0, 1], [1, 2], [0, 3], [3, 5], [2, 4], [4, 5], [1, 3], [2, 5],
];

function assertKey(key) {
  if (typeof key !== 'string' || !EXPERIENCE_KEYS.includes(key)) {
    throw new TypeError('experience key');
  }
}

function assertSeed(seed) {
  if (typeof seed !== 'number' || !Number.isInteger(seed)) throw new TypeError('seed');
  if (seed < 0 || seed > 0xffffffff) throw new RangeError('seed');
}

function assertProgress(progress) {
  if (typeof progress !== 'number' || !Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError('progress');
  }
}

function assertUnit(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(name);
  }
}

function unit(seed, index) {
  let hash = Math.imul(seed ^ Math.imul(index + 1, 0x9e3779b1), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function band(progress, start, end) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return smooth((progress - start) / (end - start));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ringSlot(index, count, cx, cy, rx, ry) {
  const angle = -Math.PI * 0.78 + (index / (count - 1)) * Math.PI * 1.56;
  return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
}

function pushNode(nodes, node) {
  nodes.push(node);
  if (nodes.length > EXPERIENCE_LIMITS.maxNodes) throw new RangeError('nodes');
}

function pushEdge(edges, edge) {
  edges.push(edge);
  if (edges.length > EXPERIENCE_LIMITS.maxEdges) throw new RangeError('edges');
}

function pushMote(motes, mote) {
  motes.push(mote);
  if (motes.length > EXPERIENCE_LIMITS.maxMotes) throw new RangeError('motes');
}

function knowledgeModel(seed) {
  const nodes = [];
  const edges = [];
  const motes = [];
  pushNode(nodes, { id: 'query', label: 'query', role: 'anchor', x0: 0.16, y0: 0.5, x1: 0.16, y1: 0.5, kind: 'query' });
  pushNode(nodes, { id: 'answer', label: 'answer', role: 'anchor', x0: 0.78, y0: 0.5, x1: 0.78, y1: 0.5, kind: 'answer' });
  for (let index = 0; index < KNOWLEDGE_SCATTER.length; index += 1) {
    const [sx, sy] = KNOWLEDGE_SCATTER[index];
    const [tx, ty] = ringSlot(index, KNOWLEDGE_SCATTER.length, 0.62, 0.5, 0.2, 0.32);
    const nudge = (unit(seed, index) - 0.5) * 0.028;
    pushNode(nodes, {
      id: 'source-' + index,
      label: String(index + 1),
      role: 'scatter',
      x0: sx + nudge,
      y0: Math.min(0.9, Math.max(0.1, sy + (unit(seed, index + 40) - 0.5) * 0.028)),
      x1: tx,
      y1: ty,
      kind: 'source',
    });
    pushEdge(edges, { id: 'k-' + index, from: 'source-' + index, to: 'answer', bend: (index % 2 === 0 ? -1 : 1) * 0.04 });
    pushMote(motes, { id: 'km-' + index, edge: 'k-' + index, phase: index / KNOWLEDGE_SCATTER.length });
  }
  for (let index = 0; index < 6; index += 1) {
    pushMote(motes, { id: 'kq-' + index, edge: 'query-link', phase: index / 6 });
  }
  return { key: 'knowledge', seed, nodes, edges, motes };
}

function replicationModel(seed) {
  const nodes = [];
  const edges = [];
  const motes = [];
  const jobs = 8;
  const lanes = 4;
  pushNode(nodes, { id: 'gate', label: 'serial', role: 'anchor', x0: 0.16, y0: 0.08, x1: 0.16, y1: 0.08, kind: 'gate' });
  for (let index = 0; index < jobs; index += 1) {
    const lane = index % lanes;
    const slot = Math.floor(index / lanes);
    const y0 = 0.18 + index * 0.09;
    const x1 = 0.46 + slot * 0.2;
    const y1 = 0.22 + lane * 0.18;
    pushNode(nodes, {
      id: 'job-' + index,
      label: String(index + 1),
      role: 'job',
      lane,
      x0: 0.16,
      y0,
      x1,
      y1,
      kind: 'job',
    });
    pushEdge(edges, { id: 'r-' + index, from: 'job-' + index, to: 'lane-' + lane, bend: 0.05 });
  }
  for (let lane = 0; lane < lanes; lane += 1) {
    pushNode(nodes, {
      id: 'lane-' + lane,
      label: 'lane ' + (lane + 1),
      role: 'anchor',
      x0: 0.9,
      y0: 0.22 + lane * 0.18,
      x1: 0.9,
      y1: 0.22 + lane * 0.18,
      kind: 'lane',
    });
    pushMote(motes, { id: 'rm-' + lane, edge: 'lane-' + lane, phase: unit(seed, lane) });
    pushMote(motes, { id: 'rm2-' + lane, edge: 'lane-' + lane, phase: (unit(seed, lane + 8) + 0.45) % 1 });
  }
  for (let index = 0; index < jobs; index += 1) {
    pushMote(motes, { id: 'rj-' + index, edge: 'job-' + index, phase: (index + unit(seed, index + 20)) % 1 });
  }
  return { key: 'replication', seed, nodes, edges, motes };
}

function paymentsModel(seed) {
  const nodes = [];
  const edges = [];
  const motes = [];
  PAYMENT_MANUAL.forEach((node, index) => {
    const jx = (unit(seed, index) - 0.5) * 0.03;
    const jy = (unit(seed, index + 12) - 0.5) * 0.03;
    pushNode(nodes, {
      id: 'manual-' + index,
      label: node.label,
      role: 'manual',
      x0: node.x + jx,
      y0: node.y + jy,
      x1: node.x,
      y1: node.y,
      kind: 'manual',
    });
  });
  PAYMENT_AUTO.forEach((node, index) => {
    pushNode(nodes, {
      id: 'auto-' + index,
      label: node.label,
      role: 'anchor',
      x0: node.x,
      y0: index % 2 === 0 ? 0.24 : 0.76,
      x1: node.x,
      y1: node.y,
      kind: 'auto',
    });
  });
  MANUAL_LINKS.forEach(([from, to], index) => {
    pushEdge(edges, {
      id: 'manual-edge-' + index,
      from: 'manual-' + from,
      to: 'manual-' + to,
      bend: (index % 2 === 0 ? 0.16 : -0.16) + (unit(seed, index + 30) - 0.5) * 0.04,
      family: 'manual',
    });
    pushMote(motes, { id: 'pm-' + index, edge: 'manual-edge-' + index, phase: index / MANUAL_LINKS.length, family: 'manual' });
  });
  for (let index = 0; index < PAYMENT_AUTO.length - 1; index += 1) {
    pushEdge(edges, {
      id: 'auto-edge-' + index,
      from: 'auto-' + index,
      to: 'auto-' + (index + 1),
      bend: 0,
      family: 'auto',
    });
    pushMote(motes, { id: 'pa-' + index, edge: 'auto-edge-' + index, phase: index / 3, family: 'auto' });
    pushMote(motes, { id: 'pa2-' + index, edge: 'auto-edge-' + index, phase: (index / 3 + 0.5) % 1, family: 'auto' });
  }
  return { key: 'payments', seed, nodes, edges, motes };
}

export function createExperienceModel(key, seed) {
  assertKey(key);
  assertSeed(seed);
  const model = key === 'knowledge'
    ? knowledgeModel(seed)
    : key === 'replication'
      ? replicationModel(seed)
      : paymentsModel(seed);
  if (model.nodes.length > EXPERIENCE_LIMITS.maxNodes) throw new RangeError('nodes');
  if (model.edges.length > EXPERIENCE_LIMITS.maxEdges) throw new RangeError('edges');
  if (model.motes.length > EXPERIENCE_LIMITS.maxMotes) throw new RangeError('motes');
  return model;
}

function nodeById(model, id) {
  const node = model.nodes.find((item) => item.id === id);
  if (!node) throw new RangeError('edge');
  return node;
}

function positionOf(node, organize) {
  return [lerp(node.x0, node.x1, organize), lerp(node.y0, node.y1, organize)];
}

function influenceOf(influence) {
  if (influence == null) return null;
  if (typeof influence !== 'object') throw new TypeError('influence');
  assertUnit('influence.x', influence.x);
  assertUnit('influence.y', influence.y);
  assertUnit('influence.amount', influence.amount);
  if (influence.amount === 0) return null;
  return influence;
}

function pull(x, y, influence) {
  if (!influence) return [x, y];
  const dx = influence.x - x;
  const dy = influence.y - y;
  const distance = Math.hypot(dx, dy);
  const radius = 0.24;
  if (distance === 0 || distance > radius) return [x, y];
  const gain = (1 - distance / radius) * 0.075 * influence.amount;
  return [
    Math.min(0.96, Math.max(0.04, x + (dx / distance) * gain)),
    Math.min(0.96, Math.max(0.04, y + (dy / distance) * gain)),
  ];
}

function curve(x0, y0, x1, y1, bend) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x0, y0, x1, y1,
    cx: Math.min(0.96, Math.max(0.04, mx + (-dy / length) * bend)),
    cy: Math.min(0.96, Math.max(0.04, my + (dx / length) * bend)),
  };
}

function pointOnCurve(edge, t) {
  const inv = 1 - t;
  return [
    inv * inv * edge.x0 + 2 * inv * t * edge.cx + t * t * edge.x1,
    inv * inv * edge.y0 + 2 * inv * t * edge.cy + t * t * edge.y1,
  ];
}

function organizeFor(model, progress) {
  if (model.key === 'knowledge') return band(progress, 0.12, 0.7);
  if (model.key === 'replication') return band(progress, 0.08, 0.82);
  return band(progress, 0.18, 0.78);
}

export function sampleExperience(model, progress, flow, influence) {
  if (!model || typeof model !== 'object' || !EXPERIENCE_KEYS.includes(model.key)) {
    throw new TypeError('model');
  }
  assertProgress(progress);
  assertUnit('flow', flow);
  const guide = influenceOf(influence);
  const organize = organizeFor(model, progress);
  const link = model.key === 'knowledge' ? band(progress, 0.48, 0.92) : organize;
  const placed = new Map();
  const nodes = model.nodes.map((node) => {
    const local = node.role === 'anchor' && model.key === 'knowledge' ? 1 : organize;
    let [x, y] = positionOf(node, local);
    if (model.key === 'replication' && node.kind === 'job' && guide) {
      const sway = Math.sin(flow * TAU + node.lane) * 0.045 * guide.amount * organize;
      y = Math.min(0.96, Math.max(0.04, y + sway));
    }
    [x, y] = pull(x, y, guide);
    const opacity = node.kind === 'manual'
      ? 1 - link
      : node.kind === 'auto'
        ? link
        : 1;
    const sample = { id: node.id, label: node.label, kind: node.kind, role: node.role, x, y, opacity };
    placed.set(node.id, sample);
    return sample;
  });
  const edges = model.edges.map((edge) => {
    const from = placed.get(edge.from) || positionSample(nodeById(model, edge.from), organize);
    const to = placed.get(edge.to) || positionSample(nodeById(model, edge.to), organize);
    const bent = curve(from.x, from.y, to.x, to.y, edge.bend || 0);
    let opacity = link;
    if (edge.family === 'manual') opacity = 1 - link;
    if (edge.family === 'auto') opacity = link;
    if (model.key === 'replication') opacity = 0.35 + 0.65 * organize;
    return { id: edge.id, family: edge.family || model.key, ...bent, opacity };
  });
  const motes = model.motes.map((mote) => {
    const edge = edges.find((item) => item.id === mote.edge);
    const host = edge || edges[0];
    if (!host) throw new RangeError('motes');
    const travel = model.key === 'knowledge' && mote.edge === 'query-link'
      ? (flow + mote.phase) % 1
      : (flow + mote.phase) % 1;
    const [x, y] = pointOnCurve(host, travel);
    let opacity = host.opacity;
    if (model.key === 'knowledge' && mote.edge === 'query-link') {
      const query = placed.get('query');
      const answer = placed.get('answer');
      const qx = lerp(query.x, answer.x, travel);
      const qy = lerp(query.y, answer.y, travel);
      return { id: mote.id, x: qx, y: qy, opacity: 0.35 + 0.65 * link };
    }
    return { id: mote.id, x, y, opacity };
  });
  return { key: model.key, progress, flow, organize, nodes, edges, motes };
}

function positionSample(node, organize) {
  const [x, y] = positionOf(node, organize);
  return { x, y, opacity: 1 };
}

export function createPlayback() {
  return { progress: 0, flow: 0, amount: 0, pointerX: 0.5, pointerY: 0.5, hovering: false, playing: true };
}

export function stepPlayback(state, dt, reduced) {
  if (!state || typeof state !== 'object') throw new TypeError('state');
  if (typeof dt !== 'number' || !Number.isFinite(dt) || dt < 0 || dt > EXPERIENCE_LIMITS.maxDt) {
    throw new RangeError('dt');
  }
  if (typeof reduced !== 'boolean') throw new TypeError('reduced');
  assertProgress(state.progress);
  assertUnit('flow', state.flow);
  assertUnit('amount', state.amount);
  assertUnit('pointerX', state.pointerX);
  assertUnit('pointerY', state.pointerY);
  if (typeof state.hovering !== 'boolean' || typeof state.playing !== 'boolean') {
    throw new TypeError('state');
  }
  const next = {
    progress: state.progress,
    flow: state.flow,
    amount: state.amount,
    pointerX: state.pointerX,
    pointerY: state.pointerY,
    hovering: state.hovering,
    playing: state.playing,
  };
  if (reduced) {
    next.progress = 1;
    next.flow = 0;
    next.amount = 0;
    next.playing = false;
    next.hovering = false;
    return next;
  }
  if (next.playing) {
    next.progress = Math.min(1, next.progress + dt / PLAY);
    if (next.progress === 1) next.playing = false;
  }
  next.flow = (next.flow + dt / 5.5) % 1;
  if (!next.hovering) {
    next.amount *= Math.exp(-dt * 2.4);
    if (next.amount < 0.0008) next.amount = 0;
  }
  return next;
}

export function replayPlayback(state) {
  if (!state || typeof state !== 'object') throw new TypeError('state');
  return {
    progress: 0,
    flow: 0,
    amount: 0,
    pointerX: state.pointerX,
    pointerY: state.pointerY,
    hovering: state.hovering === true,
    playing: true,
  };
}

const SEEDS = { knowledge: 11, replication: 29, payments: 47 };
const CAPTIONS = {
  knowledge: ['records sit apart', 'records gather', 'sources return an answer'],
  replication: ['one serial queue', 'work leaves the queue', 'lanes run side by side'],
  payments: ['manual hops cross', 'the path straightens', 'one automated route'],
};

function captionFor(key, progress) {
  const lines = CAPTIONS[key];
  if (progress < 0.34) return lines[0];
  if (progress < 0.72) return lines[1];
  return lines[2];
}

function readColor(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(canvas.ownerDocument.defaultView.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return { width: rect.width, height: rect.height, dpr, px: width, py: height };
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function paint(canvas, model, sample, reduced) {
  const box = resizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const styles = canvas.ownerDocument.defaultView.getComputedStyle(canvas);
  const ink = readColor(styles, '--ink', '#e6f0e8');
  const muted = readColor(styles, '--muted', '#82978a');
  const accent = readColor(styles, '--accent', '#a5edb8');
  const panel = readColor(styles, '--panel', '#0a1510');
  const line = readColor(styles, '--line', '#9fc9ad24');
  const dpr = box.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, box.width, box.height);
  ctx.fillStyle = panel;
  ctx.fillRect(0, 0, box.width, box.height);
  paintField(ctx, box, line, accent);
  const sx = (x) => x * box.width;
  const sy = (y) => y * box.height;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const edge of sample.edges) {
    if (edge.opacity <= 0.02) continue;
    ctx.beginPath();
    ctx.moveTo(sx(edge.x0), sy(edge.y0));
    ctx.quadraticCurveTo(sx(edge.cx), sy(edge.cy), sx(edge.x1), sy(edge.y1));
    ctx.strokeStyle = edge.family === 'manual' ? muted : accent;
    ctx.globalAlpha = Math.max(0, Math.min(1, edge.opacity)) * (edge.family === 'auto' ? 0.95 : 0.55);
    ctx.lineWidth = edge.family === 'auto' ? 2.4 : 1.15;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (sample.key === 'replication') paintLanes(ctx, box, muted, sample.organize);
  for (const node of sample.nodes) {
    if (node.opacity <= 0.02) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, node.opacity));
    drawNode(ctx, sample.key, node, sx(node.x), sy(node.y), box, ink, accent, muted, panel);
  }
  ctx.globalAlpha = 1;
  for (const mote of sample.motes) {
    if (mote.opacity <= 0.02) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, mote.opacity));
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(sx(mote.x), sy(mote.y), sample.key === 'payments' ? 2.3 : 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = muted;
  ctx.font = "11px 'DM Mono', monospace";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const caption = reduced ? CAPTIONS[sample.key][2] : captionFor(sample.key, sample.progress);
  ctx.fillText(caption, 16, box.height - 16);
}

function paintField(ctx, box, line, accent) {
  ctx.save();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.9;
  const gap = 36;
  for (let x = gap; x < box.width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, box.height - 36);
    ctx.stroke();
  }
  for (let y = gap; y < box.height - 24; y += gap) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(box.width - 14, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = accent;
  for (let y = 28; y < box.height - 40; y += gap) {
    for (let x = 28; x < box.width; x += gap) {
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  ctx.restore();
}

function paintLanes(ctx, box, muted, organize) {
  ctx.save();
  ctx.strokeStyle = muted;
  ctx.globalAlpha = 0.35 + organize * 0.4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(box.width * 0.16, box.height * 0.14);
  ctx.lineTo(box.width * 0.16, box.height * 0.9);
  ctx.stroke();
  for (let lane = 0; lane < 4; lane += 1) {
    const y = box.height * (0.22 + lane * 0.18);
    ctx.beginPath();
    ctx.moveTo(box.width * 0.38, y);
    ctx.lineTo(box.width * 0.9, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNode(ctx, key, node, x, y, box, ink, accent, muted, panel) {
  ctx.fillStyle = panel;
  ctx.strokeStyle = node.kind === 'answer' || node.kind === 'auto' || node.kind === 'lane' ? accent : muted;
  ctx.lineWidth = node.kind === 'answer' || node.kind === 'gate' ? 2 : 1.25;
  if (node.kind === 'source' || node.kind === 'manual' || node.kind === 'job') {
    const w = node.kind === 'manual' ? Math.min(78, box.width * 0.16) : 36;
    const h = node.kind === 'manual' ? 28 : 22;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 7);
    ctx.fill();
    ctx.stroke();
  } else {
    const radius = node.kind === 'answer' ? 22 : node.kind === 'query' || node.kind === 'gate' ? 16 : 13;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (node.kind === 'answer') {
      ctx.beginPath();
      ctx.arc(x, y, radius + 7, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.fillStyle = ink;
  ctx.font = (node.kind === 'manual' || node.kind === 'lane' || node.kind === 'query' || node.kind === 'answer' || node.kind === 'gate' || node.kind === 'auto')
    ? "11px 'DM Mono', monospace"
    : "10px 'DM Mono', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.label, x, y);
  if (key === 'knowledge' && node.kind === 'source') {
    ctx.fillStyle = muted;
  }
}

function sceneVisible(entry, hidden) {
  return !hidden && entry.isIntersecting;
}

export function mountExperienceEffects(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') throw new TypeError('root');
  const view = root.defaultView
    || (root.ownerDocument && root.ownerDocument.defaultView)
    || (typeof window !== 'undefined' ? window : null);
  if (!view) throw new TypeError('view');
  const articles = [...root.querySelectorAll('[data-experience]')];
  const scenes = [];
  const cleanups = [];
  let disposed = false;
  let frame = 0;
  const motion = view.matchMedia('(prefers-reduced-motion: reduce)');

  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };

  for (const article of articles) {
    const key = article.getAttribute('data-experience');
    if (!EXPERIENCE_KEYS.includes(key)) continue;
    const canvas = article.querySelector('canvas[data-experience-canvas]');
    if (!canvas || typeof canvas.getContext !== 'function') continue;
    const scene = {
      key,
      canvas,
      article,
      model: createExperienceModel(key, SEEDS[key]),
      playback: createPlayback(),
      visible: true,
    };
    scenes.push(scene);
    const replay = article.querySelector('button[data-experience-replay]');
    if (replay) {
      listen(replay, 'click', () => {
        scene.playback = replayPlayback(scene.playback);
        if (reduced()) drawScene(scene);
        else schedule();
      });
    }
    listen(canvas, 'pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      scene.playback.pointerX = x;
      scene.playback.pointerY = y;
      scene.playback.hovering = true;
      scene.playback.amount = Math.max(scene.playback.amount, 0.72);
      if (reduced()) drawScene(scene);
    });
    listen(canvas, 'pointerleave', () => {
      scene.playback.hovering = false;
      if (reduced()) {
        scene.playback.amount = 0;
        drawScene(scene);
      }
    });
    listen(canvas, 'click', () => {
      if (key === 'replication') {
        scene.playback.amount = 1;
        scene.playback.playing = false;
        scene.playback.progress = 1;
      } else {
        scene.playback = replayPlayback(scene.playback);
      }
      if (reduced()) drawScene(scene);
      else schedule();
    });
  }

  function reduced() {
    return motion.matches;
  }

  function hidden() {
    const doc = view.document;
    return doc.visibilityState === 'hidden';
  }

  function drawScene(scene) {
    const playback = reduced()
      ? stepPlayback({ ...scene.playback, hovering: false }, 0, true)
      : scene.playback;
    if (reduced()) scene.playback = playback;
    const influence = playback.amount > 0
      ? { x: playback.pointerX, y: playback.pointerY, amount: playback.amount }
      : null;
    const sample = sampleExperience(scene.model, playback.progress, playback.flow, influence);
    paint(scene.canvas, scene.model, sample, reduced());
  }

  function tick(now) {
    frame = 0;
    if (disposed || reduced() || hidden()) return;
    const running = scenes.some((scene) => scene.visible);
    if (!running) return;
    for (const scene of scenes) {
      if (!scene.visible) continue;
      const previous = scene.playback.last || now;
      const dt = Math.min(EXPERIENCE_LIMITS.maxDt, Math.max(0, (now - previous) / 1000));
      scene.playback.last = now;
      const stepped = stepPlayback(scene.playback, dt, false);
      stepped.last = now;
      scene.playback = stepped;
      drawScene(scene);
    }
    frame = view.requestAnimationFrame(tick);
  }

  function schedule() {
    if (disposed || reduced() || hidden()) return;
    if (!scenes.some((scene) => scene.visible)) return;
    if (frame) return;
    frame = view.requestAnimationFrame(tick);
  }

  function drawAll() {
    for (const scene of scenes) drawScene(scene);
  }

  if (typeof view.IntersectionObserver === 'function') {
    const observer = new view.IntersectionObserver((entries) => {
      for (const entry of entries) {
        const scene = scenes.find((item) => item.article === entry.target || item.canvas === entry.target);
        if (!scene) continue;
        scene.visible = sceneVisible(entry, hidden());
      }
      if (scenes.some((scene) => scene.visible)) schedule();
    }, { threshold: 0.08 });
    for (const scene of scenes) observer.observe(scene.article);
    cleanups.push(() => observer.disconnect());
    for (const scene of scenes) scene.visible = false;
  }

  if (typeof view.ResizeObserver === 'function') {
    const observer = new view.ResizeObserver(() => {
      drawAll();
    });
    for (const scene of scenes) observer.observe(scene.canvas);
    cleanups.push(() => observer.disconnect());
  } else {
    listen(view, 'resize', drawAll);
  }

  listen(view.document, 'visibilitychange', () => {
    if (hidden()) {
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    schedule();
  });

  const onMotion = () => {
    if (reduced()) {
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      for (const scene of scenes) {
        scene.playback = stepPlayback({ ...scene.playback, hovering: false }, 0, true);
      }
    }
    drawAll();
    schedule();
  };
  if (typeof motion.addEventListener === 'function') {
    listen(motion, 'change', onMotion);
  } else if (typeof motion.addListener === 'function') {
    motion.addListener(onMotion);
    cleanups.push(() => motion.removeListener(onMotion));
  }

  const body = view.document.body;
  if (body && typeof view.MutationObserver === 'function') {
    const themes = new view.MutationObserver(() => drawAll());
    themes.observe(body, { attributes: true, attributeFilter: ['class'] });
    cleanups.push(() => themes.disconnect());
  }

  drawAll();
  schedule();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
    },
  };
}
