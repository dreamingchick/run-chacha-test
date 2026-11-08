/* Based on the inspected Gemini HTML: Canvas 2D, radish/cabbage assets,
 * single jump (-12.5 / .65 per 60Hz frame), 4.32 starting speed, local best.
 * Rebuilt with a time-based simulation and an articulated continuous gait. */
'use strict';
const $=id=>document.getElementById(id), canvas=$('game'), ctx=canvas.getContext('2d');
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), mix=(a,b,t)=>a+(b-a)*t;
const START_SPEED=216*1.2*1.2;
const app={mode:'preview',time:0,phase:0,rate:1,slow:false,frozen:false,distance:0,speed:START_SPEED,scroll:0,spawn:1.5,obstacles:[],dust:[],jumpY:0,vy:0,land:0,buffer:0,best:0,sound:false};
let W=1000,H=392, ground=290, last=0, accumulator=0,audio;
try{const saved=Number(localStorage.getItem('chacha_test_high_score'));app.best=Number.isFinite(saved)&&saved>=0?Math.floor(saved):0}catch{}
$('best').innerHTML=app.best+' <small>m</small>';
const images={};
async function loadImage(name){
 const im=new Image();im.src='assets/'+name+'.jpg';await im.decode();
 const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
 const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
 const d=g.getImageData(0,0,c.width,c.height),w=c.width,h=c.height;
 // Remove only background-connected white pixels, preserving pale fur/vegetables.
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 function visit(i){if(i<0||i>=w*h||seen[i])return;seen[i]=1;const j=i*4;if(Math.min(d.data[j],d.data[j+1],d.data[j+2])<225)return;queue[tail++]=i;d.data[j+3]=0}
 for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x)}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1)}
 while(head<tail){const i=queue[head++];if(i%w>0)visit(i-1);if(i%w<w-1)visit(i+1);visit(i-w);visit(i+w)}
 g.putImageData(d,0,0);
 if(name==='chowRun'){images[name]=c;return}
 // Crop the known original sprite margins to align visible art and collision.
 const crop=name==='radish'?[320,130,380,750]:[110,110,810,810];
 const cut=document.createElement('canvas');cut.width=crop[2];cut.height=crop[3];cut.getContext('2d').drawImage(c,...crop,0,0,cut.width,cut.height);images[name]=cut;
}
async function loadRunSheet(){
 const im=new Image();im.src='assets/chacha-gallop-sheet.png';await im.decode();images.runSheet=im;
}
Promise.all([loadRunSheet(),...['radish','cabbage'].map(loadImage)]).then(()=>{$('start').disabled=false;$('start').innerHTML='함께 달리기 <b>↗</b>'}).catch(()=>{$('hint').textContent='이미지 일부를 불러오지 못했어요. 새로고침해 주세요.'});
function resize(){const r=canvas.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);W=r.width<600?640:1000;H=W*r.height/r.width;ground=H*.72;canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0)}
new ResizeObserver(resize).observe(canvas);resize();
function ellipse(x,y,rx,ry,color,rotation=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,TAU);ctx.fill()}
function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.stroke()}
function fluff(x,y,rx,ry,color,n=14){ellipse(x,y,rx,ry,color);for(let i=0;i<n;i++){const a=i*TAU/n;ellipse(x+Math.cos(a)*rx*.86,y+Math.sin(a)*ry*.85,rx*.22,ry*.24,color,a*.2)}}
// Asymmetric gallop: hind push -> extended flight -> fore landing ->
// gathered flight. Near/far feet land slightly apart, never as diagonal pairs.
const STRIDE_DISTANCE=145;
function cycleSample(keys,p){
 p=((p%1)+1)%1;let i=0;while(i<keys.length-2&&p>=keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],before=keys[i-1]||[keys[keys.length-2][0]-1,...keys[keys.length-2].slice(1)],after=keys[i+2]||[keys[1][0]+1,...keys[1].slice(1)];
 const span=b[0]-a[0],t=(p-a[0])/span,t2=t*t,t3=t2*t;
 return a.slice(1).map((v,k)=>{const j=k+1,m0=(b[j]-before[j])/(b[0]-before[0])*span,m1=(after[j]-a[j])/(after[0]-a[0])*span;return (2*t3-3*t2+1)*v+(t3-2*t2+t)*m0+(-2*t3+3*t2)*b[j]+(t3-t2)*m1});
}
function gaitBody(phase){const [bob,stretch,pitch]=cycleSample([[0,1,.97,-.025],[.16,-2,1.04,-.06],[.32,-6,1.06,.015],[.43,1,1,.065],[.58,2,.96,.035],[.76,-7,.93,-.02],[.9,-4,.96,-.045],[1,1,.97,-.025]],phase);return {bob,stretch,pitch}}
function groundContact(phase){return [0,.045,.6,.645].some(offset=>(phase+offset)%1<.28)}
function legPose(phase,hipX,bob,air,front,far){
 const p=(phase+(front?.6:0)+(far?.045:0))%1,stance=.28;
 let footX,footY;
 if(p<stance){footX=mix(16,-16,p/stance);footY=0}
 else{const keys=front?[[0,16,0],[.28,-16,0],[.41,-20,-11],[.61,-6,-18],[.8,20,-13],[.93,22,-4],[1,16,0]]:[[0,16,0],[.28,-16,0],[.41,-22,-10],[.57,-6,-16],[.73,14,-13],[.9,20,-4],[1,16,0]];[footX,footY]=cycleSample(keys,p);footY=Math.min(0,footY)}
 footX=hipX+mix(footX,front?-7:8,air);footY=mix(footY,-14,air);
 const hipY=(front?-27:-25)+bob,target=front?[footX,footY-2]:[footX-4,footY-7];
 const dx=target[0]-hipX,dy=target[1]-hipY,l1=front?19:17,l2=l1;
 const distance=clamp(Math.hypot(dx,dy),.01,l1+l2-.01),angle=Math.atan2(dy,dx);
 const bend=Math.acos(clamp((l1*l1+distance*distance-l2*l2)/(2*l1*distance),-1,1));
 const knee=[hipX+Math.cos(angle+(front?1:-1)*bend)*l1,hipY+Math.sin(angle+(front?1:-1)*bend)*l1];
 return {hip:[hipX,hipY],knee,hock:front?null:target,paw:[footX,footY],p,stance:p<stance&&air===0};
}
function drawLeg(l,far){
 const outline=far?'#62412a':'#784a2c',fur=far?'#b87e41':'#e9b16b';
 const chain=l.hock?[l.hip,l.knee,l.hock,[l.paw[0],l.paw[1]-3]]:[l.hip,l.knee,[l.paw[0],l.paw[1]-3]];
 // Continuous tapered limbs; no exposed circular knee caps or broad shoe shapes.
 line(chain,outline,10.5);line(chain,fur,8);
 ctx.fillStyle=outline;ctx.beginPath();ctx.ellipse(l.paw[0]+1.5,l.paw[1]-2.8,6.3,3.8,0,0,TAU);ctx.fill();
 ellipse(l.paw[0]+1.5,l.paw[1]-3.2,5.4,3.0,far?'#ca9656':'#f4c983');
 line([[l.paw[0]+3.8,l.paw[1]-3.4],[l.paw[0]+4.2,l.paw[1]-1.6]],outline,.65);
}
// Eight illustrated phases, fixed source cells and a shared foot baseline.
function drawDog(x,y,scale,phase,jump=0,vy=0,land=0){
 if(!images.runSheet)return;
 const airborne=jump>.01;
 const frame=airborne?(vy<0?2:5):Math.min(7,Math.floor((((phase%1)+1)%1)*8));
 const cw=images.runSheet.width/4,ch=images.runSheet.height/2;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 if(airborne)ctx.rotate(clamp(vy/7000,-.08,.08));
 // Match the previous actor's visible width and feet position; collision is unchanged.
 const spriteWidth=154;const unit=spriteWidth/cw,squash=clamp(land,0,1)*.035;
 ctx.scale(1+squash,1-squash);
 ctx.drawImage(images.runSheet,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,-spriteWidth/2,-(frame<4?369:356)*unit,spriteWidth,ch*unit);
 ctx.restore();
}

