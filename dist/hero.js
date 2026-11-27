const canvas = document.querySelector('.hero-tech'), status = document.getElementById('field-status');
try {
  const [THREE, { createShapes, createNameShape, hash, interpolateInto }, { default: marks }] = await Promise.all([
    import('./vendor/three.hero.min.js?v=a8b1155d25'), import('./particle-shapes.js?v=554ab605f8'), import('./tech-marks.js?v=2d5d1716e2'),
  ]);
  for (const name of ['csharp', 'dotnet', 'react', 'azure']) {
    const image = document.createElement('img'); image.alt = name === 'csharp' ? 'C#' : name === 'dotnet' ? '.NET' : name === 'react' ? 'React' : 'Azure'; image.width = image.height = 25;
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(marks[name].replace('<svg ', '<svg fill="#83b89a" ')); document.getElementById('stack-strip').append(image);
  }
  const count = innerWidth < 700 || navigator.connection?.saveData ? 18000 : 42000;
  const shapes = createShapes(count);
  await document.fonts.load('700 240px Manrope');
  const raster = document.createElement('canvas'); raster.width = 1536; raster.height = 768;
  const ink = raster.getContext('2d', { willReadFrequently: true }); if (!ink) throw new Error('Name raster unavailable');
  ink.font = '700 240px Manrope'; ink.textAlign = 'center'; ink.textBaseline = 'middle'; ink.letterSpacing = '4px'; ink.fillStyle = '#fff';
  ink.fillText('ANDREI', 768, 260); ink.fillText('BAUTIN', 768, 500);
  const pixels = ink.getImageData(0, 0, 1536, 768).data, mask = new Uint8Array(1536 * 768);
  for (let i = 0; i < mask.length; i++) mask[i] = pixels[i * 4 + 3];
  shapes[0] = createNameShape(mask, 1536, 768, count);
  try {
    const { createWorkShapes } = await import('./work-shapes.js?v=00046573a0');
    shapes.push(...createWorkShapes(count));
  } catch { /* Keep the original forms available. */ }
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.debug.onShaderError = () => { throw new Error('Particle shader unavailable'); };
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 100), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  for (const [name, data, size] of [['aFrom', shapes[0].positions, 4], ['aTo', shapes[0].positions, 4], ['aColorFrom', shapes[0].colors, 3], ['aColorTo', shapes[0].colors, 3]]) geometry.setAttribute(name, new THREE.Float32BufferAttribute(data.slice(), size));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(Float32Array.from({ length: count }, (_, i) => hash(i, 33)), 1));
  geometry.setAttribute('aCareerNode', new THREE.Float32BufferAttribute(shapes[7]?.careerNodes ?? new Float32Array(count).fill(-1), 1));
  const uniforms = {
    uTime: { value: 0 }, uMorph: { value: 1 }, uArrival: { value: 0 }, uPointer: { value: new THREE.Vector2(100, 100) }, uForce: { value: 0 },
    uWave: { value: new THREE.Vector3(100, 100, -100) }, uRatio: { value: 1 }, uLight: { value: document.body.classList.contains('light') ? 1 : 0 }, uMotion: { value: 1 }, uMobile: { value: innerWidth < 900 ? 1 : 0 }, uNameScale: { value: 1 }, uShapeScale: { value: 1 }, uSpin: { value: 0 }, uJelly: { value: 0 }, uNameWeight: { value: 1 }, uFlow: { value: 0 }, uFlowWork: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, blending: uniforms.uLight.value ? THREE.NormalBlending : THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aFrom;attribute vec4 aTo;attribute vec3 aColorFrom;attribute vec3 aColorTo;attribute float aSeed,aCareerNode;
      uniform float uTime,uMorph,uArrival,uForce,uRatio,uMotion,uMobile,uNameScale,uShapeScale,uSpin,uJelly,uNameWeight,uFlow,uFlowWork,uZoom,uCareerStep,uPresentation;uniform vec2 uPointer,uInspect;uniform vec3 uWave;
      varying vec3 vColor;varying float vAlpha;
      mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
      vec3 careerCenter(float n){return n<.5?vec3(-3.1,-1.82,.32):(n<1.5?vec3(-1.05,-.55,-.8):(n<2.5?vec3(1.15,.72,.9):vec3(3.15,1.78,-.22)));}
      vec2 laneCenter(float y){if(y>1.08)return vec2(1.62,.57);if(y>0.)return vec2(.54,.19);if(y<-1.08)return vec2(-1.62,-.57);return vec2(-.54,-.19);}
      vec4 experienceFlow(float work,vec3 p,float part,float seed,float jt){
        vec3 d=vec3(0.);float energy=0.;
        if(work<.5||work>5.5)return vec4(d,0.);
        float travel=fract(jt*.16+seed*2.7);
        float gate=smoothstep(0.,.1,travel)*(1.-smoothstep(.82,1.,travel));
        if(work<1.5){
          float r=length(p.xy);
          if(part<.5){
            if(r<1.45){float ang=jt*(r<.85?.22:.08);d.xy=(turn(ang)*p.xy)-p.xy;energy=.04+.18*clamp(.5+p.z,0.,1.);}
            else d.z=sin(jt*.5+p.x*1.7)*.016;
          }else if(part<1.5){
            vec3 fwd=normalize(-p+vec3(.001,.0004,.0002));
            d=fwd*travel*.62;energy=gate;
          }else{
            float span=length(p);
            energy=smoothstep(0.,.08,fract(jt*.2+span*.16))*(1.-smoothstep(.06,.34,fract(jt*.2+span*.16)));
            d=normalize(-p+vec3(.001))*sin(jt*.55+seed*8.)*.02;
          }
        }else if(work<2.5){
          vec2 center=laneCenter(p.y);vec2 rel=p.yz-center;
          if(part<.5){
            if(p.x<-2.15){d.yz=(turn(jt*.32)*p.yz)-p.yz;energy=.3+.7*(.5+.5*sin(jt*1.15+p.x*2.4));}
            else{d.yz=(turn(jt*.4)*rel)-rel;energy=.25+.25*sin(jt*1.1-p.x*.8);}
          }else if(part<1.5){
            d.x=travel*.7;d.yz=(turn(travel*6.28318)*rel)-rel;energy=gate;
          }else if(p.x>3.6){
            d.yz=(turn(jt*.45)*rel)-rel;energy=.35+.65*abs(sin(atan(rel.y,rel.x)-jt*1.2));
          }else energy=pow(max(0.,sin(p.x*1.35-jt*1.45)),2.);
        }else if(work<3.5){
          float clock=atan(p.y,p.x);
          if(part<.5){
            float sweep=fract((clock+3.14159)/6.28318-jt*.045);
            energy=smoothstep(0.,.015,sweep)*(1.-smoothstep(.02,.14,sweep));
            d.z=sin(jt*.65+clock)*.028;
          }else if(part<1.5){d.x=travel*.9;energy=gate;}
          else{
            vec2 knot=p.xy-vec2(-.82,.04);
            if(p.z>.28&&length(p.xy)> .85&&length(p.xy)<1.65){d.xy=(turn(-jt*.1)*p.xy)-p.xy;energy=.4+.6*abs(sin(clock-jt*.9));}
            else{energy=pow(max(0.,sin(atan(knot.y,knot.x)*2.-jt*1.5)),2.);d.xy=normalize(vec2(-knot.y,knot.x)+vec2(.001))*sin(jt*.45+atan(knot.y,knot.x))*.018;}
          }
        }else if(work<4.5){
          float node=aCareerNode;
          vec3 center=careerCenter(node);
          vec3 rel=p-center;
          if(node>=0.){
            float speed=part>.5?.4:.23;
            vec3 q=rel;q.yz=turn(jt*speed+node*.45)*q.yz;q.xz=turn(sin(jt*.35+node)*.4)*q.xz;
            d=q-rel;d.y+=sin(jt*.7+node*1.4)*.12;
            energy=.05+.2*pow(max(0.,sin(atan(rel.y,rel.x)-jt*.9+node)),3.);
          }else{
            float journey=clamp((p.x+3.1)/6.25,0.,1.);
            float pulse=fract((p.x+3.1)/6.25-jt*.12);
            energy=smoothstep(0.,.025,pulse)*(1.-smoothstep(.045,.2,pulse));
            d.y=sin(jt*.7+journey*4.2)*.12;d.z=sin(jt*.6+journey*6.)*.08;
          }
          vec3 q=p+d;q.xz=turn(sin(jt*.28)*.14)*q.xz;q.xy=turn(sin(jt*.2)*.018)*q.xy;d=q-p;
        }else{
          float radius=length(p.xy);
          if(part<.5){
            if(radius<1.1){d.xy=turn(jt*.3)*p.xy-p.xy;d.z=sin(jt*.7+atan(p.y,p.x))*.06;}
            else{
              vec3 center=p.x< -1.5?vec3(-3.15,1.2,.72):(p.x>1.5?vec3(3.25,1.02,-.58):vec3(.15,-2.05,.9));
              vec3 rel=p-center;vec3 q=rel;q.yz=turn(jt*.35)*q.yz;d=q-rel;
            }
            energy=.25+.4*pow(max(0.,sin(atan(p.y,p.x)-jt*.9)),2.);
          }else if(part<1.5){
            vec3 dest=p.y< -.2?vec3(.15,-2.05,.9):(p.x<0.?vec3(-3.15,1.2,.72):vec3(3.25,1.02,-.58));
            float start=clamp(dot(p.xy,dest.xy)/dot(dest.xy,dest.xy),0.,1.);
            float next=mix(start,1.,travel);
            float z0=2.*(1.-start)*start*.4+start*start*dest.z;
            vec3 q=vec3(dest.xy*next+(p.xy-dest.xy*start)*(1.-travel),2.*(1.-next)*next*.4+next*next*dest.z+(p.z-z0)*(1.-travel));
            d=q-p;energy=gate;
          }else{
            float pulse=fract(radius*.28-jt*.18);
            energy=smoothstep(0.,.035,pulse)*(1.-smoothstep(.07,.24,pulse));
            d.z=sin(jt*.6+p.x*.4)*.04;
          }
          vec3 q=(p+d)*(1.+sin(jt*.75)*.035);
          q.xz=turn(sin(jt*.32)*.32)*q.xz;q.xy=turn(sin(jt*.23)*.16)*q.xy;
          q.y+=sin(jt*.6)*.12;d=q-p;
        }
        return vec4(d,energy);
      }
      void main(){
        float m=uMorph;vec3 p=mix(aFrom.xyz,aTo.xyz,m);vec3 direction=normalize(vec3(sin(aSeed*125.),cos(aSeed*73.),sin(aSeed*53.)));
        float born=smoothstep(aSeed*.3,aSeed*.3+.65,uArrival);p+=direction*(1.-born)*1.4;
        float nt=uTime*uMotion;
        p.yz=turn((.08+sin(nt*.48)*.12)*uNameWeight)*p.yz;
        p.xz=turn(uSpin+(-.12+sin(nt*.65)*.38)*uNameWeight)*p.xz;
        p.xy=turn(sin(nt*.38)*.025*uNameWeight)*p.xy;
        p.y+=sin(nt*.8)*.18*uNameWeight;
        float part=mix(aFrom.w,aTo.w,m);float jt=uTime*uMotion;
        float career=(1.-step(.5,abs(uFlowWork-4.)))*uFlow;
        float nodeBody=step(-.5,aCareerNode);
        float selected=nodeBody*(1.-step(.5,abs(aCareerNode-uCareerStep)));
        float focus=career*selected;
        p+=(p-careerCenter(aCareerNode))*focus*.22;
        vec4 flow=experienceFlow(uFlowWork,p,part,aSeed,jt);
        float alive=uFlow*uMotion;p+=flow.xyz*alive;
        float contrast=(1.-step(.5,min(abs(uFlowWork-4.),abs(uFlowWork-1.))))*uFlow;
        if(part<2.5){p.xz*=1.+sin(jt*1.6)*.04*uJelly;if(part>.5&&part<1.5){float l=max(0.,1.6-p.y);p.x+=sin(l*1.4+jt*.8+atan(p.z,p.x)*2.)*l*.09*uJelly;p.z+=cos(l*1.1+jt*.6)*l*.06*uJelly;}p.y+=sin(jt*.45)*.12*uJelly;}
        p.yz=turn(uInspect.y)*p.yz;p.xz=turn(uInspect.x)*p.xz;
        p*=uZoom*uPresentation;
        p*=mix(1.,mix(uShapeScale,uNameScale,uNameWeight),uMobile);p.x+=mix(1.4,0.,uMobile);p.y+=mix(.5,2.1,uMobile);
        float t=uTime*uMotion;p+=vec3(sin(p.y*1.4+t*.45+aSeed*5.),cos(p.x*1.1+t*.3+aSeed*5.),sin(t*.4+p.x))*.035*uMotion;
        vec2 delta=p.xy-uPointer;float influence=exp(-dot(delta,delta)*.65)*uForce*uMotion;p.xy+=vec2(delta.y,-delta.x)*influence*.65;p.z+=influence*1.4;
        float age=uTime-uWave.z;float ring=exp(-pow((length(p.xy-uWave.xy)-age*5.)*1.8,2.))*exp(-max(0.,age)*.8)*step(0.,age)*uMotion;p+=direction*ring*.8;
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp((1.7+aSeed*1.8)*(1.+.28*flow.w*alive+focus*.38)*(1.-contrast*.15)*uRatio*16./max(5.,-view.z),1.,5.);
        float depth=clamp(.76+p.z*.24, .52, 1.22);
        vColor=mix(aColorFrom,aColorTo,m)*mix(1.,depth,uFlow)+vec3(.2,.38,.18)*flow.w*alive+ring*.2;
        vColor*=1.-career*nodeBody*(1.-selected)*.35;
        vColor+=vec3(.22,.3,.16)*focus;
        vAlpha=mix(.52,.85,aSeed)*born*mix(1.,.75,contrast);if(mix(aFrom.w,aTo.w,m)>2.5)vAlpha*=.4;
        if(part>.5&&part<1.5)vAlpha*=mix(1.,flow.w,alive);
      }`,
    fragmentShader: `precision highp float;uniform float uLight;varying vec3 vColor;varying float vAlpha;void main(){float radius=length(gl_PointCoord-.5);float alpha=(1.-smoothstep(.15,.5,radius))*vAlpha;if(alpha<.015)discard;gl_FragColor=vec4(mix(vColor,vColor*.2,uLight),alpha);}`,
  });
  const field = new THREE.Points(geometry, material); field.frustumCulled = false; scene.add(field);
  uniforms.uInspect = { value: new THREE.Vector2(0, 0) };
  uniforms.uZoom = { value: 1 };
  uniforms.uPresentation = { value: 1.12 };
  const selectedCareerTab = document.querySelector('.work-milestones [aria-selected="true"]');
  uniforms.uCareerStep = { value: Number(selectedCareerTab?.id.slice(-1) ?? 0) };
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), pointer = new THREE.Vector2(100, 100);
  let active = 0, transitionStart = null, frame = 0, last = null, time = 0, overlay = false, lowFrames = 0, effectiveCount = count;
  function render() { renderer.render(scene, camera); }
  function syncFlow() {
    const id = active >= 4 && active <= 8 ? active - 3 : 0;
    uniforms.uFlowWork.value = id; uniforms.uFlow.value = id ? 1 : 0;
  }
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight; camera.aspect = width / Math.max(1, height); camera.position.set(0, 0, camera.aspect < 1 ? 18 : 15); camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); uniforms.uRatio.value = renderer.getPixelRatio(); uniforms.uMobile.value = width < 900 || camera.aspect < 1.3 ? 1 : 0;
    uniforms.uPresentation.value = width < 600 ? 1.08 : 1.12;
    const worldWidth = 2 * camera.position.z * Math.tan(42 * Math.PI / 360) * camera.aspect;
    uniforms.uNameScale.value = Math.min(.8, worldWidth / 17); uniforms.uShapeScale.value = Math.min(.65, worldWidth / 11.5); render();
  }
  function change(index, instant = false) {
    if (!Number.isInteger(index) || !shapes[index] || (index === active && !instant)) return;
    uniforms.uInspect.value.set(0, 0); uniforms.uZoom.value = 1; endDrag();
    if (index !== 0) uniforms.uArrival.value = 1;
    const m = uniforms.uMorph.value;
    for (const [fromName, toName] of [['aFrom', 'aTo'], ['aColorFrom', 'aColorTo']]) {
      const from = geometry.getAttribute(fromName), to = geometry.getAttribute(toName);
      interpolateInto(from.array, to.array, m);
      from.needsUpdate = true; to.array.set(toName === 'aTo' ? shapes[index].positions : shapes[index].colors); to.needsUpdate = true;
    }
    active = index; uniforms.uMorph.value = motion.matches ? 1 : 0; transitionStart = time;
    if (motion.matches || instant) { uniforms.uMorph.value = 1; transitionStart = null; uniforms.uNameWeight.value = index === 0 ? 1 : 0; uniforms.uJelly.value = index === 3 ? 1 : 0; syncFlow(); render(); }
  }
  function draw(now) {
    if (document.hidden) { frame = 0; last = null; return; }
    const elapsed = last === null ? 0 : (now - last) / 1000, dt = Math.min(elapsed, .05); last = now; time += dt; uniforms.uTime.value = time;
    uniforms.uArrival.value = Math.min(1, uniforms.uArrival.value + dt * 1.05);
    const follow = 1 - Math.exp(-dt * 4);
    uniforms.uNameWeight.value += ((active === 0 ? 1 : 0) - uniforms.uNameWeight.value) * follow;
    uniforms.uJelly.value += ((active === 3 ? 1 : 0) - uniforms.uJelly.value) * follow;
    const experience = active >= 4 && active <= 8;
    if (uniforms.uFlow.value < 0.04 && transitionStart === null) uniforms.uFlowWork.value = experience ? active - 3 : 0;
    uniforms.uFlow.value += ((experience && transitionStart === null ? 1 : 0) - uniforms.uFlow.value) * follow;
    if (active === 1 || active === 2) uniforms.uSpin.value += dt * .08;
    else uniforms.uSpin.value += (Math.round(uniforms.uSpin.value / (Math.PI * 2)) * Math.PI * 2 - uniforms.uSpin.value) * follow;
    if (transitionStart !== null) { const t = Math.min(1, (time - transitionStart) / 1.45); uniforms.uMorph.value = t * t * (3 - 2 * t); if (t === 1) transitionStart = null; }
    uniforms.uPointer.value.lerp(pointer, Math.min(1, dt * 9)); uniforms.uForce.value += ((overlay ? 0 : 1) - uniforms.uForce.value) * Math.min(1, dt * 7);
    render(); if (elapsed > .028) lowFrames++; else lowFrames = Math.max(0, lowFrames - 1);
    if (lowFrames > 90 && effectiveCount > 18000) { effectiveCount = effectiveCount > 24000 ? 24000 : 18000; geometry.setDrawRange(0, effectiveCount); renderer.setPixelRatio(1); resize(); lowFrames = 0; }
    frame = motion.matches ? 0 : requestAnimationFrame(draw);
  }
  function resume() {
    cancelAnimationFrame(frame); last = null; uniforms.uMotion.value = motion.matches ? 0 : 1; if (motion.matches) syncFlow();
    if (motion.matches) { uniforms.uArrival.value = 1; uniforms.uMorph.value = 1; transitionStart = null; render(); }
    else if (!document.hidden) frame = requestAnimationFrame(draw);
  }
  addEventListener('portfolio:scene', event => change(event.detail?.index, event.detail?.instant === true));
  addEventListener('portfolio:career-step', event => {
    const index = event.detail?.index;
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    uniforms.uCareerStep.value = index; render();
  });
  addEventListener('portfolio:theme', event => { uniforms.uLight.value = event.detail?.light ? 1 : 0; material.blending = uniforms.uLight.value ? THREE.NormalBlending : THREE.AdditiveBlending; render(); });
  addEventListener('portfolio:overlay', event => { overlay = !!event.detail?.open; pointer.set(100, 100); });
  function projectPointer(event) { const box = canvas.getBoundingClientRect(), height = 2 * camera.position.z * Math.tan(42 * Math.PI / 360); pointer.set(((event.clientX - box.left) / box.width - .5) * height * camera.aspect, (.5 - (event.clientY - box.top) / box.height) * height); }
  let drag = null;
  function endDrag() {
    const id = drag?.id; drag = null;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function rotate(dx, dy) {
    const angle = uniforms.uInspect.value;
    angle.x = (angle.x + dx) % (Math.PI * 2);
    angle.y = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, angle.y + dy));
    render();
  }
  function zoom(delta) {
    if (overlay || !Number.isFinite(delta)) return;
    uniforms.uZoom.value = Math.max(.65, Math.min(1.5, uniforms.uZoom.value * Math.exp(-delta * .0015)));
    render();
  }
  canvas.addEventListener('pointermove', event => {
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    projectPointer(event);
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.rotate && event.pointerType !== 'touch' && !(event.buttons & 2)) { endDrag(); return; }
    const x = event.clientX - drag.x, y = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    drag.moved = true; drag.x = event.clientX; drag.y = event.clientY;
    if (drag.rotate) rotate(x * .008, y * .008);
  });
  canvas.addEventListener('pointerleave', () => pointer.set(100, 100));
  canvas.addEventListener('pointerdown', event => {
    if (![0, 2].includes(event.button) || overlay || !event.isPrimary || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    drag = { id: event.pointerId, rotate: event.button === 2 || event.pointerType === 'touch', wave: event.button === 0, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.wave && !drag.moved && !motion.matches) { projectPointer(event); uniforms.uWave.value.set(pointer.x, pointer.y, time); }
    endDrag();
  });
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('wheel', event => {
    if (overlay || event.ctrlKey || event.metaKey || !Number.isFinite(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    event.preventDefault(); zoom(Math.max(-160, Math.min(160, event.deltaY * unit)));
  }, { passive: false });
  document.querySelectorAll('[data-turn]').forEach(button => button.addEventListener('click', () => {
    const direction = button.dataset.turn;
    if (direction === 'reset') { uniforms.uInspect.value.set(0, 0); uniforms.uZoom.value = 1; render(); }
    else if (direction === 'closer' || direction === 'further') zoom(direction === 'closer' ? -100 : 100);
    else if (direction === 'left' || direction === 'right') rotate(direction === 'left' ? -.3 : .3, 0);
  }));
  addEventListener('resize', resize); motion.addEventListener('change', resume); document.addEventListener('visibilitychange', resume);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); endDrag(); cancelAnimationFrame(frame); document.body.classList.remove('field-ready'); document.body.classList.add('field-unavailable'); status.textContent = 'Graphics paused. Project links remain available.'; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  addEventListener('pagehide', event => { cancelAnimationFrame(frame); if (!event.persisted) { geometry.dispose(); material.dispose(); renderer.dispose(); } }); addEventListener('pageshow', resume);
  const initialMode = document.querySelector('#work-panel')?.getAttribute('data-work-mode');
  const initialRoute = location.hash.slice(1).replace(/^work-/, '');
  const routeMode = initialRoute === 'resume' ? 'career' : initialRoute === 'experience' ? 'knowledge' : initialRoute;
  const initialWork = ['knowledge', 'replication', 'payments', 'career', 'contact'].indexOf(initialMode === 'projects' || !initialMode ? routeMode : initialMode);
  const initialIndex = initialWork >= 0 ? 4 + initialWork : Number(document.querySelector('[data-scene][aria-pressed="true"]')?.dataset.scene ?? 0);
  uniforms.uArrival.value = initialIndex === 0 && !motion.matches ? 0 : 1;
  resize(); change(initialIndex, true); render(); document.body.classList.add('field-ready'); resume(); dispatchEvent(new CustomEvent('portfolio:graphics-ready'));
} catch { document.body.classList.remove('field-ready'); document.body.classList.add('field-unavailable'); status.textContent = 'Explore a project below.'; }
