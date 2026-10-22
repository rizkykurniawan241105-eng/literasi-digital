const CACHE_NAME = 'literal-osis-v6-network-first';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/education_pattern_bg.jpg'
];

self.addEventListener('install', (event) => {
  // Force active immediately on install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Purge ALL old caches immediately so UI updates reach student phones instantly
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NETWORK FIRST STRATEGY for CSS and Background Pattern Images (Sky Theme / Soft Blue Slate Pattern)
  const isCSS = event.request.destination === 'style' || url.pathname.endsWith('.css') || url.pathname.includes('/src/');
  const isBackgroundPattern = url.pathname.includes('education_pattern_bg') || url.pathname.includes('pattern') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg');
  const isManifestOrNavigate = url.pathname.includes('manifest.json') || event.request.mode === 'navigate';

  if (isCSS || isBackgroundPattern || isManifestOrNavigate) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') return caches.match('/index.html');
            return null;
          });
        })
    );
    return;
  }

  // 2. Default Stale-While-Revalidate for other static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET' &&
          !url.pathname.startsWith('/api') &&
          !url.hostname.includes('firestore') &&
          !url.hostname.includes('googleapis')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
