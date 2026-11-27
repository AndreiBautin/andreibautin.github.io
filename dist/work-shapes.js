// Deterministic, browser-free professional targets for hero.js.
// positions.w is a motif tag: 0 body/anchor, 1 moving packet, 2 connection.

export function hash(value, salt = 17) {
  const n = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

const TAU = Math.PI * 2;
const BANDS = [0.34, 0.26, 0.2, 0.12, 0.08];
const TAG = [0, 0, 2, 1, 2];
const MATRIX = [0.15, 0.74, 0.42];
const SAGE = [0.4, 0.58, 0.44];
const CYAN = [0.26, 0.72, 0.76];
const GOLD = [0.9, 0.7, 0.34];
const CORAL = [0.86, 0.4, 0.36];
const FAINT = [0.1, 0.24, 0.18];

const SHARDS = [
  { at: [-3.45, 1.28, 0.5], right: [1.15, 0.12, 0.18], up: [0.02, 0.78, -0.12] },
  { at: [-3.25, -1.38, -0.32], right: [1.05, -0.08, 0.22], up: [0.08, 0.74, 0.16] },
  { at: [3.3, 1.18, -0.42], right: [-1.1, 0.16, 0.14], up: [0.08, 0.72, 0.2] },
  { at: [3.15, -1.32, 0.62], right: [-1.0, -0.1, 0.24], up: [0.12, 0.74, -0.08] },
];
const ARC_CTRL = [
  [-1.55, 1.85, 1.35],
  [-1.45, -1.9, -1.25],
  [1.55, 1.75, -1.35],
  [1.4, -1.8, 1.4],
];
const LANES = [-1.62, -0.54, 0.54, 1.62];
const NODES = [
  [-3.1, -1.82, 0.32],
  [-1.05, -0.55, -0.8],
  [1.15, 0.72, 0.9],
  [3.15, 1.78, -0.22],
];
const DEST = [
  [-3.15, 1.2, 0.72],
  [3.25, 1.02, -0.58],
  [0.15, -2.05, 0.9],
];

function allocate(count, weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => (count * weight) / total);
  const counts = exact.map((value) => Math.floor(value));
  let left = count - counts.reduce((sum, value) => sum + value, 0);
  const rank = exact.map((value, index) => [value - counts[index], index]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let extra = 0; extra < left; extra++) counts[rank[extra][1]]++;
  return counts;
}

function spatialStride(count) {
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
  let step = Math.max(1, Math.floor(count * 0.61803398875));
  while (gcd(step, count) > 1) step--;
  return step;
}

function tone(base, vary) {
  const scale = 0.82 + vary * 0.18;
  return [base[0] * scale, base[1] * scale, base[2] * scale];
}

function quad(a, b, c, t) {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
    u * u * a[1] + 2 * u * t * b[1] + t * t * c[1],
    u * u * a[2] + 2 * u * t * b[2] + t * t * c[2],
  ];
}

function add(a, b, scale = 1) {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
}

function slot(k, n, bins) {
  const scaled = ((k + 0.5) / n) * bins;
  const bin = Math.min(bins - 1, Math.floor(scaled));
  return [bin, scaled - bin];
}

function fibonacci(k, n, radius, twist) {
  const i = k + 0.5;
  const y = n === 1 ? 0 : 1 - (2 * i) / n;
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = TAU * i * 0.61803398875 + twist;
  return [Math.cos(phi) * ring * radius, y * radius, Math.sin(phi) * ring * radius];
}

function localSphere(k, n, bins, radius, twist) {
  const [bin] = slot(k, n, bins);
  const start = Math.max(0, Math.ceil(bin * n / bins - 0.5));
  const end = Math.min(n, Math.ceil((bin + 1) * n / bins - 0.5));
  return fibonacci(k - start, Math.max(1, end - start), radius, twist);
}

function framePoint(frame, u, v) {
  return add(add(frame.at, frame.right, u), frame.up, v);
}

function sheet(frame, k, n) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const u = cols === 1 ? 0 : (k % cols) / (cols - 1) - 0.5;
  const v = rows === 1 ? 0 : Math.floor(k / cols) / (rows - 1) - 0.5;
  return framePoint(frame, u, v);
}

// Page faces, stepped edges and inset text rows share the same tilted frame.
// These are solid objects in depth rather than a flat scatter of points.
function documentPoint(frame, k, n, h, g) {
  const p = sheet(frame, k, n);
  const layer = Math.floor(h * 5);
  const edge = k % 5 === 0;
  const u = edge ? (k % 2 ? -0.52 : 0.52) : (g - 0.5) * 0.84;
  const v = edge ? (g - 0.5) : Math.round((h - 0.5) * 12) / 12;
  const detail = framePoint(frame, u, v);
  return [
    (edge || k % 3 ? detail[0] : p[0]) + layer * 0.035,
    (edge || k % 3 ? detail[1] : p[1]) - layer * 0.025,
    (edge || k % 3 ? detail[2] : p[2]) + (layer - 2) * 0.09,
  ];
}

