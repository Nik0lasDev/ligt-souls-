import * as THREE from 'three';
import './style.css';

// A new, asset-free fan-game interpretation of the opening Cemetery of Ash.
const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171b1c);
scene.fog = new THREE.FogExp2(0x171b1c, 0.026);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
$('game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9aa7aa, 0x24201c, 1.15));
const moon = new THREE.DirectionalLight(0xc0c9ca, 2.0);
moon.position.set(-18, 28, 10);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -42; moon.shadow.camera.right = 42;
moon.shadow.camera.top = 42; moon.shadow.camera.bottom = -42;
scene.add(moon);

const mats = {};
function mat(name, color, roughness=0.94, metalness=0) {
  mats[name] = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  return mats[name];
}
mat('ash',0x3c3d3a); mat('stone',0x555653); mat('stoneDark',0x292d2c);
mat('stoneLight',0x777872); mat('moss',0x3c4940); mat('dirt',0x292b28);
mat('iron',0x252a2b,0.48,0.62); mat('rust',0x55463a,0.65,0.42);
mat('cloth',0x252c2c); mat('leather',0x44382e); mat('bone',0x9a9788);
mat('ember',0xff8a37,0.4,0.1); mat('gold',0xbba36e,0.4,0.45);
mat('black',0x111414); mat('water',0x202d30,0.28,0.3);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180,180), mats.ash);
ground.rotation.x=-Math.PI/2; ground.position.y=-0.12; ground.receiveShadow=true; scene.add(ground);

