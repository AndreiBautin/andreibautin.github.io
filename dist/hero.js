// The hero's visual: a cluster of faceted spheres, each wearing the mark of
// one technology, floating in the dark over the star field. Three.js from
// ./vendor, loaded as a module after the page has painted, so a slow device
// still reads the text at once. Nothing random: every sphere's place, drift
// and spin come from its index.
import * as THREE from './vendor/three.module.min.js';

const canvas = document.querySelector('.hero-tech');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const marks = [
  ['csharp', 'C#'], ['dotnet', '.NET'], ['typescript', 'TypeScript'], ['react', 'React'],
  ['azure', 'Azure'], ['sqlserver', 'SQL Server'], ['docker', 'Docker'], ['nodedotjs', 'Node.js'],
  ['blazor', 'Blazor'], ['postgresql', 'PostgreSQL'], ['vuedotjs', 'Vue'], ['github', 'GitHub'],
];
const hash = (k, n) => { const x = Math.sin(k * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };

// A logo as a texture: the SVG filled in the ink colour, drawn to a square
// canvas with a margin, so a sphere's face is a round sticker with the mark
// centred on it.
const logoTexture = (name) => fetch(`./images/tech/${name}.svg`).then((r) => r.text()).then((svg) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.drawImage(img, 56, 56, 144, 144);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    resolve(t);
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg fill="#e9edf2" '));
}));

const start = async () => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  scene.add(new THREE.HemisphereLight(0x9fd9ff, 0x0a1220, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.PointLight(0x4aeaff, 40, 30); rim.position.set(-8, -3, 4); scene.add(rim);

  const cluster = new THREE.Group();
  scene.add(cluster);
  const ball = new THREE.IcosahedronGeometry(1, 1);
  const face = new THREE.CircleGeometry(0.78, 48);
  const textures = await Promise.all(marks.map(([name]) => logoTexture(name)));
  // Laid out on a loose ring with a middle, each at its own depth: the
  // nearer ones larger, so the cluster has a front and a back.
  const layout = [[0, 0.1, 1.5], [2.6, 1.6, 0.4], [-2.5, 1.9, -0.2], [2.9, -1.7, 0.8], [-2.8, -1.5, 0.2],
    [0.2, 3.1, -1.4], [0.1, -3.0, -0.8], [4.8, 0.2, -1.6], [-4.7, 0.3, -1.4], [3.9, 3.4, -2.6], [-4.0, -3.2, -2.4], [4.3, -3.6, -2.2]];
  const spheres = marks.map(([, label], i) => {
    const g = new THREE.Group();
    const [x, y, z] = layout[i];
    g.position.set(x, y, z);
    const scale = 0.72 + z * 0.09 + (i === 0 ? 0.22 : 0);
    g.scale.setScalar(scale);
    const body = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ color: 0x101c2e, roughness: 0.42, metalness: 0.25, flatShading: true }));
    g.add(body);
    const sticker = new THREE.Mesh(face, new THREE.MeshBasicMaterial({ map: textures[i], transparent: true, depthWrite: false }));
    sticker.position.z = 1.005;
    g.add(sticker);
    // Three slow sines of unrelated periods on each axis: a wander that
    // never repeats, rather than a bounce on the spot.
    g.userData = { x, y, z, scale, label, phase: hash(i, 2) * 6.283, tilt: hash(i, 3) * 6.283,
      fx: 0.11 + hash(i, 4) * 0.09, fy: 0.08 + hash(i, 5) * 0.08, fz: 0.06 + hash(i, 6) * 0.06,
      gx: 0.23 + hash(i, 7) * 0.1, gy: 0.19 + hash(i, 8) * 0.1,
      spin: new THREE.Quaternion(), vx: 0, vy: 0 };
    cluster.add(g);
    return g;
  });

  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  // A press on a sphere grabs it: dragging spins it about the screen's
  // axes, and letting go leaves it turning, slowing on its own.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const axisX = new THREE.Vector3(1, 0, 0), axisY = new THREE.Vector3(0, 1, 0);
  const turn = new THREE.Quaternion();
  let held = null, lastX = 0, lastY = 0, lastT = 0;
  const under = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(spheres.map((g) => g.children[0]), false)[0];
    return hit ? hit.object.parent : null;
  };
  const spinBy = (g, dx, dy) => {
    const u = g.userData;
    turn.setFromAxisAngle(axisY, dx * 0.012); u.spin.premultiply(turn);
    turn.setFromAxisAngle(axisX, dy * 0.012); u.spin.premultiply(turn);
  };
  canvas.addEventListener('pointerdown', (e) => {
    const g = under(e);
    if (!g) return;
    held = g; held.userData.vx = held.userData.vy = 0;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-holding');
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!held) { canvas.classList.toggle('is-over', !!under(e)); return; }
    const dx = e.clientX - lastX, dy = e.clientY - lastY, dt = Math.max(8, performance.now() - lastT);
    spinBy(held, dx, dy);
    held.userData.vx = dx / dt * 16; held.userData.vy = dy / dt * 16;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
  });
  const letGo = () => { held = null; canvas.classList.remove('is-holding'); };
  canvas.addEventListener('pointerup', letGo);
  canvas.addEventListener('pointercancel', letGo);

  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // The cluster stands on the right of a wide view and fills a narrow one.
    const narrow = w < 760;
    cluster.position.set(narrow ? 0 : 4.3, narrow ? -3.6 : 0, 0);
    cluster.scale.setScalar(narrow ? Math.min(0.62, w / 600) : Math.min(0.92, w / 1600));
    camera.position.z = narrow ? 17 : 14;
  };
  new ResizeObserver(fit).observe(canvas);
  fit();

  let last = 0;
  const frame = (t) => {
    const s = t / 1000;
    for (const g of spheres) {
      const u = g.userData;
      g.position.x = u.x + Math.sin(s * u.fx + u.phase) * 0.55 + Math.sin(s * u.gx + u.tilt) * 0.2;
      g.position.y = u.y + Math.cos(s * u.fy + u.tilt) * 0.5 + Math.sin(s * u.gy + u.phase) * 0.18;
      g.position.z = u.z + Math.sin(s * u.fz + u.phase * 0.5) * 0.5;
      if (g !== held && (u.vx || u.vy)) {
        spinBy(g, u.vx, u.vy);
        u.vx *= 0.975; u.vy *= 0.975;
        if (Math.abs(u.vx) + Math.abs(u.vy) < 0.02) u.vx = u.vy = 0;
      }
      g.rotation.set(Math.sin(s * 0.17 + u.tilt) * 0.3, Math.sin(s * 0.13 + u.phase) * 0.35, Math.sin(s * 0.09 + u.tilt) * 0.12);
      g.quaternion.premultiply(u.spin);
    }
    cluster.rotation.y += ((pointer.x * 0.14) - cluster.rotation.y) * 0.04;
    cluster.rotation.x += ((pointer.y * 0.1) - cluster.rotation.x) * 0.04;
    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
    last = t;
  };
  canvas.classList.add('is-live');
  requestAnimationFrame(frame);
  if (reduce) addEventListener('resize', () => requestAnimationFrame(frame));
  return last;
};

if (canvas && window.WebGLRenderingContext) start().catch((e) => { console.warn('hero visual skipped', e); canvas.remove(); });