function alongArc(origin, control, k, n, h, g) {
  const p = quad(origin, control, [0, 0, 0], (k + 0.5) / n);
  const side = (h - 0.5) * 0.1;
  const lift = (g - 0.5) * 0.08;
  return [p[0] + side, p[1] + lift, p[2] + side * 0.6];
}

function lanePoint(lane, s, h, g, radius) {
  const ang = TAU * h;
  return [
    -0.2 + s * 4.55,
    LANES[lane] + Math.cos(ang) * radius,
    (lane - 1.5) * 0.38 + Math.sin(ang) * radius * 0.65 + (g - 0.5) * 0.04,
  ];
}

function careerPoint(t) {
  const seg = Math.min(2, Math.floor(Math.min(t, 0.999999) * 3));
  const u = Math.min(t, 0.999999) * 3 - seg;
  const mid = [
    (NODES[seg][0] + NODES[seg + 1][0]) / 2,
    (NODES[seg][1] + NODES[seg + 1][1]) / 2 + 0.38,
    (NODES[seg][2] + NODES[seg + 1][2]) / 2,
  ];
  return quad(NODES[seg], mid, NODES[seg + 1], u);
}

function ringPoint(theta, h, radius, tube) {
  const ang = TAU * h;
  const x = Math.cos(theta) * radius + Math.cos(ang) * tube * Math.cos(theta);
  const y = Math.sin(theta) * (radius * 0.86) + Math.cos(ang) * tube * Math.sin(theta);
  const z = Math.sin(theta * 2) * 0.34 + Math.sin(ang) * tube;
  return [x, y, z];
}

function tanglePoint(t, h) {
  const x = Math.sin(t) + 2 * Math.sin(2 * t);
  const y = Math.cos(t) - 2 * Math.cos(2 * t);
  const z = -Math.sin(3 * t);
  const side = (h - 0.5) * 0.16;
  return [-0.82 + x * 0.4 + side, 0.04 + y * 0.36, z * 0.55 + side];
}

function knowledge(band, k, n, h, g) {
  if (band === 0) {
    const orbit = k % 4 === 0;
    const a = TAU * (k + 0.5) / n * 7;
    const core = fibonacci(k, n, 0.58 + Math.sin(g * TAU) * 0.035, 0.4);
    const halo = [Math.cos(a) * 1.08, Math.sin(a) * 0.76, Math.sin(a) * 0.67];
    return { at: orbit ? halo : core, color: tone(orbit ? CYAN : GOLD, h) };
  }
  if (band === 1) {
    const [bin, u] = slot(k, n, 4);
    const localN = Math.max(1, Math.round(n / 4));
    return { at: documentPoint(SHARDS[bin], Math.min(localN - 1, Math.floor(u * localN)), localN, h, g), color: tone(k % 5 ? SAGE : MATRIX, g) };
  }
  if (band === 2) {
    const [bin] = slot(k, n, 4);
    const [, u] = slot(k, n, 4);
    return { at: alongArc(SHARDS[bin].at, ARC_CTRL[bin], u * n, n, h, g), color: tone(CYAN, h) };
  }
  if (band === 3) {
    const [bin, u] = slot(k, n, 4);
    const stop = 0.32 + Math.floor(u * 3) / 3 * 0.48;
    const p = quad(SHARDS[bin].at, ARC_CTRL[bin], [0, 0, 0], stop);
    const ball = localSphere(k, n, 12, 0.16, g);
    return { at: add(p, ball), color: tone(MATRIX, h) };
  }
  const [bin] = slot(k, n, 4);
  const a = TAU * (k + 0.5) / n;
  const tilt = bin * Math.PI / 4;
  return { at: [Math.cos(a) * 1.34, Math.sin(a) * Math.cos(tilt) * 1.34, Math.sin(a) * Math.sin(tilt) * 1.34], color: tone(FAINT, h) };
}

