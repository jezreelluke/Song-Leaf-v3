// Songleaf service worker — caches the app shell so it works offline,
// and caches OCR/font assets after their first successful fetch.

var CACHE_VERSION = 'songleaf-v1';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_VERSION; })
            .map(function(key){ return caches.delete(key); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event){
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if (cached) return cached;

      return fetch(event.request).then(function(response){
        // Only cache successful, basic or opaque (cross-origin) responses.
        if (!response || (response.status !== 200 && response.type !== 'opaque')) {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_VERSION).then(function(cache){
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function(){
        // Offline and not cached: for navigations, fall back to the app shell.
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