const colliders=[];
function box(x,y,z,sx,sy,sz,material, collide=true, cast=true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), material);
  mesh.position.set(x,y,z); mesh.castShadow=cast; mesh.receiveShadow=true; scene.add(mesh);
  if(collide) colliders.push({x,z,hx:sx/2,hz:sz/2,minY:y-sy/2,maxY:y+sy/2});
  return mesh;
}
function stone(x,y,z,sx,sy,sz,material=mats.stone) {
  const m=box(x,y,z,sx,sy,sz,material,false);
  m.rotation.y=(Math.random()-.5)*.22;
  return m;
}
function cylinder(x,y,z,r1,r2,h,material,segments=7,collide=false) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  if(collide) colliders.push({x,z,hx:Math.max(r1,r2),hz:Math.max(r1,r2),minY:y-h/2,maxY:y+h/2});
  return m;
}
function grave(x,z,scale=1,tilt=0) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.z=tilt;g.rotation.y=(Math.random()-.5)*.4;g.scale.setScalar(scale);scene.add(g);
  const base=new THREE.Mesh(new THREE.BoxGeometry(.52,.15,.28),mats.stoneDark);base.position.y=.1;g.add(base);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(.34,.85,.16),mats.stone);slab.position.y=.52;slab.castShadow=true;slab.receiveShadow=true;g.add(slab);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(.42,.12,.2),mats.stoneLight);cap.position.y=.93;g.add(cap);
  colliders.push({x,z,hx:.32*scale,hz:.22*scale,minY:0,maxY:1.2*scale});
}
function rubble(x,y,z,scale=1) {
  for(let i=0;i<5;i++){
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry((.25+Math.random()*.55)*scale,0),Math.random()>.5?mats.stone:mats.stoneDark);
    m.position.set(x+(Math.random()-.5)*1.8*scale,y+Math.random()*.5,z+(Math.random()-.5)*1.8*scale);
    m.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  }
}
function tree(x,z,h=7) {
  const trunk=cylinder(x,h*.34,z,.18,.3,h*.7,mats.stoneDark,6,false);
  trunk.rotation.z=(Math.random()-.5)*.2;
  for(let i=0;i<5;i++){
    const b=cylinder(x+(Math.random()-.5)*1.4,h*(.55+i*.07),z+(Math.random()-.5)*1.4,.035,.14,h*.32,mats.stoneDark,5,false);
    b.rotation.z=(Math.random()-.5)*1.1;b.rotation.x=(Math.random()-.5)*.8;
  }
  for(let i=0;i<10;i++){
    const shard=new THREE.Mesh(new THREE.ConeGeometry(.12+Math.random()*.12,.8+Math.random()*1.4,5),mats.stoneDark);
    shard.position.set(x+(Math.random()-.5)*2,h*(.55+Math.random()*.42),z+(Math.random()-.5)*2);
    shard.rotation.z=(Math.random()-.5)*1.8;scene.add(shard);
  }
}
// Winding, broken path through the ash cemetery.
for(let z=-48;z<24;z+=2.3){
  const x=Math.sin(z*.12)*2.1;
  const slab=box(x+(Math.random()-.5)*.65,-.01,z,1.9+Math.random()*1.3,.18,1.7,mats.dirt,false,false);
  slab.rotation.y=(Math.random()-.5)*.12;
}
for(let i=0;i<115;i++){
  const z=-47+Math.random()*72;
  const x=(Math.random()-.5)*48;
  if(Math.abs(x-Math.sin(z*.12)*2)<3.5) continue;
  if(Math.abs(z+11)<5&&Math.abs(x)<8) continue;
  if(Math.random()<.68) grave(x,z,.65+Math.random()*.8,(Math.random()-.5)*.18);
  else rubble(x,-.05,z,.7+Math.random());
}
for(let i=0;i<38;i++){
  const z=-43+Math.random()*65,x=(Math.random()>.5?1:-1)*(15+Math.random()*24);
  tree(x,z,5+Math.random()*8);
}
// Distant ruined walls and broken gothic arches frame the route.
for(let side of [-1,1]){
  for(let i=0;i<12;i++){
    const z=-42+i*5.8,x=side*(17+Math.random()*3),h=2+Math.random()*4;
    stone(x,h/2,z,1.3,h,2.2,i%3?mats.stoneDark:mats.stone);
    if(i%3===0) rubble(x,h,z,.8);
  }
}
function arch(x,z,scale=1) {
  const w=5.5*scale,h=6.5*scale;
  box(x-w/2+.35*scale,h/2,z,.7*scale,h,1.1*scale,mats.stoneDark,true);
  box(x+w/2-.35*scale,h/2,z,.7*scale,h,1.1*scale,mats.stoneDark,true);
  box(x,h-.2*scale,z,w,.65*scale,1.3*scale,mats.stone,true);
  for(let s of [-1,1]) for(let i=0;i<3;i++) stone(x+s*w/2,h+(.5+i*.5)*scale,z,1.1*scale,.4*scale,1.2*scale,mats.stoneDark);
}
arch(0,-28,1.15);
for(let i=0;i<18;i++) rubble((Math.random()-.5)*12,Math.random()*.6,-29+Math.random()*5,1.1);
// Chapel ruin visible beyond the boss arena.
for(let side of [-1,1]){
  box(side*7,2.3,-49,1.1,4.6,1.1,mats.stoneDark,true);
  box(side*7,4.8,-49,1.7,.4,1.7,mats.stone,true);
  for(let i=0;i<3;i++) box(side*(7+i*1.4),1.5,-53,1.1,3,1,mats.stoneDark,true);
}
box(0,4.2,-53,15,.7,1.2,mats.stoneDark,true);
for(let x=-6;x<=6;x+=2.4) stone(x,5.5,-53,1.1,2,.9,mats.stoneDark);
for(let i=0;i<26;i++) rubble((Math.random()-.5)*18,.1,-51+Math.random()*7,.8);
for(let i=0;i<26;i++){
  const x=(Math.random()-.5)*15,z=-39-Math.random()*12;
  const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.08+Math.random()*.12,0),mats.bone);
  m.position.set(x,.15+Math.random()*.6,z);scene.add(m);
}

