const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const edge=fs.readFileSync('backend/ranking/index.ts','utf8');
const scoreCode=edge.slice(edge.indexOf('export function scoreForTicks'),edge.indexOf('Deno.serve')).replace('export ','').replace('ticks:number','ticks');
const scoreBox={Math};vm.createContext(scoreBox);vm.runInContext(scoreCode+';this.score=scoreForTicks;',scoreBox);
let distance=0,speed=259.2;for(let i=1;i<=432000;i++){distance+=speed/1500;speed=Math.min(900,259.2+distance*.0525);if([1,120,240,36000,100000,432000].includes(i))assert.equal(scoreBox.score(i),Math.floor(distance),'server matches fixed-step game scoring')}
const nodes={},listeners={},storage=new Map();function element(){return {value:'',hidden:false,disabled:false,textContent:'',children:[],append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]},addEventListener(name,fn){this[name]=fn},scrollIntoView(){},focus(){}}}
const doc={getElementById:id=>nodes[id]??=element(),createElement:()=>element()};
const responses=[],calls=[];const context={document:doc,window:{addEventListener:(name,fn)=>listeners[name]=fn},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},crypto:require('crypto').webcrypto,AbortController,setTimeout,clearTimeout,fetch:async(_url,request)=>{calls.push(JSON.parse(request.body));return {ok:true,json:async()=>responses.shift()||{leaders:[],mine:null,total:0}}},console};
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{vm.createContext(context);vm.runInContext(fs.readFileSync('dist/ranking.js','utf8'),context);await tick();assert.equal(nodes.rankingEmpty.hidden,false);assert.equal(calls[0].action,'top');
 responses.push({runId:'11111111-1111-4111-8111-111111111111'});listeners['chacha:run-start']();await tick();listeners['chacha:run-end']({detail:{score:42,ticks:240}});assert.equal(nodes.rankSubmit.disabled,false);
 nodes.rankNickname.value='<script>';await nodes.rankingForm.submit({preventDefault(){}});assert(!calls.some(c=>c.action==='submit'),'reject markup nickname');
 nodes.rankNickname.value='달리는차차';responses.push({leaders:[{rank:1,nickname:'<img src=x>',distance:42}],mine:{rank:1,distance:42,nickname:'달리는차차'},total:1});await nodes.rankingForm.submit({preventDefault(){}});assert.equal(calls.at(-1).ticks,240);assert.equal(nodes.rankSubmit.disabled,true);assert.equal(nodes.rankingRows.children[0].children[1].textContent,'<img src=x>','nickname rendered as text');
 const count=calls.length;await nodes.rankingForm.submit({preventDefault(){}});assert.equal(calls.length,count,'no duplicate submission');console.log('PASS: server scoring parity, empty ranking, game hooks, nickname validation, safe text rendering, duplicate submission');})().catch(e=>{console.error(e);process.exitCode=1});

let newDistance=0,newSpeed=311.04;
for(let i=1;i<=432000;i++){
 newDistance+=newSpeed/1500;newSpeed=Math.min(900,311.04+newDistance*.0525);
 if([1,120,240,36000,100000,432000].includes(i))assert.equal(scoreBox.score(i,2),Math.floor(newDistance),'v2 scoring matches faster game');
}
assert(fs.readFileSync('dist/chacha.js','utf8').includes('START_SPEED=216*1.2*1.2'));
assert(fs.readFileSync('dist/ranking.js','utf8').includes('gameVersion:2'));
console.log('PASS: faster game score parity and legacy score compatibility');