function replication(band, k, n, h, g) {
  if (band === 0) {
    const s = (k + 0.5) / n;
    const a = TAU * h;
    const cap = k % 4 === 0;
    const radius = cap ? Math.sqrt(g) * 0.66 : 0.66;
    return { at: [-4.35 + (cap ? (Math.floor(k / 4) % 2 ? 1.8 : 0) : s * 1.8), Math.cos(a) * radius, Math.sin(a) * radius], color: tone(k % 7 ? CYAN : MATRIX, h) };
  }
  if (band === 1) {
    const [lane, u] = slot(k, n, 4);
    const rib = k % 4 === 0;
    const phase = rib ? Math.round(u * 18) / 18 : u;
    const point = lanePoint(lane, 0.08 + phase * 0.84, rib ? h : u * 9 + lane / 4, g, rib ? 0.23 : 0.12);
    return { at: point, color: tone(rib ? SAGE : MATRIX, g) };
  }
  if (band === 2) {
    const [lane, u] = slot(k, n, 4);
    const mouth = [-2.55, 0, 0];
    const head = lanePoint(lane, 0, 0.5, 0.5, 0);
    const bow = [(mouth[0] + head[0]) / 2, head[1] * 0.65, head[2]];
    return { at: quad(mouth, bow, head, u), color: tone(CYAN, 1 - h) };
  }
  if (band === 3) {
    const [lane, u] = slot(k, n, 4);
    const cluster = Math.min(3, Math.floor(u * 4));
    const along = 0.16 + cluster * 0.22 + (h - 0.5) * 0.05;
    return { at: lanePoint(lane, along, g, h, 0.12), color: tone(CYAN, h) };
  }
  const [lane, u] = slot(k, n, 4);
  const a = TAU * h;
  return { at: [4.25 + (g - 0.5) * 0.22, LANES[lane] + Math.cos(a) * 0.37, (lane - 1.5) * 0.38 + Math.sin(a) * 0.37], color: tone(CYAN, u) };
}

function payments(band, k, n, h, g) {
  if (band === 0) {
    const a = TAU * (k + 0.5) / n;
    const point = ringPoint(a, h, 2.05, 0.12);
    point[2] += k % 2 ? 0.24 : -0.24;
    return { at: point, color: tone(k % 6 ? MATRIX : CYAN, h) };
  }
  if (band === 1) {
    const tick = k % 8 === 0;
    if (tick) {
      const theta = TAU * Math.floor((k + 0.5) / n * 48) / 48;
      const inner = ringPoint(theta, 0, 2.05, 0);
      const outer = ringPoint(theta, 0, 2.42, 0);
      const point = quad(inner, inner, outer, g);
      point[2] += (h - 0.5) * 0.5;
      return { at: point, color: tone(SAGE, h) };
    }
    return { at: ringPoint(TAU * (k + 0.5) / n, h, 2.05, 0.14), color: tone(SAGE, g) };
  }
  if (band === 2) return { at: tanglePoint(TAU * (k + 0.5) / n * 2, h), color: tone(CORAL, g * 0.35) };
  if (band === 3) {
    const s = (k + 0.5) / n;
    return { at: [2.15 + s * 2.45, (h - 0.5) * 0.25, (g - 0.5) * 0.22], color: tone(GOLD, h) };
  }
  const a = TAU * (k + 0.5) / n;
  const point = ringPoint(a, h, 1.25, 0.055);
  point[2] += 0.55;
  return { at: point, color: tone(CYAN, g) };
}

function career(band, k, n, h, g) {
  const [node, u] = slot(k, n, 4);
  if (band === 0) {
    const ball = localSphere(k, n, 4, 0.34 + node * 0.035, h);
    const light = 0.35 + 0.65 * Math.max(0, (ball[0] * 0.4 + ball[1] * 0.6 + ball[2] * 0.7) / (0.34 + node * 0.035));
    return { at: add(NODES[node], ball), color: tone(node === 3 ? GOLD : SAGE, g).map(value => value * light * (node === 3 ? 1.1 : 1.5)) };
  }
  if (band === 1) {
    const ang = TAU * u + h;
    const radius = 0.52 + node * 0.03;
    return {
      at: [
        NODES[node][0] + Math.cos(ang) * radius,
        NODES[node][1] + Math.sin(ang) * radius * 0.72,
        NODES[node][2] + Math.sin(ang * 2) * 0.18,
      ],
      color: tone(CYAN, h),
    };
  }
  if (band === 2) {
    const p = careerPoint((k + 0.5) / n);
    return { at: [p[0], p[1], p[2] + (h - 0.5) * 0.08], color: tone(MATRIX, g) };
  }
  if (band === 3) {
    const ang = TAU * (0.15 + u) + node;
    const radius = 0.62 + node * 0.03;
    return {
      at: [
        NODES[node][0] + Math.cos(ang) * radius,
        NODES[node][1] + Math.sin(ang) * 0.28,
        NODES[node][2] + Math.sin(ang) * radius * 0.55,
      ],
      color: tone(CYAN, 1 - h),
    };
  }
  // Tilted milestone trails; motion belongs to the renderer.
  const tilt = 0.85 + node * 0.28;
  const ang = TAU * (0.6 + node * 0.23) + u * 1.25;
  const radius = 0.8 + node * 0.03 + (h - 0.5) * 0.05 * (1 - u);
  const cos = Math.cos(ang) * radius, sin = Math.sin(ang) * radius;
  return {
    at: [
      NODES[node][0] + cos,
      NODES[node][1] + sin * Math.cos(tilt),
      NODES[node][2] + sin * Math.sin(tilt),
    ],
    color: tone(CYAN, g),
  };
}

