const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width; 
const H = canvas.height;

const bestEl = document.getElementById('best');
const holeIndexEl = document.getElementById('holeIndex');
const strokesEl = document.getElementById('strokes');
const powerFill = document.getElementById('powerFill');
const confirmBtn = document.getElementById('confirm');
const cancelBtn = document.getElementById('cancel');
const restartBtn = document.getElementById('restart');
const resetBestBtn = document.getElementById('resetBest');

const BALL_RADIUS = 10;
const HOLE_RADIUS = 18;
const MAX_POWER = 22;
const DRAG_MAX = 160;
// Increased friction for more realistic ball slow-down
const FRICTION = 0.985; 
const STOP_SPEED = 0.08;

// Define holes with start, hole target, and obstacles array (rectangles)
// Each obstacle: {x,y,width,height}
const holes = [
  {start:{x:120,y:520}, hole:{x:820,y:120}, obstacles:[
    {x:300,y:400,width:60,height:10},
    {x:400,y:280,width:20,height:120},
    {x:600,y:200,width:10,height:150},
  ]},
  {start:{x:100,y:80}, hole:{x:840,y:520}, obstacles:[
    {x:200,y:200,width:10,height:300},
    {x:500,y:400,width:120,height:15},
  ]},
  {start:{x:80,y:320}, hole:{x:880,y:320}, obstacles:[
    {x:300,y:150,width:20,height:200},
    {x:600,y:450,width:100,height:15},
    {x:720,y:320,width:15,height:120},
  ]},
  {start:{x:160,y:160}, hole:{x:760,y:540}, obstacles:[
    {x:250,y:300,width:10,height:250},
    {x:550,y:250,width:10,height:150},
    {x:650,y:400,width:150,height:10},
  ]},
  {start:{x:200,y:540}, hole:{x:760,y:120}, obstacles:[
    {x:350,y:200,width:10,height:300},
    {x:500,y:120,width:120,height:10},
    {x:650,y:350,width:10,height:250},
  ]},
  {start:{x:140,y:300}, hole:{x:500,y:80}, obstacles:[
    {x:300,y:200,width:200,height:10},
    {x:420,y:100,width:10,height:150},
  ]},
  {start:{x:820,y:520}, hole:{x:120,y:120}, obstacles:[
    {x:500,y:300,width:10,height:200},
    {x:600,y:500,width:150,height:10},
    {x:700,y:250,width:10,height:250},
  ]},
  {start:{x:480,y:560}, hole:{x:480,y:80}, obstacles:[
    {x:400,y:300,width:150,height:10},
    {x:600,y:100,width:10,height:250},
  ]},
  {start:{x:120,y:140}, hole:{x:840,y:400}, obstacles:[
    {x:300,y:220,width:10,height:300},
    {x:500,y:100,width:150,height:10},
    {x:700,y:300,width:10,height:300},
  ]}
];

let holeIndex = 0;
let strokes = 0;
let ball = {x:holes[0].start.x, y:holes[0].start.y, vx:0, vy:0};
let isMoving = false;
let dragging = false;
let dragStart = null;
let dragCurrent = null;
let proposedVelocity = null;

let bestScore = localStorage.getItem('gold-golf-best');
if(bestScore !== null) bestScore = parseInt(bestScore,10);
updateBestUI();

function updateBestUI(){ bestEl.textContent = (bestScore==null||isNaN(bestScore))? '—': bestScore; }
function updateHUD(){ holeIndexEl.textContent = (holeIndex+1) + ' / ' + holes.length; strokesEl.textContent = strokes; }

function toCanvasPos(e){
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX) - rect.left;
  const y = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY) - rect.top;
  return {x,y};
}

canvas.addEventListener('mousedown', (e)=>{
  const p = toCanvasPos(e);
  if(distance(p, ball) < 40 && !isMoving){
    dragging = true; dragStart = {...p}; dragCurrent = {...dragStart};
    proposedVelocity = null; showConfirm(false);
  }
});
window.addEventListener('mousemove', (e)=>{ if(dragging) dragCurrent = toCanvasPos(e); });
window.addEventListener('mouseup', ()=>{ if(dragging){ dragging = false; prepareShot(); }});

canvas.addEventListener('touchstart',(e)=>{
  e.preventDefault();
  const p=toCanvasPos(e);
  if(distance(p, ball)<40 && !isMoving){
    dragging=true; dragStart={...p}; dragCurrent={...dragStart};
    proposedVelocity=null; showConfirm(false);
  }
});
window.addEventListener('touchmove',(e)=>{ if(dragging) dragCurrent=toCanvasPos(e); });
window.addEventListener('touchend',()=>{ if(dragging){ dragging=false; prepareShot(); }});

