// Browser-free, deterministic geometry. Rasterized name samples are supplied by the renderer.
export function hash(value, salt = 17) {
  const n = Math.sin(value * 127.1 + salt * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Retarget from the current interpolated state, rather than the last destination.
export function interpolateInto(from, to, progress) {
  if (!(from instanceof Float32Array) || !(to instanceof Float32Array) || from.length !== to.length) throw new TypeError('Matching float attributes required');
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  for (let i = 0; i < from.length; i++) from[i] += (to[i] - from[i]) * t;
}

export function createShapes(count, samples, seed = 17) {
  if (!Number.isInteger(count) || count < 1 || count > 60000) throw new RangeError('Particle count outside bounds');
  if (!(samples instanceof Float32Array) || !samples.length || samples.length % 3 || !samples.every(Number.isFinite)) throw new TypeError('Name samples must be finite xyz coordinates');
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
    const sample = Math.floor(a * samples.length / 3) * 3;
    put(0, i, samples[sample], samples[sample + 1], (c - .5) * .35, 0, [.15 + d * .5, .55 + d * .4, .3 + d * .35]);

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

    // Trefoil centerline with a circular tube in its local normal plane.
    const t = a * tau, r = 2 + Math.cos(3 * t);
    const center = [r * Math.cos(t), r * Math.sin(t), Math.sin(3 * t)];
    let tx = -3 * Math.sin(3 * t) * Math.cos(t) - r * Math.sin(t);
    let ty = -3 * Math.sin(3 * t) * Math.sin(t) + r * Math.cos(t);
    let tz = 3 * Math.cos(3 * t);
    const length = Math.hypot(tx, ty, tz); tx /= length; ty /= length; tz /= length;
    const nl = Math.hypot(tz, tx), nx = -tz / nl, nz = tx / nl;
    const bx = ty * nz, by = tz * nx - tx * nz, bz = -ty * nx;
    const ring = b * tau, tube = .57 + .03 * Math.sin(t * 12);
    const px = center[0] + tube * (nx * Math.cos(ring) + bx * Math.sin(ring));
    const py = center[1] + tube * by * Math.sin(ring);
    const pz = center[2] + tube * (nz * Math.cos(ring) + bz * Math.sin(ring));
    const metallic = .45 + .55 * Math.pow(Math.abs(Math.cos(ring - .6)), 4);
    put(2, i, px * 1.25, py * .93, pz * 1.25, 0, [metallic, metallic * .75, metallic * .32]);

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