function shadow(x,y,size,jump){ellipse(x,y+3,size*(1-clamp(jump/300,0,.5)),size*.10,'#080d0870')}
function addDust(x,y,n=2){for(let i=0;i<n;i++)app.dust.push({x,y,vx:-25-Math.random()*35,vy:-15-Math.random()*25,life:.45,size:2+Math.random()*3})}
function beep(freq,duration,type='sine'){if(!app.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.6,audio.currentTime+duration);g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function jump(){if(app.mode==='over'||app.mode==='paused')return;app.buffer=.12;if(app.jumpY<=.01){app.vy=-750;app.jumpY=.1;app.buffer=0;beep(530,.16);addDust(actorX(),ground,5)}}
function actorX(){return app.mode==='preview'?W*.48:Math.min(100,W*.16)}
function start(){app.runTicks=0;window.dispatchEvent(new Event('chacha:run-start'));Object.assign(app,{mode:'play',distance:0,speed:START_SPEED,spawn:2.3,obstacles:[],dust:[],jumpY:0,vy:0,land:0,buffer:0});$('result').hidden=true;$('start').hidden=true;$('jump').hidden=true;$('pause').hidden=false;$('pause').textContent='잠깐 쉬기 Ⅱ';$('jumpMobile').hidden=false;$('hint').hidden=true;$('modeLabel').textContent='차차, 달리는 중!';for(const id of ['speed','slow','freeze','phase'])$(id).disabled=true;app.frozen=false;$('freeze').setAttribute('aria-pressed','false');$('freeze').textContent='동작 멈추기';$('instructions').innerHTML='<kbd>SPACE</kbd> 점프 · <kbd>P</kbd> 일시정지';beep(660,.1)}
function preview(){app.mode='preview';app.obstacles=[];app.jumpY=0;app.vy=0;app.land=0;$('result').hidden=true;$('start').hidden=false;$('jump').hidden=false;$('pause').hidden=true;$('jumpMobile').hidden=true;$('hint').hidden=false;$('modeLabel').textContent='차차의 러닝 타임';$('distance').textContent='READY TO RUN';$('pace').textContent='01 / WARM UP';for(const id of ['speed','slow','freeze','phase'])$(id).disabled=false;$('instructions').innerHTML='<kbd>SPACE</kbd> / <kbd>↑</kbd> / 화면 터치로 점프'}
function pause(){if(app.mode==='play'){app.mode='paused';$('pause').textContent='계속 달리기 ▷';$('modeLabel').textContent='차차, 쉬는 중'}else if(app.mode==='paused'){app.mode='play';$('pause').textContent='잠깐 쉬기 Ⅱ';$('modeLabel').textContent='차차, 달리는 중!'}}
function gameOver(){app.mode='over';beep(160,.35,'triangle');const score=Math.floor(app.distance),isNew=score>app.best;app.best=Math.max(score,app.best);try{localStorage.setItem('chacha_test_high_score',String(app.best))}catch{}$('best').innerHTML=app.best+' <small>m</small>';$('final').textContent=score;$('resultNote').textContent=isNew?'새로운 최고 기록! 차차, 멋진데?':'다음에는 조금 더 멀리!';$('result').hidden=false;$('pause').hidden=true;$('jumpMobile').hidden=true;window.dispatchEvent(new CustomEvent('chacha:run-end',{detail:{score,ticks:app.runTicks}}))}
// One ground obstacle per encounter. Reserve a complete jump, landing and
// reaction window at maximum speed, so acceleration cannot consume the gap.
const MAX_SPEED=900, JUMP_SPEED=750, GRAVITY=2340;
const JUMP_TIME=2*JUMP_SPEED/GRAVITY;
function safeGap(previous,next){
 const large=previous.w>=60||previous.h>=60;
 return MAX_SPEED*(JUMP_TIME+.32+(large?.4:0)) + Math.max(previous.w,next.w)+40;
}
function canSpawnObstacle(next){
 // Reject geometry that a single jump cannot clear at the slowest pace.
 const clearance=Math.max(0,next.h-16);
 const discriminant=JUMP_SPEED**2-2*GRAVITY*clearance;
 if(discriminant<=0||(next.w+25)/START_SPEED>2*Math.sqrt(discriminant)/GRAVITY-.08)return false;
 return app.obstacles.every(o=>next.x-(o.x+o.w)>=safeGap(o,next));
}
function spawnObstacle(){
 const radish=Math.random()<.5;
 const next={x:W+40,w:radish?38:44,h:radish?46:42,name:radish?'radish':'cabbage'};
 if(!canSpawnObstacle(next))return false;
 app.obstacles.push(next);app.spawn=.2+Math.random()*.35;return true;
}
// Procedural scenery remains crisp at every screen size; only the distant
// countryside is softened, leaving the track and collision objects clear.
function drawCountryside(){
 const sky=ctx.createLinearGradient(0,0,0,ground);
 sky.addColorStop(0,'#a9c9c4');sky.addColorStop(1,'#e8e4bc');
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.filter='blur(4px)';
 ellipse(W*.77,ground*.22,25,25,'#fff0c3');
 for(let layer=0;layer<2;layer++){
  const step=260,offset=(app.scroll*(layer?.12:.05))%step;
  for(let x=-step-offset;x<W+step;x+=step)
   ellipse(x+130,ground*(layer?.87:.74),190,ground*(layer?.25:.28),layer?'#9cae83':'#b2bea0');
 }
 const offset=(app.scroll*.18)%440;
 for(let x=-440-offset;x<W+440;x+=440){
  ctx.fillStyle='#d6c9a6';ctx.fillRect(x+115,ground-85,70,45);
  ctx.fillStyle='#936f59';ctx.beginPath();ctx.moveTo(x+105,ground-83);ctx.lineTo(x+150,ground-113);ctx.lineTo(x+195,ground-83);ctx.closePath();ctx.fill();
  ctx.fillStyle='#748379';ctx.fillRect(x+143,ground-64,13,24);ctx.fillRect(x+123,ground-70,11,12);
  ctx.fillStyle='#8d9570';ctx.fillRect(x+265,ground-72,8,42);
  ellipse(x+269,ground-88,28,34,'#819b76');
 }
 ctx.restore();
 ctx.fillStyle='#eee8cd35';ctx.fillRect(0,0,W,ground);
 ctx.fillStyle='#c4ba91';ctx.fillRect(0,ground,W,H-ground);
 ctx.fillStyle='#6d8051';ctx.fillRect(0,ground,W,3);
 for(let x=-(app.scroll%80);x<W;x+=80){ctx.fillStyle='#9e946e';ctx.fillRect(x,ground+24,31,2);ctx.fillRect(x+33,ground+45,17,1)}
}
function drawObstacle(o){
 shadow(o.x+o.w/2,ground,o.w*.65,0);
 ctx.save();ctx.translate(o.x+o.w/2,ground);
 if(images[o.name]){
  // The source alpha silhouette supplies an outline for every vegetable.
  ctx.shadowColor='#263524';ctx.shadowBlur=2;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
  for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2]])ctx.drawImage(images[o.name],-o.w/2+dx,-o.h+dy,o.w,o.h);
  ctx.shadowBlur=4;ctx.shadowOffsetX=2;ctx.shadowOffsetY=3;
  ctx.drawImage(images[o.name],-o.w/2,-o.h,o.w,o.h);
 }else{
  ctx.fillStyle=o.name==='radish'?'#f5e9cb':'#8cb554';ctx.strokeStyle='#263524';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(0,-o.h/2,o.w/2,o.h/2,0,0,TAU);ctx.fill();ctx.stroke();
 }
 ctx.restore();
}
function update(dt){if(app.mode==='paused'||app.mode==='over')return;const previewing=app.mode==='preview';if(previewing&&app.frozen)return;const motionRate=previewing?app.rate*(app.slow?.25:1):1;const t=dt*motionRate;app.time+=t;app.buffer=Math.max(0,app.buffer-t);app.land*=Math.exp(-t*17);const speed=previewing?START_SPEED*app.rate:app.speed;app.scroll+=speed*dt*(previewing?Math.min(2.85,(ground-90)/100):1)*(previewing&&app.slow?.25:1);if(app.jumpY<=.01){app.phase=(app.phase+speed*t/(STRIDE_DISTANCE*(previewing?app.rate:.92)))%1}else{app.vy+=2340*t;app.jumpY-=app.vy*t;if(app.jumpY<=0){app.jumpY=0;app.vy=0;app.land=1;addDust(actorX(),ground,6);if(app.buffer>0)jump()}}
 if(!previewing){app.runTicks=(app.runTicks||0)+1;app.distance+=app.speed*t*.08;app.speed=Math.min(900,START_SPEED+app.distance/400*21);app.spawn-=t;if(app.spawn<=0)spawnObstacle();for(const o of app.obstacles){o.x-=app.speed*t;const px=actorX();if(px+20>o.x+7&&px-19<o.x+o.w-7&&ground-app.jumpY-9>ground-o.h+7&&ground-app.jumpY-52<ground-6){gameOver();break}}app.obstacles=app.obstacles.filter(o=>o.x+o.w>-50);$('distance').textContent=Math.floor(app.distance)+' m';$('pace').textContent=(app.speed/START_SPEED).toFixed(1)+'× PACE'}
 for(const p of app.dust){p.x+=p.vx*t;p.y+=p.vy*t;p.life-=t}app.dust=app.dust.filter(p=>p.life>0);if(app.jumpY===0&&groundContact(app.phase)&&Math.random()<dt*12)addDust(actorX()-20,ground-1,1);if(previewing)$('phase').value=app.phase}
