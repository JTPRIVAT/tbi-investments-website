const shell = document.querySelector('.scene-shell');
const motionButton = document.querySelector('#motion-toggle');

// Balance / Fuge 02 is the selected brand mark; query parameters cannot replace it.

const mobileMenu = document.querySelector('.mobile-menu');
document.addEventListener('click',event => {
  if (mobileMenu && !mobileMenu.contains(event.target)) mobileMenu.open = false;
});
document.addEventListener('keydown',event => {
  if (event.key === 'Escape' && mobileMenu?.open) {
    mobileMenu.open = false;
    mobileMenu.querySelector('summary').focus();
  }
});
async function createSculpture() {
  const THREE = await import('./vendor/three.module.js');
  const canvas = document.querySelector('#sculpture');
  const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
  camera.position.set(0, .1, 14);
  camera.lookAt(0, 0, 0);

  // Procedural geometry and point sprites; no stock assets or external requests.
  let seed = 217;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = spriteCanvas.height = 64;
  const context = spriteCanvas.getContext('2d');
  const gradient = context.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.15,'rgba(255,255,255,.95)');
  gradient.addColorStop(.4,'rgba(255,255,255,.25)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  context.fillStyle=gradient;context.fillRect(0,0,64,64);
  const sprite = new THREE.CanvasTexture(spriteCanvas);
  function points(positions, size, color, opacity) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    return new THREE.Points(geometry,new THREE.PointsMaterial({color,size,map:sprite,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));
  }
  const stars=[];
  for(let i=0;i<520;i++) stars.push((random()-.5)*30,(random()-.5)*15,-3-random()*8);
  const starfield=points(stars,.07,'#73b5cb',.65);scene.add(starfield);
  const sculpture = new THREE.Group(); scene.add(sculpture);
  const globe=new THREE.Group();globe.rotation.set(.38,.1,-.42);sculpture.add(globe);
  const radius=2.25;
  const globePoints=[];
  const lineMaterial=new THREE.LineBasicMaterial({color:'#73b5cb',transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let ring=1;ring<33;ring++){
    const latitude=Math.PI*ring/33;
    const r=Math.sin(latitude)*radius;
    const y=Math.cos(latitude)*radius;
    const vertices=[];
    for(let step=0;step<180;step++){
      const angle=Math.PI*2*step/180;
      vertices.push(new THREE.Vector3(r*Math.cos(angle),y,r*Math.sin(angle)));
      if(step%3===0)globePoints.push(r*Math.cos(angle),y,r*Math.sin(angle));
    }
    const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices),lineMaterial);globe.add(line);
  }
  globe.add(points(globePoints,.06,'#8fd6b5',.9));
  const core=new THREE.Mesh(new THREE.SphereGeometry(2.19,40,28),new THREE.MeshBasicMaterial({color:'#102d38',transparent:true,opacity:.28,depthWrite:false}));globe.add(core);
  const satellites=[];
  function orbit(rx,ry,rotation,color){
    const vertices=[];
    for(let i=0;i<240;i++){const t=Math.PI*2*i/240;vertices.push(new THREE.Vector3(rx*Math.cos(t),ry*Math.sin(t),0));}
    const group=new THREE.Group();group.rotation.set(...rotation);
    const geometry=new THREE.BufferGeometry().setFromPoints(vertices);
    const line=new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending}));
    group.add(line);
    const sparks=[];
    for(let i=0;i<90;i++){const t=Math.PI*2*i/90;sparks.push(rx*Math.cos(t),ry*Math.sin(t),0);}
    group.add(points(sparks,.035,color,.45));
    const bead=points([rx,0,0],.17,'#eff5f3',1);group.add(bead);
    satellites.push({bead,rx,ry,phase:random()*6});sculpture.add(group);
  }
  orbit(3.3,2.65,[1.1,.1,-.48],'#8fd6b5');
  orbit(2.6,3.05,[.55,.85,.45],'#73b5cb');
  const halo=[];
  for(let i=0;i<340;i++){
    const theta=random()*Math.PI*2, phi=Math.acos(2*random()-1), r=2.5+random()*1.2;
    halo.push(r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
  }
  sculpture.add(points(halo,.055,'#73b5cb',.65));
  sculpture.rotation.set(.04,-.4,-.08);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let visible = true;
  let lost = false;
  let frame = 0;
  let lastTime = 0;
  let phase = 0;
  let pointerX = 0;
  let pointerY = 0;
  const canAnimate = () => !paused && visible && !document.hidden && !lost;
  function render() { if (!lost) renderer.render(scene,camera); }
  function loop(time) {
    frame = 0;
    if (!canAnimate()) {lastTime=0;return;}
    const delta = lastTime ? Math.min((time-lastTime)/1000,.05) : 0;
    lastTime=time;phase+=delta;
    globe.rotation.y += delta*.045;
    starfield.rotation.y = Math.sin(phase*.04)*.025;
    satellites.forEach(({bead,rx,ry,phase:offset})=>{
      const t=phase*.09+offset;
      bead.position.set(rx*Math.cos(t)-rx,ry*Math.sin(t),0);
    });
    sculpture.rotation.y = THREE.MathUtils.damp(sculpture.rotation.y,-.4+pointerX*.13,3,delta);
    sculpture.rotation.x = THREE.MathUtils.damp(sculpture.rotation.x,.04+pointerY*.1,3,delta);
    sculpture.position.y = Math.sin(phase*.45)*.07;
    render();
    frame=requestAnimationFrame(loop);
  }
  function synchronize() {
    cancelAnimationFrame(frame);frame=0;lastTime=0;
    canvas.dataset.animation=canAnimate()?'running':'paused';
    if (canAnimate()) frame=requestAnimationFrame(loop);
    else render();
  }
  function updateButton() {
    motionButton.querySelector('.motion-icon').textContent=paused?'▷':'Ⅱ';
    motionButton.querySelector('.motion-label').textContent=paused?motionButton.dataset.startLabel:motionButton.dataset.pauseLabel;
  }
  function resize() {
    const box=shell.getBoundingClientRect();
    if (!box.width || !box.height) return;
    renderer.setSize(box.width,box.height,false);
    camera.aspect=box.width/box.height;
    const mobile=window.innerWidth<=900;
    camera.position.z=14;
    const viewWidth=2*Math.tan(THREE.MathUtils.degToRad(18))*camera.position.z*camera.aspect;
    sculpture.position.x=mobile?0:viewWidth*.255;
    sculpture.scale.setScalar(mobile?Math.min(1,viewWidth/7.5):Math.min(1,viewWidth/16));
    camera.updateProjectionMatrix();render();
  }
  new ResizeObserver(resize).observe(shell);
  new IntersectionObserver(entries => { visible=entries[0].isIntersecting;synchronize(); },{threshold:0}).observe(shell);
  document.addEventListener('visibilitychange',synchronize);
  document.querySelector('.hero').addEventListener('pointermove', event => {
    if(event.pointerType!=='mouse')return;
    const box=shell.getBoundingClientRect();
    pointerX=THREE.MathUtils.clamp((event.clientX-box.left)/box.width-.5,-.5,.5);
    pointerY=THREE.MathUtils.clamp((event.clientY-box.top)/box.height-.5,-.5,.5);
  },{passive:true});
  motionButton.addEventListener('click',()=>{paused=!paused;updateButton();synchronize();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateButton();synchronize();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;shell.classList.remove('ready');motionButton.hidden=true;synchronize();});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();shell.classList.add('ready');motionButton.hidden=false;synchronize();});
  resize();render();shell.classList.add('ready');motionButton.hidden=false;updateButton();synchronize();
  canvas.dataset.renderer='three-webgl';
}
if (shell && motionButton) {
  createSculpture().catch(()=>{shell.dataset.renderer='fallback';motionButton.hidden=true;});
}
