// GPU point field: deterministic target shapes and interruptible transitions.
const canvas = document.querySelector('.hero-tech'), status = document.getElementById('field-status');
try {
  const [THREE, { createShapes, hash, interpolateInto }, { default: marks }] = await Promise.all([
    import('./vendor/three.hero.min.js?v=a8b1155d25'), import('./particle-shapes.js?v=6a3ee46d4b'), import('./tech-marks.js?v=2d5d1716e2'),
  ]);
  for (const name of ['csharp', 'dotnet', 'react', 'azure']) {
    const image = document.createElement('img'); image.alt = name === 'csharp' ? 'C#' : name === 'dotnet' ? '.NET' : name === 'react' ? 'React' : 'Azure'; image.width = image.height = 25;
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(marks[name].replace('<svg ', '<svg fill="#83b89a" ')); document.getElementById('stack-strip').append(image);
  }
  const count = innerWidth < 700 || navigator.connection?.saveData ? 18000 : 42000;
  const shapes = createShapes(count);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.debug.onShaderError = () => { throw new Error('Particle shader unavailable'); };
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 100), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  for (const [name, data, size] of [['aFrom', shapes[0].positions, 4], ['aTo', shapes[0].positions, 4], ['aColorFrom', shapes[0].colors, 3], ['aColorTo', shapes[0].colors, 3]]) geometry.setAttribute(name, new THREE.Float32BufferAttribute(data.slice(), size));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(Float32Array.from({ length: count }, (_, i) => hash(i, 33)), 1));
  const uniforms = {
    uTime: { value: 0 }, uMorph: { value: 1 }, uPointer: { value: new THREE.Vector2(100, 100) }, uForce: { value: 0 },
    uWave: { value: new THREE.Vector3(100, 100, -100) }, uRatio: { value: 1 }, uLight: { value: document.body.classList.contains('light') ? 1 : 0 }, uMotion: { value: 1 }, uMobile: { value: innerWidth < 900 ? 1 : 0 }, uNameScale: { value: 1 }, uShapeScale: { value: 1 }, uSpin: { value: 0 }, uJelly: { value: 0 }, uNameWeight: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, blending: uniforms.uLight.value ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aFrom;attribute vec4 aTo;attribute vec3 aColorFrom;attribute vec3 aColorTo;attribute float aSeed;
      uniform float uTime,uMorph,uForce,uRatio,uMotion,uMobile,uNameScale,uShapeScale,uSpin,uJelly,uNameWeight;uniform vec2 uPointer;uniform vec3 uWave;
      varying vec3 vColor;varying float vAlpha;
      mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
      void main(){
        float m=uMorph;vec3 p=mix(aFrom.xyz,aTo.xyz,m);vec3 direction=normalize(vec3(sin(aSeed*125.),cos(aSeed*73.),sin(aSeed*53.)));
        p.xz=turn(uSpin)*p.xz;
        float part=mix(aFrom.w,aTo.w,m);float jt=uTime*uMotion;
        if(part<2.5){p.xz*=1.+sin(jt*1.6)*.04*uJelly;if(part>.5&&part<1.5){float l=max(0.,1.6-p.y);p.x+=sin(l*1.4+jt*.8+atan(p.z,p.x)*2.)*l*.09*uJelly;p.z+=cos(l*1.1+jt*.6)*l*.06*uJelly;}p.y+=sin(jt*.45)*.12*uJelly;}
        p*=mix(1.,mix(uShapeScale,uNameScale,uNameWeight),uMobile);p.x+=mix(1.4,0.,uMobile);p.y+=mix(.5,2.1,uMobile);
        float t=uTime*uMotion;p+=vec3(sin(p.y*1.4+t*.45+aSeed*5.),cos(p.x*1.1+t*.3+aSeed*5.),sin(t*.4+p.x))*.035*uMotion;
        p.y+=sin(p.x*.6+t*.15)*.15*uNameWeight*uMotion;p.z+=sin(p.x*.5+t*.2)*.2*uNameWeight*uMotion;
        vec2 delta=p.xy-uPointer;float influence=exp(-dot(delta,delta)*.65)*uForce*uMotion;p.xy+=vec2(delta.y,-delta.x)*influence*.65;p.z+=influence*1.4;
        float age=uTime-uWave.z;float ring=exp(-pow((length(p.xy-uWave.xy)-age*5.)*1.8,2.))*exp(-max(0.,age)*.8)*step(0.,age)*uMotion;p+=direction*ring*.8;
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp((1.7+aSeed*1.8)*uRatio*16./max(5.,-view.z),1.,5.);
        vColor=mix(aColorFrom,aColorTo,m)+ring*.2;vAlpha=mix(.52,.85,aSeed)*mix(1.,.18,uNameWeight);if(mix(aFrom.w,aTo.w,m)>2.5)vAlpha*=.4;
      }`,
    fragmentShader: `precision highp float;uniform float uLight;varying vec3 vColor;varying float vAlpha;void main(){float radius=length(gl_PointCoord-.5);float alpha=(1.-smoothstep(.15,.5,radius))*vAlpha;if(alpha<.015)discard;gl_FragColor=vec4(mix(vColor,vColor*.2,uLight),alpha);}`,
  });
  const field = new THREE.Points(geometry, material); field.frustumCulled = false; scene.add(field);
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), pointer = new THREE.Vector2(100, 100);
  let active = 0, transitionStart = null, frame = 0, last = null, time = 0, overlay = false, fpsFrames = 0, fpsTime = 0, lowFrames = 0, effectiveCount = count;
  function render() { renderer.render(scene, camera); }
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight; camera.aspect = width / Math.max(1, height); camera.position.set(0, 0, camera.aspect < 1 ? 18 : 15); camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); uniforms.uRatio.value = renderer.getPixelRatio(); uniforms.uMobile.value = width < 900 ? 1 : 0;
    const worldWidth = 2 * camera.position.z * Math.tan(42 * Math.PI / 360) * camera.aspect;
    uniforms.uNameScale.value = Math.min(.8, worldWidth / 14.5); uniforms.uShapeScale.value = Math.min(.65, worldWidth / 11.5); render();
  }
  function change(index) {
    if (!Number.isInteger(index) || !shapes[index] || index === active) return;
    const m = uniforms.uMorph.value;
    for (const [fromName, toName] of [['aFrom', 'aTo'], ['aColorFrom', 'aColorTo']]) {
      const from = geometry.getAttribute(fromName), to = geometry.getAttribute(toName);
      interpolateInto(from.array, to.array, m);
      from.needsUpdate = true; to.array.set(toName === 'aTo' ? shapes[index].positions : shapes[index].colors); to.needsUpdate = true;
    }
    active = index; uniforms.uMorph.value = motion.matches ? 1 : 0; transitionStart = time;
    if (motion.matches) { uniforms.uNameWeight.value = index === 0 ? 1 : 0; uniforms.uJelly.value = index === 3 ? 1 : 0; render(); }
  }
  function draw(now) {
    if (document.hidden) { frame = 0; last = null; return; }
    const elapsed = last === null ? 0 : (now - last) / 1000, dt = Math.min(elapsed, .05); last = now; time += dt; uniforms.uTime.value = time;
    const follow = 1 - Math.exp(-dt * 4);
    uniforms.uNameWeight.value += ((active === 0 ? 1 : 0) - uniforms.uNameWeight.value) * follow;
    uniforms.uJelly.value += ((active === 3 ? 1 : 0) - uniforms.uJelly.value) * follow;
    if (active === 1 || active === 2) uniforms.uSpin.value += dt * .08;
    else uniforms.uSpin.value += (Math.round(uniforms.uSpin.value / (Math.PI * 2)) * Math.PI * 2 - uniforms.uSpin.value) * follow;
    if (transitionStart !== null) { const t = Math.min(1, (time - transitionStart) / 1.45); uniforms.uMorph.value = t * t * (3 - 2 * t); if (t === 1) transitionStart = null; }
    uniforms.uPointer.value.lerp(pointer, Math.min(1, dt * 9)); uniforms.uForce.value += ((overlay ? 0 : 1) - uniforms.uForce.value) * Math.min(1, dt * 7);
    render(); if (elapsed > 0) fpsFrames++; fpsTime += elapsed; if (elapsed > .028) lowFrames++; else lowFrames = Math.max(0, lowFrames - 1);
    if (lowFrames > 90 && effectiveCount > 18000) { effectiveCount = effectiveCount > 24000 ? 24000 : 18000; geometry.setDrawRange(0, effectiveCount); renderer.setPixelRatio(1); resize(); lowFrames = 0; }
    if (fpsTime >= 1.5) { status.textContent = `${effectiveCount.toLocaleString('en-US')} points / ${Math.round(fpsFrames / fpsTime)} fps`; fpsFrames = 0; fpsTime = 0; }
    frame = motion.matches ? 0 : requestAnimationFrame(draw);
  }
  function resume() {
    cancelAnimationFrame(frame); last = null; uniforms.uMotion.value = motion.matches ? 0 : 1;
    document.querySelector('.interaction-hint').textContent = motion.matches ? 'Choose a project below' : 'Move to disturb\nClick to send a wave';
    if (motion.matches) { uniforms.uMorph.value = 1; transitionStart = null; status.textContent = 'Reduced motion'; render(); }
    else if (!document.hidden) frame = requestAnimationFrame(draw);
  }
  addEventListener('portfolio:scene', event => change(event.detail?.index));
  addEventListener('portfolio:theme', event => { uniforms.uLight.value = event.detail?.light ? 1 : 0; material.blending = uniforms.uLight.value ? THREE.NormalBlending : THREE.AdditiveBlending; render(); });
  addEventListener('portfolio:overlay', event => { overlay = !!event.detail?.open; pointer.set(100, 100); });
  function projectPointer(event) { const box = canvas.getBoundingClientRect(), height = 2 * camera.position.z * Math.tan(42 * Math.PI / 360); pointer.set(((event.clientX - box.left) / box.width - .5) * height * camera.aspect, (.5 - (event.clientY - box.top) / box.height) * height); }
  canvas.addEventListener('pointermove', projectPointer); canvas.addEventListener('pointerleave', () => pointer.set(100, 100));
  canvas.addEventListener('pointerdown', event => { if (motion.matches) return; projectPointer(event); uniforms.uWave.value.set(pointer.x, pointer.y, time); });
  addEventListener('resize', resize); motion.addEventListener('change', resume); document.addEventListener('visibilitychange', resume);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); document.body.classList.remove('field-ready'); status.textContent = 'Graphics paused. Project links remain available.'; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  addEventListener('pagehide', event => { cancelAnimationFrame(frame); if (!event.persisted) { geometry.dispose(); material.dispose(); renderer.dispose(); } }); addEventListener('pageshow', resume);
  resize(); change(Number(document.querySelector('[data-scene][aria-pressed="true"]').dataset.scene)); render(); document.body.classList.add('field-ready'); resume();
} catch { document.body.classList.remove('field-ready'); document.querySelector('.interaction-hint').textContent = 'Choose a project below'; status.textContent = 'Explore a project below.'; }
