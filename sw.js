const VERSION = 'lingua-v11';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Установка — кэшируем все критичные файлы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кэши, сразу берём управление
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Внешние запросы (Google Fonts, QR API) — только сеть
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 408})));
    return;
  }

  // Stale-while-revalidate:
  // 1. Сразу отдаём из кэша (офлайн работает, нет задержки)
  // 2. Параллельно идём в сеть и обновляем кэш
  // 3. Если кэша нет — ждём сеть
  e.respondWith(
    caches.open(VERSION).then(cache => {
      return cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(response => {
          if (response.ok) {
            cache.put(e.request, response.clone());
            // Если это главный файл — уведомляем приложение об обновлении
            if (url.pathname === '/' || url.pathname === '/index.html') {
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({type: 'UPDATE_AVAILABLE'}));
              });
            }
          }
          return response;
        }).catch(() => cached || caches.match('/index.html'));

        // Есть кэш — отдаём сразу, сеть обновит в фоне
        return cached || networkFetch;
      });
    })
  );
});