function contact(band, k, n, h, g) {
  if (band === 0) {
    const theta = Math.PI / 2 + 0.55 + ((k + 0.5) / n) * (TAU - 1.1);
    return { at: [Math.cos(theta) * 0.74, Math.sin(theta) * 0.74, (h - 0.5) * 0.12], color: tone(CYAN, h) };
  }
  if (band === 1) {
    const [bin] = slot(k, n, 3);
    return { at: add(DEST[bin], localSphere(k, n, 3, 0.4, g)), color: tone(bin === 1 ? CYAN : SAGE, h) };
  }
  if (band === 2) {
    const [bin, u] = slot(k, n, 3);
    const rim = [DEST[bin][0] * 0.18, DEST[bin][1] * 0.18, DEST[bin][2] * 0.1];
    const bow = [DEST[bin][0] * 0.55, DEST[bin][1] * 0.55 + 0.25, DEST[bin][2] * 0.4];
    return { at: quad(rim, bow, DEST[bin], u), color: tone(MATRIX, g) };
  }
  if (band === 3) {
    const [bin, u] = slot(k, n, 3);
    const rim = [0, 0, 0];
    const p = quad(rim, [DEST[bin][0] * 0.5, DEST[bin][1] * 0.5, 0.4], DEST[bin], 0.35 + u * 0.4);
    return { at: [p[0] + (h - 0.5) * 0.1, p[1], p[2] + (g - 0.5) * 0.1], color: tone(CYAN, h) };
  }
  const theta = TAU * (k + 0.5) / n;
  return { at: [Math.cos(theta) * 2.55, Math.sin(theta) * 1.55, Math.sin(theta * 2) * 0.25], color: tone(FAINT, g) };
}

const SCENES = [knowledge, replication, payments, career, contact];

function paint(shape, index, at, tag, color) {
  const x = at[0], y = at[1], z = at[2];
  if (![x, y, z, tag, color[0], color[1], color[2]].every(Number.isFinite)) throw new RangeError('Work shape produced a non-finite sample');
  if (Math.abs(x) > 5 || Math.abs(y) > 3.2 || Math.abs(z) > 2.2 || tag > 2) throw new RangeError('Work shape left the visible stage');
  shape.positions[index * 4] = x;
  shape.positions[index * 4 + 1] = y;
  shape.positions[index * 4 + 2] = z;
  shape.positions[index * 4 + 3] = tag;
  shape.colors[index * 3] = color[0];
  shape.colors[index * 3 + 1] = color[1];
  shape.colors[index * 3 + 2] = color[2];
}

export function createWorkShapes(count, seed = 69) {
  if (!Number.isInteger(count) || count < 1 || count > 60000) throw new RangeError('Particle count outside bounds');
  if (!Number.isInteger(seed)) throw new TypeError('Seed must be a finite integer');
  const counts = allocate(count, BANDS);
  // Interleave bands so adaptive prefixes keep every motif.
  const order = counts.map(() => []), debt = counts.map(() => 0);
  for (let i = 0; i < count; i++) {
    let chosen = 0;
    for (let band = 0; band < counts.length; band++) {
      debt[band] += counts[band];
      if (debt[band] > debt[chosen]) chosen = band;
    }
    debt[chosen] -= count;
    order[chosen].push(i);
  }
  return SCENES.map((scene, sceneIndex) => {
    const shape = { positions: new Float32Array(count * 4), colors: new Float32Array(count * 3) };
    let cursor = 0;
    for (let band = 0; band < counts.length; band++) {
      const n = counts[band];
      const stride = spatialStride(n);
      for (let k = 0; k < n; k++) {
        // Coprime sampling spreads each motif through every prefix.
        const sample = scene(band, k * stride % n, n, hash(cursor, seed + sceneIndex * 13), hash(cursor, seed + 101 + band));
        paint(shape, order[band][k], sample.at, TAG[band], sample.color);
        cursor++;
      }
    }
    return shape;
  });
}