// Bonfire: the first safe point and the visual anchor of the opening area.
const bonfire=new THREE.Group();bonfire.position.set(-3,0,5);scene.add(bonfire);
cylinder(-3,.18,5,.7,.85,.3,mats.stoneDark,8,false);
for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7;
  const log=box(-3+Math.cos(a)*.28,.43,5+Math.sin(a)*.28,.12,.12,.85,mats.rust,false);
  log.rotation.y=-a;log.rotation.z=.2;
}
const sword=cylinder(-3,.95,5,.035,.055,1.15,mats.iron,6,false);sword.rotation.z=.2;
const blade=box(-3,.97,5,.055,.8,.08,mats.stoneLight,false);blade.rotation.z=.2;
const flameMat=new THREE.MeshBasicMaterial({color:0xff8a35});
const flame=new THREE.Mesh(new THREE.ConeGeometry(.24,.9,7),flameMat);flame.position.set(-3,.9,5);bonfire.add(flame);
const fireLight=new THREE.PointLight(0xff7830,4.5,13,2);fireLight.position.set(-3,1.1,5);scene.add(fireLight);
const emberParticles=[];
for(let i=0;i<28;i++){
 const p=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.025,5,5),new THREE.MeshBasicMaterial({color:i%3?0xff9b43:0xd9c6a1}));
 p.position.set(-3+(Math.random()-.5)*.8,.5+Math.random()*2,5+(Math.random()-.5)*.8);scene.add(p);
 emberParticles.push({mesh:p,base:p.position.clone(),speed:.35+Math.random()*.7});
}