function render(){ctx.clearRect(0,0,W,H);drawCountryside();
 const previewing=app.mode==='preview',scale=previewing?Math.min(2.85,(ground-90)/100):.92,x=actorX();shadow(x,ground,previewing?110:36,app.jumpY);for(const o of app.obstacles)drawObstacle(o);
 for(const p of app.dust){ctx.globalAlpha=p.life*.7;ellipse(p.x,p.y,p.size,p.size*.65,'#a0b28d')}ctx.globalAlpha=1;drawDog(x,ground-app.jumpY,scale,app.phase,app.jumpY,app.vy,app.land);
 if(previewing){ctx.fillStyle='#8d9e7e';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('CHACHA',x,Math.max(70,ground-113*scale));ctx.textAlign='left'}
 if(app.mode==='paused'){ctx.fillStyle='#111811ad';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#d4ed8a';ctx.font='600 24px sans-serif';ctx.fillText('잠깐, 숨 고르기.',W/2,H/2);ctx.font='12px sans-serif';ctx.fillStyle='#a5b59a';ctx.fillText('P 또는 계속 달리기로 돌아와요',W/2,H/2+30);ctx.textAlign='left'}}
function frame(ms){const elapsed=last?Math.min((ms-last)/1000,.1):0;last=ms;accumulator+=elapsed;while(accumulator+1e-10>=1/120){update(1/120);accumulator-=1/120}render();requestAnimationFrame(frame)}
$('start').onclick=start;$('retry').onclick=start;$('back').onclick=preview;$('jump').onclick=jump;$('jumpMobile').onclick=jump;$('pause').onclick=pause;
$('sound').onclick=()=>{app.sound=!app.sound;$('sound').textContent=app.sound?'소리 ON':'소리 OFF';$('sound').setAttribute('aria-pressed',String(app.sound));$('sound').setAttribute('aria-label',app.sound?'사운드 끄기':'사운드 켜기');beep(660,.12)};
$('speed').oninput=e=>{app.rate=Number(e.target.value);$('speedValue').value=app.rate.toFixed(2)+'×'};
$('slow').onclick=()=>{app.slow=!app.slow;$('slow').setAttribute('aria-pressed',String(app.slow))};
$('freeze').onclick=()=>{app.frozen=!app.frozen;$('freeze').setAttribute('aria-pressed',String(app.frozen));$('freeze').textContent=app.frozen?'동작 재생하기':'동작 멈추기'};
$('phase').oninput=e=>{app.frozen=true;app.phase=Number(e.target.value);$('freeze').setAttribute('aria-pressed','true');$('freeze').textContent='동작 재생하기'};
canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump()});window.addEventListener('keydown',e=>{if(['INPUT','BUTTON','A'].includes(e.target.tagName))return;if(['Space','ArrowUp'].includes(e.code)){e.preventDefault();if(!e.repeat)jump()}if(e.code==='KeyP'||e.code==='Escape')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&app.mode==='play')pause();last=0;accumulator=0});
requestAnimationFrame(frame);
