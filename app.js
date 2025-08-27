/* app.js
   Full simulation host (replace your existing app.js with this)
   - preserves the original UI hooks and behavior
   - adds: circular motion, collision, electric-field simulations
   - injects options for new sims if not present in the HTML
*/

/* tiny helpers */
function qs(sel){return document.querySelector(sel);}
function qsa(sel){return Array.from(document.querySelectorAll(sel));}
function paramURL(params){ return Object.entries(params).map(([k,v])=> `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'); }

/* ---------- New simulations added below ----------
   Each simulation returns the same small API:
     { start(), pause(), reset(), params }
   so loadSimulation/restartSim can treat them uniformly.
*/

/* ---------- Projectile, Pendulum, Spring (unchanged logic) ---------- */
/* (I left these mostly as in your earlier file; included here for one-file completeness) */

function projectileSim(canvas, params){
  const ctx = canvas.getContext('2d');
  let running = true, t = 0;
  const scale = Math.max(4, Math.min(8, Math.floor(canvas.width/150))); // adapt scale a bit
  function step(dt){
    if(!running) return;
    t += dt;
    draw();
    requestAnimationFrame(()=> step(0.016));
  }
  function draw(){
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    // ground baseline
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, H-30, W, 30);
    // physics
    const g = params.g, u = params.speed, a = params.angle * Math.PI/180;
    const vx = u * Math.cos(a), vy0 = u * Math.sin(a);
    const x = vx * t; // meters
    const y = vy0 * t - 0.5 * g * t * t; // meters (vertical positive up)
    // draw path (sampled)
    ctx.beginPath();
    ctx.strokeStyle = '#DFB6B2';
    ctx.lineWidth = 3;
    for(let s=0;s<=t+s*0;s+=0.02){
      const xs = 60 + (vx * s) * scale;
      const ys = H-30 - (vy0*s - 0.5*g*s*s)*scale;
      if(s===0) ctx.moveTo(xs,ys); else ctx.lineTo(xs,ys);
    }
    ctx.stroke();
    // projectile
    const px = 60 + x*scale;
    const py = H-30 - y*scale;
    ctx.fillStyle = '#854F6C';
    ctx.beginPath(); ctx.arc(px,py,10,0,Math.PI*2); ctx.fill();
    // HUD
    ctx.fillStyle = '#2B124C';
    ctx.font = '12px sans-serif';
    ctx.fillText(`t=${t.toFixed(2)}s`, 12, 18);
    ctx.fillText(`vy=${(vy0 - g*t).toFixed(2)} m/s`, 12, 36);
  }
  function start(){ t=0; running=true; requestAnimationFrame(()=> step(0.016)); }
  function pause(){ running=false; }
  function reset(){ t=0; ctx.clearRect(0,0,canvas.width,canvas.height); draw(); }
  start();
  return { start, pause, reset, params };
}

function pendulumSim(canvas, params){
  const ctx = canvas.getContext('2d');
  let theta = params.theta0, omega=0, t=0, running=true;
  function step(dt){
    if(!running) return;
    const L = params.length, g = params.g;
    const alpha = - (g / L) * theta; // small-angle
    omega += alpha * dt;
    theta += omega * dt;
    t+=dt;
    draw();
    requestAnimationFrame(()=> step(0.016));
  }
  function draw(){
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const originX = W/2, originY = 60;
    const px = originX + Math.sin(theta) * params.length * 80;
    const py = originY + Math.cos(theta) * params.length * 80;
    // string
    ctx.strokeStyle = '#DFB6B2'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = '#522B5B'; ctx.beginPath(); ctx.arc(px,py,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2B124C'; ctx.font = '12px sans-serif';
    ctx.fillText(`θ=${theta.toFixed(2)} rad`, 12, 18);
  }
  requestAnimationFrame(()=> step(0.016));
  return { start(){}, pause(){}, reset(){}, params };
}

function springSim(canvas, params){
  const ctx = canvas.getContext('2d');
  let x = params.x0, v=0, t=0, running=true;
  function step(dt){
    if(!running) return;
    const k = params.k, m = params.m;
    const a = - (k/m) * x;
    v += a * dt;
    x += v * dt;
    t += dt;
    draw();
    requestAnimationFrame(()=> step(0.016));
  }
  function draw(){
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const anchorX = 40, anchorY = H/2;
    const massX = anchorX + 180 + x*40;
    // spring (zig)
    ctx.strokeStyle = '#DFB6B2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(anchorX, anchorY);
    for(let i=0;i<8;i++){
      ctx.lineTo(anchorX + 10 + i*20, anchorY + (i%2?8:-8));
    }
    ctx.lineTo(massX-20, anchorY); ctx.stroke();
    ctx.fillStyle = '#854F6C'; ctx.fillRect(massX-18, anchorY-18, 36, 36);
    ctx.fillStyle = '#2B124C'; ctx.font = '12px sans-serif';
    ctx.fillText(`x=${x.toFixed(2)} m`, 12, 18);
  }
  requestAnimationFrame(()=> step(0.016));
  return { start(){}, pause(){}, reset(){}, params };
}

/* ---------- NEW: Circular Motion ---------- */
/* draw a dot moving on a circle; keeps a trace array for a tail */
function circularSim(canvas, params){
  const ctx = canvas.getContext('2d');
  let running = true, angle = 0;
  const trace = []; const maxTrace = 120;
  function step(){
    if(!running) return;
    angle += params.angularSpeed * 0.016; // rad per frame (~dt=0.016)
    draw();
    requestAnimationFrame(step);
  }
  function draw(){
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const cx = W/2, cy = H/2;
    const r = Math.max(20, Math.min(Math.min(W,H)/2 - 40, params.radius));
    // draw guide circle
    ctx.strokeStyle = '#DFB6B2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
    // compute current point
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    // push to trace
    trace.push({x,y});
    if(trace.length > maxTrace) trace.shift();
    // draw trace
    ctx.strokeStyle = 'rgba(133,79,108,0.85)';
    ctx.beginPath();
    for(let i=0;i<trace.length;i++){
      const p = trace[i];
      if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
    // draw particle
    ctx.fillStyle = '#854F6C';
    ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill();
    // velocity arrow (tangent)
    const vx = -params.angularSpeed * r * Math.sin(angle);
    const vy = params.angularSpeed * r * Math.cos(angle);
    // draw small tangent vector
    const len = Math.min(40, Math.hypot(vx,vy));
    ctx.strokeStyle = '#2B124C'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x + (vx/Math.hypot(vx,vy))*len, y + (vy/Math.hypot(vx,vy))*len); ctx.stroke();
    // HUD
    ctx.fillStyle = '#2B124C'; ctx.font='12px sans-serif';
    ctx.fillText(`ω=${params.angularSpeed.toFixed(2)} rad/s`, 10, 18);
  }
  function start(){ running=true; requestAnimationFrame(step); }
  function pause(){ running=false; }
  function reset(){ angle = 0; trace.length=0; ctx.clearRect(0,0,canvas.width,canvas.height); draw(); }
  start();
  return { start, pause, reset, params };
}

/* ---------- NEW: Collision (two balls) ---------- */
/* 2D elastic collision with optional restitution slider (0..1) */
function collisionSim(canvas, params){
  const ctx = canvas.getContext('2d');
  let running = true;
  // initial in-canvas positions (will be set in reset)
  const ball1 = { x:0, y:0, vx:0, vy:0, r: params.r1 || 20, m: params.m1 || 2, color:'#DFB6B2' };
  const ball2 = { x:0, y:0, vx:0, vy:0, r: params.r2 || 20, m: params.m2 || 1, color:'#854F6C' };
  const pxScale = 20; // scale factor for mapping velocity units to px/s (tweakable)
  function placeInitial(){
    const W = canvas.width, H = canvas.height;
    ball1.x = W*0.25; ball1.y = H/2;
    ball2.x = W*0.75; ball2.y = H/2;
    // convert input velocities (m/s) to px/s for visuals
    ball1.vx = (params.v1||0) * pxScale; ball1.vy = 0;
    ball2.vx = (params.v2||0) * pxScale; ball2.vy = 0;
    ball1.m = params.m1; ball2.m = params.m2;
    ball1.r = params.r1 || 20; ball2.r = params.r2 || 20;
  }
  function step(){
    if(!running) return;
    update(0.016);
    draw();
    requestAnimationFrame(step);
  }
  function update(dt){
    // simple Euler integration
    ball1.x += ball1.vx * dt;
    ball1.y += ball1.vy * dt;
    ball2.x += ball2.vx * dt;
    ball2.y += ball2.vy * dt;
    // wall collisions (bounce)
    const W = canvas.width, H = canvas.height;
    [ball1, ball2].forEach(b=>{
      if(b.x - b.r < 0){ b.x = b.r; b.vx *= -1; }
      if(b.x + b.r > W){ b.x = W - b.r; b.vx *= -1; }
      if(b.y - b.r < 0){ b.y = b.r; b.vy *= -1; }
      if(b.y + b.r > H){ b.y = H - b.r; b.vy *= -1; }
    });
    // detect collision between ball1 and ball2
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const dist = Math.hypot(dx,dy);
    if(dist <= ball1.r + ball2.r){
      // normalize collision normal
      const nx = dx / dist;
      const ny = dy / dist;
      // tangent vector
      const tx = -ny, ty = nx;
      // project velocities onto normal and tangent
      const v1n = ball1.vx * nx + ball1.vy * ny;
      const v1t = ball1.vx * tx + ball1.vy * ty;
      const v2n = ball2.vx * nx + ball2.vy * ny;
      const v2t = ball2.vx * tx + ball2.vy * ty;
      // restitution
      const e = Math.max(0, Math.min(1, params.e!==undefined?params.e:1)); // 1=elastic
      // new normal velocities after 1D collision with restitution
      // compute using conservation of momentum and relative velocity scaled by e:
      // v1n' = (m1*v1n + m2*v2n + m2*e*(v2n - v1n)) / (m1 + m2)
      // v2n' = (m1*v1n + m2*v2n + m1*e*(v1n - v2n)) / (m1 + m2)
      const m1 = ball1.m, m2 = ball2.m;
      const v1nPrime = (m1*v1n + m2*v2n + m2*e*(v2n - v1n)) / (m1 + m2);
      const v2nPrime = (m1*v1n + m2*v2n + m1*e*(v1n - v2n)) / (m1 + m2);
      // convert scalar normal/tangential velocities back to vectors
      ball1.vx = v1nPrime * nx + v1t * tx;
      ball1.vy = v1nPrime * ny + v1t * ty;
      ball2.vx = v2nPrime * nx + v2t * tx;
      ball2.vy = v2nPrime * ny + v2t * ty;
      // simple positional correction to prevent sticking
      const overlap = (ball1.r + ball2.r) - dist;
      const correction = overlap / 2;
      ball1.x -= nx * correction;
      ball1.y -= ny * correction;
      ball2.x += nx * correction;
      ball2.y += ny * correction;
    }
  }
  function draw(){
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    // draw track line
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10,H/2+ball1.r+40); ctx.lineTo(W-10,H/2+ball1.r+40); ctx.stroke();
    // draw balls
    [ball1, ball2].forEach(b=>{
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#2B124C'; ctx.lineWidth = 1; ctx.stroke();
    });
    ctx.fillStyle = '#2B124C'; ctx.font='12px sans-serif';
    ctx.fillText(`v1=${(ball1.vx/pxScale).toFixed(2)} m/s`, 12, 18);
    ctx.fillText(`v2=${(ball2.vx/pxScale).toFixed(2)} m/s`, 12, 36);
  }
  function start(){ running=true; placeInitial(); requestAnimationFrame(step); }
  function pause(){ running=false; }
  function reset(){ running=false; placeInitial(); ctx.clearRect(0,0,canvas.width,canvas.height); draw(); running=true; requestAnimationFrame(step); }
  // initialize
  placeInitial();
  requestAnimationFrame(step);
  return { start, pause, reset, params };
}

/* ---------- NEW: Electric field visualization (vector/quiver) ---------- */
/* Two adjustable charges, show field vectors sampled on a coarse grid */
function electricSim(canvas, params){
  const ctx = canvas.getContext('2d');
  let running = true;
  // charges will be stored as objects {x,y,q}
  let charges = [];
  function placeCharges(){
    const W = canvas.width, H = canvas.height;
    // two charges by default at left and right
    charges = [
      { x: W*0.33, y: H*0.5, q: params.q1 || 3 },
      { x: W*0.67, y: H*0.5, q: params.q2 || -3 }
    ];
  }
  function drawField(){
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    // charges
    charges.forEach(ch=>{
      ctx.beginPath();
      ctx.fillStyle = ch.q >= 0 ? '#854F6C' : '#DFB6B2';
      ctx.arc(ch.x, ch.y, 10, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font='12px sans-serif';
      ctx.fillText((ch.q>0?'+':'') + ch.q.toFixed(1), ch.x-8, ch.y+4);
    });
    
    const step = Math.max(28, Math.floor(Math.min(W,H)/20));
    const scale = 200; 
    for(let gx = step/2; gx < W; gx += step){
      for(let gy = step/2; gy < H; gy += step){
        
        let Ex=0, Ey=0;
        for(const ch of charges){
          const dx = gx - ch.x;
          const dy = gy - ch.y;
          const r2 = dx*dx + dy*dy;
          if(r2 < 16) { Ex = Ex; Ey = Ey; continue; }
          const r3 = Math.pow(r2, 1.5);
         
          Ex += ch.q * dx / r3;
          Ey += ch.q * dy / r3;
        }
        
        const mag = Math.hypot(Ex,Ey);
        if(mag < 1e-6) continue;
        const ux = Ex / mag, uy = Ey / mag;
        const len = Math.min(14, mag * scale);
        const x2 = gx + ux * len;
        const y2 = gy + uy * len;
        
        ctx.strokeStyle = 'rgba(43,18,76,0.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(x2,y2); ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux*4 - uy*3, y2 - uy*4 + ux*3);
        ctx.lineTo(x2 - ux*4 + uy*3, y2 - uy*4 - ux*3);
        ctx.closePath(); ctx.fillStyle = 'rgba(43,18,76,0.85)'; ctx.fill();
      }
    }
    ctx.fillStyle = '#2B124C'; ctx.font='12px sans-serif';
    ctx.fillText(`q1=${charges[0].q.toFixed(1)}    q2=${charges[1].q.toFixed(1)}`, 12, 18);
  }
  function start(){ placeCharges(); running=true; drawField(); timer(); }
  function timer(){ if(!running) return; drawField(); requestAnimationFrame(timer); }
  function pause(){ running=false; }
  function reset(){ placeCharges(); drawField(); }
  start();
  return { start, pause, reset, params };
}


document.addEventListener('DOMContentLoaded', ()=>{

  const simSelect = qs('#simSelect');
  if(simSelect){
    const wants = ['projectile','pendulum','spring','circular','collision','electric'];
   
    const existing = new Set(Array.from(simSelect.options).map(o=>o.value));
    wants.forEach(v=>{
      if(!existing.has(v)){
        const opt = document.createElement('option');
        opt.value = v;
        
        const mapLabel = {
          projectile: 'Projectile motion',
          pendulum: 'Pendulum (small-angle)',
          spring: 'Spring–mass (SHM)',
          circular: 'Circular motion',
          collision: 'Collision (2 balls)',
          electric: 'Electric field (vectors)'
        };
        opt.textContent = mapLabel[v] || v;
        simSelect.appendChild(opt);
      }
    });
  }

  
  const simCanvas = document.getElementById('simCanvas');
  if(simCanvas){
    function resizeCanvas(){
      const wrap = document.getElementById('canvasWrap');
      if(!wrap) return;
      simCanvas.width = Math.max(300, wrap.clientWidth - 24);
      simCanvas.height = Math.max(360, wrap.clientHeight - 24);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    
    const simParamsPreset = {
      projectile: { speed:25, angle:45, g:9.81 },
      pendulum: { length:1.6, theta0:0.5, g:9.81 },
      spring:   { k:50, m:1.5, x0:0.6 },
      circular:{ radius:100, angularSpeed:1.2 },
      collision:{ m1:2, m2:1, v1:3, v2:-1, r1:20, r2:20, e:1 },
      electric:{ q1:3, q2:-3 }
    };

    let activeSimKey = 'projectile';
    let activeSimInstance = null;

    const controlsContainer = document.getElementById('controlsContainer');
    const simTitle = document.getElementById('simTitle');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const graphBtn = document.getElementById('graphBtn');
    const toggleControls = document.getElementById('toggleControls');
    const controlDrawer = document.getElementById('controlDrawer');

    function clearControls(){ controlsContainer.innerHTML = ''; }

    function makeRange(label, min, max, step, val, oninput){
      const wr = document.createElement('div');
      const lab = document.createElement('label'); lab.textContent = label; lab.className='label';
      const rng = document.createElement('input'); rng.type='range'; rng.min=min; rng.max=max; rng.step=step; rng.value=val;
      const out = document.createElement('div'); out.style.fontSize='12px'; out.style.marginTop='6px'; out.textContent = rng.value;
      rng.oninput = (e)=>{ const v=parseFloat(e.target.value); out.textContent = v; oninput(v, rng); };
      wr.appendChild(lab); wr.appendChild(rng); wr.appendChild(out);
      return wr;
    }

    function loadSimulation(key){
      activeSimKey = key;
      
      const mapTitle = {
        projectile:'Projectile motion', pendulum:'Pendulum (small-angle)', spring:'Spring–mass (SHM)',
        circular:'Circular motion', collision:'Collision (2 balls)', electric:'Electric field (vectors)'
      };
      simTitle.textContent = mapTitle[key] || key;
      
      if(activeSimInstance && activeSimInstance.reset) activeSimInstance.reset();
      clearControls();

      const p = Object.assign({}, simParamsPreset[key]);

      
      if(key === 'projectile'){
        controlsContainer.appendChild(makeRange('Speed (m/s)',1,80,1,p.speed,(v)=>{ p.speed=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('Angle (°)',0,85,1,p.angle,(v)=>{ p.angle=v; restartSim(); }));
      } else if(key === 'pendulum'){
        controlsContainer.appendChild(makeRange('Length (m)',0.2,4,0.1,p.length,(v)=>{ p.length=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('Init angle (rad)',-1.2,1.2,0.01,p.theta0,(v)=>{ p.theta0=v; restartSim(); }));
      } else if(key === 'spring'){
        controlsContainer.appendChild(makeRange('k (N/m)',5,200,1,p.k,(v)=>{ p.k=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('Init disp (m)',-2,2,0.01,p.x0,(v)=>{ p.x0=v; restartSim(); }));
      } else if(key === 'circular'){
        controlsContainer.appendChild(makeRange('Radius (px)',20, Math.max(50, Math.floor(simCanvas.width/2)-20),1,p.radius,(v)=>{ p.radius=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('Angular speed (rad/s)',0.2,6,0.01,p.angularSpeed,(v)=>{ p.angularSpeed=v; restartSim(); }));
      } else if(key === 'collision'){
        controlsContainer.appendChild(makeRange('Mass 1 (kg)',0.5,10,0.1,p.m1,(v)=>{ p.m1=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('Mass 2 (kg)',0.5,10,0.1,p.m2,(v)=>{ p.m2=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('v1 (m/s)',-10,10,0.1,p.v1,(v)=>{ p.v1=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('v2 (m/s)',-10,10,0.1,p.v2,(v)=>{ p.v2=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('Restitution (e)',0,1,0.01,p.e,(v)=>{ p.e=v; restartSim(); }));
      } else if(key === 'electric'){
        controlsContainer.appendChild(makeRange('Charge 1 (q1)',-6,6,0.1,p.q1,(v)=>{ p.q1=v; restartSim(); }));
        controlsContainer.appendChild(makeRange('Charge 2 (q2)',-6,6,0.1,p.q2,(v)=>{ p.q2=v; restartSim(); }));
      }

      function restartSim(){
        if(activeSimInstance && activeSimInstance.reset) activeSimInstance.reset();
        
        if(activeSimKey==='projectile') activeSimInstance = projectileSim(simCanvas, p);
        else if(activeSimKey==='pendulum') activeSimInstance = pendulumSim(simCanvas, p);
        else if(activeSimKey==='spring') activeSimInstance = springSim(simCanvas, p);
        else if(activeSimKey==='circular') activeSimInstance = circularSim(simCanvas, p);
        else if(activeSimKey==='collision') activeSimInstance = collisionSim(simCanvas, p);
        else if(activeSimKey==='electric') activeSimInstance = electricSim(simCanvas, p);
      }

      restartSim();
    }

  
    const sel = qs('#simSelect');
    sel.addEventListener('change', ()=> loadSimulation(sel.value));
    
    loadSimulation(sel.value);

    
    pauseBtn.addEventListener('click', ()=>{
      if(!activeSimInstance) return;
      if(pauseBtn.textContent === 'Pause'){
        if(activeSimInstance.pause) activeSimInstance.pause();
        pauseBtn.textContent = 'Resume';
      } else {
        if(activeSimInstance.start) activeSimInstance.start();
        pauseBtn.textContent = 'Pause';
      }
    });
    resetBtn.addEventListener('click', ()=>{
      if(activeSimInstance && activeSimInstance.reset) activeSimInstance.reset();
      
      loadSimulation(sel.value);
      pauseBtn.textContent = 'Pause';
    });

    graphBtn.addEventListener('click', ()=>{
      const params = { sim: activeSimKey };
      
      if(activeSimKey==='projectile'){
        const inputs = controlsContainer.querySelectorAll('input');
        params.speed = inputs[0].value; params.angle = inputs[1].value;
      } else if(activeSimKey==='pendulum'){
        const inputs = controlsContainer.querySelectorAll('input');
        params.length = inputs[0].value; params.theta0 = inputs[1].value;
      } else if(activeSimKey==='spring'){
        const inputs = controlsContainer.querySelectorAll('input');
        params.k = inputs[0].value; params.x0 = inputs[1].value;
      } else if(activeSimKey==='circular'){
        const inputs = controlsContainer.querySelectorAll('input');
        params.radius = inputs[0].value; params.angularSpeed = inputs[1].value;
      } else if(activeSimKey==='collision'){
        const inputs = controlsContainer.querySelectorAll('input');
        params.m1 = inputs[0].value; params.m2 = inputs[1].value; params.v1 = inputs[2].value; params.v2 = inputs[3].value; params.e = inputs[4].value;
      } else if(activeSimKey==='electric'){
        const inputs = controlsContainer.querySelectorAll('input');
        params.q1 = inputs[0].value; params.q2 = inputs[1].value;
      }
      const q = paramURL(params);
      window.location.href = 'graph.html?' + q;
    });

    
    if(toggleControls && controlDrawer){
      toggleControls.addEventListener('click', ()=>{
        if(controlDrawer.style.display === 'none'){ controlDrawer.style.display='block'; toggleControls.textContent='Hide'; }
        else { controlDrawer.style.display='none'; toggleControls.textContent='Show'; }
      });
    }
  } 

  
  const chartEl = document.getElementById('chart');
  if(chartEl && typeof Chart !== 'undefined'){
    const params = Object.fromEntries(new URLSearchParams(location.search));
    const sim = params.sim || 'projectile';
    const ctx = chartEl.getContext('2d');

    if(sim==='projectile'){
      const u = parseFloat(params.speed) || 25;
      const a = (parseFloat(params.angle) || 45) * Math.PI/180;
      const g = 9.81;
      const T = 2*u*Math.sin(a)/g;
      const steps = 60;
      const labels = []; const data = [];
      for(let i=0;i<=steps;i++){
        const t = i*(T/steps);
        labels.push(t.toFixed(2));
        const vy = u*Math.sin(a) - g*t;
        data.push(vy);
      }
      new Chart(ctx,{ type:'line', data:{ labels, datasets:[{label:'vy (m/s)', data, borderColor:'#854F6C', tension:0.2}] }, options:{ responsive:true }});
      const problem = `A projectile launched at <b>${u} m/s</b> at <b>${(a*180/Math.PI).toFixed(0)}°</b>. Find time of flight, range, and max height.`;
      const Tval = (2*u*Math.sin(a)/g).toFixed(2);
      const Rval = (u*u*Math.sin(2*a)/g).toFixed(2);
      const Hval = (u*u*Math.sin(a)*Math.sin(a)/(2*g)).toFixed(2);
      qs('#graphTitle').textContent = 'Projectile: vertical velocity';
      qs('#problemText').innerHTML = problem;
      qs('#answerText').innerHTML = `<b>Answers:</b><br>T=${Tval} s; Range=${Rval} m; Max height=${Hval} m`;
    } else if(sim==='pendulum'){
      const L = parseFloat(params.length) || 1.6;
      const g = 9.81;
      const T = 2*Math.PI*Math.sqrt(L/g);
      const labels = []; const data=[]; const steps=100;
      for(let i=0;i<steps;i++){ const t=i*(T/steps); labels.push(t.toFixed(2)); data.push(Math.sin(2*Math.PI * t / T)); }
      new Chart(ctx,{ type:'line', data:{ labels, datasets:[{label:'θ (a.u.)', data, borderColor:'#522B5B'}] }});
      qs('#problemText').innerHTML = `Pendulum length ${L} m — find period (small-angle).`;
      qs('#answerText').innerHTML = `T = 2π √(L/g) = ${T.toFixed(2)} s`;
      qs('#graphTitle').textContent = 'Pendulum: angular displacement (a.u.)';
    } else if(sim==='spring'){
      const k = parseFloat(params.k) || 50;
      const m = parseFloat(params.m) || 1.5;
      const omega = Math.sqrt(k/m);
      const T = 2*Math.PI/omega;
      const labels=[]; const data=[]; const steps=120;
      for(let i=0;i<steps;i++){ const t=i*0.02; labels.push(t.toFixed(2)); data.push(Math.cos(omega*t)); }
      new Chart(ctx,{ type:'line', data:{ labels, datasets:[{label:'x (a.u.)', data, borderColor:'#854F6C'}] }});
      qs('#problemText').innerHTML = `Mass-spring with k=${k} N/m and m=${m} kg: find ω and f.`;
      qs('#answerText').innerHTML = `ω = √(k/m) = ${omega.toFixed(2)} rad/s; f = ω / (2π) = ${(omega/(2*Math.PI)).toFixed(2)} Hz`;
      qs('#graphTitle').textContent = 'Spring: displacement (a.u.)';
    } else if(sim==='circular'){
      const radius = parseFloat(params.radius) || 100;
      const omega = parseFloat(params.angularSpeed) || 1.2;
      
      const T = 2*Math.PI / omega;
      const steps = 120;
      const labels=[]; const data=[];
      for(let i=0;i<=steps;i++){ const t=i*(T/steps); labels.push(t.toFixed(2)); data.push((radius * Math.cos(omega*t)).toFixed(3)); }
      new Chart(ctx,{ type:'line', data:{ labels, datasets:[{label:'x(t) (px)', data, borderColor:'#522B5B'}] }});
      qs('#problemText').innerHTML = `Uniform circular motion with radius=${radius}px and ω=${omega} rad/s. What is period T?`;
      qs('#answerText').innerHTML = `T = 2π/ω = ${(2*Math.PI/omega).toFixed(3)} s`;
      qs('#graphTitle').textContent = 'Circular motion: x(t)';
    } else if(sim==='collision'){
     
      const m1 = parseFloat(params.m1) || 2, m2 = parseFloat(params.m2) || 1;
      const u1 = parseFloat(params.v1) || 3, u2 = parseFloat(params.v2) || -1;
      const e = parseFloat(params.e) || 1;
      
      const v1p = (m1*u1 + m2*u2 + m2*e*(u2 - u1)) / (m1 + m2);
      const v2p = (m1*u1 + m2*u2 + m1*e*(u1 - u2)) / (m1 + m2);
      const labels = ['before','after']; const data1=[u1, v1p], data2=[u2, v2p];
      new Chart(ctx,{ type:'bar', data:{ labels, datasets:[ { label:'v1 (m/s)', data:data1, backgroundColor:'#854F6C' }, { label:'v2 (m/s)', data:data2, backgroundColor:'#DFB6B2' } ] }});
      qs('#problemText').innerHTML = `Two masses m1=${m1} kg and m2=${m2} kg with initial velocities u1=${u1} m/s and u2=${u2} m/s. Compute final velocities (restitution e=${e}).`;
      qs('#answerText').innerHTML = `v1' = ${v1p.toFixed(3)} m/s; v2' = ${v2p.toFixed(3)} m/s`;
      qs('#graphTitle').textContent = 'Collision: velocities (before/after)';
    } else if(sim==='electric'){
      
      const q1 = parseFloat(params.q1) || 3, q2 = parseFloat(params.q2) || -3;
      const W = chartEl.width, H = chartEl.height;
     
      const N = 120; const labels=[]; const data=[];
      for(let i=0;i<N;i++){
        const x = (i/(N-1))*1.0; 
        const cx1 = 0.33, cx2 = 0.67;
        const dx1 = x - cx1, dx2 = x - cx2;
        const r1 = Math.abs(dx1); const r2 = Math.abs(dx2);
        
        const E1 = (r1>0.0001) ? q1 / (r1*r1) : 0;
        const E2 = (r2>0.0001) ? q2 / (r2*r2) : 0;
        const Emag = Math.abs(E1) + Math.abs(E2);
        labels.push((x).toFixed(2));
        data.push(Emag);
      }
      new Chart(ctx,{ type:'line', data:{ labels, datasets:[{label:'|E| (arb)', data, borderColor:'#522B5B'}] }});
      qs('#problemText').innerHTML = `Two charges q1=${q1}, q2=${q2}. Plot |E| along the line between them (qualitative).`;
      qs('#answerText').innerHTML = `Field is stronger near charges and depends on 1/r²; signs determine direction.`;
      qs('#graphTitle').textContent = 'Electric field magnitude along line';
    }
  } 

}); 

