// Deterministic simulation checks without browser/network dependencies.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function sandbox(width=1000){const nodes={},storage={};const gradient={addColorStop(){}};const context=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});function node(id){return nodes[id]??={value:0,hidden:false,disabled:false,textContent:'',innerHTML:'',setAttribute(){},getBoundingClientRect:()=>({width:width===640?400:1000,height:392}),getContext:()=>context,addEventListener(){}}}const box={document:{getElementById:node,createElement:()=>node('temp'),addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},Event:class{},CustomEvent:class{},devicePixelRatio:1,ResizeObserver:class{observe(){}},Image:class{decode(){return new Promise(()=>{})}},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},requestAnimationFrame(){},Math:Object.create(Math),console};box.Math.random=()=>.5;vm.createContext(box);vm.runInContext(fs.readFileSync('dist/chacha.js','utf8')+'\nthis.api={app,update,start,jump,pause,preview,legPose,gaitBody,groundContact,render,frame,safeGap,canSpawnObstacle,spawnObstacle,drawObstacle,images};',box);return box.api}
for(const hz of [30,60,120,144]){const a=sandbox();a.start();a.app.spawn=1000;a.frame(100);for(let i=1;i<=hz*2;i++)a.frame(100+i*1000/hz);a.render();assert(a.app.distance>49&&a.app.distance<51);console.log(hz+'Hz distance '+a.app.distance.toFixed(4))}
const a=sandbox();a.start();a.app.spawn=1000;a.jump();const first=a.app.vy;a.jump();assert.equal(a.app.vy,first,'no double jump');let apex=0;for(let i=0;i<90;i++){a.update(1/120);apex=Math.max(apex,a.app.jumpY)}assert(apex>110&&apex<125,'jump height');assert.equal(a.app.jumpY,0,'landed');a.pause();const phase=a.app.phase,distance=a.app.distance;a.update(1);assert.equal(a.app.phase,phase);assert.equal(a.app.distance,distance);a.pause();a.app.obstacles=[{x:100,w:38,h:46,name:'radish'}];a.update(1/120);assert.equal(a.app.mode,'over');a.start();assert.equal(a.app.obstacles.length,0);assert.equal(a.app.mode,'play');a.preview();a.app.frozen=true;const before=a.app.phase;a.update(1);assert.equal(a.app.phase,before);
for(let p=0;p<1;p+=.001){const l=a.legPose(p,-30,3,0,false,false);assert(l.paw.every(Number.isFinite)&&l.knee.every(Number.isFinite));if(l.stance)assert.equal(l.paw[1],0,'stance paw on track')}
console.log('PASS: jump/landing, pause, collision/restart, scrub freeze, 1000 gait positions');


let flight=0;
for(let i=0;i<1000;i++){
 const phase=i/1000,bob=a.gaitBody(phase).bob;
 const legs=[];
 for(const front of [false,true])for(const far of [false,true]){
  const l=a.legPose(phase,front?17:-31,bob,0,front,far);legs.push(l);
  const target=l.hock||[l.paw[0],l.paw[1]-2],length=front?19:17;
  assert(Math.abs(Math.hypot(l.knee[0]-l.hip[0],l.knee[1]-l.hip[1])-length)<1e-8);
  assert(Math.abs(Math.hypot(l.knee[0]-target[0],l.knee[1]-target[1])-length)<1e-8,'no overextended lower bone');
  assert(l.paw[1]<=0,'no foot below track');
  if(l.stance)assert.equal(l.paw[1],0);
 }
 if(legs.every(l=>!l.stance)){flight++;assert(legs.every(l=>l.paw[1]<0||Math.abs(l.p-.28)<1e-8),'all paws above track during flight')}
 assert.equal(a.groundContact(phase),legs.some(l=>l.stance));
}
assert(flight>300&&flight<400,'visible suspension during gallop');
for(const front of [false,true])for(const far of [false,true])for(const phase of [0,.28,.4,.68,1]){
 const before=a.legPose((phase-1e-7+1)%1,17,a.gaitBody((phase-1e-7+1)%1).bob,0,front,far);
 const after=a.legPose((phase+1e-7)%1,17,a.gaitBody((phase+1e-7)%1).bob,0,front,far);
 assert(Math.hypot(before.paw[0]-after.paw[0],before.paw[1]-after.paw[1])<.001,'continuous foot trajectory');
}
console.log('PASS: 4,000 joint poses, continuous feet, '+flight/10+'% airborne gallop');

// Exercise the actual spawn gate at both viewport widths and extreme speeds.
for(const width of [640,1000])for(const speed of [311.04,600,900]){
 const a=sandbox(width);a.start();a.app.speed=speed;
 for(const previous of [{w:38,h:46},{w:44,h:42},{w:100,h:85}]){
  const next={x:width+40,w:44,h:42,name:'cabbage'};
  const gap=a.safeGap(previous,next);
  a.app.obstacles=[{...previous,x:next.x-previous.w-gap+1}];
  assert(!a.canSpawnObstacle(next),'reject even one pixel inside safe spacing');
  assert(!a.spawnObstacle(),'live spawn must respect existing obstacle');
  a.app.obstacles[0].x-=2;
  assert(a.canSpawnObstacle(next),'allow fully recovered encounter');
  assert(gap/900>2*750/2340+.32,'full flight plus reaction time');
 }
 a.app.obstacles=[];
 assert(!a.canSpawnObstacle({x:1040,w:400,h:90}),'reject unjumpable width');
 assert(!a.canSpawnObstacle({x:1040,w:40,h:160}),'reject unjumpable height');
 // Simulate each supported obstacle through a complete collision window.
 for(const [w,h] of [[38,46],[44,42]]){
  a.start();a.app.speed=speed;a.app.distance=(speed-311.04)*400/21;a.app.spawn=1000;
  a.app.obstacles=[{x:120+speed*.16,w,h,name:'radish'}];a.jump();
  for(let i=0;i<120;i++)a.update(1/120);
  assert.equal(a.app.mode,'play','supported obstacle clears at '+speed);
 }
 a.images.radish={};a.app.obstacles=[{x:400,w:38,h:46,name:'radish'}];a.render();
 a.drawObstacle({x:500,w:44,h:42,name:'missing'});
}
console.log('PASS: size-aware spacing, large-obstacle recovery, impossible geometry rejection, jump clearance and both obstacle render paths');