function prepareShot(){
  const dx = dragStart.x - dragCurrent.x;
  const dy = dragStart.y - dragCurrent.y;
  const dist = Math.sqrt(dx*dx+dy*dy);
  const powerRatio = Math.min(1, dist / DRAG_MAX);
  const power = powerRatio * MAX_POWER;
  if(power > 0.5){
    proposedVelocity = {vx: dx/dist * power, vy: dy/dist * power};
    showConfirm(true);
  } else {
    proposedVelocity = null; showConfirm(false);
  }
}

function showConfirm(show){
  if(show){
    confirmBtn.style.display='inline-block';
    cancelBtn.style.display='inline-block';
    const ratio = Math.min(1, distance(dragStart, dragCurrent)/DRAG_MAX);
    powerFill.style.width = Math.round(ratio*100) + '%';
  } else {
    confirmBtn.style.display='none';
    cancelBtn.style.display='none';
    powerFill.style.width = '0%';
  }
}

confirmBtn.addEventListener('click', ()=>{
  if(proposedVelocity){
    applyShot(proposedVelocity.vx, proposedVelocity.vy);
    proposedVelocity = null; showConfirm(false);
  }
});
cancelBtn.addEventListener('click', ()=>{ proposedVelocity = null; showConfirm(false); });

restartBtn.addEventListener('click', ()=>{ if(confirm('Restart the 9-hole round?')) resetRound(); });
resetBestBtn.addEventListener('click', ()=>{ localStorage.removeItem('gold-golf-best'); bestScore = null; updateBestUI(); alert('Best score reset'); });

function applyShot(vx,vy){ ball.vx = vx; ball.vy = vy; isMoving = true; strokes++; updateHUD(); }

function distance(a,b){const dx=a.x-b.x;const dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);} 

function step(){
  if(isMoving){
    ball.x += ball.vx; ball.y += ball.vy;

    // Collide with obstacles and walls first:
    collideWithObstacles();
    collideWithWalls();

    ball.vx *= FRICTION; ball.vy *= FRICTION;

    const speed = Math.hypot(ball.vx, ball.vy);
    if(speed < STOP_SPEED){
      ball.vx = 0; ball.vy = 0; isMoving = false;
    }

    // Check hole sink:
    const h = holes[holeIndex].hole;
    if(distance(ball, h) <= HOLE_RADIUS){
      isMoving = false; ball.vx = 0; ball.vy = 0;
      setTimeout(()=>{ advanceHole(); }, 600);
    }
  }
  draw();
  requestAnimationFrame(step);
}

// Collisions with rectangular obstacles (axis-aligned)
function collideWithObstacles(){
  const obs = holes[holeIndex].obstacles;
  obs.forEach(rect => {
    // Circle-rectangle collision detection
    const closestX = clamp(ball.x, rect.x, rect.x + rect.width);
    const closestY = clamp(ball.y, rect.y, rect.y + rect.height);
    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distSq = distX*distX + distY*distY;

    if(distSq < BALL_RADIUS*BALL_RADIUS){
      // Simple collision response: reflect velocity depending on collision side
      // Determine penetration depth
      const dist = Math.sqrt(distSq);
      const penetration = BALL_RADIUS - dist;

      // Normal vector
      let nx = 0, ny = 0;
      if(dist === 0){ // avoid divide by zero
        // just push ball up
        ny = -1;
      } else {
        nx = distX / dist;
        ny = distY / dist;
      }
      // Push ball outside the obstacle
      ball.x += nx * penetration;
      ball.y += ny * penetration;

      // Reflect velocity (basic bounce)
      const dot = ball.vx*nx + ball.vy*ny;
      ball.vx = ball.vx - 2*dot*nx;
      ball.vy = ball.vy - 2*dot*ny;

      // Dampen velocity on bounce a bit
      ball.vx *= 0.7;
      ball.vy *= 0.7;
    }
  });
}

// Collisions with canvas edges (walls)
function collideWithWalls(){
  if(ball.x < BALL_RADIUS){
    ball.x = BALL_RADIUS;
    ball.vx = Math.abs(ball.vx)*0.7;
  }
  if(ball.x > W - BALL_RADIUS){
    ball.x = W - BALL_RADIUS;
    ball.vx = -Math.abs(ball.vx)*0.7;
  }
  if(ball.y < BALL_RADIUS){
    ball.y = BALL_RADIUS;
    ball.vy = Math.abs(ball.vy)*0.7;
  }
  if(ball.y > H - BALL_RADIUS){
    ball.y = H - BALL_RADIUS;
    ball.vy = -Math.abs(ball.vy)*0.7;
  }
}