// Player: low-poly, hooded ash wanderer, third-person camera.
const player=new THREE.Group();scene.add(player);
const playerBody=new THREE.Group();player.add(playerBody);
function part(parent,geo,material,x,y,z,sx=1,sy=1,sz=1){
 const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
part(playerBody,new THREE.CylinderGeometry(.24,.34,.9,7),mats.cloth,0,1.05,0);
part(playerBody,new THREE.SphereGeometry(.25,7,6),mats.iron,0,1.72,0,1,1.2,1);
part(playerBody,new THREE.ConeGeometry(.27,.4,7),mats.cloth,0,1.95,-.02);
part(playerBody,new THREE.BoxGeometry(.16,.62,.18),mats.leather,-.35,1.12,0);
part(playerBody,new THREE.BoxGeometry(.16,.62,.18),mats.leather,.35,1.12,0);
const swordArm=new THREE.Group();swordArm.position.set(.36,1.35,-.02);playerBody.add(swordArm);
part(swordArm,new THREE.BoxGeometry(.15,.48,.16),mats.iron,0,-.15,0);
const heldBlade=part(swordArm,new THREE.BoxGeometry(.075,.85,.07),mats.stoneLight,.05,-.72,-.02);
heldBlade.rotation.z=-.16;
part(swordArm,new THREE.BoxGeometry(.3,.08,.12),mats.gold,.04,-.38,-.02);
const legs=[];
for(const x of [-.15,.15]) legs.push(part(playerBody,new THREE.BoxGeometry(.17,.62,.2),mats.cloth,x,.38,0));
const playerRadius=.42;
player.position.set(0,0,10);
let yaw=0, pitch=-.12, cameraDistance=5.7, cameraHeight=2.55;
let started=false, paused=false, dead=false, locked=false, bonfireLit=false;
const keys={};
let health=100, stamina=100, souls=0, attackTimer=0,dodgeTimer=0, invuln=0, enemyAttack=0;
const enemy={group:new THREE.Group(),hp:100,maxHp:100,alive:true,state:'idle',timer:0,attackCooldown:0,home:new THREE.Vector3(0,0,-35)};
scene.add(enemy.group);
function buildBoss(){
 const g=enemy.group;g.position.copy(enemy.home);
 part(g,new THREE.CylinderGeometry(.38,.55,1.35,8),mats.iron,0,1.35,0);
 part(g,new THREE.SphereGeometry(.42,8,7),mats.stoneDark,0,2.25,0,1,1.15,1);
 part(g,new THREE.ConeGeometry(.42,.75,7),mats.iron,0,2.7,0);
 part(g,new THREE.BoxGeometry(1.25,.28,.5),mats.iron,0,1.85,0);
 for(const x of [-.48,.48]){
  part(g,new THREE.BoxGeometry(.24,.9,.28),mats.iron,x,1.35,0);
  part(g,new THREE.BoxGeometry(.22,.85,.25),mats.rust,x*.65,.5,0);
  part(g,new THREE.BoxGeometry(.32,.2,.5),mats.iron,x*.65,.12,-.08);
 }
 const spear=part(g,new THREE.CylinderGeometry(.055,.055,3.3,6),mats.rust,.72,1.5,-.2);
 spear.rotation.z=-.22;
 const tip=part(g,new THREE.ConeGeometry(.13,.48,6),mats.iron,.35,3.2,-.2);tip.rotation.z=-.22;
 for(let i=0;i<5;i++) part(g,new THREE.ConeGeometry(.16,.5,5),mats.stoneDark,(Math.random()-.5)*.5,2.2+Math.random()*.5,-.35);
}
buildBoss();
const undeads=[];
function makeUndead(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 part(g,new THREE.CylinderGeometry(.2,.28,.8,6),mats.cloth,0,.85,0);
 part(g,new THREE.SphereGeometry(.2,6,5),mats.bone,0,1.4,0);
 part(g,new THREE.BoxGeometry(.12,.5,.12),mats.iron,.26,.9,0);
 const blade=part(g,new THREE.BoxGeometry(.06,.7,.06),mats.stoneLight,.32,.45,0);blade.rotation.z=-.25;
 return {group:g,hp:35,alive:true,cooldown:0,home:new THREE.Vector3(x,0,z),alert:false};
}
undeads.push(makeUndead(-5, -9),makeUndead(6,-20),makeUndead(-7,-31));

const keysHeld=new Set();
function hitTest(x,z){
 for(const c of colliders){
  if(Math.abs(x-c.x)<c.hx+playerRadius && Math.abs(z-c.z)<c.hz+playerRadius) return true;
 }
 return false;
}
function moveWithCollision(obj,dx,dz){
 const nx=obj.position.x+dx,nz=obj.position.z+dz;
 if(!hitTest(nx,obj.position.z)) obj.position.x=nx;
 if(!hitTest(obj.position.x,nz)) obj.position.z=nz;
}
function updateCamera(dt){
 const target=new THREE.Vector3(player.position.x,player.position.y+1.45,player.position.z);
 if(locked&&enemy.alive){
   const d=new THREE.Vector3(enemy.group.position.x-player.position.x,0,enemy.group.position.z-player.position.z);
   yaw=Math.atan2(-d.x,-d.z);
 }
 const cp=Math.cos(pitch),sp=Math.sin(pitch);
 const offset=new THREE.Vector3(Math.sin(yaw)*cameraDistance*cp,cameraHeight-sp*cameraDistance,Math.cos(yaw)*cameraDistance*cp);
 const desired=target.clone().add(offset);
 camera.position.lerp(desired,1-Math.exp(-dt*10));
 camera.lookAt(target);
}
function showToast(text){
 const el=$('toast');el.textContent=text;el.classList.add('visible');
 clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('visible'),2300);
}
function updateHud(){
 $('health-fill').style.width=Math.max(0,health)+'%';
 $('stamina-fill').style.width=Math.max(0,stamina)+'%';
 $('boss-health-fill').style.width=(enemy.hp/enemy.maxHp*100)+'%';
 $('boss-ui').classList.toggle('hidden',!enemy.alive||!started);
 $('souls').textContent=String(souls).padStart(4,'0');
 $('lock-label').classList.toggle('on',locked);
 $('bonfire-prompt').classList.toggle('visible',player.position.distanceTo(bonfire.position)<3.1&&started&&!paused);
}
function damagePlayer(amount){
 if(invuln>0||dead)return;
 health=Math.max(0,health-amount);invuln=.85;
 if(health<=0){dead=true;paused=true;$('death-screen').classList.remove('hidden');document.exitPointerLock?.();}
}
function attack(){
 if(!started||paused||dead||attackTimer>0||stamina<15)return;
 attackTimer=.55;stamina-=15;
 swordArm.rotation.x=-1.8;
 let target=null,dist=4.2;
 const candidates=[...(enemy.alive?[enemy]:[]),...undeads.filter(e=>e.alive)];
 for(const e of candidates){
  const d=player.position.distanceTo(e.group.position);
  if(d<dist){const dir=new THREE.Vector3(e.group.position.x-player.position.x,0,e.group.position.z-player.position.z).normalize();
   const facing=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
   if(dir.dot(facing)>.1){target=e;dist=d;}
  }
 }
 if(target){
  target.hp-=target===enemy?23:28;
  if(target.hp<=0){target.alive=false;target.group.visible=false;souls+=target===enemy?3000:150;showToast(target===enemy?'GUARDIÃO DERROTADO · +3000 ALMAS':'INIMIGO DERROTADO · +150 ALMAS');}
 }
}
function dodge(){
 if(!started||paused||dead||dodgeTimer>0||stamina<24)return;
 dodgeTimer=.42;invuln=.5;stamina-=24;
 const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
 let dx=0,dz=0;
 if(keys.KeyS){dx=-forward.x;dz=-forward.z;}else{dx=forward.x;dz=forward.z;}
 if(keys.KeyA){dx=-Math.cos(yaw);dz=Math.sin(yaw);}
 if(keys.KeyD){dx=Math.cos(yaw);dz=-Math.sin(yaw);}
 moveWithCollision(player,dx*2.1,dz*2.1);
}
function enemyAI(e,dt,isBoss=false){
 if(!e.alive)return;
 e.cooldown=Math.max(0,e.cooldown-dt);
 const d=e.group.position.distanceTo(player.position);
 const alertRange=isBoss?22:9;
 if(d<alertRange)e.alert=true;
 if(!e.alert){e.group.rotation.y=Math.sin(performance.now()*.0005)*.15;return;}
 if(d>(isBoss?2.8:1.8)){
  const dir=player.position.clone().sub(e.group.position);dir.y=0;dir.normalize();
  const speed=isBoss?1.65:1.05;
  e.group.position.addScaledVector(dir,speed*dt);
  e.group.rotation.y=Math.atan2(dir.x,dir.z);
 }else if(e.cooldown<=0){
  e.cooldown=isBoss?1.75:1.45;
  if(dodgeTimer<=0)damagePlayer(isBoss?24:12);
  showToast(isBoss?'O GUARDIÃO GOLPEIA':'VOCÊ FOI ATINGIDO');
 }
}
function resetGame(){
 health=100;stamina=100;souls=0;dead=false;paused=false;enemy.hp=enemy.maxHp;enemy.alive=true;enemy.group.visible=true;enemy.group.position.copy(enemy.home);enemy.state='idle';enemy.alert=false;enemy.cooldown=0;
 undeads.forEach(e=>{e.hp=35;e.alive=true;e.alert=false;e.group.visible=true;e.group.position.copy(e.home);e.cooldown=0;});
 player.position.set(0,0,10);yaw=0;pitch=-.12;locked=false;
 $('death-screen').classList.add('hidden');$('pause-menu').classList.add('hidden');$('intro').classList.add('hidden');$('hud').classList.remove('hidden');
 started=true;requestPointerLock();showToast('CEMITÉRIO DAS CINZAS · PRIMEIRO FOGO');
}
function requestPointerLock(){renderer.domElement.requestPointerLock?.();}
$('start-button').addEventListener('click',resetGame);
$('resume-button').addEventListener('click',()=>{paused=false;$('pause-menu').classList.add('hidden');requestPointerLock();});
$('restart-button').addEventListener('click',resetGame);
document.addEventListener('pointerlockchange',()=>{
 if(!document.pointerLockElement&&started&&!paused&&!dead){paused=true;$('pause-menu').classList.remove('hidden');}
});
document.addEventListener('mousemove',(e)=>{
 if(!started||paused||!document.pointerLockElement)return;
 yaw-=e.movementX*.0024;pitch=Math.max(-.62,Math.min(.28,pitch-e.movementY*.0018));
});
document.addEventListener('keydown',(e)=>{
 keys[e.code]=true;
 if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'&&started&&!dead){paused=!paused;$('pause-menu').classList.toggle('hidden',!paused);if(!paused)requestPointerLock();}
 if(e.code==='Tab'&&started){e.preventDefault();locked=!locked;showToast(locked?'ALVO FIXADO':'ALVO LIBERADO');}
 if(e.code==='KeyE'&&started&&!paused){
  if(player.position.distanceTo(bonfire.position)<3.1){health=100;stamina=100;bonfireLit=true;fireLight.intensity=6;showToast('DESCANSOU NA FOGUEIRA');}
  else showToast('NADA PARA INTERAGIR');
 }
 if(e.code==='KeyF')attack();
 if(e.code==='Space'&&started){dodge();}
});
document.addEventListener('keyup',(e)=>{keys[e.code]=false;});
renderer.domElement.addEventListener('mousedown',(e)=>{if(e.button===0){if(!started) return;if(!document.pointerLockElement){requestPointerLock();return;}attack();}});
let touchStart=null;
renderer.domElement.addEventListener('touchstart',e=>{if(e.touches.length){touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};}},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{
 if(!touchStart||!e.touches.length||!started||paused)return;
 const t=e.touches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;
 yaw-=dx*.004;pitch=Math.max(-.62,Math.min(.28,pitch-dy*.003));touchStart={x:t.clientX,y:t.clientY};
},{passive:true});
$('touch-attack').addEventListener('click',attack);
$('touch-dodge').addEventListener('click',dodge);
$('touch-lock').addEventListener('click',()=>locked=!locked);
$('touch-move').addEventListener('touchstart',e=>{e.preventDefault();keys.KeyW=true;},{passive:false});
$('touch-move').addEventListener('touchend',()=>keys.KeyW=false);

