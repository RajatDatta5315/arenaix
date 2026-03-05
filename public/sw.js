const CACHE='arenaix-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/','/manifest.json'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')||u.hostname.includes('supabase')){e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));}else{e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));}});
