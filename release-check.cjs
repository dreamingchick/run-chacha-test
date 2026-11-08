'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
process.chdir(__dirname);
for(const file of ['dist/chacha.js','dist/pwa.js','dist/sw.js','check.cjs']){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(result.status,0,result.stderr)}
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/style.css','utf8');
for(const value of html.matchAll(/(?:src|href)="([^"]+)"/g)){const file=value[1].split('?')[0];if(file==='./')continue;assert(!file.startsWith('http'),'self-contained runtime');assert(fs.existsSync(path.join('dist',file)),file)}
assert(!/@import|url\(https?:/.test(css),'no network font/CDN dependency');
const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
for(const icon of manifest.icons){const b=fs.readFileSync('dist/'+icon.src);assert.equal(b.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size)}
async function serviceWorkerCheck(){
 const origin='https://example.test',base=origin+'/games/chacha/',callbacks={},stores=new Map();
 const key=r=>new URL(typeof r==='string'?r:r.url,base).href;
 const cache={async addAll(files){for(const file of files){const relative=typeof file==='string'?file:new URL(file.url).pathname.slice(new URL(base).pathname.length);const disk=path.join('dist',relative==='./'||relative===''?'index.html':relative);assert(fs.existsSync(disk),file);stores.set(key(file),new Response(fs.readFileSync(disk))) }},async put(r,response){stores.set(key(r),response)},async match(r){return stores.get(key(r))?.clone()}};
 const deleted=[],context={URL,Request,Response,caches:{open:async()=>cache,keys:async()=>['other-app','chacha-release-obsolete'],delete:async name=>deleted.push(name)},fetch:async request=>{const name=new URL(request.url).pathname.slice(new URL(base).pathname.length)||'index.html';return new Response(fs.readFileSync(path.join('dist',name)))},self:{location:{origin,href:base+'sw.js'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>callbacks[name]=fn}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('dist/sw.js','utf8'),context);
 for(const name of ['install','activate']){let work;callbacks[name]({waitUntil:p=>work=p});await work}
 context.fetch=async()=>{throw Error('offline')};assert.deepEqual(deleted,['chacha-release-obsolete'],'only this app cache is cleaned');
 for(const route of ['', 'index.html', 'style.css','chacha.js','pwa.js','chacha.js?v=1.1.2','chacha.js?v=sprite-20261108','chacha.js?v=gallop-v2','ranking.js?v=gallop-v2','assets/chacha-gallop-sheet.png','assets/chacha-run-sheet.png','ranking.js?v=1.1.2','play.html','assets/chowRun.jpg','manifest.webmanifest']){let work;callbacks.fetch({request:{url:base+route,method:'GET',mode:route===''||route==='index.html'?'navigate':'cors'},respondWith:p=>work=p});const response=await work;assert(response?.ok,route+' works offline below a subdirectory')}
 let intercepted=false;callbacks.fetch({request:{url:'https://other.test/private',method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 callbacks.fetch({request:{url:base,method:'POST'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 console.log('PASS: deployment file references, no external runtime dependencies, icon sizes, offline cache and subdirectory scope');
}
serviceWorkerCheck().catch(error=>{console.error(error);process.exitCode=1});