function advanceHole(){
  holeIndex++;
  if(holeIndex >= holes.length){
    const total = strokes;
    if(bestScore == null || total < bestScore){
      bestScore = total;
      localStorage.setItem('gold-golf-best', bestScore);
      updateBestUI();
    }
    setTimeout(()=>{ 
      if(confirm('Round complete! Final score: '+total+' strokes. Start a new round?')) 
        resetRound(); 
    }, 80);
    return;
  }
  const next = holes[holeIndex].start;
  ball.x = next.x; ball.y = next.y; ball.vx = 0; ball.vy = 0; isMoving=false; updateHUD();
}

function resetRound(){
  holeIndex = 0; strokes = 0;
  const s = holes[0].start;
  ball.x = s.x; ball.y = s.y; ball.vx = 0; ball.vy = 0;
  isMoving = false; proposedVelocity = null;
  showConfirm(false); updateHUD();
}

function draw(){
  ctx.clearRect(0,0,W,H);

  // Background green gradient
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1b3b1b'); 
  g.addColorStop(1,'#0b2b0b');
  ctx.fillStyle = g; 
  ctx.fillRect(0,0,W,H);

  // Outline border
  ctx.strokeStyle = 'rgba(212,175,55,0.08)'; 
  ctx.lineWidth = 2; 
  ctx.strokeRect(6,6,W-12,H-12);

  // Draw only current hole's obstacles
  const obs = holes[holeIndex].obstacles;
  obs.forEach(rect => {
    ctx.fillStyle = 'rgba(212,175,55,0.75)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = 'rgba(255,215,0,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  });

  // Draw current hole cup
  const h = holes[holeIndex].hole;
  ctx.beginPath(); 
  ctx.arc(h.x, h.y, HOLE_RADIUS, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(10,10,10,0.95)'; 
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,0.95)'; 
  ctx.lineWidth = 4; 
  ctx.stroke();

  // Draw ball
  ctx.beginPath(); 
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI*2);
  const ballGrad = ctx.createRadialGradient(ball.x-4,ball.y-4,2,ball.x,ball.y,14);
  ballGrad.addColorStop(0,'#fff'); 
  ballGrad.addColorStop(1,'rgba(220,220,220,0.9)');
  ctx.fillStyle = ballGrad; 
  ctx.fill();
  ctx.lineWidth = 2; 
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; 
  ctx.stroke();

  // Draw aiming line and arrow if dragging
  if(dragging){
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const len = Math.min(dist, DRAG_MAX);
    const nx = dx/dist; 
    const ny = dy/dist;
    const ex = ball.x + nx * len;
    const ey = ball.y + ny * len;
    ctx.beginPath(); 
    ctx.moveTo(ball.x, ball.y); 
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(212,175,55,0.95)'; 
    ctx.lineWidth = 3; 
    ctx.stroke();
    drawArrowHead(ex,ey, Math.atan2(ny,nx));
    const ratio = Math.min(1, dist/DRAG_MAX);
    powerFill.style.width = Math.round(ratio*100) + '%';
  }

  // Draw proposed shot arrow
  if(proposedVelocity){
    ctx.beginPath(); 
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x+proposedVelocity.vx*8, ball.y+proposedVelocity.vy*8);
    ctx.strokeStyle = 'rgba(212,175,55,0.7)'; 
    ctx.lineWidth = 2; 
    ctx.stroke();
    drawArrowHead(ball.x+proposedVelocity.vx*8, ball.y+proposedVelocity.vy*8,
                  Math.atan2(proposedVelocity.vy, proposedVelocity.vx));
  }
}

function drawArrowHead(x,y,ang){
  ctx.save(); 
  ctx.translate(x,y); 
  ctx.rotate(ang);
  ctx.beginPath(); 
  ctx.moveTo(0,0); 
  ctx.lineTo(-8,-5); 
  ctx.lineTo(-8,5);
  ctx.closePath(); 
  ctx.fillStyle='rgba(212,175,55,0.95)'; 
  ctx.fill(); 
  ctx.restore();
}

function clamp(x, min, max){ return Math.min(Math.max(x, min), max); }

updateHUD(); 
step();