const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.04),time=performance.now()*.001;
 flame.scale.set(1+.12*Math.sin(time*13),1+.2*Math.sin(time*17),1+.1*Math.cos(time*11));
 fireLight.intensity=(bonfireLit?5.5:3.6)+Math.sin(time*12)*.5;
 emberParticles.forEach(p=>{p.mesh.position.y=p.base.y+(time*p.speed%1.8);p.mesh.position.x=p.base.x+Math.sin(time*2+p.speed)*.15;});
 if(started&&!paused&&!dead){
  invuln=Math.max(0,invuln-dt);attackTimer=Math.max(0,attackTimer-dt);dodgeTimer=Math.max(0,dodgeTimer-dt);
  if(attackTimer===0)swordArm.rotation.x=THREE.MathUtils.damp(swordArm.rotation.x,0,14,dt);
  const moving=keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown;
  let dx=0,dz=0;
  const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  if(keys.KeyW||keys.ArrowUp){dx+=f.x;dz+=f.z;}
  if(keys.KeyS||keys.ArrowDown){dx-=f.x;dz-=f.z;}
  if(keys.KeyA||keys.ArrowLeft){dx-=r.x;dz-=r.z;}
  if(keys.KeyD||keys.ArrowRight){dx+=r.x;dz+=r.z;}
  const len=Math.hypot(dx,dz);
  if(len){const speed=keys.ShiftLeft||keys.ShiftRight?7.2:4.2;moveWithCollision(player,dx/len*speed*dt,dz/len*speed*dt);playerBody.position.y=Math.abs(Math.sin(time*11))*0.045;legs[0].rotation.x=Math.sin(time*11)*.5;legs[1].rotation.x=-Math.sin(time*11)*.5;if(speed>5&&stamina>0)stamina=Math.max(0,stamina-22*dt);}
  else {playerBody.position.y=THREE.MathUtils.damp(playerBody.position.y,0,10,dt);legs.forEach(l=>l.rotation.x=THREE.MathUtils.damp(l.rotation.x,0,10,dt));}
  stamina=Math.min(100,stamina+(moving?5:17)*dt);
  enemyAI(enemy,dt,true);undeads.forEach(e=>enemyAI(e,dt,false));
  updateCamera(dt);updateHud();
  $('coordinates').textContent='CEMITÉRIO DAS CINZAS';
  $('movement-label').textContent=moving?'MOVENDO-SE':'EM GUARDA';
  if(player.position.z<-42)$('area-name').textContent='SANTUÁRIO EM RUÍNAS';
  else if(player.position.z<-22)$('area-name').textContent='PORTÃO DO CEMITÉRIO';
  else $('area-name').textContent='CEMITÉRIO DAS CINZAS';
 }else if(!started){
  camera.position.set(Math.sin(time*.08)*18,8,17);camera.lookAt(0,1,-25);
 }
 renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
