const CACHE_NAME = 'auditref-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com'
];

// Installe le service worker et met en cache l'application shell de base.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache ouvert');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Intercepte les requêtes réseau.
// Stratégie : Network First, falling back to Cache.
// Idéal pour les applications où les données à jour sont importantes.
self.addEventListener('fetch', event => {
    // Ne met en cache que les requêtes GET.
    if (event.request.method !== 'GET') {
        return;
    }
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
        return fetch(event.request).then(response => {
            // Si la requête réseau réussit, on met à jour le cache.
            if (response.status === 200) {
                // Ne pas mettre en cache les extensions chrome
                if (!event.request.url.startsWith('chrome-extension://')) {
                    cache.put(event.request, response.clone());
                }
            }
            return response;
        }).catch(() => {
            // Si le réseau échoue (mode hors ligne), on sert depuis le cache.
            return cache.match(event.request);
        });
    })
  );
});

// Nettoie les anciens caches lors de l'activation d'un nouveau service worker.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
