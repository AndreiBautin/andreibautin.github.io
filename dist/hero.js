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
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.06, 64), new THREE.MeshBasicMaterial({ color: 0x4aeaff, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
    ring.position.z = 1.002;
    g.add(ring);
    g.userData = { x, y, z, scale, label, drift: 0.6 + hash(i, 1) * 0.9, phase: hash(i, 2) * 6.283, tilt: hash(i, 3) * 6.283 };
    cluster.add(g);
    return g;
  });

  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

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
      g.position.y = u.y + Math.sin(s * u.drift + u.phase) * 0.28;
      g.position.x = u.x + Math.cos(s * u.drift * 0.7 + u.phase) * 0.12;
      g.rotation.set(Math.sin(s * 0.5 + u.tilt) * 0.22, Math.cos(s * 0.4 + u.phase) * 0.28, 0);
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
