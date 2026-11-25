// A low-contrast code wall. Uses the existing, integrity-pinned Three.js subset
// and the generated technology marks; no additional runtime dependency.
const canvas = document.querySelector('.hero-tech');
if (canvas && !navigator.connection?.saveData) {
  const [THREE, { default: marks }] = await Promise.all([import('./vendor/three.hero.min.js'), import('./tech-marks.js')]);
  const hash = (i, salt) => { const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return n - Math.floor(n); };
  const image = document.createElement('canvas'); image.width = image.height = 1024;
  const context = image.getContext('2d');
  const symbols = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}[]';
  const logos = await Promise.all(['csharp', 'dotnet', 'react', 'azure'].map(name => new Promise(resolve => {
    const logo = new Image(); logo.onload = () => resolve(logo); logo.onerror = () => resolve(null);
    logo.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(marks[name].replace('<svg ', '<svg fill="#70c986" '));
  })));
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }); } catch { renderer = null; }
  if (renderer && context) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 60);
    camera.position.set(0, 0, 12);
    const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.CircleGeometry(14, 4);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .85, depthWrite: false });
    const wall = new THREE.Mesh(geometry, material); wall.rotation.y = -.18; scene.add(wall);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true, previous = -Infinity, handle = 0;
    function resize() { const box = canvas.getBoundingClientRect(); renderer.setSize(box.width, box.height, false); camera.aspect = box.width / Math.max(1, box.height); camera.updateProjectionMatrix(); }
    function draw(now) {
      if (!visible || document.hidden) return;
      if (now - previous < 90 && !reduced) { handle = requestAnimationFrame(draw); return; }
      previous = now;
      context.clearRect(0, 0, 1024, 1024); context.font = '17px Consolas, monospace';
      const time = reduced ? 0 : now / 1000;
      for (let column = 0; column < 43; column++) {
        const speed = 13 + hash(column, 1) * 17;
        const head = (time * speed + hash(column, 2) * 1100) % 1300;
        for (let row = 0; row < 18; row++) {
          const y = head - row * 25, x = column * 25;
          if (y < 0 || y > 1040) continue;
          context.fillStyle = row === 0 ? '#a9edbb' : '#348d50';
          context.globalAlpha = (1 - row / 18) * .7;
          context.fillText(symbols[Math.floor(hash(column * 19 + row, Math.floor(time * 2)) * symbols.length)], x, y);
        }
      }
      context.globalAlpha = .24;
      logos.forEach((logo, i) => { if (logo) context.drawImage(logo, 180 + i * 170, 400 + Math.sin(time * .2 + i) * 60, 35, 35); });
      context.globalAlpha = 1; texture.needsUpdate = true; renderer.render(scene, camera);
      if (!reduced) handle = requestAnimationFrame(draw);
    }
    new IntersectionObserver(([entry]) => { const resume = entry.isIntersecting && !visible; visible = entry.isIntersecting; if (resume) handle = requestAnimationFrame(draw); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) handle = requestAnimationFrame(draw); });
    addEventListener('resize', () => { resize(); if (reduced) handle = requestAnimationFrame(draw); });
    addEventListener('pagehide', event => { if (event.persisted) return; cancelAnimationFrame(handle); renderer.dispose(); geometry.dispose(); material.dispose(); texture.dispose(); });
    resize(); handle = requestAnimationFrame(draw);
  }
}
