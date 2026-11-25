// Browser-free, deterministic geometry for the veil and three project forms.
export function hash(value, salt = 17) {
  const n = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Signed chamfer distance in pixels, positive inside ink. Two bounded passes
// keep font processing linear in raster size, including enclosed letter holes.
export function createNameField(mask, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3 || width * height > 1200000) throw new RangeError('Name raster outside bounds');
  if (!(mask instanceof Uint8Array) || mask.length !== width * height) throw new TypeError('Matching alpha raster required');
  const inside = new Float32Array(mask.length), outside = new Float32Array(mask.length);
  let ink = 0;
  for (let i = 0; i < mask.length; i++) { const solid = mask[i] >= 128; ink += Number(solid); inside[i] = solid ? 1e6 : 0; outside[i] = solid ? 0 : 1e6; }
  if (!ink || ink === mask.length) throw new TypeError('Name raster requires ink and background');
  const diagonal = Math.SQRT2;
  for (const field of [inside, outside]) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) field[i] = Math.min(field[i], field[i - 1] + 1);
      if (y) field[i] = Math.min(field[i], field[i - width] + 1);
      if (x && y) field[i] = Math.min(field[i], field[i - width - 1] + diagonal);
      if (x + 1 < width && y) field[i] = Math.min(field[i], field[i - width + 1] + diagonal);
    }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) field[i] = Math.min(field[i], field[i + 1] + 1);
      if (y + 1 < height) field[i] = Math.min(field[i], field[i + width] + 1);
      if (x + 1 < width && y + 1 < height) field[i] = Math.min(field[i], field[i + width + 1] + diagonal);
      if (x && y + 1 < height) field[i] = Math.min(field[i], field[i + width - 1] + diagonal);
    }
  }
  for (let i = 0; i < inside.length; i++) inside[i] -= outside[i];
  return inside;
}

// Front, back and side surfaces of an extruded glyph, all sampled as points.
export function createNameShape(mask, width, height, count, seed = 17) {
  if (!Number.isInteger(count) || count < 1 || count > 60000) throw new RangeError('Particle count outside bounds');
  if (!Number.isFinite(seed)) throw new TypeError('Seed must be finite');
  const distance = createNameField(mask, width, height), face = [], edge = [];
  for (let i = 0; i < distance.length; i++) if (distance[i] > 0) { face.push(i); if (distance[i] < 1.5) edge.push(i); }
  if (!edge.length) throw new TypeError('Name raster requires a boundary');
  const positions = new Float32Array(count * 4), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const side = hash(i, seed + 61) > .68, back = hash(i, seed + 62) > .72;
    const candidates = side ? edge : face, pixel = candidates[Math.floor(hash(i, seed + 63) * candidates.length)];
    const depth = side ? (hash(i, seed + 64) - .5) * 1.1 : (back ? -.55 : .55) * Math.min(1, .7 + distance[pixel] * .06);
    positions.set([((pixel % width) / width - .5) * 16, (.5 - Math.floor(pixel / width) / height) * 8, depth, 0], i * 4);
    const light = side ? .54 + hash(i, seed + 65) * .28 : back ? .28 : .7 + hash(i, seed + 66) * .3;
    colors.set([light * .48, light * .88, light], i * 3);
  }
  return { positions, colors };
}

// Retarget from the current interpolated state, rather than the last destination.
export function interpolateInto(from, to, progress) {
  if (!(from instanceof Float32Array) || !(to instanceof Float32Array) || from.length !== to.length) throw new TypeError('Matching float attributes required');
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  for (let i = 0; i < from.length; i++) from[i] += (to[i] - from[i]) * t;
}

