const VERSION = 'v2.0'; // ⬅️ МЕНЯЙ ЭТУ СТРОКУ ПРИ КАЖДОМ ДЕПЛОЕ
const CACHE_NAME = `arab-srs-${VERSION}`;
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => !k.startsWith('arab-srs-')).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.endsWith('/index.html') || e.request.url === location.origin + '/') {
    e.respondWith(fetch(e.request).then(net => {
      caches.open(CACHE_NAME).then(c => c.put(e.request, net.clone()));
      return net;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => {
    caches.open(CACHE_NAME).then(c => c.put(e.request, n.clone()));
    return n;
  })));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});