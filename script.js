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
    dragging = true; dragStart
