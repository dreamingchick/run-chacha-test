// Deterministic simulation checks without browser/network dependencies.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
function sandbox(width=1000){const nodes={},storage={};const gradient={addColorStop(){}};const context=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});function node(id){return nodes[id]??={value:0,hidden:false,disabled:false,textContent:'',innerHTML:'',setAttribute(){},getBoundingClientRect:()=>({width:width===640?400:1000,height:392}),getContext:()=>context,addEventListener(){}}}const box={document:{getElementById:node,createElement:()=>node('temp'),addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},Event:class{},CustomEvent:class{},devicePixelRatio:1,ResizeObserver:class{observe(){}},Image:class{decode(){return new Promise(()=>{})}},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},requestAnimationFrame(){},Math:Object.create(Math),console};box.Math.random=()=>.5;vm.createContext(box);vm.runInContext(fs.readFileSync('dist/chacha.js','utf8')+'\nthis.api={app,update,start,jump,pause,preview,legPose,gaitBody,groundContact,render,frame,makeObstacle,actorBox,obstacleBox,sweptCollision,testConfig,START_SPEED,MAX_SPEED,recoveryTime,setWorld:(w,h)=>{W=w;H=h;ground=h*.78},setRandom:f=>Math.random=f};',box);return box.api}
const DT=1/120;
function setup(multiplier=1){const a=sandbox();a.testConfig.speed=multiplier;a.start();a.app.spawn=1e9;return a}
function step(a,seconds){for(let i=0;i<Math.ceil(seconds/DT);i++)a.update(DT)}
const a=setup();assert(Math.abs(a.START_SPEED-466.56)<1e-9);assert.equal(a.MAX_SPEED,a.START_SPEED*10);
a.jump();assert.equal(a.app.jumpsUsed,1);step(a,.1);a.jump();assert.equal(a.app.jumpsUsed,2);const vy=a.app.vy;a.jump();assert.equal(a.app.vy,vy);step(a,2);assert.equal(a.app.jumpY,0);assert.equal(a.app.jumpsUsed,0);a.jump();assert.equal(a.app.jumpsUsed,1);
const b=setup();b.jump();let single=0;for(let i=0;i<160;i++){b.update(DT);single=Math.max(single,b.app.jumpY)}
const c=setup();c.jump();let double=0;for(let i=0;i<200;i++){if(i===36)c.jump();c.update(DT);double=Math.max(double,c.app.jumpY)}
assert(single>115&&single<122);assert(double>250&&double<270);
console.log(`PASS: two jumps only; landing resets jumps; single apex ${single.toFixed(1)}, double apex ${double.toFixed(1)}`);
function encounter(kind,multi,second,width=1000){const x=setup(multi);x.setWorld(width,480);const actor=x.actorBox(),o=x.makeObstacle(kind,actor.right+x.app.speed*.42-5);x.app.obstacles=[o];x.jump();for(let i=0;i<200&&x.app.mode!=='over';i++){if(second&&i===36)x.jump();x.update(DT)}return x}
for(const w of [640,1000])for(const m of [1,2,5,10])for(const kind of ['giant-radish','giant-cabbage']){
 const singleRun=encounter(kind,m,false,w);assert.equal(singleRun.app.mode,'over',kind+' blocks single jump');
 const doubleRun=encounter(kind,m,true,w);assert.equal(doubleRun.app.mode,'play',`${kind} clearable at ${m}x width ${w}`);
}
assert(single+9<176-6,'no single-jump timing can clear the giant top');
console.log('PASS: both giant vegetables require double jump and are clearable at 1/2/5/10x, mobile and desktop');
for(const m of [1,10]){const x=setup(m);const r=x.actorBox();x.app.obstacles=[x.makeObstacle('crow',r.right+x.app.speed*.42-5)];step(x,1.2);assert.equal(x.app.mode,'play','ground avoids crow');const y=encounter('crow',m,false);assert.equal(y.app.mode,'over','jump into crow collides')}
const s=setup();assert(s.sweptCollision({left:0,right:20,top:0,bottom:20},{left:0,right:20,top:0,bottom:20},{left:200,right:220,top:0,bottom:20},{left:-200,right:-180,top:0,bottom:20}),'detect crossed obstacle');
s.pause();s.jump();assert.equal(s.app.jumpsUsed,0);const d=s.app.distance;step(s,1);assert.equal(s.app.distance,d);s.pause();s.app.mode='over';s.jump();assert.equal(s.app.jumpsUsed,0);
console.log('PASS: crow ground clearance/air collision, swept high-speed collision, pause and game-over input');
let expected;
for(const hz of [30,60,120,144]){const x=setup();x.frame(100);for(let i=1;i<=hz*2;i++)x.frame(100+i*1000/hz);expected??=x.app.distance;assert(Math.abs(x.app.distance-expected)<1e-7);x.render()}
const cap=setup();step(cap,600);assert.equal(cap.app.speed,cap.MAX_SPEED);cap.update(DT);assert.equal(cap.app.speed,cap.MAX_SPEED);
console.log('PASS: frame-rate independent distance and 10x speed cap');
const r=setup();let seed=12345;r.setRandom(()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296});let crow=0,giant=0;for(let i=0;i<10000;i++){const o=r.makeObstacle();if(o.name==='crow')crow++;else if(o.giant)giant++}
assert(crow>1800&&crow<2200);assert(giant/(10000-crow)>.22&&giant/(10000-crow)<.28);
console.log(`PASS: seeded spawn mix: ${crow} crows and ${giant} giant vegetables / 10,000`);

// Drive the real generator, including object removal and recovery at high speed.
for(const width of [640,1000])for(const multi of [1,10])for(const kind of ['random','giant-radish','giant-cabbage','crow','chestnut']){
 const x=setup(multi);x.setWorld(width,480);x.testConfig.kind=kind;x.testConfig.invincible=true;x.app.spawn=0;
 let spawned=0,previous=null,emptySince=null,clock=0;
 for(let i=0;i<120*35;i++){
  const before=x.app.obstacles[0];x.update(DT);clock+=DT;
  assert(x.app.obstacles.length<=1,'no overlapping encounters or trailing chains');
  const now=x.app.obstacles[0];
  if(before&&!now){emptySince=clock;previous=before}
  if(now&&now!==before){
   spawned++;
   if(previous)assert(clock-emptySince+DT>=x.recoveryTime(previous),'reserve full recovery after large obstacle');
   if(kind!=='random')assert.equal(now.kind,kind,'forced test selection reaches generator');
  }
 }
 assert(spawned>=3,'obstacles continue to spawn');
}
const html=fs.readFileSync('dist/index.html','utf8');
for(const kind of ['giant-radish','giant-cabbage','crow'])assert(html.includes('value="'+kind+'"'),'UI exposes v2 test mode');
assert(!/src="(?:ranking|pwa)\.js/.test(html),'no production ranking or cache registration');
console.log('PASS: live spawning, forced v2 modes, no stacks, full recovery across removal, mobile/desktop at 1x and 10x');
