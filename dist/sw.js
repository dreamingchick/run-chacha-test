'use strict';
const CACHE = 'chacha-release-1.3.1-countryside';
const FILES = ['./assets/chacha-gallop-sheet.png', './chacha.js?v=gallop-v2', './ranking.js?v=gallop-v2', './assets/chacha-run-sheet.png', './chacha.js?v=sprite-20261108', './chacha.js?v=sprite-20261108', './', './index.html', './play.html', './style.css?v=1.1.2', './chacha.js?v=1.1.2', './ranking.js?v=1.1.2', './pwa.js?v=1.1.2', './style.css', './chacha.js', './pwa.js', './ranking.js', './manifest.webmanifest', './assets/chowRun.jpg', './assets/radish.jpg', './assets/cabbage.jpg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable.png', './assets/apple-touch-icon.png'];
self.addEventListener('install', event => {
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.all(FILES.map(async file=>{
   const canonical=new URL(file,self.location.href),fresh=new URL(canonical);
   fresh.searchParams.set('__chacha_release',CACHE);
   const response=await fetch(new Request(fresh,{cache:'reload'}));
   if(!response.ok)throw new Error('Precache failed');
   await cache.put(canonical.href,response);
  }));
 })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('chacha-release-') && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Serve a consistent release from one precache. Do not mix new JS with old HTML.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const path = new URL(request.url).pathname;
    const base = new URL('./', self.location.href).pathname;
    if (request.mode === 'navigate' && (path === base || path === base + 'index.html')) {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return await cache.match(request, {ignoreSearch: false}) || fetch(request);
  })());
});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
