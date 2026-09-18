const CACHE='wildoku-v0.7.4';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>(k.startsWith('wildoku-beta-')||k.startsWith('wildoku-'))&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin && url.pathname.endsWith('/version.json')){
    event.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const local=await cache.match('./index.html') || await cache.match('./');
      if(local) return local;
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh&&fresh.ok) await cache.put('./index.html',fresh.clone());
        return fresh;
      }catch(err){
        return new Response('<!doctype html><meta charset="utf-8"><title>Wildoku</title><p>Wildoku konnte lokal nicht geladen werden. Bitte einmal online starten, damit die Offline-Version gespeichert wird.</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }
  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const local=await cache.match(req);
      if(local) return local;
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok) await cache.put(req,fresh.clone());
        return fresh;
      }catch(err){
        return new Response('',{status:504,statusText:'Offline'});
      }
    })());
  }
});