export function createShapes(count, seed = 17) {
  if (!Number.isInteger(count) || count < 1 || count > 60000) throw new RangeError('Particle count outside bounds');
  if (!Number.isFinite(seed)) throw new TypeError('Seed must be a finite number');
  const shapes = Array.from({ length: 4 }, () => ({ positions: new Float32Array(count * 4), colors: new Float32Array(count * 3) }));
  const tau = Math.PI * 2;
  const put = (scene, i, x, y, z, part, color) => {
    shapes[scene].positions.set([x, y, z, part], i * 4);
    shapes[scene].colors.set(color, i * 3);
  };
  for (let i = 0; i < count; i++) {
    const a = hash(i, seed), b = hash(i, seed + 1), c = hash(i, seed + 2), d = hash(i, seed + 3);
    if (i % 16 === 0) {
      for (let scene = 0; scene < 4; scene++) put(scene, i, (a - .5) * 32, (b - .5) * 18, (c - .5) * 14, 3, [.04, .15, .1]);
      continue;
    }
    // A soft flowing veil frames the HTML name; no particles form its letters.
    const flow = (a - .5) * Math.PI * 2, spread = (b - .5);
    put(0, i, flow * 3, Math.sin(flow * .9) * 2.7 + Math.cos(flow * 1.9) * .7 + spread * .8, Math.cos(flow) * 1.8 + spread * .7, 0, [.24 + d * .18, .52 + d * .2, .5 + d * .22]);

    // Uniform sphere sampling, an atmosphere and inclined orbital traces.
    const phi = a * tau, latitude = Math.acos(2 * b - 1);
    let radius = 3.55, x = Math.sin(latitude) * Math.cos(phi), y = Math.cos(latitude), z = Math.sin(latitude) * Math.sin(phi);
    const land = Math.sin(x * 4 + z * 2) + Math.sin(y * 6 - x * 3) * .65 + Math.cos(z * 7 + y * 2) * .4;
    let color = land > .24 ? [.22, .65 + d * .2, .35] : [.07, .27 + d * .15, .55 + d * .35];
    if (c > .92) {
      radius = 5.2 + b * .9;
      x = Math.cos(phi); y = Math.sin(phi) * .34; z = Math.sin(phi) * .94;
      color = [.13, .42, .5];
    } else if (c > .84) { radius = 3.72 + d * .08; color = [.2, .62, .9]; }
    const shade = .38 + Math.max(0, x * -.45 + y * .4 + z * .65) * .8;
    put(1, i, x * radius, y * radius, z * radius, 0, color.map(v => v * shade));

    // One broad ribbon with a half twist, in silver, ice blue and lilac.
    const t = a * tau, across = (b - .5) * 2.4, radiusAt = 3 + across * Math.cos(t / 2);
    const px = radiusAt * Math.cos(t), py = radiusAt * Math.sin(t) * .8, pz = across * Math.sin(t / 2);
    const sheen = .52 + .4 * Math.pow(Math.abs(Math.sin(t + across)), 3);
    put(2, i, px, py, pz, 0, [sheen * (.72 + .15 * d), sheen * (.73 + .15 * b), sheen]);

    // Bell, long filament chains and four internal radial structures.
    let jx, jy, jz, part;
    if (c < .57) {
      const theta = Math.acos(1 - b), angle = a * tau, scallop = 1 + .025 * Math.cos(angle * 24) * Math.pow(Math.sin(theta), 12);
      jx = Math.sin(theta) * Math.cos(angle) * 3 * scallop;
      jy = 1.2 + Math.cos(theta) * 2.5;
      jz = Math.sin(theta) * Math.sin(angle) * 3 * scallop;
      part = 0;
    } else if (c < .93) {
      const strand = Math.floor(a * 40), angle = strand / 40 * tau, length = 4.5 + hash(strand, 8) * 2;
      jx = Math.cos(angle) * (2.7 - b * .6) + Math.sin(b * 8 + angle) * b * .35;
      jy = 1.2 - b * length;
      jz = Math.sin(angle) * (2.7 - b * .6) + Math.cos(b * 7 + angle) * b * .35;
      part = 1;
    } else {
      const angle = a * tau, lobe = Math.floor(b * 4) * Math.PI / 2;
      jx = Math.cos(lobe) * .85 + Math.cos(angle) * .65;
      jy = 1.9 + Math.sin(angle * 2) * .2;
      jz = Math.sin(lobe) * .85 + Math.sin(angle) * .65;
      part = 2;
    }
    put(3, i, jx, jy + .4, jz, part, part === 2 ? [.65, .34, .9] : [.2 + d * .35, .65 + d * .25, .8 + d * .2]);
  }
  return shapes;
}
