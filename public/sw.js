const C="asclepius-v6";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(["/","/manifest.json","/icon.svg","/icon-192.png","/apple-touch-icon.png"])));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
 // never cache: writes, other sites, partial (range) requests, backups/exports, health checks
 if(r.method!=="GET"||u.origin!==location.origin||r.headers.has("range")||/^\/api\/(backup|anki|health|cron)/.test(u.pathname))return;
 e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r)))});
